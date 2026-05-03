// Package hub manages WebSocket connections grouped into match rooms.
// Each match room has a set of connected clients; broadcasting to a room
// fans out a message to every connected client in that room.
package hub

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	WriteWait  = 10 * time.Second
	PongWait   = 60 * time.Second
	PingPeriod = (PongWait * 9) / 10
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
}

func New() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]struct{}),
		Register:   make(chan *Client, 256),
		Unregister: make(chan *Client, 256),
		Broadcast:  make(chan Broadcast, 512),
	}
}

func (h *Hub) Run() {
	for {
		select {
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
			h.mu.RLock()
			room := h.rooms[b.MatchID]
			h.mu.RUnlock()
			for c := range room {
				select {
				case c.Send <- b.Data:
				default:
					// slow client — drop it
					h.Unregister <- c
				}
			}
		}
	}
}
