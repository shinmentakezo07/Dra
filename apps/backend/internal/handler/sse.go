package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"
)

// NotificationHub manages SSE connections.
type NotificationHub struct {
	mu          sync.RWMutex
	clients     map[string][]chan SSEEvent
	broadcastCh chan SSEEvent
}

type SSEEvent struct {
	UserID  string          `json:"-"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
	Time    time.Time       `json:"time"`
}

// NewNotificationHub creates a new SSE hub.
func NewNotificationHub() *NotificationHub {
	hub := &NotificationHub{
		clients:     make(map[string][]chan SSEEvent),
		broadcastCh: make(chan SSEEvent, 100),
	}
	go hub.broadcast()
	return hub
}

func (hub *NotificationHub) broadcast() {
	for event := range hub.broadcastCh {
		hub.mu.RLock()
		clients := hub.clients[event.UserID]
		hub.mu.RUnlock()
		for _, ch := range clients {
			select {
			case ch <- event:
			default:
			}
		}
	}
}

// Subscribe adds a client channel for a user.
func (hub *NotificationHub) Subscribe(userID string) chan SSEEvent {
	ch := make(chan SSEEvent, 10)
	hub.mu.Lock()
	hub.clients[userID] = append(hub.clients[userID], ch)
	hub.mu.Unlock()
	return ch
}

// Unsubscribe removes a client channel.
func (hub *NotificationHub) Unsubscribe(userID string, ch chan SSEEvent) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	list := hub.clients[userID]
	for i, c := range list {
		if c == ch {
			hub.clients[userID] = append(list[:i], list[i+1:]...)
			close(ch)
			break
		}
	}
}

// Send delivers an event to a specific user.
func (hub *NotificationHub) Send(userID, eventType string, payload interface{}) {
	data, _ := json.Marshal(payload)
	select {
	case hub.broadcastCh <- SSEEvent{UserID: userID, Type: eventType, Payload: data, Time: time.Now()}:
	default:
	}
}

// NotificationsStream handles SSE connections for real-time notifications.
func (h *Handler) NotificationsStream(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	if h.notificationHub == nil {
		response.Error(w, 500, "Notification hub not available")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		response.Error(w, 500, "Streaming unsupported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	ch := h.notificationHub.Subscribe(u.ID)
	defer h.notificationHub.Unsubscribe(u.ID, ch)

	// Send initial connected event
	fmt.Fprintf(w, "data: %s\n\n", `{"type":"connected"}`)
	flusher.Flush()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	done := r.Context().Done()
	for {
		select {
		case event, more := <-ch:
			if !more {
				return
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "data: %s\n\n", string(data))
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(w, "data: %s\n\n", `{"type":"ping"}`)
			flusher.Flush()
		case <-done:
			return
		}
	}
}

// SendNotification is a helper to emit a notification to a user.
func (h *Handler) SendNotification(userID, eventType string, payload interface{}) {
	if h.notificationHub != nil {
		h.notificationHub.Send(userID, eventType, payload)
	}
}
