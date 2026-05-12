package moderation

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Result holds moderation analysis for a piece of content.
type Result struct {
	Flagged   bool     `json:"flagged"`
	Categories []string `json:"categories"`
	Score     float64  `json:"score"`
}

// Moderator analyzes content for policy violations.
type Moderator interface {
	Moderate(ctx context.Context, content string) (*Result, error)
}

// OpenAIModerator uses OpenAI's moderation API.
type OpenAIModerator struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

// NewOpenAIModerator creates a new OpenAI moderator.
func NewOpenAIModerator(apiKey string) *OpenAIModerator {
	return &OpenAIModerator{
		apiKey:  apiKey,
		baseURL: "https://api.openai.com/v1",
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

// Moderate checks content via OpenAI moderation endpoint.
func (m *OpenAIModerator) Moderate(ctx context.Context, content string) (*Result, error) {
	if m.apiKey == "" {
		return nil, fmt.Errorf("moderation: API key not configured")
	}

	body, _ := json.Marshal(map[string]string{"input": content})
	req, err := http.NewRequestWithContext(ctx, "POST", m.baseURL+"/moderations", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+m.apiKey)

	resp, err := m.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("moderation: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("moderation: HTTP %d", resp.StatusCode)
	}

	var result struct {
		Results []struct {
			Flagged    bool               `json:"flagged"`
			Categories map[string]bool    `json:"categories"`
			Scores     map[string]float64 `json:"category_scores"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("moderation: decode: %w", err)
	}

	if len(result.Results) == 0 {
		return &Result{Flagged: false}, nil
	}

	r := result.Results[0]
	var cats []string
	maxScore := 0.0
	for cat, flagged := range r.Categories {
		if flagged {
			cats = append(cats, cat)
		}
		if s, ok := r.Scores[cat]; ok && s > maxScore {
			maxScore = s
		}
	}

	return &Result{
		Flagged:    r.Flagged,
		Categories: cats,
		Score:      maxScore,
	}, nil
}

// LocalModerator performs rule-based moderation without external APIs.
type LocalModerator struct {
	blocklist   []string
	regexList   []*regexp.Regexp
	piiPatterns []*regexp.Regexp
}

// NewLocalModerator creates a rule-based moderator.
func NewLocalModerator() *LocalModerator {
	return &LocalModerator{
		piiPatterns: []*regexp.Regexp{
			regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`),                    // SSN
			regexp.MustCompile(`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`), // Email
			regexp.MustCompile(`\b(?:\d[ -]*?){13,16}\b`),                  // Credit card-ish
		},
	}
}

// WithBlocklist adds literal string blocklist entries.
func (l *LocalModerator) WithBlocklist(words []string) *LocalModerator {
	l.blocklist = words
	return l
}

// WithRegexPatterns adds regex patterns to flag.
func (l *LocalModerator) WithRegexPatterns(patterns []string) (*LocalModerator, error) {
	for _, p := range patterns {
		re, err := regexp.Compile(p)
		if err != nil {
			return nil, err
		}
		l.regexList = append(l.regexList, re)
	}
	return l, nil
}

// Moderate checks content against local rules.
func (l *LocalModerator) Moderate(ctx context.Context, content string) (*Result, error) {
	lower := strings.ToLower(content)
	var categories []string
	score := 0.0

	for _, word := range l.blocklist {
		if strings.Contains(lower, strings.ToLower(word)) {
			categories = append(categories, "blocklist")
			score = 1.0
			break
		}
	}

	for _, re := range l.regexList {
		if re.MatchString(content) {
			categories = append(categories, "pattern_match")
			score = 1.0
		}
	}

	for _, re := range l.piiPatterns {
		if re.MatchString(content) {
			categories = append(categories, "pii_detected")
			score = max(score, 0.8)
		}
	}

	return &Result{
		Flagged:    len(categories) > 0,
		Categories: categories,
		Score:      score,
	}, nil
}

// SanitizePII redacts detected PII from content.
func (l *LocalModerator) SanitizePII(content string) string {
	for _, re := range l.piiPatterns {
		content = re.ReplaceAllString(content, "[REDACTED]")
	}
	return content
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
