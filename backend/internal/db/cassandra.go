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
			salary TEXT,
			location TEXT,
			created_at TIMESTAMP
		)`,
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
		`CREATE TABLE IF NOT EXISTS matches (
			id UUID PRIMARY KEY,
			user_id_1 UUID,
			user_id_2 UUID,
			created_at TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS jobswiper.messages (
    match_id   TEXT,
    created_at TIMESTAMP,
    id         TEXT,
    sender_id  TEXT,
    content    TEXT,
    PRIMARY KEY ((match_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at ASC, id ASC)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_type  ON users (user_type)`,
		`CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches (user_id_1)`,
		`CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches (user_id_2)`,
		`CREATE INDEX IF NOT EXISTS idx_swipes_target ON jobswiper.swipes (target_id)`,
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
	return cdb.session.Query(`
		INSERT INTO users (id, email, username, password_hash, user_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.Email, user.Username, passwordHash, user.UserType,
		time.UnixMilli(user.CreatedAt), time.UnixMilli(user.UpdatedAt),
	).Exec()
}

func (cdb *CassandraDB) GetUserByEmail(email string) (*models.User, string, error) {
	var user models.User
	var passwordHash string
	var createdAt, updatedAt time.Time

	err := cdb.session.Query(`
		SELECT id, email, username, password_hash, user_type, created_at, updated_at
		FROM users WHERE email = ? LIMIT 1`,
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
	return cdb.session.Query(`
		INSERT INTO swipes (user_id, target_id, id, direction, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		swipe.UserID, swipe.TargetID, swipe.ID,
		swipe.Direction, time.UnixMilli(swipe.CreatedAt),
	).Exec()
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
		`SELECT user_id, direction FROM swipes WHERE target_id = ? ALLOW FILTERING`,
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
	return cdb.session.Query(`
		INSERT INTO matches (id, user_id_1, user_id_2, created_at)
		VALUES (?, ?, ?, ?)`,
		match.ID, match.UserID1, match.UserID2,
		time.UnixMilli(match.CreatedAt),
	).Exec()
}

func (db *CassandraDB) GetMatchesByUserID(userID string) ([]models.Match, error) {
	var matches []models.Match
	// query user_id_1
	iter := db.session.Query(`SELECT id, user_id_1, user_id_2, created_at FROM matches WHERE user_id_1 = ?`, userID).Iter()
	var id, uid1, uid2 string
	var t time.Time
	for iter.Scan(&id, &uid1, &uid2, &t) {
		matches = append(matches, models.Match{ID: id, UserID1: uid1, UserID2: uid2, CreatedAt: t.UnixMilli()})
	}
	if err := iter.Close(); err != nil {
		return nil, err
	}
	// query user_id_2
	iter2 := db.session.Query(`SELECT id, user_id_1, user_id_2, created_at FROM matches WHERE user_id_2 = ?`, userID).Iter()
	for iter2.Scan(&id, &uid1, &uid2, &t) {
		matches = append(matches, models.Match{ID: id, UserID1: uid1, UserID2: uid2, CreatedAt: t.UnixMilli()})
	}
	if err := iter2.Close(); err != nil {
		return nil, err
	}
	return matches, nil
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

func (db *CassandraDB) CreateMessage(msg *models.Message) error {
	t := time.UnixMilli(msg.CreatedAt)
	return db.session.Query(
		`INSERT INTO messages (match_id, created_at, id, sender_id, content) VALUES (?, ?, ?, ?, ?)`,
		msg.MatchID, t, msg.ID, msg.SenderID, msg.Content,
	).Exec()
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
	return db.session.Query(`DELETE FROM messages WHERE match_id = ?`, matchID).Exec()
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
		`SELECT id, email, username, user_type, created_at, updated_at FROM users WHERE user_type = ?`,
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
