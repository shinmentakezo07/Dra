package moderation

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/sashabaranov/go-openai"
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

// OpenAIModerator uses OpenAI's moderation API via the official SDK.
type OpenAIModerator struct {
	client *openai.Client
}

// NewOpenAIModerator creates a new OpenAI moderator.
func NewOpenAIModerator(apiKey string) *OpenAIModerator {
	cfg := openai.DefaultConfig(apiKey)
	return &OpenAIModerator{
		client: openai.NewClientWithConfig(cfg),
	}
}

// NewOpenAIModeratorWithClient creates a moderator with an existing SDK client.
func NewOpenAIModeratorWithClient(client *openai.Client) *OpenAIModerator {
	return &OpenAIModerator{client: client}
}

// Moderate checks content via OpenAI moderation endpoint.
func (m *OpenAIModerator) Moderate(ctx context.Context, content string) (*Result, error) {
	if m.client == nil {
		return nil, fmt.Errorf("moderation: client not configured")
	}

	resp, err := m.client.Moderations(ctx, openai.ModerationRequest{
		Input: content,
		Model: "omni-moderation-latest",
	})
	if err != nil {
		return nil, fmt.Errorf("moderation: request failed: %w", err)
	}

	if len(resp.Results) == 0 {
		return &Result{Flagged: false}, nil
	}

	r := resp.Results[0]
	var cats []string
	maxScore := 0.0
	type catEntry struct {
		name  string
		flag  bool
		score float32
	}
	entries := []catEntry{
		{"hate", r.Categories.Hate, r.CategoryScores.Hate},
		{"hate/threatening", r.Categories.HateThreatening, r.CategoryScores.HateThreatening},
		{"harassment", r.Categories.Harassment, r.CategoryScores.Harassment},
		{"harassment/threatening", r.Categories.HarassmentThreatening, r.CategoryScores.HarassmentThreatening},
		{"self-harm", r.Categories.SelfHarm, r.CategoryScores.SelfHarm},
		{"self-harm/intent", r.Categories.SelfHarmIntent, r.CategoryScores.SelfHarmIntent},
		{"self-harm/instructions", r.Categories.SelfHarmInstructions, r.CategoryScores.SelfHarmInstructions},
		{"sexual", r.Categories.Sexual, r.CategoryScores.Sexual},
		{"sexual/minors", r.Categories.SexualMinors, r.CategoryScores.SexualMinors},
		{"violence", r.Categories.Violence, r.CategoryScores.Violence},
		{"violence/graphic", r.Categories.ViolenceGraphic, r.CategoryScores.ViolenceGraphic},
	}
	for _, e := range entries {
		if e.flag {
			cats = append(cats, e.name)
		}
		if float64(e.score) > maxScore {
			maxScore = float64(e.score)
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
			regexp.MustCompile(`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b`), // Email
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
