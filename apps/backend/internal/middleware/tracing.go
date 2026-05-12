package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"
)

// TraceIDKey is the context key for trace IDs.
type traceIDKey struct{}

// TraceMiddleware injects a trace ID into each request.
func TraceMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := r.Header.Get("X-Trace-ID")
		if traceID == "" {
			traceID = generateTraceID()
		}
		ctx := WithTraceID(r.Context(), traceID)
		w.Header().Set("X-Trace-ID", traceID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// WithTraceID attaches a trace ID to context.
func WithTraceID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, traceIDKey{}, id)
}

// GetTraceID retrieves the trace ID from context.
func GetTraceID(ctx context.Context) string {
	if id, ok := ctx.Value(traceIDKey{}).(string); ok {
		return id
	}
	return ""
}

// Span represents a timed operation for tracing.
type Span struct {
	Name      string    `json:"name"`
	TraceID   string    `json:"trace_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	Tags      map[string]string `json:"tags,omitempty"`
}

// StartSpan begins a new span.
func StartSpan(ctx context.Context, name string) *Span {
	return &Span{
		Name:      name,
		TraceID:   GetTraceID(ctx),
		StartTime: time.Now(),
		Tags:      make(map[string]string),
	}
}

// Finish marks the span as complete.
func (s *Span) Finish() {
	now := time.Now()
	s.EndTime = &now
}

// SetTag adds a tag to the span.
func (s *Span) SetTag(key, value string) {
	if s.Tags == nil {
		s.Tags = make(map[string]string)
	}
	s.Tags[key] = value
}

// Duration returns the span duration.
func (s *Span) Duration() time.Duration {
	if s.EndTime == nil {
		return time.Since(s.StartTime)
	}
	return s.EndTime.Sub(s.StartTime)
}

// SpanFromRequest creates a span from an HTTP request.
func SpanFromRequest(r *http.Request, name string) *Span {
	return StartSpan(r.Context(), name)
}

func generateTraceID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b) + fmt.Sprintf("%x", time.Now().UnixNano())[:8]
}
