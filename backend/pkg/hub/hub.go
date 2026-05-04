// Package hub manages WebSocket connections grouped into match rooms.
// Each match room has a set of connected clients; broadcasting to a room
// fans out a message to every connected client in that room.
package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

const (
	WriteWait       = 10 * time.Second
	PongWait        = 60 * time.Second
	PingPeriod      = (PongWait * 9) / 10
	broadcastTopic  = "jobswiper:chat:broadcast"
	redisBufferSize = 512
)

// Broadcast is a message to fan out to every client in a room.
type Broadcast struct {
	MatchID string
	Data    []byte
}

// Client is a single WebSocket connection registered to a room.
type Client struct {
	MatchID string
	Conn    *websocket.Conn
	Send    chan []byte
}

// Hub routes messages between WebSocket clients.
type Hub struct {
	mu         sync.RWMutex
	rooms      map[string]map[*Client]struct{}
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan Broadcast
	local      chan Broadcast
	rdb        *redis.Client
	ctx        context.Context
	cancel     context.CancelFunc
	origin     string
}

type redisEnvelope struct {
	MatchID string          `json:"match_id"`
	Data    json.RawMessage `json:"data"`
	Origin  string          `json:"origin"`
}

func New(redisAddr string) *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	hostname, _ := os.Hostname()
	var rdb *redis.Client
	if redisAddr != "" {
		rdb = redis.NewClient(&redis.Options{
			Addr:         redisAddr,
			DialTimeout:  3 * time.Second,
			ReadTimeout:  2 * time.Second,
			WriteTimeout: 2 * time.Second,
		})
	}
	return &Hub{
		rooms:      make(map[string]map[*Client]struct{}),
		Register:   make(chan *Client, 256),
		Unregister: make(chan *Client, 256),
		Broadcast:  make(chan Broadcast, 512),
		local:      make(chan Broadcast, redisBufferSize),
		rdb:        rdb,
		ctx:        ctx,
		cancel:     cancel,
		origin:     fmt.Sprintf("%s-%d", hostname, time.Now().UnixNano()),
	}
}

func (h *Hub) Run() {
	if h.rdb != nil {
		go h.subscribeRedis()
	}

	for {
		select {
		case <-h.ctx.Done():
			if h.rdb != nil {
				_ = h.rdb.Close()
			}
			return

		case c := <-h.Register:
			h.mu.Lock()
			if h.rooms[c.MatchID] == nil {
				h.rooms[c.MatchID] = make(map[*Client]struct{})
			}
			h.rooms[c.MatchID][c] = struct{}{}
			h.mu.Unlock()

		case c := <-h.Unregister:
			h.mu.Lock()
			if room, ok := h.rooms[c.MatchID]; ok {
				if _, exists := room[c]; exists {
					delete(room, c)
					close(c.Send)
				}
				if len(room) == 0 {
					delete(h.rooms, c.MatchID)
				}
			}
			h.mu.Unlock()

		case b := <-h.Broadcast:
			if err := h.publishRedis(b); err != nil {
				log.Printf("hub redis publish failed, falling back to local broadcast: %v", err)
			}
			h.deliver(b)

		case b := <-h.local:
			h.deliver(b)
		}
	}
}

func (h *Hub) Close() {
	h.cancel()
}

func (h *Hub) publishRedis(b Broadcast) error {
	if h.rdb == nil {
		return nil
	}
	payload, err := json.Marshal(redisEnvelope{
		MatchID: b.MatchID,
		Data:    json.RawMessage(b.Data),
		Origin:  h.origin,
	})
	if err != nil {
		return err
	}
	return h.rdb.Publish(h.ctx, broadcastTopic, payload).Err()
}

func (h *Hub) subscribeRedis() {
	pubsub := h.rdb.Subscribe(h.ctx, broadcastTopic)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for {
		select {
		case <-h.ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var envelope redisEnvelope
			if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
				log.Printf("hub redis message decode failed: %v", err)
				continue
			}
			if envelope.Origin == h.origin {
				continue
			}
			h.local <- Broadcast{MatchID: envelope.MatchID, Data: []byte(envelope.Data)}
		}
	}
}

func (h *Hub) deliver(b Broadcast) {
	h.mu.RLock()
	room := h.rooms[b.MatchID]
	h.mu.RUnlock()
	for c := range room {
		select {
		case c.Send <- b.Data:
		default:
			h.Unregister <- c
		}
	}
}
