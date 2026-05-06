package db

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gocql/gocql"
	"github.com/jobswiper/backend/internal/models"
	"github.com/jobswiper/backend/pkg/config"
)

type CassandraDB struct {
	session *gocql.Session
}

func NewCassandraDB(cfg *config.Config) (*CassandraDB, error) {
	cluster := gocql.NewCluster(cfg.CassandraHosts...)
	port, err := strconv.Atoi(cfg.CassandraPort)
	if err != nil {
		port = 9042
	}
	cluster.Port = port
	cluster.Consistency = gocql.Quorum
	cluster.ConnectTimeout = 10 * time.Second

	session, err := cluster.CreateSession()
	if err != nil {
		return nil, fmt.Errorf("failed to create initial session: %w", err)
	}

	keyspaceQuery := fmt.Sprintf(`
		CREATE KEYSPACE IF NOT EXISTS %s
		WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
	`, cfg.CassandraKeyspace)

	if err := session.Query(keyspaceQuery).Exec(); err != nil {
		return nil, fmt.Errorf("failed to create keyspace: %w", err)
	}
	session.Close()

	cluster.Keyspace = cfg.CassandraKeyspace
	session, err = cluster.CreateSession()
	if err != nil {
		return nil, fmt.Errorf("failed to create session with keyspace: %w", err)
	}

	if err := initializeTables(session); err != nil {
		return nil, fmt.Errorf("failed to initialize tables: %w", err)
	}
	if cfg.Environment != "production" {
		if err := backfillReadModels(session); err != nil {
			return nil, fmt.Errorf("failed to backfill read models: %w", err)
		}
	}

	return &CassandraDB{session: session}, nil
}

func initializeTables(session *gocql.Session) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			email TEXT,
			username TEXT,
			password_hash TEXT,
			user_type TEXT,
			created_at TIMESTAMP,
			updated_at TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS users_by_email (
			email TEXT PRIMARY KEY,
			id UUID,
			username TEXT,
			password_hash TEXT,
			user_type TEXT,
			created_at TIMESTAMP,
			updated_at TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS users_by_type (
			user_type TEXT,
			created_at TIMESTAMP,
			id UUID,
			email TEXT,
			username TEXT,
			updated_at TIMESTAMP,
			PRIMARY KEY ((user_type), created_at, id)
		) WITH CLUSTERING ORDER BY (created_at DESC, id ASC)`,
		`CREATE TABLE IF NOT EXISTS profiles (
			user_id UUID PRIMARY KEY,
			name TEXT,
			description TEXT,
			photo_url TEXT,
			location TEXT,
			device_token TEXT,
			updated_at TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS jobs (
			id UUID PRIMARY KEY,
			employer_id UUID,
			title TEXT,
			description TEXT,
			location TEXT,
			skills LIST<TEXT>,
			created_at TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS jobs_by_employer (
			employer_id UUID,
			created_at TIMESTAMP,
			id UUID,
			title TEXT,
			description TEXT,
			location TEXT,
			skills LIST<TEXT>,
			PRIMARY KEY ((employer_id), created_at, id)
		) WITH CLUSTERING ORDER BY (created_at DESC, id ASC)`,
		// Partition by user_id, cluster by target_id — allows efficient lookup of
		// a specific (user, target) pair for match detection.
		`CREATE TABLE IF NOT EXISTS swipes (
			user_id UUID,
			target_id UUID,
			id UUID,
			direction TEXT,
			created_at TIMESTAMP,
			PRIMARY KEY (user_id, target_id)
		)`,
		`CREATE TABLE IF NOT EXISTS swipes_by_target (
			target_id UUID,
			user_id UUID,
			id UUID,
			direction TEXT,
			created_at TIMESTAMP,
			PRIMARY KEY ((target_id), user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS matches (
			id UUID PRIMARY KEY,
			user_id_1 UUID,
			user_id_2 UUID,
			created_at TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS matches_by_user (
			user_id UUID,
			created_at TIMESTAMP,
			id UUID,
			user_id_1 UUID,
			user_id_2 UUID,
			PRIMARY KEY ((user_id), created_at, id)
		) WITH CLUSTERING ORDER BY (created_at DESC, id ASC)`,
		`CREATE TABLE IF NOT EXISTS messages (
    match_id   TEXT,
    created_at TIMESTAMP,
    id         TEXT,
    sender_id  TEXT,
    content    TEXT,
    PRIMARY KEY ((match_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at ASC, id ASC)`,
		`CREATE TABLE IF NOT EXISTS latest_messages_by_match (
			match_id TEXT PRIMARY KEY,
			created_at TIMESTAMP,
			id TEXT,
			sender_id TEXT,
			content TEXT
		)`,
	}

	for _, stmt := range statements {
		if err := session.Query(stmt).Exec(); err != nil {
			return fmt.Errorf("failed to execute schema statement: %w", err)
		}
	}

	// Best-effort column additions for existing tables.
	// Cassandra returns an error if the column already exists; that's safe to ignore.
	_ = session.Query(`ALTER TABLE profiles ADD device_token TEXT`).Exec()
	_ = session.Query(`ALTER TABLE profiles ADD skills LIST<TEXT>`).Exec()
	_ = session.Query(`ALTER TABLE jobs ADD skills LIST<TEXT>`).Exec()
	_ = session.Query(`ALTER TABLE jobs_by_employer ADD skills LIST<TEXT>`).Exec()

	return nil
}

func backfillReadModels(session *gocql.Session) error {
	if err := backfillUsers(session); err != nil {
		return err
	}
	if err := backfillSwipes(session); err != nil {
		return err
	}
	if err := backfillJobs(session); err != nil {
		return err
	}
	if err := backfillMatches(session); err != nil {
		return err
	}
	return backfillLatestMessages(session)
}

func backfillUsers(session *gocql.Session) error {
	iter := session.Query(`SELECT id, email, username, password_hash, user_type, created_at, updated_at FROM users`).Iter()
	var id, email, username, passwordHash, userType string
	var createdAt, updatedAt time.Time
	for iter.Scan(&id, &email, &username, &passwordHash, &userType, &createdAt, &updatedAt) {
		batch := session.NewBatch(gocql.UnloggedBatch)
		batch.Query(`
			INSERT INTO users_by_email (email, id, username, password_hash, user_type, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			email, id, username, passwordHash, userType, createdAt, updatedAt,
		)
		batch.Query(`
			INSERT INTO users_by_type (user_type, created_at, id, email, username, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
			userType, createdAt, id, email, username, updatedAt,
		)
		if err := session.ExecuteBatch(batch); err != nil {
			_ = iter.Close()
			return err
		}
	}
	return iter.Close()
}

func backfillSwipes(session *gocql.Session) error {
	iter := session.Query(`SELECT user_id, target_id, id, direction, created_at FROM swipes`).Iter()
	var userID, targetID, id, direction string
	var createdAt time.Time
	for iter.Scan(&userID, &targetID, &id, &direction, &createdAt) {
		if err := session.Query(`
			INSERT INTO swipes_by_target (target_id, user_id, id, direction, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			targetID, userID, id, direction, createdAt,
		).Exec(); err != nil {
			_ = iter.Close()
			return err
		}
	}
	return iter.Close()
}

func backfillJobs(session *gocql.Session) error {
	iter := session.Query(`SELECT id, employer_id, title, description, location, skills, created_at FROM jobs`).Iter()
	var id, employerID, title, description, location string
	var skills []string
	var createdAt time.Time
	for iter.Scan(&id, &employerID, &title, &description, &location, &skills, &createdAt) {
		if err := session.Query(`
			INSERT INTO jobs_by_employer (employer_id, created_at, id, title, description, location, skills)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			employerID, createdAt, id, title, description, location, skills,
		).Exec(); err != nil {
			_ = iter.Close()
			return err
		}
	}
	return iter.Close()
}

func backfillMatches(session *gocql.Session) error {
	iter := session.Query(`SELECT id, user_id_1, user_id_2, created_at FROM matches`).Iter()
	var id, userID1, userID2 string
	var createdAt time.Time
	for iter.Scan(&id, &userID1, &userID2, &createdAt) {
		batch := session.NewBatch(gocql.UnloggedBatch)
		batch.Query(`
			INSERT INTO matches_by_user (user_id, created_at, id, user_id_1, user_id_2)
			VALUES (?, ?, ?, ?, ?)`,
			userID1, createdAt, id, userID1, userID2,
		)
		batch.Query(`
			INSERT INTO matches_by_user (user_id, created_at, id, user_id_1, user_id_2)
			VALUES (?, ?, ?, ?, ?)`,
			userID2, createdAt, id, userID1, userID2,
		)
		if err := session.ExecuteBatch(batch); err != nil {
			_ = iter.Close()
			return err
		}
	}
	return iter.Close()
}

func backfillLatestMessages(session *gocql.Session) error {
	iter := session.Query(`SELECT id, match_id, sender_id, content, created_at FROM messages`).Iter()
	latest := map[string]models.Message{}
	var id, matchID, senderID, content string
	var createdAt time.Time
	for iter.Scan(&id, &matchID, &senderID, &content, &createdAt) {
		current, ok := latest[matchID]
		if !ok || createdAt.UnixMilli() > current.CreatedAt {
			latest[matchID] = models.Message{
				ID: id, MatchID: matchID, SenderID: senderID,
				Content: content, CreatedAt: createdAt.UnixMilli(),
			}
		}
	}
	if err := iter.Close(); err != nil {
		return err
	}
	for _, msg := range latest {
		if err := session.Query(`
			INSERT INTO latest_messages_by_match (match_id, created_at, id, sender_id, content)
			VALUES (?, ?, ?, ?, ?)`,
			msg.MatchID, time.UnixMilli(msg.CreatedAt), msg.ID, msg.SenderID, msg.Content,
		).Exec(); err != nil {
			return err
		}
	}
	return nil
}

func (cdb *CassandraDB) Close() error {
	cdb.session.Close()
	return nil
}

func (cdb *CassandraDB) GetSession() *gocql.Session {
	return cdb.session
}

// ── Users ──────────────────────────────────────────────────────────────────

func (cdb *CassandraDB) CreateUser(user *models.User, passwordHash string) error {
	batch := cdb.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`
		INSERT INTO users (id, email, username, password_hash, user_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.Email, user.Username, passwordHash, user.UserType,
		time.UnixMilli(user.CreatedAt), time.UnixMilli(user.UpdatedAt),
	)
	batch.Query(`
		INSERT INTO users_by_email (email, id, username, password_hash, user_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		user.Email, user.ID, user.Username, passwordHash, user.UserType,
		time.UnixMilli(user.CreatedAt), time.UnixMilli(user.UpdatedAt),
	)
	batch.Query(`
		INSERT INTO users_by_type (user_type, created_at, id, email, username, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		user.UserType, time.UnixMilli(user.CreatedAt), user.ID, user.Email,
		user.Username, time.UnixMilli(user.UpdatedAt),
	)
	return cdb.session.ExecuteBatch(batch)
}

func (cdb *CassandraDB) GetUserByEmail(email string) (*models.User, string, error) {
	var user models.User
	var passwordHash string
	var createdAt, updatedAt time.Time

	err := cdb.session.Query(`
		SELECT id, email, username, password_hash, user_type, created_at, updated_at
		FROM users_by_email WHERE email = ?`,
		email,
	).Scan(
		&user.ID, &user.Email, &user.Username, &passwordHash,
		&user.UserType, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, "", err
	}

	user.CreatedAt = createdAt.UnixMilli()
	user.UpdatedAt = updatedAt.UnixMilli()
	return &user, passwordHash, nil
}

// ── Profiles ───────────────────────────────────────────────────────────────

func (cdb *CassandraDB) CreateProfile(profile *models.Profile) error {
	return cdb.session.Query(`
		INSERT INTO profiles (user_id, name, description, photo_url, location, skills, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		profile.UserID, profile.Name, profile.Description,
		profile.PhotoURL, profile.Location, profile.Skills, time.UnixMilli(profile.UpdatedAt),
	).Exec()
}

func (cdb *CassandraDB) GetProfileByUserID(userID string) (*models.Profile, error) {
	var profile models.Profile
	var skills []string
	var updatedAt time.Time

	err := cdb.session.Query(`
		SELECT user_id, name, description, photo_url, location, device_token, skills, updated_at
		FROM profiles WHERE user_id = ?`,
		userID,
	).Scan(
		&profile.UserID, &profile.Name, &profile.Description,
		&profile.PhotoURL, &profile.Location, &profile.DeviceToken, &skills, &updatedAt,
	)
	if err != nil {
		return nil, err
	}

	profile.Skills = skills
	profile.UpdatedAt = updatedAt.UnixMilli()
	return &profile, nil
}

func (cdb *CassandraDB) SaveDeviceToken(userID, token string) error {
	return cdb.session.Query(`
		UPDATE profiles SET device_token = ? WHERE user_id = ?`,
		token, userID,
	).Exec()
}

func (cdb *CassandraDB) UpdateProfile(profile *models.Profile) error {
	return cdb.session.Query(`
		UPDATE profiles
		SET name = ?, description = ?, photo_url = ?, location = ?, skills = ?, updated_at = ?
		WHERE user_id = ?`,
		profile.Name, profile.Description, profile.PhotoURL,
		profile.Location, profile.Skills, time.UnixMilli(profile.UpdatedAt), profile.UserID,
	).Exec()
}

// ── Swipes ─────────────────────────────────────────────────────────────────

func (cdb *CassandraDB) CreateSwipe(swipe *models.Swipe) error {
	batch := cdb.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`
		INSERT INTO swipes (user_id, target_id, id, direction, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		swipe.UserID, swipe.TargetID, swipe.ID,
		swipe.Direction, time.UnixMilli(swipe.CreatedAt),
	)
	batch.Query(`
		INSERT INTO swipes_by_target (target_id, user_id, id, direction, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		swipe.TargetID, swipe.UserID, swipe.ID,
		swipe.Direction, time.UnixMilli(swipe.CreatedAt),
	)
	return cdb.session.ExecuteBatch(batch)
}

func (cdb *CassandraDB) GetSwipesByUserID(userID string) ([]models.Swipe, error) {
	iter := cdb.session.Query(`
		SELECT user_id, target_id, id, direction, created_at
		FROM swipes WHERE user_id = ?`,
		userID,
	).Iter()

	var swipes []models.Swipe
	var s models.Swipe
	var createdAt time.Time

	for iter.Scan(&s.UserID, &s.TargetID, &s.ID, &s.Direction, &createdAt) {
		s.CreatedAt = createdAt.UnixMilli()
		swipes = append(swipes, s)
	}

	return swipes, iter.Close()
}

func (cdb *CassandraDB) GetSwipesByTargetID(targetID string) ([]models.Swipe, error) {
	iter := cdb.session.Query(`
		SELECT user_id, target_id, id, direction, created_at
		FROM swipes_by_target WHERE target_id = ?`,
		targetID,
	).Iter()

	var swipes []models.Swipe
	var s models.Swipe
	var createdAt time.Time

	for iter.Scan(&s.UserID, &s.TargetID, &s.ID, &s.Direction, &createdAt) {
		s.CreatedAt = createdAt.UnixMilli()
		swipes = append(swipes, s)
	}

	return swipes, iter.Close()
}

// GetSwipe fetches a specific swipe record, used to detect mutual matches.
func (cdb *CassandraDB) GetSwipe(userID, targetID string) (*models.Swipe, error) {
	var s models.Swipe
	var createdAt time.Time

	err := cdb.session.Query(`
		SELECT user_id, target_id, id, direction, created_at
		FROM swipes WHERE user_id = ? AND target_id = ?`,
		userID, targetID,
	).Scan(&s.UserID, &s.TargetID, &s.ID, &s.Direction, &createdAt)
	if err != nil {
		return nil, err
	}

	s.CreatedAt = createdAt.UnixMilli()
	return &s, nil
}

// GetRightSwipesByTarget returns all user_ids that swiped right on targetID.
func (db *CassandraDB) GetRightSwipesByTarget(targetID string) ([]string, error) {
	iter := db.session.Query(
		`SELECT user_id, direction FROM swipes_by_target WHERE target_id = ?`,
		targetID,
	).Iter()

	var userIDs []string
	var uid, dir string
	for iter.Scan(&uid, &dir) {
		if dir == "right" {
			userIDs = append(userIDs, uid)
		}
	}
	return userIDs, iter.Close()
}

// ── Matches ────────────────────────────────────────────────────────────────

func (cdb *CassandraDB) CreateMatch(match *models.Match) error {
	batch := cdb.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`
		INSERT INTO matches (id, user_id_1, user_id_2, created_at)
		VALUES (?, ?, ?, ?)`,
		match.ID, match.UserID1, match.UserID2,
		time.UnixMilli(match.CreatedAt),
	)
	batch.Query(`
		INSERT INTO matches_by_user (user_id, created_at, id, user_id_1, user_id_2)
		VALUES (?, ?, ?, ?, ?)`,
		match.UserID1, time.UnixMilli(match.CreatedAt), match.ID, match.UserID1, match.UserID2,
	)
	batch.Query(`
		INSERT INTO matches_by_user (user_id, created_at, id, user_id_1, user_id_2)
		VALUES (?, ?, ?, ?, ?)`,
		match.UserID2, time.UnixMilli(match.CreatedAt), match.ID, match.UserID1, match.UserID2,
	)
	return cdb.session.ExecuteBatch(batch)
}

func (db *CassandraDB) GetMatchesByUserID(userID string) ([]models.Match, error) {
	var matches []models.Match
	iter := db.session.Query(`SELECT id, user_id_1, user_id_2, created_at FROM matches_by_user WHERE user_id = ?`, userID).Iter()
	var id, uid1, uid2 string
	var t time.Time
	for iter.Scan(&id, &uid1, &uid2, &t) {
		matches = append(matches, models.Match{ID: id, UserID1: uid1, UserID2: uid2, CreatedAt: t.UnixMilli()})
	}
	return matches, iter.Close()
}

func (db *CassandraDB) GetMatchByID(matchID string) (*models.Match, error) {
	var id, uid1, uid2 string
	var t time.Time
	err := db.session.Query(`SELECT id, user_id_1, user_id_2, created_at FROM matches WHERE id = ?`, matchID).
		Scan(&id, &uid1, &uid2, &t)
	if err != nil {
		return nil, err
	}
	return &models.Match{ID: id, UserID1: uid1, UserID2: uid2, CreatedAt: t.UnixMilli()}, nil
}

func (db *CassandraDB) DeleteMatchByID(matchID string) error {
	return db.session.Query(`DELETE FROM matches WHERE id = ?`, matchID).Exec()
}

func (db *CassandraDB) DeleteMatch(match *models.Match) error {
	t := time.UnixMilli(match.CreatedAt)
	batch := db.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`DELETE FROM matches WHERE id = ?`, match.ID)
	batch.Query(`DELETE FROM matches_by_user WHERE user_id = ? AND created_at = ? AND id = ?`, match.UserID1, t, match.ID)
	batch.Query(`DELETE FROM matches_by_user WHERE user_id = ? AND created_at = ? AND id = ?`, match.UserID2, t, match.ID)
	return db.session.ExecuteBatch(batch)
}

func (db *CassandraDB) CreateMessage(msg *models.Message) error {
	t := time.UnixMilli(msg.CreatedAt)
	batch := db.session.NewBatch(gocql.LoggedBatch)
	batch.Query(
		`INSERT INTO messages (match_id, created_at, id, sender_id, content) VALUES (?, ?, ?, ?, ?)`,
		msg.MatchID, t, msg.ID, msg.SenderID, msg.Content,
	)
	batch.Query(
		`INSERT INTO latest_messages_by_match (match_id, created_at, id, sender_id, content) VALUES (?, ?, ?, ?, ?)`,
		msg.MatchID, t, msg.ID, msg.SenderID, msg.Content,
	)
	return db.session.ExecuteBatch(batch)
}

func (db *CassandraDB) GetMessagesByMatchID(matchID string) ([]models.Message, error) {
	iter := db.session.Query(
		`SELECT id, match_id, sender_id, content, created_at FROM messages WHERE match_id = ?`,
		matchID,
	).Iter()
	var msgs []models.Message
	var id, mid, senderID, content string
	var t time.Time
	for iter.Scan(&id, &mid, &senderID, &content, &t) {
		msgs = append(msgs, models.Message{ID: id, MatchID: mid, SenderID: senderID, Content: content, CreatedAt: t.UnixMilli()})
	}
	return msgs, iter.Close()
}

func (db *CassandraDB) DeleteMessagesByMatchID(matchID string) error {
	batch := db.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`DELETE FROM messages WHERE match_id = ?`, matchID)
	batch.Query(`DELETE FROM latest_messages_by_match WHERE match_id = ?`, matchID)
	return db.session.ExecuteBatch(batch)
}

func (db *CassandraDB) GetLatestMessageByMatchID(matchID string) (*models.Message, error) {
	var msg models.Message
	var t time.Time
	err := db.session.Query(
		`SELECT id, match_id, sender_id, content, created_at FROM latest_messages_by_match WHERE match_id = ?`,
		matchID,
	).Scan(&msg.ID, &msg.MatchID, &msg.SenderID, &msg.Content, &t)
	if err != nil {
		return nil, err
	}
	msg.CreatedAt = t.UnixMilli()
	return &msg, nil
}

// ── Discover ───────────────────────────────────────────────────────────────

func (db *CassandraDB) GetUserByID(userID string) (*models.User, error) {
	var u models.User
	var createdAt, updatedAt time.Time
	err := db.session.Query(
		`SELECT id, email, username, user_type, created_at, updated_at FROM users WHERE id = ?`,
		userID,
	).Scan(&u.ID, &u.Email, &u.Username, &u.UserType, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt.UnixMilli()
	u.UpdatedAt = updatedAt.UnixMilli()
	return &u, nil
}

func (db *CassandraDB) GetUsersByType(userType string) ([]models.User, error) {
	iter := db.session.Query(
		`SELECT id, email, username, user_type, created_at, updated_at FROM users_by_type WHERE user_type = ? LIMIT 100`,
		userType,
	).Iter()
	var users []models.User
	var id, email, username, ut string
	var createdAt, updatedAt time.Time
	for iter.Scan(&id, &email, &username, &ut, &createdAt, &updatedAt) {
		users = append(users, models.User{
			ID: id, Email: email, Username: username, UserType: ut,
			CreatedAt: createdAt.UnixMilli(), UpdatedAt: updatedAt.UnixMilli(),
		})
	}
	return users, iter.Close()
}

func (db *CassandraDB) GetSwipedTargetIDs(userID string) ([]string, error) {
	iter := db.session.Query(
		`SELECT target_id FROM swipes WHERE user_id = ?`,
		userID,
	).Iter()
	var ids []string
	var tid string
	for iter.Scan(&tid) {
		ids = append(ids, tid)
	}
	return ids, iter.Close()
}

// ── Jobs ───────────────────────────────────────────────────────────────────

func (db *CassandraDB) CreateJob(job *models.Job) error {
	t := time.UnixMilli(job.CreatedAt)
	batch := db.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`
		INSERT INTO jobs (id, employer_id, title, description, location, skills, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		job.ID, job.EmployerID, job.Title, job.Description,
		job.Location, job.Skills, t,
	)
	batch.Query(`
		INSERT INTO jobs_by_employer (employer_id, created_at, id, title, description, location, skills)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		job.EmployerID, t, job.ID, job.Title, job.Description,
		job.Location, job.Skills,
	)
	return db.session.ExecuteBatch(batch)
}

func (db *CassandraDB) GetJobByID(jobID string) (*models.Job, error) {
	var job models.Job
	var createdAt time.Time

	err := db.session.Query(`
		SELECT id, employer_id, title, description, location, skills, created_at
		FROM jobs WHERE id = ?`,
		jobID,
	).Scan(
		&job.ID, &job.EmployerID, &job.Title, &job.Description,
		&job.Location, &job.Skills, &createdAt,
	)
	if err != nil {
		return nil, err
	}

	job.CreatedAt = createdAt.UnixMilli()
	return &job, nil
}

func (db *CassandraDB) GetJobsByEmployerID(employerID string) ([]models.Job, error) {
	iter := db.session.Query(`
		SELECT id, employer_id, title, description, location, skills, created_at
		FROM jobs_by_employer WHERE employer_id = ?`,
		employerID,
	).Iter()

	var jobs []models.Job
	var job models.Job
	var createdAt time.Time

	for iter.Scan(&job.ID, &job.EmployerID, &job.Title, &job.Description, &job.Location, &job.Skills, &createdAt) {
		job.CreatedAt = createdAt.UnixMilli()
		jobs = append(jobs, job)
	}

	return jobs, iter.Close()
}

func (db *CassandraDB) GetAllJobs() ([]models.Job, error) {
	iter := db.session.Query(`
		SELECT id, employer_id, title, description, location, skills, created_at
		FROM jobs LIMIT 100`,
	).Iter()

	var jobs []models.Job
	var job models.Job
	var createdAt time.Time

	for iter.Scan(&job.ID, &job.EmployerID, &job.Title, &job.Description, &job.Location, &job.Skills, &createdAt) {
		job.CreatedAt = createdAt.UnixMilli()
		jobs = append(jobs, job)
	}

	return jobs, iter.Close()
}

func (db *CassandraDB) UpdateJob(job *models.Job) error {
	t := time.UnixMilli(job.CreatedAt)
	batch := db.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`
		UPDATE jobs
		SET title = ?, description = ?, location = ?, skills = ?
		WHERE id = ?`,
		job.Title, job.Description, job.Location, job.Skills, job.ID,
	)
	batch.Query(`
		UPDATE jobs_by_employer
		SET title = ?, description = ?, location = ?, skills = ?
		WHERE employer_id = ? AND created_at = ? AND id = ?`,
		job.Title, job.Description, job.Location, job.Skills,
		job.EmployerID, t, job.ID,
	)
	return db.session.ExecuteBatch(batch)
}

func (db *CassandraDB) DeleteJob(job *models.Job) error {
	t := time.UnixMilli(job.CreatedAt)
	batch := db.session.NewBatch(gocql.LoggedBatch)
	batch.Query(`DELETE FROM jobs WHERE id = ?`, job.ID)
	batch.Query(`DELETE FROM jobs_by_employer WHERE employer_id = ? AND created_at = ? AND id = ?`, job.EmployerID, t, job.ID)
	return db.session.ExecuteBatch(batch)
}
