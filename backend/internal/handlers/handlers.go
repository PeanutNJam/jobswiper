package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jobswiper/backend/internal/db"
	"github.com/jobswiper/backend/internal/models"
	"github.com/jobswiper/backend/pkg/auth"
	"github.com/jobswiper/backend/pkg/hub"
	"github.com/jobswiper/backend/pkg/matchqueue"
	"github.com/jobswiper/backend/pkg/push"
	"github.com/jobswiper/backend/pkg/storage"
	"golang.org/x/crypto/bcrypt"
)

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type Handler struct {
	db        *db.CassandraDB
	jwtSecret string
	push      *push.Client
	matchQ    *matchqueue.Client
	storage   *storage.S3Client
	hub       *hub.Hub
}

func NewHandler(database *db.CassandraDB, jwtSecret string, mq *matchqueue.Client, s3 *storage.S3Client, h *hub.Hub) *Handler {
	return &Handler{
		db:        database,
		jwtSecret: jwtSecret,
		push:      push.NewClient(),
		matchQ:    mq,
		storage:   s3,
		hub:       h,
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "JobSwiper API"})
}

// ── Auth ───────────────────────────────────────────────────────────────────

type registerRequest struct {
	Email    string `json:"email"     binding:"required"`
	Username string `json:"username"  binding:"required"`
	Password string `json:"password"  binding:"required,min=6"`
	UserType string `json:"user_type" binding:"required,oneof=job_seeker employer"`
}

func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if existing, _, err := h.db.GetUserByEmail(req.Email); err == nil && existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	now := time.Now().UnixMilli()
	user := &models.User{
		ID:        uuid.New().String(),
		Email:     req.Email,
		Username:  req.Username,
		UserType:  req.UserType,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := h.db.CreateUser(user, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	if err := h.db.CreateProfile(&models.Profile{UserID: user.ID, UpdatedAt: now}); err != nil {
		log.Printf("failed to create profile for user %s: %v", user.ID, err)
	}

	token, err := auth.GenerateToken(user.ID, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"token": token, "user": user, "expiresIn": 604800})
}

type loginRequest struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, hash, err := h.db.GetUserByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token, err := auth.GenerateToken(user.ID, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token, "user": user, "expiresIn": 604800})
}

func (h *Handler) GetMe(c *gin.Context) {
	userID := c.GetString("userID")

	user, err := h.db.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// ── Profile ────────────────────────────────────────────────────────────────

func (h *Handler) GetProfile(c *gin.Context) {
	userID := c.GetString("userID")

	profile, err := h.db.GetProfileByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

type updateProfileRequest struct {
	Name        *string   `json:"name"`
	Description *string   `json:"description"`
	PhotoURL    *string   `json:"photo_url"`
	Location    *string   `json:"location"`
	Skills      *[]string `json:"skills"`
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userID")

	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing, err := h.db.GetProfileByUserID(userID)
	if err != nil {
		// If no existing profile exists yet, proceed with empty defaults.
		existing = &models.Profile{UserID: userID}
	}

	profile := &models.Profile{
		UserID:      userID,
		Name:        existing.Name,
		Description: existing.Description,
		PhotoURL:    existing.PhotoURL,
		Location:    existing.Location,
		Skills:      existing.Skills,
		UpdatedAt:   time.Now().UnixMilli(),
	}

	if req.Name != nil {
		profile.Name = *req.Name
	}
	if req.Description != nil {
		profile.Description = *req.Description
	}
	if req.PhotoURL != nil {
		profile.PhotoURL = *req.PhotoURL
		log.Printf("[UPDATE] userID=%s photoURL=%s", userID, *req.PhotoURL)
	}
	if req.Location != nil {
		profile.Location = *req.Location
	}
	if req.Skills != nil {
		profile.Skills = *req.Skills
	}

	if err := h.db.UpdateProfile(profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// ── Swipes ─────────────────────────────────────────────────────────────────

type createSwipeRequest struct {
	TargetID  string `json:"target_id" binding:"required"`
	Direction string `json:"direction" binding:"required,oneof=right left"`
}

func (h *Handler) CreateSwipe(c *gin.Context) {
	userID := c.GetString("userID")

	var req createSwipeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	swipe := &models.Swipe{
		ID:        uuid.New().String(),
		UserID:    userID,
		TargetID:  req.TargetID,
		Direction: req.Direction,
		CreatedAt: time.Now().UnixMilli(),
	}

	if err := h.db.CreateSwipe(swipe); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record swipe"})
		return
	}

	isMatch := false
	if req.Direction == "right" {
		isMatch = h.detectAndCreateMatch(c.Request.Context(), userID, req.TargetID)
	}

	c.JSON(http.StatusCreated, gin.H{"swipe": swipe, "match": isMatch})
}

func (h *Handler) GetSwipes(c *gin.Context) {
	userID := c.GetString("userID")

	swipes, err := h.db.GetSwipesByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get swipes"})
		return
	}

	if swipes == nil {
		swipes = []models.Swipe{}
	}

	c.JSON(http.StatusOK, gin.H{"swipes": swipes})
}

// ── Device token ───────────────────────────────────────────────────────────

type saveDeviceTokenRequest struct {
	Token string `json:"token" binding:"required"`
}

func (h *Handler) SaveDeviceToken(c *gin.Context) {
	userID := c.GetString("userID")

	var req saveDeviceTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.SaveDeviceToken(userID, req.Token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save device token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ── Push helpers ───────────────────────────────────────────────────────────

// detectAndCreateMatch uses Redis SADD to atomically detect a mutual right swipe.
// Exactly one of the two concurrent requests will receive isMatch=true from Redis
// and become responsible for writing the match row and sending notifications.
// If Redis is unavailable the call falls back to a direct Cassandra read, which
// has the original race window but keeps the endpoint functional.
func (h *Handler) detectAndCreateMatch(ctx context.Context, userID, targetID string) bool {
	won, err := h.matchQ.RecordRightSwipe(ctx, userID, targetID)
	if err != nil {
		log.Printf("matchqueue unavailable, falling back to DB check: %v", err)
		// Degraded path — still subject to the race condition described in the
		// matchqueue package docs, but won't take the endpoint down.
		mutual, dbErr := h.db.GetSwipe(targetID, userID)
		won = dbErr == nil && mutual.Direction == "right"
	}

	if !won {
		return false
	}

	match := &models.Match{
		ID:        uuid.New().String(),
		UserID1:   userID,
		UserID2:   targetID,
		CreatedAt: time.Now().UnixMilli(),
	}
	if err := h.db.CreateMatch(match); err != nil {
		log.Printf("failed to create match (%s, %s): %v", userID, targetID, err)
		return false
	}

	go h.notifyMatch(userID, targetID)
	return true
}

// ── Upload URL ─────────────────────────────────────────────────────────────

func (h *Handler) GetUploadURL(c *gin.Context) {
	userID := c.GetString("userID")
	contentType := c.DefaultQuery("content_type", "image/jpeg")
	// validate content_type is one of image/jpeg, image/png, image/webp
	allowed := map[string]bool{"image/jpeg": true, "image/png": true, "image/webp": true}
	if !allowed[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported content type"})
		return
	}

	ext := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
	key := fmt.Sprintf("profiles/%s%s", userID, ext[contentType])

	if h.storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "storage not configured"})
		return
	}

	url, err := h.storage.PresignPut(c.Request.Context(), key, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate upload url"})
		return
	}

	publicURL := h.storage.PublicURL(key)
	log.Printf("[UPLOAD] userID=%s key=%s uploadURL=%s publicURL=%s", userID, key, url, publicURL)

	c.JSON(http.StatusOK, gin.H{
		"upload_url": url,
		"public_url": publicURL,
	})
}

// ── Candidates ─────────────────────────────────────────────────────────────

func (h *Handler) GetCandidates(c *gin.Context) {
	employerID := c.GetString("userID")

	candidateIDs, err := h.db.GetRightSwipesByTarget(employerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get candidates"})
		return
	}

	type candidateResult struct {
		UserID      string `json:"user_id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		PhotoURL    string `json:"photo_url,omitempty"`
		Location    string `json:"location"`
	}

	var results []candidateResult
	for _, uid := range candidateIDs {
		p, err := h.db.GetProfileByUserID(uid)
		if err != nil {
			continue
		}
		results = append(results, candidateResult{
			UserID:      uid,
			Name:        p.Name,
			Description: p.Description,
			PhotoURL:    p.PhotoURL,
			Location:    p.Location,
		})
	}
	if results == nil {
		results = []candidateResult{}
	}

	c.JSON(http.StatusOK, gin.H{"candidates": results})
}

// ── Matches ────────────────────────────────────────────────────────────────

func (h *Handler) GetMatches(c *gin.Context) {
	userID := c.GetString("userID")

	matches, err := h.db.GetMatchesByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get matches"})
		return
	}

	type matchResult struct {
		MatchID        string `json:"match_id"`
		OtherUserID    string `json:"other_user_id"`
		OtherUserName  string `json:"other_user_name"`
		OtherUserPhoto string `json:"other_user_photo,omitempty"`
		CreatedAt      int64  `json:"created_at"`
		LastMessage    string `json:"last_message,omitempty"`
		LastMessageAt  int64  `json:"last_message_at,omitempty"`
	}

	var results []matchResult
	for _, m := range matches {
		otherID := m.UserID2
		if m.UserID2 == userID {
			otherID = m.UserID1
		}
		r := matchResult{MatchID: m.ID, OtherUserID: otherID, CreatedAt: m.CreatedAt}
		if p, err := h.db.GetProfileByUserID(otherID); err == nil {
			r.OtherUserName = p.Name
			r.OtherUserPhoto = p.PhotoURL
		}
		if messages, err := h.db.GetMessagesByMatchID(m.ID); err == nil && len(messages) > 0 {
			last := messages[len(messages)-1]
			r.LastMessage = last.Content
			r.LastMessageAt = last.CreatedAt
		}
		results = append(results, r)
	}
	sort.Slice(results, func(i, j int) bool {
		left := results[i].CreatedAt
		if results[i].LastMessageAt > 0 {
			left = results[i].LastMessageAt
		}
		right := results[j].CreatedAt
		if results[j].LastMessageAt > 0 {
			right = results[j].LastMessageAt
		}
		return left > right
	})
	if results == nil {
		results = []matchResult{}
	}
	c.JSON(http.StatusOK, gin.H{"matches": results})
}

func (h *Handler) DeleteMatch(c *gin.Context) {
	userID := c.GetString("userID")
	matchID := c.Param("matchId")

	match, err := h.db.GetMatchByID(matchID)
	if err != nil || (match.UserID1 != userID && match.UserID2 != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	if err := h.db.DeleteMessagesByMatchID(matchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete messages"})
		return
	}
	if err := h.db.DeleteMatchByID(matchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete match"})
		return
	}

	c.Status(http.StatusNoContent)
}

// ── Messages ───────────────────────────────────────────────────────────────

func (h *Handler) GetMessages(c *gin.Context) {
	userID := c.GetString("userID")
	matchID := c.Param("matchId")

	match, err := h.db.GetMatchByID(matchID)
	if err != nil || (match.UserID1 != userID && match.UserID2 != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	messages, err := h.db.GetMessagesByMatchID(matchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get messages"})
		return
	}
	if messages == nil {
		messages = []models.Message{}
	}
	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

type sendMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

func (h *Handler) SendMessage(c *gin.Context) {
	userID := c.GetString("userID")
	matchID := c.Param("matchId")

	match, err := h.db.GetMatchByID(matchID)
	if err != nil || (match.UserID1 != userID && match.UserID2 != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	var req sendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := &models.Message{
		ID:        uuid.New().String(),
		MatchID:   matchID,
		SenderID:  userID,
		Content:   req.Content,
		CreatedAt: time.Now().UnixMilli(),
	}
	if err := h.db.CreateMessage(msg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send message"})
		return
	}

	if data, err := json.Marshal(msg); err == nil {
		h.hub.Broadcast <- hub.Broadcast{MatchID: matchID, Data: data}
	}

	c.JSON(http.StatusCreated, msg)
}

// ChatWS upgrades a connection to WebSocket and subscribes it to the match room.
// New messages (sent via POST /matches/:matchId/messages) are pushed to all
// subscribers in real time.
func (h *Handler) ChatWS(c *gin.Context) {
	matchID := c.Param("matchId")
	userID := c.GetString("userID")

	match, err := h.db.GetMatchByID(matchID)
	if err != nil || (match.UserID1 != userID && match.UserID2 != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}

	client := &hub.Client{
		MatchID: matchID,
		Conn:    conn,
		Send:    make(chan []byte, 256),
	}
	h.hub.Register <- client

	// write pump — forwards hub messages to the WebSocket
	go func() {
		ticker := time.NewTicker(hub.PingPeriod)
		defer func() {
			ticker.Stop()
			conn.Close()
		}()
		for {
			select {
			case msg, ok := <-client.Send:
				conn.SetWriteDeadline(time.Now().Add(hub.WriteWait))
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(hub.WriteWait))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// read pump — keeps the connection alive and detects client disconnect
	defer func() {
		h.hub.Unregister <- client
		conn.Close()
	}()
	conn.SetReadLimit(512)
	conn.SetReadDeadline(time.Now().Add(hub.PongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(hub.PongWait))
		return nil
	})
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

// ── Discover ───────────────────────────────────────────────────────────────

func (h *Handler) GetDiscover(c *gin.Context) {
	userID := c.GetString("userID")

	me, err := h.db.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	targetType := "employer"
	if me.UserType == "employer" {
		targetType = "job_seeker"
	}

	candidates, err := h.db.GetUsersByType(targetType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get users"})
		return
	}

	swipedIDs, _ := h.db.GetSwipedTargetIDs(userID)
	swiped := make(map[string]bool, len(swipedIDs))
	for _, id := range swipedIDs {
		swiped[id] = true
	}

	type discoverUser struct {
		UserID      string   `json:"user_id"`
		Username    string   `json:"username"`
		Name        string   `json:"name"`
		Description string   `json:"description"`
		PhotoURL    string   `json:"photo_url,omitempty"`
		Location    string   `json:"location"`
		Skills      []string `json:"skills"`
	}

	var results []discoverUser
	for _, u := range candidates {
		if swiped[u.ID] || u.ID == userID {
			continue
		}
		du := discoverUser{UserID: u.ID, Username: u.Username}
		if p, err := h.db.GetProfileByUserID(u.ID); err == nil {
			du.Name = p.Name
			du.Description = p.Description
			du.PhotoURL = p.PhotoURL
			du.Location = p.Location
			du.Skills = p.Skills
		}
		if du.Name == "" {
			du.Name = u.Username
		}
		results = append(results, du)
	}
	if results == nil {
		results = []discoverUser{}
	}
	c.JSON(http.StatusOK, gin.H{"users": results})
}

// notifyMatch runs in a goroutine — push failures never block the swipe response.
func (h *Handler) notifyMatch(userID1, userID2 string) {
	p1, err1 := h.db.GetProfileByUserID(userID1)
	p2, err2 := h.db.GetProfileByUserID(userID2)

	name1, name2 := "someone", "someone"
	if err1 == nil && p1.Name != "" {
		name1 = p1.Name
	}
	if err2 == nil && p2.Name != "" {
		name2 = p2.Name
	}

	var msgs []push.Message

	if err2 == nil && p2.DeviceToken != "" {
		msgs = append(msgs, push.Message{
			To:    p2.DeviceToken,
			Title: "🎉 It's a match!",
			Body:  fmt.Sprintf("You matched with %s", name1),
			Data:  map[string]string{"type": "match", "user_id": userID1},
		})
	}
	if err1 == nil && p1.DeviceToken != "" {
		msgs = append(msgs, push.Message{
			To:    p1.DeviceToken,
			Title: "🎉 It's a match!",
			Body:  fmt.Sprintf("You matched with %s", name2),
			Data:  map[string]string{"type": "match", "user_id": userID2},
		})
	}

	if err := h.push.Send(msgs); err != nil {
		log.Printf("push notification failed for match (%s, %s): %v", userID1, userID2, err)
	}
}
