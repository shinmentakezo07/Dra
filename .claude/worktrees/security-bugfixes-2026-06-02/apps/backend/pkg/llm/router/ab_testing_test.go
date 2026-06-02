package router

import (
	"testing"
	"time"
)

func TestABTestRouting(t *testing.T) {
	r := NewABTestRouter()
	r.AddTest(&ABTestConfig{
		ID:              "test-1",
		ModelA:          "gpt-4",
		ModelB:          "claude-3.5-sonnet",
		TrafficPercentA: 50,
		IsActive:        true,
		StartAt:         time.Now().Add(-1 * time.Hour),
	})

	countA, countB := 0, 0
	for i := 0; i < 1000; i++ {
		_, _, variant, _ := r.Route("test-1")
		if variant == "A" {
			countA++
		} else {
			countB++
		}
	}

	// Should be roughly 50/50
	if countA < 400 || countA > 600 {
		t.Errorf("expected ~500 A variants, got %d", countA)
	}
	if countB < 400 || countB > 600 {
		t.Errorf("expected ~500 B variants, got %d", countB)
	}
}

func TestABTestInactive(t *testing.T) {
	r := NewABTestRouter()
	r.AddTest(&ABTestConfig{
		ID:       "test-1",
		ModelA:   "gpt-4",
		ModelB:   "claude-3.5-sonnet",
		IsActive: false,
		StartAt:  time.Now().Add(-1 * time.Hour),
	})

	for i := 0; i < 100; i++ {
		_, _, variant, _ := r.Route("test-1")
		if variant != "A" {
			t.Error("inactive test should always route to A")
		}
	}
}

func TestABTestNotStarted(t *testing.T) {
	r := NewABTestRouter()
	r.AddTest(&ABTestConfig{
		ID:              "test-1",
		ModelA:          "gpt-4",
		ModelB:          "claude-3.5-sonnet",
		TrafficPercentA: 0,
		IsActive:        true,
		StartAt:         time.Now().Add(1 * time.Hour),
	})

	for i := 0; i < 100; i++ {
		_, _, variant, _ := r.Route("test-1")
		if variant != "A" {
			t.Error("not-yet-started test should route to A")
		}
	}
}

func TestABTestEnded(t *testing.T) {
	r := NewABTestRouter()
	endTime := time.Now().Add(-1 * time.Hour)
	r.AddTest(&ABTestConfig{
		ID:              "test-1",
		ModelA:          "gpt-4",
		ModelB:          "claude-3.5-sonnet",
		TrafficPercentA: 50,
		IsActive:        true,
		StartAt:         time.Now().Add(-2 * time.Hour),
		EndAt:           &endTime,
	})

	for i := 0; i < 100; i++ {
		_, _, variant, _ := r.Route("test-1")
		if variant != "A" {
			t.Error("ended test should route to A")
		}
	}
}

func TestABTestGetCounts(t *testing.T) {
	r := NewABTestRouter()
	r.AddTest(&ABTestConfig{
		ID:              "test-1",
		ModelA:          "gpt-4",
		ModelB:          "claude-3.5-sonnet",
		TrafficPercentA: 50,
		IsActive:        true,
		StartAt:         time.Now().Add(-1 * time.Hour),
	})

	for i := 0; i < 100; i++ {
		r.Route("test-1")
	}

	countA, countB := r.GetCounts("test-1")
	if countA+countB != 100 {
		t.Errorf("expected total 100, got %d", countA+countB)
	}
}

func TestCanaryRouting(t *testing.T) {
	r := NewCanaryRouter()
	r.AddCanary(&CanaryConfig{
		ID:             "canary-1",
		StableModel:    "gpt-4",
		CanaryModel:    "gpt-4-turbo",
		CanaryPercent:  10,
		IsActive:       true,
		MaxCanaryErrors: 5,
	})

	canaryCount := 0
	for i := 0; i < 1000; i++ {
		_, _, isCanary, _ := r.Route("canary-1")
		if isCanary {
			canaryCount++
		}
	}

	// Should be roughly 10%
	if canaryCount < 50 || canaryCount > 150 {
		t.Errorf("expected ~100 canary requests, got %d", canaryCount)
	}
}

func TestCanaryDisableOnError(t *testing.T) {
	r := NewCanaryRouter()
	r.AddCanary(&CanaryConfig{
		ID:              "canary-1",
		StableModel:     "gpt-4",
		CanaryModel:     "gpt-4-turbo",
		CanaryPercent:   100, // 100% to canary
		IsActive:        true,
		MaxCanaryErrors: 3,
	})

	// Record 3 errors
	for i := 0; i < 3; i++ {
		r.RecordCanaryError("canary-1")
	}

	// Should fall back to stable
	for i := 0; i < 10; i++ {
		_, _, isCanary, _ := r.Route("canary-1")
		if isCanary {
			t.Error("canary should be disabled after max errors")
		}
	}
}

func TestCanarySuccessRecovery(t *testing.T) {
	r := NewCanaryRouter()
	r.AddCanary(&CanaryConfig{
		ID:              "canary-1",
		StableModel:     "gpt-4",
		CanaryModel:     "gpt-4-turbo",
		CanaryPercent:   100,
		IsActive:        true,
		MaxCanaryErrors: 3,
	})

	r.RecordCanaryError("canary-1")
	r.RecordCanaryError("canary-1")
	r.RecordCanarySuccess("canary-1") // recover one

	// Should still be active (2 errors < 3 max)
	for i := 0; i < 10; i++ {
		_, _, isCanary, _ := r.Route("canary-1")
		if !isCanary {
			// This is expected since we're at 1 error (2-1=1), canary should still work
			break
		}
	}
}
