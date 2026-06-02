// Package security provides prompt injection detection, jailbreak defense, PII detection,
// and secret detection for LLM requests. Inspired by Lakera Guard and LlamaGuard patterns.
package security

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// EventType represents the type of security event.
type EventType string

const (
	EventPromptInjection EventType = "prompt_injection"
	EventJailbreak       EventType = "jailbreak"
	EventPIIDetected     EventType = "pii_detected"
	EventSecretDetected  EventType = "secret_detected"
	EventTopicViolation  EventType = "topic_violation"
)

// Severity levels.
type Severity string

const (
	SeverityLow      Severity = "low"
	SeverityMedium   Severity = "medium"
	SeverityHigh     Severity = "high"
	SeverityCritical Severity = "critical"
)

// Action taken.
type Action string

const (
	ActionBlocked  Action = "blocked"
	ActionRedacted Action = "redacted"
	ActionWarned   Action = "warned"
	ActionLogged   Action = "logged"
)

// SecurityEvent represents a detected security issue.
type SecurityEvent struct {
	EventType   EventType
	Severity    Severity
	Action      Action
	Description string
	Details     map[string]any
	RequestID   string
	UserID      string
	KeyID       string
	Model       string
	IPAddress   string
	Timestamp   time.Time
}

// Config configures the security guardrails.
type Config struct {
	EnablePromptInjection bool
	EnableJailbreak       bool
	EnablePIIDetection    bool
	EnableSecretDetection bool
	EnableTopicRestriction bool
	BlockOnDetection      bool     // true = block, false = log only
	RestrictedTopics      []string // topics to block
	CustomPatterns        []string // additional injection patterns
	RedactPII             bool     // true = redact PII, false = block
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() Config {
	return Config{
		EnablePromptInjection: true,
		EnableJailbreak:       true,
		EnablePIIDetection:    true,
		EnableSecretDetection: true,
		BlockOnDetection:      true,
		RedactPII:             true,
	}
}

// DetectorFunc is a function that detects security issues in text.
type DetectorFunc func(text string) []Detection

// Detection represents a single detection.
type Detection struct {
	Type        EventType
	Severity    Severity
	Description string
	Position    int
	Length      int
	Redacted    string // replacement text if redacting
}

// Guard is the security guardrail engine.
type Guard struct {
	config    Config
	detectors []DetectorFunc
	mu        sync.RWMutex
	events    []SecurityEvent
	eventCh   chan SecurityEvent
}

// NewGuard creates a new security guardrail engine.
func NewGuard(cfg Config) *Guard {
	g := &Guard{
		config:  cfg,
		eventCh: make(chan SecurityEvent, 1000),
	}

	// Register built-in detectors
	if cfg.EnablePromptInjection {
		g.detectors = append(g.detectors, detectPromptInjection)
	}
	if cfg.EnableJailbreak {
		g.detectors = append(g.detectors, detectJailbreak)
	}
	if cfg.EnablePIIDetection {
		g.detectors = append(g.detectors, detectPII)
	}
	if cfg.EnableSecretDetection {
		g.detectors = append(g.detectors, detectSecrets)
	}
	if cfg.EnableTopicRestriction && len(cfg.RestrictedTopics) > 0 {
		g.detectors = append(g.detectors, detectTopicViolation(cfg.RestrictedTopics))
	}

	return g
}

// Events returns the event channel for consuming security events.
func (g *Guard) Events() <-chan SecurityEvent {
	return g.eventCh
}

// Scan scans text for security issues. Returns detections and whether the request should be blocked.
func (g *Guard) Scan(ctx context.Context, text string, meta map[string]string) ([]Detection, Action, error) {
	var allDetections []Detection

	for _, detector := range g.detectors {
		detections := detector(text)
		allDetections = append(allDetections, detections...)
	}

	if len(allDetections) == 0 {
		return nil, ActionLogged, nil
	}

	action := ActionLogged
	if g.config.BlockOnDetection {
		// Block on high/critical severity
		for _, d := range allDetections {
			if d.Severity == SeverityHigh || d.Severity == SeverityCritical {
				action = ActionBlocked
				break
			}
		}
		if action != ActionBlocked && g.config.RedactPII {
			action = ActionRedacted
		}
	} else if g.config.RedactPII {
		action = ActionRedacted
	}

	// Emit events
	for _, d := range allDetections {
		event := SecurityEvent{
			EventType:   d.Type,
			Severity:    d.Severity,
			Action:      action,
			Description: d.Description,
			Timestamp:   time.Now(),
		}
		if meta != nil {
			event.RequestID = meta["request_id"]
			event.UserID = meta["user_id"]
			event.KeyID = meta["key_id"]
			event.Model = meta["model"]
			event.IPAddress = meta["ip_address"]
		}

		select {
		case g.eventCh <- event:
		default: // drop if channel full
		}

		g.mu.Lock()
		g.events = append(g.events, event)
		if len(g.events) > 10000 {
			g.events = g.events[1000:]
		}
		g.mu.Unlock()
	}

	return allDetections, action, nil
}

// Redact applies redaction to text based on detections.
// Bug #49/#50: sort detections by position descending so earlier redactions don't shift later positions.
func (g *Guard) Redact(text string, detections []Detection) string {
	if len(detections) == 0 {
		return text
	}
	// Sort by position descending — process from end to start to preserve positions
	sorted := make([]Detection, len(detections))
	copy(sorted, detections)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Position > sorted[j].Position
	})

	result := text
	for _, d := range sorted {
		if d.Redacted != "" && d.Position >= 0 && d.Position+d.Length <= len(result) {
			result = result[:d.Position] + d.Redacted + result[d.Position+d.Length:]
		}
	}
	return result
}

// ScanAndRedact scans and optionally redacts text in one call.
func (g *Guard) ScanAndRedact(ctx context.Context, text string, meta map[string]string) (string, Action, error) {
	detections, action, err := g.Scan(ctx, text, meta)
	if err != nil {
		return text, action, err
	}

	if action == ActionRedacted && len(detections) > 0 {
		return g.Redact(text, detections), action, nil
	}

	return text, action, nil
}

// RecentEvents returns recent security events.
func (g *Guard) RecentEvents(limit int) []SecurityEvent {
	g.mu.RLock()
	defer g.mu.RUnlock()

	if limit <= 0 || limit > len(g.events) {
		limit = len(g.events)
	}
	start := len(g.events) - limit
	if start < 0 {
		start = 0
	}
	return g.events[start:]
}

// --- Built-in Detectors ---

// Prompt injection patterns.
var promptInjectionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)`),
	regexp.MustCompile(`(?i)disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)`),
	regexp.MustCompile(`(?i)forget\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)`),
	regexp.MustCompile(`(?i)you\s+are\s+now\s+(a|an)\s+\w+`),
	regexp.MustCompile(`(?i)new\s+instructions?\s*:`),
	regexp.MustCompile(`(?i)system\s*:\s*you\s+are`),
	regexp.MustCompile(`(?i)\[INST\]|\[/INST\]|<\|im_start\|>|<\|im_end\|>`),
	regexp.MustCompile(`(?i)override\s+(all\s+)?(safety|content|system)\s+(filters?|rules?|restrictions?)`),
	regexp.MustCompile(`(?i)act\s+as\s+(if\s+)?you\s+(have|don'?t\s+have)\s+(no\s+)?(restrictions?|limitations?|filters?)`),
	regexp.MustCompile(`(?i)developer\s+mode\s*(enabled|activated|on)`),
	regexp.MustCompile(`(?i)pretend\s+you\s+(are|have)\s+no\s+(restrictions?|rules?|limitations?|filters?)`),
	regexp.MustCompile(`(?i)jailbreak`),
	regexp.MustCompile(`(?i)do\s+anything\s+now`),
	regexp.MustCompile(`(?i)DAN\s+mode`),
}

func detectPromptInjection(text string) []Detection {
	var detections []Detection
	lower := strings.ToLower(text)

	for _, pattern := range promptInjectionPatterns {
		loc := pattern.FindStringIndex(lower)
		if loc != nil {
			patStr := pattern.String()
			if len(patStr) > 50 {
				patStr = patStr[:50]
			}
			detections = append(detections, Detection{
				Type:        EventPromptInjection,
				Severity:    SeverityCritical,
				Description: fmt.Sprintf("Prompt injection pattern detected: %s", patStr),
				Position:    loc[0],
				Length:      loc[1] - loc[0],
			})
		}
	}

	return detections
}

// Jailbreak patterns.
var jailbreakPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\bDAN\b.*\bmode\b`),
	regexp.MustCompile(`(?i)do\s+anything\s+now`),
	regexp.MustCompile(`(?i)you\s+have\s+been\s+(freed|unlocked|unleashed)`),
	regexp.MustCompile(`(?i)hypothetical(ly)?\s*,?\s*(if\s+)?you\s+(were|are)\s+(an?\s+)?evil`),
	regexp.MustCompile(`(?i)in\s+a\s+(fictional|hypothetical)\s+(world|scenario|universe)\s*,?\s*where\s+there\s+are\s+no\s+(rules|restrictions|limitations|morals|ethics)`),
	regexp.MustCompile(`(?i)roleplay\s+as\s+(an?\s+)?(evil|malicious|unrestricted|unethical)`),
	regexp.MustCompile(`(?i)your\s+(previous|original|old)\s+(programming|instructions|training)\s+(no\s+longer\s+)?(applies?|exists?|matters?)`),
	regexp.MustCompile(`(?i)from\s+now\s+on\s*,?\s*you\s+(will|shall|must|should)\s+(only\s+)?respond\s+as`),
	regexp.MustCompile(`(?i)token\s+smuggling`),
	regexp.MustCompile(`(?i)base64\s+(encoded|decode)\s+(this|the)\s+(prompt|instruction)`),
}

func detectJailbreak(text string) []Detection {
	var detections []Detection
	lower := strings.ToLower(text)

	for _, pattern := range jailbreakPatterns {
		loc := pattern.FindStringIndex(lower)
		if loc != nil {
			patStr := pattern.String()
			if len(patStr) > 50 {
				patStr = patStr[:50]
			}
			detections = append(detections, Detection{
				Type:        EventJailbreak,
				Severity:    SeverityHigh,
				Description: fmt.Sprintf("Jailbreak attempt detected: %s", patStr),
				Position:    loc[0],
				Length:      loc[1] - loc[0],
			})
		}
	}

	return detections
}

// PII patterns.
var piiPatterns = []struct {
	name    string
	pattern *regexp.Regexp
	replace string
}{
	{"SSN", regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`), "[SSN_REDACTED]"},
	{"Credit Card", regexp.MustCompile(`\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b`), "[CC_REDACTED]"},
	{"Email", regexp.MustCompile(`\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b`), "[EMAIL_REDACTED]"},
	{"Phone US", regexp.MustCompile(`\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b`), "[PHONE_REDACTED]"},
	{"IP Address", regexp.MustCompile(`\b(?:\d{1,3}\.){3}\d{1,3}\b`), "[IP_REDACTED]"},
}

func detectPII(text string) []Detection {
	var detections []Detection
	for _, p := range piiPatterns {
		loc := p.pattern.FindStringIndex(text)
		if loc != nil {
			detections = append(detections, Detection{
				Type:        EventPIIDetected,
				Severity:    SeverityMedium,
				Description: fmt.Sprintf("%s detected", p.name),
				Position:    loc[0],
				Length:      loc[1] - loc[0],
				Redacted:    p.replace,
			})
		}
	}
	return detections
}

// Secret patterns.
var secretPatterns = []struct {
	name    string
	pattern *regexp.Regexp
	replace string
}{
	{"OpenAI API Key", regexp.MustCompile(`\bsk-[a-zA-Z0-9]{20,}\b`), "[OPENAI_KEY_REDACTED]"},
	{"Anthropic API Key", regexp.MustCompile(`\bsk-ant-[a-zA-Z0-9\-]{20,}\b`), "[ANTHROPIC_KEY_REDACTED]"},
	{"AWS Access Key", regexp.MustCompile(`\bAKIA[0-9A-Z]{16}\b`), "[AWS_KEY_REDACTED]"},
	{"GitHub Token", regexp.MustCompile(`\bghp_[a-zA-Z0-9]{36}\b`), "[GITHUB_TOKEN_REDACTED]"},
	{"Generic Secret", regexp.MustCompile(`(?i)(?:password|secret|token|api[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{16,}['"]?`), "[SECRET_REDACTED]"},
	{"Bearer Token", regexp.MustCompile(`(?i)bearer\s+[a-zA-Z0-9\-_\.]{20,}`), "[BEARER_REDACTED]"},
	{"Private Key", regexp.MustCompile(`-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----`), "[PRIVATE_KEY_REDACTED]"},
}

func detectSecrets(text string) []Detection {
	var detections []Detection
	for _, p := range secretPatterns {
		loc := p.pattern.FindStringIndex(text)
		if loc != nil {
			detections = append(detections, Detection{
				Type:        EventSecretDetected,
				Severity:    SeverityHigh,
				Description: fmt.Sprintf("%s detected", p.name),
				Position:    loc[0],
				Length:      loc[1] - loc[0],
				Redacted:    p.replace,
			})
		}
	}
	return detections
}

func detectTopicViolation(topics []string) DetectorFunc {
	return func(text string) []Detection {
		var detections []Detection
		lower := strings.ToLower(text)
		for _, topic := range topics {
			if strings.Contains(lower, strings.ToLower(topic)) {
				detections = append(detections, Detection{
					Type:        EventTopicViolation,
					Severity:    SeverityMedium,
					Description: fmt.Sprintf("Restricted topic '%s' detected", topic),
				})
			}
		}
		return detections
	}
}

// EventToJSON converts a security event to JSON for logging.
func EventToJSON(e SecurityEvent) string {
	data := map[string]any{
		"event_type":  string(e.EventType),
		"severity":    string(e.Severity),
		"action":      string(e.Action),
		"description": e.Description,
		"timestamp":   e.Timestamp.Format(time.RFC3339),
	}
	if e.RequestID != "" {
		data["request_id"] = e.RequestID
	}
	if e.UserID != "" {
		data["user_id"] = e.UserID
	}
	if e.Model != "" {
		data["model"] = e.Model
	}
	b, _ := json.Marshal(data)
	return string(b)
}
