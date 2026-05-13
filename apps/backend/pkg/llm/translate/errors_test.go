package translate

import (
	"testing"
)

func TestNewError(t *testing.T) {
	err := NewError(KindNilInput, "anthropic", "nil input", "received nil pointer")
	if err == nil {
		t.Fatal("expected error")
	}
	if err.Kind != KindNilInput {
		t.Errorf("kind = %d", err.Kind)
	}
	if err.Format != "anthropic" {
		t.Errorf("format = %q", err.Format)
	}
	if err.Message != "nil input" {
		t.Errorf("message = %q", err.Message)
	}
}

func TestError_Error(t *testing.T) {
	err := NewError(KindMissingRequired, "openai", "missing required field", "model")
	msg := err.Error()
	if msg != "[openai] missing required field: model" {
		t.Errorf("Error() = %q", msg)
	}

	err2 := NewError(KindConversionFailed, "internal", "conversion failed", "")
	msg2 := err2.Error()
	if msg2 != "[internal] conversion failed" {
		t.Errorf("Error() = %q", msg2)
	}
}

func TestError_WithDetail(t *testing.T) {
	err := NewError(KindInvalidMessage, "anthropic", "invalid message", "messages[0]: empty role")
	if err.Detail != "messages[0]: empty role" {
		t.Error("detail not set")
	}
}

func TestErrNilInput(t *testing.T) {
	err := ErrNilInput("anthropic")
	if err == nil {
		t.Fatal("expected error")
	}
	if err.Kind != KindNilInput {
		t.Errorf("kind = %d, want KindNilInput", err.Kind)
	}
	if err.Format != "anthropic" {
		t.Errorf("format = %q", err.Format)
	}
}

func TestErrInvalidMessage(t *testing.T) {
	err := ErrInvalidMessage("openai", "empty role")
	if err.Kind != KindInvalidMessage {
		t.Errorf("kind = %d", err.Kind)
	}
	if err.Detail != "empty role" {
		t.Errorf("detail = %q", err.Detail)
	}
}

func TestErrInvalidContentBlock(t *testing.T) {
	err := ErrInvalidContentBlock("generic", "empty map")
	if err.Kind != KindInvalidContentBlock {
		t.Errorf("kind = %d", err.Kind)
	}
}

func TestErrMissingRequired(t *testing.T) {
	err := ErrMissingRequired("anthropic", "model")
	if err.Kind != KindMissingRequired {
		t.Errorf("kind = %d", err.Kind)
	}
	if err.Detail != "model" {
		t.Errorf("detail = %q", err.Detail)
	}
}

func TestErrorKindValues(t *testing.T) {
	if KindNilInput != 0 {
		t.Error("KindNilInput should be 0")
	}
	if KindInvalidMessage != 1 {
		t.Error("KindInvalidMessage should be 1")
	}
	if KindConversionFailed != 5 {
		t.Errorf("KindConversionFailed = %d, want 5", KindConversionFailed)
	}
}
