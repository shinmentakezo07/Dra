package cache

import (
	"testing"
)

func TestSignatureCacheBasic(t *testing.T) {
	sc := NewSignatureCache()

	// Cache a signature
	sc.CacheSignature("claude-sonnet-4-5", "thinking text block", "a]very-long-signature-that-is-definitely-more-than-fifty-characters-long")

	// Retrieve it
	sig := sc.GetCachedSignature("claude-sonnet-4-5", "thinking text block")
	if sig == "" {
		t.Fatal("expected cached signature, got empty")
	}

	// Different model group, same text -> cache miss
	sig2 := sc.GetCachedSignature("gpt-4o", "thinking text block")
	if sig2 != "" {
		t.Errorf("expected empty for different model group, got %q", sig2)
	}

	// Different text -> cache miss
	sig3 := sc.GetCachedSignature("claude-sonnet-4-5", "different text")
	if sig3 != "" {
		t.Errorf("expected empty for different text, got %q", sig3)
	}
}

func TestSignatureCacheEmptyInputs(t *testing.T) {
	sc := NewSignatureCache()

	// Empty text should not cache
	sc.CacheSignature("claude-sonnet-4-5", "", "signature")
	sig := sc.GetCachedSignature("claude-sonnet-4-5", "")
	if sig != "" {
		t.Error("expected empty for empty text")
	}

	// Empty signature should not cache
	sc.CacheSignature("claude-sonnet-4-5", "text", "")
	sig = sc.GetCachedSignature("claude-sonnet-4-5", "text")
	if sig != "" {
		t.Error("expected empty for empty signature")
	}

	// Short signature should not cache
	sc.CacheSignature("claude-sonnet-4-5", "text", "short")
	sig = sc.GetCachedSignature("claude-sonnet-4-5", "text")
	if sig != "" {
		t.Error("expected empty for short signature")
	}
}

func TestSignatureCacheClear(t *testing.T) {
	sc := NewSignatureCache()
	longSig := "this-is-a-very-long-signature-that-exceeds-fifty-characters-easily"

	sc.CacheSignature("claude-sonnet-4-5", "text1", longSig)
	sc.CacheSignature("gemini-2.5-pro", "text2", longSig)

	// Clear specific group
	sc.ClearSignatureCache("claude-sonnet-4-5")
	if sig := sc.GetCachedSignature("claude-sonnet-4-5", "text1"); sig != "" {
		t.Error("expected cleared cache for claude")
	}
	if sig := sc.GetCachedSignature("gemini-2.5-pro", "text2"); sig == "" {
		t.Error("expected gemini cache to survive claude clear")
	}

	// Clear all
	sc.ClearSignatureCache("")
	if sig := sc.GetCachedSignature("gemini-2.5-pro", "text2"); sig != "" {
		t.Error("expected all cleared")
	}
}

func TestSignatureCacheEnabled(t *testing.T) {
	sc := NewSignatureCache()
	if !sc.Enabled() {
		t.Error("expected enabled by default")
	}
	sc.SetEnabled(false)
	if sc.Enabled() {
		t.Error("expected disabled after SetEnabled(false)")
	}
}

func TestGetModelGroup(t *testing.T) {
	tests := []struct {
		model string
		want  string
	}{
		{"claude-sonnet-4-5", "claude"},
		{"gemini-2.5-pro", "gemini"},
		{"gpt-4o", "openai"},
		{"o1-preview", "openai"},
		{"o3-mini", "openai"},
		{"llama-3", "llama-3"},
	}

	for _, tt := range tests {
		got := GetModelGroup(tt.model)
		if got != tt.want {
			t.Errorf("GetModelGroup(%q) = %q, want %q", tt.model, got, tt.want)
		}
	}
}

func TestHasValidSignature(t *testing.T) {
	sc := NewSignatureCache()
	longSig := "this-is-a-very-long-signature-that-exceeds-fifty-characters-easily"

	if !sc.HasValidSignature("claude", longSig) {
		t.Error("expected valid for long signature")
	}
	if sc.HasValidSignature("claude", "short") {
		t.Error("expected invalid for short signature")
	}
	if sc.HasValidSignature("claude", "") {
		t.Error("expected invalid for empty signature")
	}
}
