package trace

import (
	"context"
	"testing"
)

func TestWithRequestID_GetRequestID(t *testing.T) {
	ctx := context.Background()
	ctx = WithRequestID(ctx, "req-123")

	got := GetRequestID(ctx)
	if got != "req-123" {
		t.Errorf("GetRequestID() = %q, want req-123", got)
	}
}

func TestGetRequestID_Missing(t *testing.T) {
	ctx := context.Background()
	got := GetRequestID(ctx)
	if got != "" {
		t.Errorf("GetRequestID() on empty context = %q, want empty", got)
	}
}

func TestWithRequestID_Overwrite(t *testing.T) {
	ctx := context.Background()
	ctx = WithRequestID(ctx, "req-1")
	ctx = WithRequestID(ctx, "req-2")

	got := GetRequestID(ctx)
	if got != "req-2" {
		t.Errorf("GetRequestID() = %q, want req-2", got)
	}
}
