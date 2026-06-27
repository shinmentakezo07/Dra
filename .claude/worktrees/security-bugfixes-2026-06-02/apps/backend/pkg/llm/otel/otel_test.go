package otel

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

type testExporter struct {
	spans   atomic.Int32
	metrics atomic.Int32
}

func (t *testExporter) ExportSpan(span *Span) error {
	t.spans.Add(1)
	return nil
}

func (t *testExporter) ExportMetric(metric *Metric) error {
	t.metrics.Add(1)
	return nil
}

func (t *testExporter) Shutdown() error { return nil }

func TestProviderStartEndSpan(t *testing.T) {
	exp := &testExporter{}
	provider := NewProvider(exp, true)

	ctx := context.Background()
	span := provider.StartSpan(ctx, SpanGatewayRequest, map[string]any{
		GenAIRequestModel: "gpt-4",
		GatewayProvider:   "openai",
	})

	if span.Name != SpanGatewayRequest {
		t.Errorf("expected span name %s, got %s", SpanGatewayRequest, span.Name)
	}

	provider.EndSpan(span)

	// Wait for async export
	time.Sleep(50 * time.Millisecond)
	if exp.spans.Load() != 1 {
		t.Errorf("expected 1 exported span, got %d", exp.spans.Load())
	}
}

func TestProviderDisabled(t *testing.T) {
	exp := &testExporter{}
	provider := NewProvider(exp, false)

	ctx := context.Background()
	span := provider.StartSpan(ctx, SpanGatewayRequest, nil)
	provider.EndSpan(span)

	if exp.spans.Load() != 0 {
		t.Error("disabled provider should not export spans")
	}
}

func TestRecordMetrics(t *testing.T) {
	exp := &testExporter{}
	provider := NewProvider(exp, true)

	provider.RecordRequest("gpt-4", "openai", "success", 200, 100, 50)
	provider.RecordCacheHit("gpt-4")
	provider.RecordCacheMiss("gpt-4")
	provider.RecordError("gpt-4", "openai", "timeout")
	provider.RecordSecurityEvent("prompt_injection", "blocked")

	// Wait for async export
	time.Sleep(50 * time.Millisecond)
	if exp.metrics.Load() < 5 {
		t.Errorf("expected at least 5 exported metrics, got %d", exp.metrics.Load())
	}
}

func TestNoopExporter(t *testing.T) {
	exp := &NoopExporter{}
	provider := NewProvider(exp, true)

	ctx := context.Background()
	span := provider.StartSpan(ctx, SpanGatewayRequest, nil)
	provider.EndSpan(span)

	provider.RecordRequest("gpt-4", "openai", "success", 200, 100, 50)

	if err := provider.Shutdown(); err != nil {
		t.Errorf("shutdown error: %v", err)
	}
}

func TestGenAIAttributes(t *testing.T) {
	// Verify attribute constants are defined
	attrs := []string{
		GenAISystem, GenAIRequestModel, GenAIUsageInput, GenAIUsageOutput,
		GenAIUsageTotal, GenAIFinishReason, GenAIStream,
		GatewayRequestID, GatewayProvider, GatewayCacheHit, GatewayLatencyMs,
		SpanGatewayRequest, SpanProviderCall, SpanCacheLookup,
		MetricRequestCount, MetricRequestDuration, MetricTokenCount,
	}

	for _, attr := range attrs {
		if attr == "" {
			t.Error("empty attribute constant")
		}
	}
}
