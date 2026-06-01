package email

import (
	"context"
	"fmt"
	"net/mail"
	"net/smtp"
	"strings"
)

// SMTPSender sends emails via SMTP.
type SMTPSender struct {
	host     string
	port     string
	username string
	password string
	from     string
}

// NewSMTPSender creates a new SMTP email sender.
func NewSMTPSender(host, port, username, password, from string) *SMTPSender {
	if from == "" {
		from = username
	}
	return &SMTPSender{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
	}
}

// Send sends an email via SMTP.
func (s *SMTPSender) Send(ctx context.Context, msg Message) error {
	// Validate header fields BEFORE formatting into wire bytes. Without this,
	// an attacker who controls msg.To (signup form, password-reset request)
	// can inject "To: victim@x\r\nBcc: attacker@y" and have the SMTP server
	// accept the message with attacker-supplied Bcc.
	if _, err := mail.ParseAddress(msg.To); err != nil {
		return fmt.Errorf("invalid To address: %w", err)
	}
	if strings.ContainsAny(msg.Subject, "\r\n") {
		return fmt.Errorf("invalid Subject: must not contain CR or LF")
	}

	addr := fmt.Sprintf("%s:%s", s.host, s.port)
	headers := fmt.Sprintf("To: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n", msg.To, msg.Subject)
	body := headers + msg.HTML
	if msg.HTML == "" {
		body = headers + msg.Body
	}

	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	return smtp.SendMail(addr, auth, s.from, []string{msg.To}, []byte(body))
}
