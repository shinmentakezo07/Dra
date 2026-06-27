package email

import (
	"context"
	"fmt"
	"net/smtp"
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
	addr := fmt.Sprintf("%s:%s", s.host, s.port)
	headers := fmt.Sprintf("To: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n", msg.To, msg.Subject)
	body := headers + msg.HTML
	if msg.HTML == "" {
		body = headers + msg.Body
	}

	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	return smtp.SendMail(addr, auth, s.from, []string{msg.To}, []byte(body))
}
