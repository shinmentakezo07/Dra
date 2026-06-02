// Package ws provides WebSocket gateway for real-time bidirectional streaming
// with automatic SSE fallback. Inspired by CLIProxyAPI's wsrelay package.
package ws

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// Message types.
const (
	TypeChatRequest  = "chat.request"
	TypeChatChunk    = "chat.chunk"
	TypeChatComplete = "chat.complete"
	TypeChatError    = "chat.error"
	TypePing         = "ping"
	TypePong         = "pong"
	TypeSubscribe    = "subscribe"
	TypeUnsubscribe  = "unsubscribe"
	TypeStatus       = "status"
)

// Message represents a WebSocket message.
type Message struct {
	Type      string          `json:"type"`
	ID        string          `json:"id,omitempty"`
	RequestID string          `json:"request_id,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	Error     string          `json:"error,omitempty"`
	Timestamp int64           `json:"timestamp"`
}

// Conn represents a WebSocket connection (abstraction for testing).
type Conn interface {
	ReadMessage() (int, []byte, error)
	WriteMessage(int, []byte) error
	Close() error
	SetReadDeadline(t time.Time) error
	SetWriteDeadline(t time.Time) error
	SetPongHandler(func(string) error)
}

// Handler processes incoming WebSocket messages.
type Handler func(conn Conn, msg *Message) error

// Gateway manages WebSocket connections.
type Gateway struct {
	mu          sync.RWMutex
	connections map[string]*connectionState
	handlers    map[string]Handler
	maxConns    int
	maxPerUser  int // Bug #47: per-user connection limit
	pingInterval time.Duration
	pongTimeout  time.Duration
	connCount    atomic.Int64
}

type connectionState struct {
	conn      Conn
	id        string
	userID    string
	keyID     string
	subscriptions map[string]bool
	lastPing  time.Time
	createdAt time.Time
}

// NewGateway creates a new WebSocket gateway.
func NewGateway(maxConns int) *Gateway {
	g := &Gateway{
		connections:  make(map[string]*connectionState),
		handlers:     make(map[string]Handler),
		maxConns:     maxConns,
		maxPerUser:   10, // Bug #47: default per-user connection limit
		pingInterval: 30 * time.Second,
		pongTimeout:  10 * time.Second,
	}

	// Register default handlers
	g.handlers[TypePing] = func(conn Conn, msg *Message) error {
		return g.Send(conn, &Message{Type: TypePong, Timestamp: time.Now().UnixMilli()})
	}
	// Bug #48: pong handler updates lastPing so pingLoop knows the peer is alive
	g.handlers[TypePong] = func(conn Conn, msg *Message) error {
		g.mu.Lock()
		for _, cs := range g.connections {
			if cs.conn == conn {
				cs.lastPing = time.Now()
				break
			}
		}
		g.mu.Unlock()
		return nil
	}

	return g
}

// RegisterHandler registers a handler for a message type.
func (g *Gateway) RegisterHandler(msgType string, handler Handler) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.handlers[msgType] = handler
}

// HandleHTTP upgrades an HTTP connection to WebSocket.
func (g *Gateway) HandleHTTP(w http.ResponseWriter, r *http.Request, conn Conn, userID, keyID string) error {
	if int(g.connCount.Load()) >= g.maxConns {
		http.Error(w, "connection limit reached", http.StatusServiceUnavailable)
		return fmt.Errorf("connection limit reached")
	}

	// Bug #47: check per-user connection limit
	if userID != "" && g.maxPerUser > 0 {
		g.mu.RLock()
		userConns := 0
		for _, cs := range g.connections {
			if cs.userID == userID {
				userConns++
			}
		}
		g.mu.RUnlock()
		if userConns >= g.maxPerUser {
			http.Error(w, "per-user connection limit reached", http.StatusServiceUnavailable)
			return fmt.Errorf("per-user connection limit reached for user %s", userID)
		}
	}

	connID := fmt.Sprintf("ws-%d", time.Now().UnixNano())
	cs := &connectionState{
		conn:          conn,
		id:            connID,
		userID:        userID,
		keyID:         keyID,
		subscriptions: make(map[string]bool),
		lastPing:      time.Now(),
		createdAt:     time.Now(),
	}

	g.mu.Lock()
	g.connections[connID] = cs
	g.mu.Unlock()
	g.connCount.Add(1)

	slog.Info("ws_connected", "conn_id", connID, "user_id", userID)

	// Start ping/pong handler
	go g.pingLoop(cs)

	// Read messages
	go g.readLoop(cs)

	return nil
}

// Send sends a message to a connection.
func (g *Gateway) Send(conn Conn, msg *Message) error {
	msg.Timestamp = time.Now().UnixMilli()
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}
	return conn.WriteMessage(1, data) // TextMessage = 1
}

// Broadcast sends a message to all connections subscribed to a topic.
func (g *Gateway) Broadcast(topic string, msg *Message) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	for _, cs := range g.connections {
		if cs.subscriptions[topic] {
			if err := g.Send(cs.conn, msg); err != nil {
				slog.Warn("ws_broadcast_error", "conn_id", cs.id, "error", err.Error())
			}
		}
	}
}

// SendToUser sends a message to all connections for a user.
func (g *Gateway) SendToUser(userID string, msg *Message) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	for _, cs := range g.connections {
		if cs.userID == userID {
			if err := g.Send(cs.conn, msg); err != nil {
				slog.Warn("ws_send_to_user_error", "conn_id", cs.id, "error", err.Error())
			}
		}
	}
}

// Disconnect disconnects a connection.
func (g *Gateway) Disconnect(connID string) {
	g.mu.Lock()
	cs, ok := g.connections[connID]
	if ok {
		delete(g.connections, connID)
	}
	g.mu.Unlock()

	if ok {
		cs.conn.Close()
		g.connCount.Add(-1)
		slog.Info("ws_disconnected", "conn_id", connID)
	}
}

// ActiveConnections returns the number of active connections.
func (g *Gateway) ActiveConnections() int {
	return int(g.connCount.Load())
}

// ConnectionInfo returns info about all active connections.
func (g *Gateway) ConnectionInfo() []map[string]any {
	g.mu.RLock()
	defer g.mu.RUnlock()

	var result []map[string]any
	for _, cs := range g.connections {
		result = append(result, map[string]any{
			"id":         cs.id,
			"user_id":    cs.userID,
			"key_id":     cs.keyID,
			"created_at": cs.createdAt,
			"topics":     cs.subscriptions,
		})
	}
	return result
}

// Stop stops the gateway and disconnects all clients.
func (g *Gateway) Stop() {
	g.mu.Lock()
	conns := make([]*connectionState, 0, len(g.connections))
	for _, cs := range g.connections {
		conns = append(conns, cs)
	}
	g.connections = make(map[string]*connectionState)
	g.mu.Unlock()

	for _, cs := range conns {
		cs.conn.Close()
	}
	g.connCount.Store(0)
}

func (g *Gateway) readLoop(cs *connectionState) {
	defer g.Disconnect(cs.id)

	for {
		if err := cs.conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
			return
		}

		_, data, err := cs.conn.ReadMessage()
		if err != nil {
			return
		}

		var msg Message
		if err := json.Unmarshal(data, &msg); err != nil {
			g.Send(cs.conn, &Message{
				Type:      TypeChatError,
				Error:     "invalid message format",
				Timestamp: time.Now().UnixMilli(),
			})
			continue
		}

		// Handle subscriptions
		switch msg.Type {
		case TypeSubscribe:
			var topic string
			json.Unmarshal(msg.Payload, &topic)
			if topic != "" {
				g.mu.Lock()
				cs.subscriptions[topic] = true
				g.mu.Unlock()
			}
			continue
		case TypeUnsubscribe:
			var topic string
			json.Unmarshal(msg.Payload, &topic)
			if topic != "" {
				g.mu.Lock()
				delete(cs.subscriptions, topic)
				g.mu.Unlock()
			}
			continue
		}

		// Dispatch to handler
		g.mu.RLock()
		handler, ok := g.handlers[msg.Type]
		g.mu.RUnlock()

		if !ok {
			g.Send(cs.conn, &Message{
				Type:      TypeChatError,
				Error:     fmt.Sprintf("unknown message type: %s", msg.Type),
				Timestamp: time.Now().UnixMilli(),
			})
			continue
		}

		if err := handler(cs.conn, &msg); err != nil {
			g.Send(cs.conn, &Message{
				Type:      TypeChatError,
				RequestID: msg.RequestID,
				Error:     err.Error(),
				Timestamp: time.Now().UnixMilli(),
			})
		}
	}
}

func (g *Gateway) pingLoop(cs *connectionState) {
	ticker := time.NewTicker(g.pingInterval)
	defer ticker.Stop()

	for range ticker.C {
		g.mu.RLock()
		_, exists := g.connections[cs.id]
		g.mu.RUnlock()
		if !exists {
			return
		}

		// Bug #48: check if pong was received since last ping (not just if ping was sent)
		if time.Since(cs.lastPing) > g.pingInterval+g.pongTimeout {
			g.Disconnect(cs.id)
			return
		}

		if err := g.Send(cs.conn, &Message{Type: TypePing}); err != nil {
			g.Disconnect(cs.id)
			return
		}
		// Note: lastPing is updated by the pong handler in readLoop, not here.
		// This ensures we only consider the connection alive if the peer responded.
	}
}

// SSEFallback provides SSE streaming as a fallback when WebSocket is not available.
type SSEFallback struct {
	gateway *Gateway
}

// NewSSEFallback creates an SSE fallback handler.
func NewSSEFallback(gw *Gateway) *SSEFallback {
	return &SSEFallback{gateway: gw}
}

// HandleSSE handles SSE streaming requests.
func (s *SSEFallback) HandleSSE(w http.ResponseWriter, r *http.Request, requestID string) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Request-ID", requestID)

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send initial connection event
	fmt.Fprintf(w, "event: connected\ndata: {\"request_id\":\"%s\"}\n\n", requestID)
	flusher.Flush()

	// Keep connection alive until context is done
	ctx := r.Context()
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			fmt.Fprintf(w, "event: done\ndata: {}\n\n")
			flusher.Flush()
			return
		case <-ticker.C:
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

// SendSSEEvent sends an SSE event to a response writer.
func SendSSEEvent(w http.ResponseWriter, flusher http.Flusher, event, requestID string, data any) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	_, err = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, jsonData)
	if err != nil {
		return err
	}

	flusher.Flush()
	return nil
}
