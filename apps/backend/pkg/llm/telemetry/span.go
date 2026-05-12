package telemetry

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
)

type Span struct {
	Name      string            `json:"name"`
	TraceID   string            `json:"trace_id"`
	StartTime time.Time         `json:"start_time"`
	EndTime   *time.Time        `json:"end_time,omitempty"`
	Tags      map[string]string `json:"tags,omitempty"`
	Events    []SpanEvent       `json:"events,omitempty"`
}

type SpanEvent struct {
	Name       string            `json:"name"`
	Timestamp  time.Time         `json:"timestamp"`
	Attributes map[string]string `json:"attributes,omitempty"`
}

func StartSpan(ctx context.Context, name string) *Span {
	traceID := middleware.GetTraceID(ctx)
	if traceID == "" {
		traceID = generateTraceID()
	}
	return &Span{
		Name:      name,
		TraceID:   traceID,
		StartTime: time.Now(),
		Tags:      make(map[string]string),
		Events:    make([]SpanEvent, 0),
	}
}

func (s *Span) Finish() {
	now := time.Now()
	s.EndTime = &now
}

func (s *Span) SetTag(key, value string) {
	if s.Tags == nil {
		s.Tags = make(map[string]string)
	}
	s.Tags[key] = value
}

func (s *Span) AddEvent(name string, attrs map[string]string) {
	s.Events = append(s.Events, SpanEvent{
		Name:       name,
		Timestamp:  time.Now(),
		Attributes: attrs,
	})
}

func (s *Span) Duration() time.Duration {
	if s.EndTime == nil {
		return time.Since(s.StartTime)
	}
	return s.EndTime.Sub(s.StartTime)
}

func (s *Span) Log() {
	logger.Info("telemetry_span",
		"trace_id", s.TraceID,
		"span_name", s.Name,
		"duration_ms", s.Duration().Milliseconds(),
		"tags", s.Tags,
	)
}

type Logger struct {
	component string
}

func NewLogger(component string) *Logger {
	return &Logger{component: component}
}

func (l *Logger) Info(ctx context.Context, msg string, attrs ...map[string]string) {
	traceID := middleware.GetTraceID(ctx)
	args := []interface{}{"component", l.component, "trace_id", traceID, "msg", msg}
	for _, attr := range attrs {
		for k, v := range attr {
			args = append(args, k, v)
		}
	}
	logger.Info("telemetry_event", args...)
}

func (l *Logger) Error(ctx context.Context, msg string, err error, attrs ...map[string]string) {
	traceID := middleware.GetTraceID(ctx)
	args := []interface{}{"component", l.component, "trace_id", traceID, "msg", msg, "error", err.Error()}
	for _, attr := range attrs {
		for k, v := range attr {
			args = append(args, k, v)
		}
	}
	logger.Error("telemetry_event", args...)
}

func (l *Logger) Warn(ctx context.Context, msg string, attrs ...map[string]string) {
	traceID := middleware.GetTraceID(ctx)
	args := []interface{}{"component", l.component, "trace_id", traceID, "msg", msg}
	for _, attr := range attrs {
		for k, v := range attr {
			args = append(args, k, v)
		}
	}
	logger.Warn("telemetry_event", args...)
}

func generateTraceID() string {
	return fmt.Sprintf("trace-%d", time.Now().UnixNano())
}
