package middleware

import (
	"context"
	"net/http"
	"time"

	"dra-platform/backend/pkg/trace"
	"github.com/google/uuid"
)

// TraceMiddleware injects a request ID into each request.
func TraceMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = r.Header.Get("X-Trace-ID")
		}
		if reqID == "" {
			reqID = uuid.NewString()
		}
		ctx := trace.WithRequestID(r.Context(), reqID)
		w.Header().Set("X-Request-ID", reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// WithTraceID attaches a trace ID to context (backward-compatible wrapper).
func WithTraceID(ctx context.Context, id string) context.Context {
	return trace.WithRequestID(ctx, id)
}

// GetTraceID retrieves the trace ID from context (backward-compatible wrapper).
func GetTraceID(ctx context.Context) string {
	return trace.GetRequestID(ctx)
}

// Span represents a timed operation for tracing.
type Span struct {
	Name      string            `json:"name"`
	TraceID   string            `json:"trace_id"`
	StartTime time.Time         `json:"start_time"`
	EndTime   *time.Time        `json:"end_time,omitempty"`
	Tags      map[string]string `json:"tags,omitempty"`
}

// StartSpan begins a new span.
func StartSpan(ctx context.Context, name string) *Span {
	return &Span{
		Name:      name,
		TraceID:   trace.GetRequestID(ctx),
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
