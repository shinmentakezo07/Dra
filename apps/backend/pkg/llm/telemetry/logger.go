package telemetry

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/pkg/trace"
)

type TelemetryLogger struct {
	component string
}

func NewTelemetryLogger(component string) *TelemetryLogger {
	return &TelemetryLogger{component: component}
}

func (tl *TelemetryLogger) Info(ctx context.Context, msg string, attrs ...map[string]string) {
	traceID := trace.GetRequestID(ctx)
	args := []interface{}{"component", tl.component, "trace_id", traceID, "msg", msg}
	for _, attr := range attrs {
		for k, v := range attr {
			args = append(args, k, v)
		}
	}
	logger.Info("telemetry_event", args...)
}

func (tl *TelemetryLogger) Error(ctx context.Context, msg string, err error, attrs ...map[string]string) {
	traceID := trace.GetRequestID(ctx)
	args := []interface{}{"component", tl.component, "trace_id", traceID, "msg", msg, "error", err.Error()}
	for _, attr := range attrs {
		for k, v := range attr {
			args = append(args, k, v)
		}
	}
	logger.Error("telemetry_event", args...)
}

func (tl *TelemetryLogger) Warn(ctx context.Context, msg string, attrs ...map[string]string) {
	traceID := trace.GetRequestID(ctx)
	args := []interface{}{"component", tl.component, "trace_id", traceID, "msg", msg}
	for _, attr := range attrs {
		for k, v := range attr {
			args = append(args, k, v)
		}
	}
	logger.Warn("telemetry_event", args...)
}

func (tl *TelemetryLogger) Debug(ctx context.Context, msg string, attrs ...map[string]string) {
	traceID := trace.GetRequestID(ctx)
	args := []interface{}{"component", tl.component, "trace_id", traceID, "msg", msg}
	for _, attr := range attrs {
		for k, v := range attr {
			args = append(args, k, v)
		}
	}
	logger.Debug("telemetry_event", args...)
}

func (tl *TelemetryLogger) RecordMetric(ctx context.Context, name string, value float64, attrs map[string]string) {
	traceID := trace.GetRequestID(ctx)
	logger.Info("telemetry_metric",
		"component", tl.component,
		"trace_id", traceID,
		"metric_name", name,
		"metric_value", value,
		"attrs", attrs,
	)
}

func (tl *TelemetryLogger) RecordLatency(ctx context.Context, operation string, duration time.Duration, attrs map[string]string) {
	traceID := trace.GetRequestID(ctx)
	logger.Info("telemetry_latency",
		"component", tl.component,
		"trace_id", traceID,
		"operation", operation,
		"duration_ms", duration.Milliseconds(),
		"attrs", attrs,
	)
}

func (tl *TelemetryLogger) WithComponent(component string) *TelemetryLogger {
	return &TelemetryLogger{component: component}
}

func FormatTraceID(id string) string {
	if id == "" {
		return fmt.Sprintf("trace-%d", time.Now().UnixNano())
	}
	return id
}
