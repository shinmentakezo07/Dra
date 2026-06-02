package usage

import (
	"context"
	"sync"
	"testing"
	"time"
)

type memoryStore struct {
	mu      sync.RWMutex
	records []*Record
}

func (s *memoryStore) Save(r *Record) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records = append(s.records, r)
	return nil
}

func (s *memoryStore) GetByRequest(requestID string) (*Record, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, r := range s.records {
		if r.RequestID == requestID {
			return r, nil
		}
	}
	return nil, nil
}

func (s *memoryStore) GetByUser(userID string, since time.Time) ([]*Record, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Record
	for _, r := range s.records {
		if r.UserID == userID && r.CreatedAt.After(since) {
			result = append(result, r)
		}
	}
	return result, nil
}

func (s *memoryStore) GetByModel(model string, since time.Time) ([]*Record, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Record
	for _, r := range s.records {
		if r.Model == model && r.CreatedAt.After(since) {
			result = append(result, r)
		}
	}
	return result, nil
}

func (s *memoryStore) GetByProvider(provider string, since time.Time) ([]*Record, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Record
	for _, r := range s.records {
		if r.Provider == provider && r.CreatedAt.After(since) {
			result = append(result, r)
		}
	}
	return result, nil
}

func (s *memoryStore) GetByTeam(teamID string, since time.Time) ([]*Record, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Record
	for _, r := range s.records {
		if r.TeamID == teamID && r.CreatedAt.After(since) {
			result = append(result, r)
		}
	}
	return result, nil
}

func (s *memoryStore) aggregate(records []*Record) *Aggregate {
	a := &Aggregate{}
	latencySum := 0.0
	models := make(map[string]bool)
	users := make(map[string]bool)
	for _, r := range records {
		a.TotalRequests++
		a.TotalTokens += int64(r.TotalTokens)
		a.TotalInputTokens += int64(r.InputTokens)
		a.TotalOutputTokens += int64(r.OutputTokens)
		a.TotalThinkingTokens += int64(r.ThinkingTokens)
		a.TotalCostCents += r.CostMicroCents / 1_000_000
		latencySum += float64(r.LatencyMs)
		if r.Status != "success" {
			a.ErrorCount++
		}
		models[r.Model] = true
		users[r.UserID] = true
	}
	if a.TotalRequests > 0 {
		a.AvgLatencyMs = latencySum / float64(a.TotalRequests)
	}
	a.UniqueModels = len(models)
	a.UniqueUsers = len(users)
	return a
}

func (s *memoryStore) AggregateByUser(userID string, since time.Time) (*Aggregate, error) {
	records, _ := s.GetByUser(userID, since)
	return s.aggregate(records), nil
}

func (s *memoryStore) AggregateByModel(model string, since time.Time) (*Aggregate, error) {
	records, _ := s.GetByModel(model, since)
	return s.aggregate(records), nil
}

func (s *memoryStore) AggregateByProvider(provider string, since time.Time) (*Aggregate, error) {
	records, _ := s.GetByProvider(provider, since)
	return s.aggregate(records), nil
}

func (s *memoryStore) AggregateGlobal(since time.Time) (*Aggregate, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var records []*Record
	for _, r := range s.records {
		if r.CreatedAt.After(since) {
			records = append(records, r)
		}
	}
	return s.aggregate(records), nil
}

type memoryPricingStore struct {
	mu       sync.RWMutex
	pricings map[string]*Pricing
}

func (s *memoryPricingStore) GetPricing(model, provider string) (*Pricing, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key := pricingKey(model, provider)
	return s.pricings[key], nil
}

func (s *memoryPricingStore) ListPricing() ([]*Pricing, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Pricing
	for _, p := range s.pricings {
		result = append(result, p)
	}
	return result, nil
}

func (s *memoryPricingStore) SavePricing(p *Pricing) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := pricingKey(p.Model, p.Provider)
	s.pricings[key] = p
	return nil
}

func TestRecordUsage(t *testing.T) {
	store := &memoryStore{}
	ps := &memoryPricingStore{pricings: make(map[string]*Pricing)}
	tracker := NewTracker(store, ps)

	ctx := context.Background()
	err := tracker.Record(ctx, &Record{
		RequestID:    "req-1",
		UserID:       "user-1",
		Model:        "gpt-4o",
		Provider:     "openai",
		InputTokens:  1000,
		OutputTokens: 500,
		LatencyMs:    200,
		Status:       "success",
	})
	if err != nil {
		t.Fatalf("Record: %v", err)
	}

	r, _ := tracker.GetByRequest("req-1")
	if r == nil {
		t.Fatal("expected record")
	}
	if r.TotalTokens != 1500 {
		t.Errorf("expected 1500 tokens, got %d", r.TotalTokens)
	}
}

func TestCostCalculation(t *testing.T) {
	store := &memoryStore{}
	ps := &memoryPricingStore{pricings: make(map[string]*Pricing)}
	tracker := NewTracker(store, ps)

	// gpt-4o: $2.50/M input, $10/M output = 250 cents/M input, 1000 cents/M output
	// microcents = tokens * centsPerMillion
	// For 1000 input + 500 output: 1000*250 + 500*1000 = 250000 + 500000 = 750000
	costMicroCents := tracker.CalculateCost("gpt-4o", "openai", 1000, 500, 0)
	expected := int64(750000)
	if costMicroCents != expected {
		t.Errorf("expected %d microcents, got %d", expected, costMicroCents)
	}
}

func TestCostCentsConversion(t *testing.T) {
	store := &memoryStore{}
	ps := &memoryPricingStore{pricings: make(map[string]*Pricing)}
	tracker := NewTracker(store, ps)

	// 1M input tokens at $2.50/M = $2.50 = 250 cents
	costCents := tracker.GetCostCents("gpt-4o", "openai", 1_000_000, 0, 0)
	if costCents != 250 {
		t.Errorf("expected 250 cents, got %d", costCents)
	}

	// Small amount should round up to 1 cent
	costCents = tracker.GetCostCents("gpt-4o", "openai", 100, 0, 0)
	if costCents != 1 {
		t.Errorf("expected 1 cent for small amount, got %d", costCents)
	}
}

func TestCustomPricing(t *testing.T) {
	store := &memoryStore{}
	ps := &memoryPricingStore{pricings: make(map[string]*Pricing)}
	tracker := NewTracker(store, ps)

	tracker.SetPricing(&Pricing{
		Model:               "custom-model",
		Provider:            "custom",
		InputCostPerMillion: 100,
		OutputCostPerMillion: 200,
	})

	cost := tracker.CalculateCost("custom-model", "custom", 1000, 1000, 0)
	if cost == 0 {
		t.Error("expected non-zero cost for custom model")
	}
}

func TestAggregation(t *testing.T) {
	store := &memoryStore{}
	ps := &memoryPricingStore{pricings: make(map[string]*Pricing)}
	tracker := NewTracker(store, ps)

	ctx := context.Background()
	tracker.Record(ctx, &Record{RequestID: "r1", UserID: "u1", Model: "gpt-4o", InputTokens: 100, OutputTokens: 50, Status: "success"})
	tracker.Record(ctx, &Record{RequestID: "r2", UserID: "u1", Model: "gpt-4o", InputTokens: 200, OutputTokens: 100, Status: "error"})
	tracker.Record(ctx, &Record{RequestID: "r3", UserID: "u2", Model: "claude-3.5-sonnet", InputTokens: 300, OutputTokens: 150, Status: "success"})

	agg, _ := tracker.GetUserSummary("u1", time.Time{})
	if agg.TotalRequests != 2 {
		t.Errorf("expected 2 requests, got %d", agg.TotalRequests)
	}
	if agg.ErrorCount != 1 {
		t.Errorf("expected 1 error, got %d", agg.ErrorCount)
	}
}
