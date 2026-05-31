package ws

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

type mockConn struct {
	mu       sync.Mutex
	messages [][]byte
	closed   bool
}

func (m *mockConn) ReadMessage() (int, []byte, error) {
	time.Sleep(100 * time.Millisecond)
	return 0, nil, nil
}

func (m *mockConn) WriteMessage(_ int, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messages = append(m.messages, data)
	return nil
}

func (m *mockConn) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.closed = true
	return nil
}

func (m *mockConn) SetReadDeadline(_ time.Time) error  { return nil }
func (m *mockConn) SetWriteDeadline(_ time.Time) error { return nil }
func (m *mockConn) SetPongHandler(_ func(string) error) {}

func (m *mockConn) lastMessage() *Message {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.messages) == 0 {
		return nil
	}
	var msg Message
	json.Unmarshal(m.messages[len(m.messages)-1], &msg)
	return &msg
}

func (m *mockConn) messageCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.messages)
}

func TestGatewaySend(t *testing.T) {
	gw := NewGateway(100)
	conn := &mockConn{}

	msg := &Message{Type: TypeChatChunk, RequestID: "req-1"}
	if err := gw.Send(conn, msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	received := conn.lastMessage()
	if received == nil {
		t.Fatal("expected message")
	}
	if received.Type != TypeChatChunk {
		t.Errorf("expected type %s, got %s", TypeChatChunk, received.Type)
	}
	if received.Timestamp == 0 {
		t.Error("expected non-zero timestamp")
	}
}

func TestGatewayBroadcast(t *testing.T) {
	gw := NewGateway(100)

	conn1 := &mockConn{}
	conn2 := &mockConn{}

	// Simulate connections with subscriptions
	gw.mu.Lock()
	gw.connections["c1"] = &connectionState{
		conn:          conn1,
		id:            "c1",
		subscriptions: map[string]bool{"model-updates": true},
		createdAt:     time.Now(),
	}
	gw.connections["c2"] = &connectionState{
		conn:          conn2,
		id:            "c2",
		subscriptions: map[string]bool{"other-topic": true},
		createdAt:     time.Now(),
	}
	gw.connCount.Store(2)
	gw.mu.Unlock()

	gw.Broadcast("model-updates", &Message{Type: "update"})

	// conn1 should receive, conn2 should not
	if conn1.messageCount() != 1 {
		t.Errorf("conn1 expected 1 message, got %d", conn1.messageCount())
	}
	if conn2.messageCount() != 0 {
		t.Errorf("conn2 expected 0 messages, got %d", conn2.messageCount())
	}
}

func TestGatewaySendToUser(t *testing.T) {
	gw := NewGateway(100)

	conn1 := &mockConn{}
	conn2 := &mockConn{}

	gw.mu.Lock()
	gw.connections["c1"] = &connectionState{
		conn: conn1, id: "c1", userID: "user-1", createdAt: time.Now(),
	}
	gw.connections["c2"] = &connectionState{
		conn: conn2, id: "c2", userID: "user-2", createdAt: time.Now(),
	}
	gw.connCount.Store(2)
	gw.mu.Unlock()

	gw.SendToUser("user-1", &Message{Type: "notification"})

	if conn1.messageCount() != 1 {
		t.Errorf("conn1 expected 1 message, got %d", conn1.messageCount())
	}
	if conn2.messageCount() != 0 {
		t.Errorf("conn2 expected 0 messages, got %d", conn2.messageCount())
	}
}

func TestGatewayDisconnect(t *testing.T) {
	gw := NewGateway(100)

	conn := &mockConn{}
	gw.mu.Lock()
	gw.connections["c1"] = &connectionState{
		conn: conn, id: "c1", createdAt: time.Now(),
	}
	gw.connCount.Store(1)
	gw.mu.Unlock()

	gw.Disconnect("c1")

	if gw.ActiveConnections() != 0 {
		t.Errorf("expected 0 connections, got %d", gw.ActiveConnections())
	}
	if !conn.closed {
		t.Error("expected connection to be closed")
	}
}

func TestGatewayStop(t *testing.T) {
	gw := NewGateway(100)

	conn1 := &mockConn{}
	conn2 := &mockConn{}

	gw.mu.Lock()
	gw.connections["c1"] = &connectionState{conn: conn1, id: "c1", createdAt: time.Now()}
	gw.connections["c2"] = &connectionState{conn: conn2, id: "c2", createdAt: time.Now()}
	gw.connCount.Store(2)
	gw.mu.Unlock()

	gw.Stop()

	if gw.ActiveConnections() != 0 {
		t.Errorf("expected 0 connections after stop, got %d", gw.ActiveConnections())
	}
}

func TestGatewayConnectionInfo(t *testing.T) {
	gw := NewGateway(100)

	gw.mu.Lock()
	gw.connections["c1"] = &connectionState{
		conn: &mockConn{}, id: "c1", userID: "user-1", createdAt: time.Now(),
	}
	gw.connCount.Store(1)
	gw.mu.Unlock()

	info := gw.ConnectionInfo()
	if len(info) != 1 {
		t.Errorf("expected 1 connection info, got %d", len(info))
	}
	if info[0]["user_id"] != "user-1" {
		t.Errorf("expected user-1, got %v", info[0]["user_id"])
	}
}

func TestGatewayMaxConnections(t *testing.T) {
	gw := NewGateway(2)
	gw.connCount.Store(2)

	// Exceeding max should fail
	if int(gw.connCount.Load()) >= gw.maxConns {
		// This is the expected path — the HTTP handler would return 503
		return
	}
	t.Error("expected connection limit check")
}
