package email

import (
	"context"
	"fmt"
)

// Message represents an email to be sent.
type Message struct {
	To      string
	Subject string
	Body    string
	HTML    string
}

// Sender is the interface for sending emails.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}

// NoOpSender is a sender that does nothing.
type NoOpSender struct{}

func (n *NoOpSender) Send(ctx context.Context, msg Message) error { return nil }

// Factory creates a Sender based on configuration.
func Factory(smtpHost, smtpPort, smtpUser, smtpPass, fromAddr string) Sender {
	if smtpHost != "" && smtpPort != "" && smtpUser != "" && smtpPass != "" {
		return NewSMTPSender(smtpHost, smtpPort, smtpUser, smtpPass, fromAddr)
	}
	return &NoOpSender{}
}

// SendPasswordReset sends a password reset email.
func SendPasswordReset(s Sender, to, resetURL string) error {
	if s == nil {
		return nil
	}
	return s.Send(context.Background(), Message{
		To:      to,
		Subject: "Password Reset Request",
		Body:    fmt.Sprintf("Click the link to reset your password: %s", resetURL),
		HTML:    fmt.Sprintf(`<p>Click <a href="%s">here</a> to reset your password.</p>`, resetURL),
	})
}

// SendInvite sends an organization invite email.
func SendInvite(s Sender, to, orgName, inviteURL string) error {
	if s == nil {
		return nil
	}
	return s.Send(context.Background(), Message{
		To:      to,
		Subject: fmt.Sprintf("You've been invited to join %s", orgName),
		Body:    fmt.Sprintf("You've been invited to join %s. Click here to accept: %s", orgName, inviteURL),
		HTML:    fmt.Sprintf(`<p>You've been invited to join <strong>%s</strong>. <a href="%s">Click here to accept</a>.</p>`, orgName, inviteURL),
	})
}

// SendBudgetAlert sends a budget threshold alert email.
func SendBudgetAlert(s Sender, to string, dailySpent, dailyBudget, monthlySpent, monthlyBudget int) error {
	if s == nil {
		return nil
	}
	body := fmt.Sprintf("Budget Alert:\n\nDaily: %d / %d\nMonthly: %d / %d", dailySpent, dailyBudget, monthlySpent, monthlyBudget)
	return s.Send(context.Background(), Message{
		To:      to,
		Subject: "Budget Alert: Spending Threshold Reached",
		Body:    body,
		HTML:    fmt.Sprintf("<p>Budget Alert:</p><ul><li>Daily: %d / %d</li><li>Monthly: %d / %d</li></ul>", dailySpent, dailyBudget, monthlySpent, monthlyBudget),
	})
}
