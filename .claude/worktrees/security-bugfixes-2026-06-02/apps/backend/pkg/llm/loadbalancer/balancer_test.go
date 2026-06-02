package loadbalancer

import (
	"sync"
	"testing"
)

func TestRoundRobin(t *testing.T) {
	b := New(StrategyRoundRobin)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: true})
	b.AddEndpoint(&Endpoint{ID: "e2", Model: "*", IsActive: true, IsHealthy: true})
	b.AddEndpoint(&Endpoint{ID: "e3", Model: "*", IsActive: true, IsHealthy: true})

	counts := make(map[string]int)
	for i := 0; i < 300; i++ {
		e := b.SelectEndpoint("")
		counts[e.ID]++
	}

	// Each should get roughly 100
	for id, count := range counts {
		if count < 90 || count > 110 {
			t.Errorf("endpoint %s got %d requests, expected ~100", id, count)
		}
	}
}

func TestLeastBusy(t *testing.T) {
	b := New(StrategyLeastBusy)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: true})
	b.AddEndpoint(&Endpoint{ID: "e2", Model: "*", IsActive: true, IsHealthy: true})

	// Simulate e1 being busy
	b.BeginRequest("e1")
	b.BeginRequest("e1")
	b.BeginRequest("e1")

	// e2 should be selected
	e := b.SelectEndpoint("")
	if e.ID != "e2" {
		t.Errorf("expected e2, got %s", e.ID)
	}
}

func TestLatencyBased(t *testing.T) {
	b := New(StrategyLatencyBased)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: true})
	b.AddEndpoint(&Endpoint{ID: "e2", Model: "*", IsActive: true, IsHealthy: true})

	// Simulate e1 being slow
	for i := 0; i < 10; i++ {
		b.RecordSuccess("e1", 500)
	}
	// Simulate e2 being fast
	for i := 0; i < 10; i++ {
		b.RecordSuccess("e2", 50)
	}

	e := b.SelectEndpoint("")
	if e.ID != "e2" {
		t.Errorf("expected e2 (faster), got %s", e.ID)
	}
}

func TestCostBased(t *testing.T) {
	b := New(StrategyCostBased)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: true, CostPerToken: 0.01})
	b.AddEndpoint(&Endpoint{ID: "e2", Model: "*", IsActive: true, IsHealthy: true, CostPerToken: 0.001})

	e := b.SelectEndpoint("")
	if e.ID != "e2" {
		t.Errorf("expected e2 (cheaper), got %s", e.ID)
	}
}

func TestWeighted(t *testing.T) {
	b := New(StrategyWeighted)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: true, Weight: 1})
	b.AddEndpoint(&Endpoint{ID: "e2", Model: "*", IsActive: true, IsHealthy: true, Weight: 3})

	counts := make(map[string]int)
	var mu sync.Mutex
	for i := 0; i < 4000; i++ {
		e := b.SelectEndpoint("")
		mu.Lock()
		counts[e.ID]++
		mu.Unlock()
	}

	// e2 should get roughly 3x more than e1
	if counts["e1"] > counts["e2"] {
		t.Errorf("expected e2 to get more requests: e1=%d, e2=%d", counts["e1"], counts["e2"])
	}
}

func TestModelFiltering(t *testing.T) {
	b := New(StrategyRoundRobin)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "gpt-4", IsActive: true, IsHealthy: true})
	b.AddEndpoint(&Endpoint{ID: "e2", Model: "claude-3", IsActive: true, IsHealthy: true})

	e := b.SelectEndpoint("gpt-4")
	if e.ID != "e1" {
		t.Errorf("expected e1 for gpt-4, got %s", e.ID)
	}

	e = b.SelectEndpoint("claude-3")
	if e.ID != "e2" {
		t.Errorf("expected e2 for claude-3, got %s", e.ID)
	}
}

func TestUnhealthyEndpoint(t *testing.T) {
	b := New(StrategyRoundRobin)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: false})
	b.AddEndpoint(&Endpoint{ID: "e2", Model: "*", IsActive: true, IsHealthy: true})

	e := b.SelectEndpoint("")
	if e.ID != "e2" {
		t.Errorf("expected e2 (healthy), got %s", e.ID)
	}
}

func TestNoEndpoints(t *testing.T) {
	b := New(StrategyRoundRobin)
	e := b.SelectEndpoint("")
	if e != nil {
		t.Error("expected nil for no endpoints")
	}
}

func TestRecordSuccessFailure(t *testing.T) {
	b := New(StrategyRoundRobin)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: true})

	b.BeginRequest("e1")
	b.RecordSuccess("e1", 100)

	b.BeginRequest("e1")
	b.RecordFailure("e1")

	stats := b.Stats()
	if stats["e1"].TotalRequests.Load() != 2 {
		t.Errorf("expected 2 total requests, got %d", stats["e1"].TotalRequests.Load())
	}
	if stats["e1"].TotalErrors.Load() != 1 {
		t.Errorf("expected 1 error, got %d", stats["e1"].TotalErrors.Load())
	}
}

func TestSetHealthy(t *testing.T) {
	b := New(StrategyRoundRobin)
	b.AddEndpoint(&Endpoint{ID: "e1", Model: "*", IsActive: true, IsHealthy: true})

	b.SetHealthy("e1", false)
	e := b.SelectEndpoint("")
	if e != nil {
		t.Error("expected nil after marking unhealthy")
	}

	b.SetHealthy("e1", true)
	e = b.SelectEndpoint("")
	if e == nil {
		t.Error("expected endpoint after marking healthy")
	}
}
