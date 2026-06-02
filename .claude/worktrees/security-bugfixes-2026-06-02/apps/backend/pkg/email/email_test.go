package email

import (
	"context"
	"testing"
)

type mockSender struct {
	sent []Message
}

func (m *mockSender) Send(ctx context.Context, msg Message) error {
	m.sent = append(m.sent, msg)
	return nil
}

func TestNoOpSender(t *testing.T) {
	s := &NoOpSender{}
	err := s.Send(context.Background(), Message{To: "test@example.com", Subject: "test", Body: "body"})
	if err != nil {
		t.Fatalf("NoOpSender.Send() error = %v", err)
	}
}

func TestFactory_NoConfig(t *testing.T) {
	s := Factory("", "", "", "", "")
	if _, ok := s.(*NoOpSender); !ok {
		t.Error("Factory with empty config should return NoOpSender")
	}
}

func TestFactory_SMTP(t *testing.T) {
	s := Factory("smtp.example.com", "587", "user", "pass", "from@example.com")
	if _, ok := s.(*SMTPSender); !ok {
		t.Error("Factory with SMTP config should return SMTPSender")
	}
}

func TestSendPasswordReset(t *testing.T) {
	m := &mockSender{}
	err := SendPasswordReset(m, "user@example.com", "https://example.com/reset?token=abc")
	if err != nil {
		t.Fatalf("SendPasswordReset() error = %v", err)
	}
	if len(m.sent) != 1 {
		t.Fatalf("sent %d emails, want 1", len(m.sent))
	}
	if m.sent[0].To != "user@example.com" {
		t.Errorf("To = %q, want user@example.com", m.sent[0].To)
	}
	if m.sent[0].Subject != "Password Reset Request" {
		t.Errorf("Subject = %q, want Password Reset Request", m.sent[0].Subject)
	}
}

func TestSendPasswordReset_NilSender(t *testing.T) {
	err := SendPasswordReset(nil, "user@example.com", "https://example.com/reset")
	if err != nil {
		t.Fatalf("SendPasswordReset(nil) error = %v", err)
	}
}

func TestSendInvite(t *testing.T) {
	m := &mockSender{}
	err := SendInvite(m, "user@example.com", "Acme Corp", "https://example.com/invite?token=xyz")
	if err != nil {
		t.Fatalf("SendInvite() error = %v", err)
	}
	if len(m.sent) != 1 {
		t.Fatalf("sent %d emails, want 1", len(m.sent))
	}
	if m.sent[0].Subject != "You've been invited to join Acme Corp" {
		t.Errorf("Subject = %q, want invite message", m.sent[0].Subject)
	}
}

func TestSendInvite_NilSender(t *testing.T) {
	err := SendInvite(nil, "user@example.com", "Acme Corp", "https://example.com/invite")
	if err != nil {
		t.Fatalf("SendInvite(nil) error = %v", err)
	}
}

func TestSendBudgetAlert(t *testing.T) {
	m := &mockSender{}
	err := SendBudgetAlert(m, "admin@example.com", 500, 1000, 8000, 10000)
	if err != nil {
		t.Fatalf("SendBudgetAlert() error = %v", err)
	}
	if len(m.sent) != 1 {
		t.Fatalf("sent %d emails, want 1", len(m.sent))
	}
	if m.sent[0].Subject != "Budget Alert: Spending Threshold Reached" {
		t.Errorf("Subject = %q, want budget alert", m.sent[0].Subject)
	}
}

func TestSendBudgetAlert_NilSender(t *testing.T) {
	err := SendBudgetAlert(nil, "admin@example.com", 500, 1000, 8000, 10000)
	if err != nil {
		t.Fatalf("SendBudgetAlert(nil) error = %v", err)
	}
}

func TestNewSMTPSender_DefaultFrom(t *testing.T) {
	s := NewSMTPSender("smtp.example.com", "587", "noreply@example.com", "pass", "")
	if s.from != "noreply@example.com" {
		t.Errorf("from = %q, want noreply@example.com", s.from)
	}
}
