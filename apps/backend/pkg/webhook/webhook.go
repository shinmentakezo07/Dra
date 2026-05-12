package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Event represents a webhook event.
type Event struct {
	Type      string                 `json:"type"`
	Timestamp time.Time              `json:"timestamp"`
	Payload   map[string]interface{} `json:"payload"`
}

// Delivery represents a webhook delivery attempt.
type Delivery struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	Event     Event     `json:"event"`
	Status    int       `json:"status"`
	Error     string    `json:"error,omitempty"`
	SentAt    time.Time `json:"sent_at"`
}

// Config holds webhook configuration.
type Config struct {
	URL       string            `json:"url"`
	Secret    string            `json:"secret"`
	Events    []string          `json:"events"`
	Headers   map[string]string `json:"headers,omitempty"`
	RetryMax  int               `json:"retry_max"`
	Timeout   time.Duration     `json:"timeout"`
}

// Dispatcher sends webhook events.
type Dispatcher struct {
	client *http.Client
}

// NewDispatcher creates a new webhook dispatcher.
func NewDispatcher() *Dispatcher {
	return &Dispatcher{
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

// Send delivers a webhook event.
func (d *Dispatcher) Send(ctx context.Context, cfg Config, event Event) (*Delivery, error) {
	if !isEventAllowed(event.Type, cfg.Events) {
		return nil, fmt.Errorf("event type %s not subscribed", event.Type)
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return nil, fmt.Errorf("marshal event: %w", err)
	}

	delivery := &Delivery{
		ID:     generateID(),
		URL:    cfg.URL,
		Event:  event,
		SentAt: time.Now(),
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, bytes.NewReader(payload))
	if err != nil {
		delivery.Error = err.Error()
		return delivery, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-ID", delivery.ID)
	req.Header.Set("X-Event-Type", event.Type)
	req.Header.Set("X-Webhook-Timestamp", fmt.Sprintf("%d", event.Timestamp.Unix()))

	if cfg.Secret != "" {
		sig := signPayload(payload, cfg.Secret)
		req.Header.Set("X-Webhook-Signature", "sha256="+sig)
	}

	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}

	resp, err := d.client.Do(req)
	if err != nil {
		delivery.Error = err.Error()
		return delivery, err
	}
	defer resp.Body.Close()

	delivery.Status = resp.StatusCode
	if resp.StatusCode >= 400 {
		delivery.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
		return delivery, fmt.Errorf("webhook delivery failed: HTTP %d", resp.StatusCode)
	}

	return delivery, nil
}

// SendWithRetry sends a webhook with retries.
func (d *Dispatcher) SendWithRetry(ctx context.Context, cfg Config, event Event) (*Delivery, error) {
	maxRetries := cfg.RetryMax
	if maxRetries <= 0 {
		maxRetries = 3
	}

	var lastErr error
	for i := 0; i <= maxRetries; i++ {
		if i > 0 {
			time.Sleep(time.Duration(i) * time.Second)
		}
		delivery, err := d.Send(ctx, cfg, event)
		if err == nil {
			return delivery, nil
		}
		lastErr = err
		if delivery != nil && delivery.Status >= 400 && delivery.Status < 500 {
			break // Don't retry client errors
		}
	}
	return nil, fmt.Errorf("webhook failed after %d retries: %w", maxRetries, lastErr)
}

func signPayload(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return hex.EncodeToString(h.Sum(nil))
}

func isEventAllowed(eventType string, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, a := range allowed {
		if a == eventType || a == "*" {
			return true
		}
	}
	return false
}

func generateID() string {
	return fmt.Sprintf("wh_%d", time.Now().UnixNano())
}
