// Package otel provides OpenTelemetry integration with GenAI semantic conventions
// for LLM gateway observability. Supports tracing, metrics, and span attributes
// per the OpenTelemetry GenAI semantic conventions.
package otel

import (
	"context"
	"fmt"
	"time"
)

// GenAI semantic convention attribute keys.
const (
	GenAISystem         = "gen_ai.system"
	GenAIRequestModel   = "gen_ai.request.model"
	GenAITemperature    = "gen_ai.request.temperature"
	GenAITopP           = "gen_ai.request.top_p"
	GenAIMaxTokens      = "gen_ai.request.max_tokens"
	GenAIResponseModel  = "gen_ai.response.model"
	GenAIFinishReason   = "gen_ai.response.finish_reason"
	GenAIUsageInput     = "gen_ai.usage.input_tokens"
	GenAIUsageOutput    = "gen_ai.usage.output_tokens"
	GenAIUsageTotal     = "gen_ai.usage.total_tokens"
	GenAIUsageThinking  = "gen_ai.usage.thinking_tokens"
	GenAIStream         = "gen_ai.stream"

	// Gateway-specific attributes
	GatewayRequestID    = "gateway.request_id"
	GatewayUserID       = "gateway.user_id"
	GatewayKeyID        = "gateway.key_id"
	GatewayTeamID       = "gateway.team_id"
	GatewayProvider     = "gateway.provider"
	GatewayModel        = "gateway.model"
	GatewayCacheHit     = "gateway.cache_hit"
	GatewayLatencyMs    = "gateway.latency_ms"
	GatewayCostCents    = "gateway.cost_cents"
	GatewayTranslated   = "gateway.translated"
	GatewayTranslator   = "gateway.translator"
	GatewayFallback     = "gateway.fallback"
	GatewayError        = "gateway.error"
	GatewaySecurityAction = "gateway.security_action"
)

// Span names.
const (
	SpanGatewayRequest  = "gateway.request"
	SpanTranslation     = "gateway.translation"
	SpanProviderCall    = "gateway.provider.call"
	SpanCacheLookup     = "gateway.cache.lookup"
	SpanGuardrailCheck  = "gateway.guardrail.check"
	SpanTokenCount      = "gateway.token.count"
	SpanRouting         = "gateway.routing"
	SpanFallback        = "gateway.fallback"
)

// Metric names.
const (
	MetricRequestCount    = "gateway.requests.total"
	MetricRequestDuration = "gateway.request.duration"
	MetricTokenCount      = "gateway.tokens.total"
	MetricCostTotal       = "gateway.cost.total"
	MetricCacheHits       = "gateway.cache.hits"
	MetricCacheMisses     = "gateway.cache.misses"
	MetricProviderLatency = "gateway.provider.latency"
	MetricErrorCount      = "gateway.errors.total"
	MetricActiveRequests  = "gateway.requests.active"
	MetricBudgetUsage     = "gateway.budget.usage"
	MetricSecurityEvents  = "gateway.security.events"
)

// Span represents a trace span (abstraction over OTel SDK).
type Span struct {
	Name       string
	TraceID    string
	SpanID     string
	ParentID   string
	StartTime  time.Time
	EndTime    time.Time
	Attributes map[string]any
	Events     []SpanEvent
	Status     SpanStatus
	StatusMsg  string
}

// SpanEvent represents an event within a span.
type SpanEvent struct {
	Name       string
	Timestamp  time.Time
	Attributes map[string]any
}

// SpanStatus represents the span status.
type SpanStatus int

const (
	SpanStatusUnset SpanStatus = iota
	SpanStatusOK
	SpanStatusError
)

// Metric represents a recorded metric.
type Metric struct {
	Name      string
	Type      string // counter, histogram, gauge
	Value     float64
	Labels    map[string]string
	Timestamp time.Time
}

// Exporter is the interface for exporting telemetry data.
type Exporter interface {
	ExportSpan(span *Span) error
	ExportMetric(metric *Metric) error
	Shutdown() error
}

// Provider is the telemetry provider.
type Provider struct {
	exporter Exporter
	enabled  bool
}

// NewProvider creates a new telemetry provider.
func NewProvider(exporter Exporter, enabled bool) *Provider {
	return &Provider{
		exporter: exporter,
		enabled:  enabled,
	}
}

// StartSpan starts a new span.
func (p *Provider) StartSpan(ctx context.Context, name string, attrs map[string]any) *Span {
	if !p.enabled {
		return &Span{Name: name, StartTime: time.Now(), Attributes: attrs}
	}

	span := &Span{
		Name:       name,
		TraceID:    getTraceID(ctx),
		SpanID:     generateSpanID(),
		ParentID:   getSpanID(ctx),
		StartTime:  time.Now(),
		Attributes: attrs,
	}

	return span
}

// EndSpan ends a span and exports it.
func (p *Provider) EndSpan(span *Span) {
	if span == nil {
		return
	}

	span.EndTime = time.Now()
	if p.enabled && p.exporter != nil {
		go func() {
			_ = p.exporter.ExportSpan(span)
		}()
	}
}

// RecordMetric records a metric.
func (p *Provider) RecordMetric(name, metricType string, value float64, labels map[string]string) {
	if !p.enabled || p.exporter == nil {
		return
	}

	m := &Metric{
		Name:      name,
		Type:      metricType,
		Value:     value,
		Labels:    labels,
		Timestamp: time.Now(),
	}

	go func() {
		_ = p.exporter.ExportMetric(m)
	}()
}

// RecordRequest records request metrics.
func (p *Provider) RecordRequest(model, provider, status string, latencyMs int64, inputTokens, outputTokens int) {
	labels := map[string]string{
		"model":    model,
		"provider": provider,
		"status":   status,
	}

	p.RecordMetric(MetricRequestCount, "counter", 1, labels)
	p.RecordMetric(MetricRequestDuration, "histogram", float64(latencyMs), labels)
	p.RecordMetric(MetricTokenCount, "counter", float64(inputTokens+outputTokens), labels)
}

// RecordCacheHit records a cache hit.
func (p *Provider) RecordCacheHit(model string) {
	p.RecordMetric(MetricCacheHits, "counter", 1, map[string]string{"model": model})
}

// RecordCacheMiss records a cache miss.
func (p *Provider) RecordCacheMiss(model string) {
	p.RecordMetric(MetricCacheMisses, "counter", 1, map[string]string{"model": model})
}

// RecordError records an error.
func (p *Provider) RecordError(model, provider, errorType string) {
	p.RecordMetric(MetricErrorCount, "counter", 1, map[string]string{
		"model":      model,
		"provider":   provider,
		"error_type": errorType,
	})
}

// RecordSecurityEvent records a security event.
func (p *Provider) RecordSecurityEvent(eventType, action string) {
	p.RecordMetric(MetricSecurityEvents, "counter", 1, map[string]string{
		"event_type": eventType,
		"action":     action,
	})
}

// Shutdown shuts down the telemetry provider.
func (p *Provider) Shutdown() error {
	if p.exporter != nil {
		return p.exporter.Shutdown()
	}
	return nil
}

// --- Noop implementations for when no exporter is configured ---

// NoopExporter is a no-op exporter.
type NoopExporter struct{}

func (n *NoopExporter) ExportSpan(span *Span) error   { return nil }
func (n *NoopExporter) ExportMetric(metric *Metric) error { return nil }
func (n *NoopExporter) Shutdown() error                { return nil }

// LoggingExporter logs telemetry to stdout.
type LoggingExporter struct{}

func (l *LoggingExporter) ExportSpan(span *Span) error {
	fmt.Printf("[OTEL SPAN] %s trace=%s span=%s duration=%dms attrs=%v\n",
		span.Name, span.TraceID, span.SpanID,
		span.EndTime.Sub(span.StartTime).Milliseconds(),
		span.Attributes)
	return nil
}

func (l *LoggingExporter) ExportMetric(metric *Metric) error {
	fmt.Printf("[OTEL METRIC] %s=%f %v\n", metric.Name, metric.Value, metric.Labels)
	return nil
}

func (l *LoggingExporter) Shutdown() error { return nil }

// Helper functions for trace/span ID generation.
func getTraceID(ctx context.Context) string {
	if id, ok := ctx.Value("trace_id").(string); ok {
		return id
	}
	return ""
}

func getSpanID(ctx context.Context) string {
	if id, ok := ctx.Value("span_id").(string); ok {
		return id
	}
	return ""
}

func generateSpanID() string {
	return fmt.Sprintf("%016x", time.Now().UnixNano())
}
