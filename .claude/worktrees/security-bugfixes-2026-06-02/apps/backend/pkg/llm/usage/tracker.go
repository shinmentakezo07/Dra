// Package usage provides per-request usage tracking with cost calculation,
// per-user/per-model/per-provider aggregation, and export capabilities.
package usage

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Record represents a single usage record.
type Record struct {
	ID             string
	RequestID      string
	VirtualKeyID   string
	UserID         string
	TeamID         string
	Model          string
	Provider       string
	InputTokens    int
	OutputTokens   int
	TotalTokens    int
	ThinkingTokens int
	CostMicroCents int64 // Cost in microcents (1/1000000 dollar)
	LatencyMs      int
	Status         string // success, error, timeout, rate_limited
	ErrorMessage   string
	IPAddress      string
	UserAgent      string
	Metadata       map[string]any
	CreatedAt      time.Time
}

// Pricing represents model pricing.
type Pricing struct {
	Model                   string
	Provider                string
	InputCostPerMillion     int64 // cents per 1M input tokens
	OutputCostPerMillion    int64 // cents per 1M output tokens
	ThinkingCostPerMillion  int64 // cents per 1M thinking tokens
}

// Store is the interface for usage record persistence.
type Store interface {
	Save(r *Record) error
	GetByRequest(requestID string) (*Record, error)
	GetByUser(userID string, since time.Time) ([]*Record, error)
	GetByModel(model string, since time.Time) ([]*Record, error)
	GetByProvider(provider string, since time.Time) ([]*Record, error)
	GetByTeam(teamID string, since time.Time) ([]*Record, error)
	AggregateByUser(userID string, since time.Time) (*Aggregate, error)
	AggregateByModel(model string, since time.Time) (*Aggregate, error)
	AggregateByProvider(provider string, since time.Time) (*Aggregate, error)
	AggregateGlobal(since time.Time) (*Aggregate, error)
}

// PricingStore is the interface for pricing data.
type PricingStore interface {
	GetPricing(model, provider string) (*Pricing, error)
	ListPricing() ([]*Pricing, error)
	SavePricing(p *Pricing) error
}

// Aggregate represents aggregated usage metrics.
type Aggregate struct {
	TotalRequests    int64
	TotalTokens      int64
	TotalInputTokens int64
	TotalOutputTokens int64
	TotalThinkingTokens int64
	TotalCostCents   int64
	AvgLatencyMs     float64
	ErrorCount       int64
	UniqueModels     int
	UniqueUsers      int
}

// Tracker tracks usage across requests.
type Tracker struct {
	store        Store
	pricingStore PricingStore
	mu           sync.RWMutex
	cache        map[string]*Pricing
	defaultPricing map[string]*Pricing
}

// NewTracker creates a new usage tracker.
func NewTracker(store Store, pricingStore PricingStore) *Tracker {
	t := &Tracker{
		store:        store,
		pricingStore: pricingStore,
		cache:        make(map[string]*Pricing),
		defaultPricing: defaultPricingMap(),
	}
	return t
}

// Record records usage for a completed request.
func (t *Tracker) Record(ctx context.Context, r *Record) error {
	if r.RequestID == "" {
		return fmt.Errorf("request ID is required")
	}
	if r.TotalTokens == 0 {
		r.TotalTokens = r.InputTokens + r.OutputTokens + r.ThinkingTokens
	}

	// Calculate cost if not set
	if r.CostMicroCents == 0 && r.TotalTokens > 0 {
		r.CostMicroCents = t.CalculateCost(r.Model, r.Provider, r.InputTokens, r.OutputTokens, r.ThinkingTokens)
	}

	r.CreatedAt = time.Now()
	return t.store.Save(r)
}

// CalculateCost calculates the cost in microcents for a request.
// Pricing is stored as cents per 1M tokens. To avoid integer division
// truncation with small token counts, we compute: tokens * centsPerMillion
// which directly yields microcents (since microcents = cents * 1M / 1M).
func (t *Tracker) CalculateCost(model, provider string, inputTokens, outputTokens, thinkingTokens int) int64 {
	p := t.getPricing(model, provider)
	if p == nil {
		return 0
	}

	inputMicroCents := int64(inputTokens) * p.InputCostPerMillion
	outputMicroCents := int64(outputTokens) * p.OutputCostPerMillion
	thinkingMicroCents := int64(thinkingTokens) * p.ThinkingCostPerMillion

	return inputMicroCents + outputMicroCents + thinkingMicroCents
}

// GetCostCents returns the cost in cents for a request.
func (t *Tracker) GetCostCents(model, provider string, inputTokens, outputTokens, thinkingTokens int) int64 {
	microCents := t.CalculateCost(model, provider, inputTokens, outputTokens, thinkingTokens)
	// Round up: if there's any fractional cent, charge 1 cent
	if microCents > 0 && microCents < 1_000_000 {
		return 1
	}
	return microCents / 1_000_000
}

// GetByRequest returns a usage record by request ID.
func (t *Tracker) GetByRequest(requestID string) (*Record, error) {
	return t.store.GetByRequest(requestID)
}

// GetUserSummary returns aggregated usage for a user.
func (t *Tracker) GetUserSummary(userID string, since time.Time) (*Aggregate, error) {
	return t.store.AggregateByUser(userID, since)
}

// GetModelSummary returns aggregated usage for a model.
func (t *Tracker) GetModelSummary(model string, since time.Time) (*Aggregate, error) {
	return t.store.AggregateByModel(model, since)
}

// GetProviderSummary returns aggregated usage for a provider.
func (t *Tracker) GetProviderSummary(provider string, since time.Time) (*Aggregate, error) {
	return t.store.AggregateByProvider(provider, since)
}

// GetGlobalSummary returns global aggregated usage.
func (t *Tracker) GetGlobalSummary(since time.Time) (*Aggregate, error) {
	return t.store.AggregateGlobal(since)
}

// SetPricing sets custom pricing for a model.
func (t *Tracker) SetPricing(p *Pricing) error {
	if err := t.pricingStore.SavePricing(p); err != nil {
		return err
	}
	t.mu.Lock()
	t.cache[pricingKey(p.Model, p.Provider)] = p
	t.mu.Unlock()
	return nil
}

// ListPricing returns all pricing data.
func (t *Tracker) ListPricing() ([]*Pricing, error) {
	return t.pricingStore.ListPricing()
}

func (t *Tracker) getPricing(model, provider string) *Pricing {
	key := pricingKey(model, provider)

	t.mu.RLock()
	if p, ok := t.cache[key]; ok {
		t.mu.RUnlock()
		return p
	}
	// Also check the "model" key (without provider)
	if provider != "" {
		if p, ok := t.cache[model]; ok {
			t.mu.RUnlock()
			return p
		}
	}
	t.mu.RUnlock()

	// Try exact match from store
	if t.pricingStore != nil {
		p, err := t.pricingStore.GetPricing(model, provider)
		if err == nil && p != nil {
			t.mu.Lock()
			t.cache[key] = p
			t.mu.Unlock()
			return p
		}
	}

	// Fall back to default pricing
	if p, ok := t.defaultPricing[model]; ok {
		t.mu.Lock()
		t.cache[model] = p
		t.mu.Unlock()
		return p
	}

	return nil
}

func pricingKey(model, provider string) string {
	if provider == "" {
		return model
	}
	return provider + "/" + model
}

func defaultPricingMap() map[string]*Pricing {
	return map[string]*Pricing{
		"gpt-4o":              {Model: "gpt-4o", InputCostPerMillion: 250, OutputCostPerMillion: 1000},
		"gpt-4o-mini":         {Model: "gpt-4o-mini", InputCostPerMillion: 15, OutputCostPerMillion: 60},
		"gpt-4-turbo":         {Model: "gpt-4-turbo", InputCostPerMillion: 1000, OutputCostPerMillion: 3000},
		"gpt-4":               {Model: "gpt-4", InputCostPerMillion: 3000, OutputCostPerMillion: 6000},
		"gpt-3.5-turbo":       {Model: "gpt-3.5-turbo", InputCostPerMillion: 50, OutputCostPerMillion: 150},
		"claude-3.5-sonnet":   {Model: "claude-3.5-sonnet", InputCostPerMillion: 300, OutputCostPerMillion: 1500},
		"claude-3.5-haiku":    {Model: "claude-3.5-haiku", InputCostPerMillion: 100, OutputCostPerMillion: 500},
		"claude-3-opus":       {Model: "claude-3-opus", InputCostPerMillion: 1500, OutputCostPerMillion: 7500},
		"claude-3-sonnet":     {Model: "claude-3-sonnet", InputCostPerMillion: 300, OutputCostPerMillion: 1500},
		"claude-3-haiku":      {Model: "claude-3-haiku", InputCostPerMillion: 25, OutputCostPerMillion: 125},
		"gemini-2.0-flash":    {Model: "gemini-2.0-flash", InputCostPerMillion: 10, OutputCostPerMillion: 40},
		"gemini-1.5-pro":      {Model: "gemini-1.5-pro", InputCostPerMillion: 125, OutputCostPerMillion: 500},
		"gemini-1.5-flash":    {Model: "gemini-1.5-flash", InputCostPerMillion: 7, OutputCostPerMillion: 30},
		"llama-3.1-70b":       {Model: "llama-3.1-70b", InputCostPerMillion: 80, OutputCostPerMillion: 80},
		"llama-3.1-8b":        {Model: "llama-3.1-8b", InputCostPerMillion: 20, OutputCostPerMillion: 20},
		"mixtral-8x7b":        {Model: "mixtral-8x7b", InputCostPerMillion: 50, OutputCostPerMillion: 50},
	}
}
