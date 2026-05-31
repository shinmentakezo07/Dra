package registry

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestRegisterAndUnregister(t *testing.T) {
	r := New()

	models := []*ModelInfo{
		{ID: "gpt-4o", Type: "openai", OwnedBy: "openai"},
		{ID: "claude-sonnet-4-5", Type: "anthropic", OwnedBy: "anthropic"},
	}

	r.RegisterClient("client-1", "openai", models)

	if r.GetModelCount("gpt-4o") != 1 {
		t.Errorf("expected 1 client for gpt-4o, got %d", r.GetModelCount("gpt-4o"))
	}
	if r.GetModelCount("claude-sonnet-4-5") != 1 {
		t.Errorf("expected 1 client for claude-sonnet-4-5, got %d", r.GetModelCount("claude-sonnet-4-5"))
	}
	if r.ClientCount() != 1 {
		t.Errorf("expected 1 client, got %d", r.ClientCount())
	}

	r.UnregisterClient("client-1")
	if r.GetModelCount("gpt-4o") != 0 {
		t.Errorf("expected 0 clients after unregister, got %d", r.GetModelCount("gpt-4o"))
	}
}

func TestMultipleClientsSameModel(t *testing.T) {
	r := New()

	r.RegisterClient("c1", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})
	r.RegisterClient("c2", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})

	if r.GetModelCount("gpt-4o") != 2 {
		t.Errorf("expected 2 clients, got %d", r.GetModelCount("gpt-4o"))
	}

	r.UnregisterClient("c1")
	if r.GetModelCount("gpt-4o") != 1 {
		t.Errorf("expected 1 client after c1 unregister, got %d", r.GetModelCount("gpt-4o"))
	}
}

func TestQuotaExceeded(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})

	r.SetModelQuotaExceeded("c1", "gpt-4o")
	if r.GetModelCount("gpt-4o") != 0 {
		t.Errorf("expected 0 effective clients when quota exceeded, got %d", r.GetModelCount("gpt-4o"))
	}

	r.ClearModelQuotaExceeded("c1", "gpt-4o")
	if r.GetModelCount("gpt-4o") != 1 {
		t.Errorf("expected 1 client after clearing quota, got %d", r.GetModelCount("gpt-4o"))
	}
}

func TestSuspendResume(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})

	r.SuspendClientModel("c1", "gpt-4o", "test")
	if r.GetModelCount("gpt-4o") != 0 {
		t.Errorf("expected 0 when suspended, got %d", r.GetModelCount("gpt-4o"))
	}

	r.ResumeClientModel("c1", "gpt-4o")
	if r.GetModelCount("gpt-4o") != 1 {
		t.Errorf("expected 1 after resume, got %d", r.GetModelCount("gpt-4o"))
	}
}

func TestGetAvailableModels(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{
		{ID: "gpt-4o", Type: "openai", OwnedBy: "openai"},
		{ID: "gpt-3.5-turbo", Type: "openai", OwnedBy: "openai"},
	})

	models := r.GetAvailableModels("openai")
	if len(models) != 2 {
		t.Errorf("expected 2 available models, got %d", len(models))
	}
}

func TestGetModelProviders(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})
	r.RegisterClient("c2", "azure", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})

	providers := r.GetModelProviders("gpt-4o")
	if len(providers) != 2 {
		t.Errorf("expected 2 providers, got %d", len(providers))
	}
}

func TestClientSupportsModel(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})

	if !r.ClientSupportsModel("c1", "gpt-4o") {
		t.Error("expected c1 to support gpt-4o")
	}
	if r.ClientSupportsModel("c1", "claude-sonnet-4-5") {
		t.Error("expected c1 to not support claude-sonnet-4-5")
	}
	if r.ClientSupportsModel("c2", "gpt-4o") {
		t.Error("expected c2 to not exist")
	}
}

func TestGetModelInfo(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{
		{ID: "gpt-4o", Type: "openai", ContextLength: 128000},
	})

	info := r.GetModelInfo("gpt-4o", "openai")
	if info == nil {
		t.Fatal("expected model info")
	}
	if info.ContextLength != 128000 {
		t.Errorf("expected 128000 context, got %d", info.ContextLength)
	}
}

func TestHookCalled(t *testing.T) {
	r := New()
	hook := &testHook{regDone: make(chan struct{}, 1), unregDone: make(chan struct{}, 1)}
	r.SetHook(hook)

	r.RegisterClient("c1", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})

	// Wait for async hook
	select {
	case <-hook.regDone:
	case <-time.After(2 * time.Second):
		t.Fatal("registration hook timed out")
	}

	r.UnregisterClient("c1")

	select {
	case <-hook.unregDone:
	case <-time.After(2 * time.Second):
		t.Fatal("unregistration hook timed out")
	}

	if hook.registered.Load() != 1 {
		t.Errorf("expected 1 registration, got %d", hook.registered.Load())
	}
	if hook.unregistered.Load() != 1 {
		t.Errorf("expected 1 unregistration, got %d", hook.unregistered.Load())
	}
}

func TestGetModelsForClient(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{
		{ID: "gpt-4o", Type: "openai"},
		{ID: "gpt-3.5-turbo", Type: "openai"},
	})

	models := r.GetModelsForClient("c1")
	if len(models) != 2 {
		t.Errorf("expected 2 models, got %d", len(models))
	}

	models = r.GetModelsForClient("c2")
	if models != nil {
		t.Errorf("expected nil for unknown client, got %v", models)
	}
}

func TestReconciliation(t *testing.T) {
	r := New()

	// Register with 2 models
	r.RegisterClient("c1", "openai", []*ModelInfo{
		{ID: "gpt-4o", Type: "openai"},
		{ID: "gpt-3.5-turbo", Type: "openai"},
	})
	if r.GetModelCount("gpt-4o") != 1 {
		t.Error("expected gpt-4o registered")
	}

	// Re-register with different model set (remove gpt-3.5, add gpt-4)
	r.RegisterClient("c1", "openai", []*ModelInfo{
		{ID: "gpt-4o", Type: "openai"},
		{ID: "gpt-4", Type: "openai"},
	})

	if r.GetModelCount("gpt-3.5-turbo") != 0 {
		t.Error("expected gpt-3.5-turbo removed")
	}
	if r.GetModelCount("gpt-4") != 1 {
		t.Error("expected gpt-4 added")
	}
}

func TestCleanupExpiredQuotas(t *testing.T) {
	r := New()
	r.RegisterClient("c1", "openai", []*ModelInfo{{ID: "gpt-4o", Type: "openai"}})
	r.SetModelQuotaExceeded("c1", "gpt-4o")

	// Quota should still be active
	if r.GetModelCount("gpt-4o") != 0 {
		t.Error("expected 0 when quota exceeded")
	}

	r.CleanupExpiredQuotas()
	// Quota not yet expired, should still be 0
	if r.GetModelCount("gpt-4o") != 0 {
		t.Error("expected 0 before quota window expires")
	}
}

type testHook struct {
	registered   atomic.Int32
	unregistered atomic.Int32
	regDone      chan struct{}
	unregDone    chan struct{}
}

func (h *testHook) OnModelsRegistered(_ context.Context, _, _ string, _ []*ModelInfo) {
	h.registered.Add(1)
	select {
	case h.regDone <- struct{}{}:
	default:
	}
}

func (h *testHook) OnModelsUnregistered(_ context.Context, _, _ string) {
	h.unregistered.Add(1)
	select {
	case h.unregDone <- struct{}{}:
	default:
	}
}
