package service

import (
	"context"
	"sync"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
)

// ModelPricing holds per-model token pricing from the model_registry.
type ModelPricing struct {
	InputPricePer1k  float64 // dollars per 1k input tokens
	OutputPricePer1k float64 // dollars per 1k output tokens
}

// PricingService provides model pricing lookups from the DB.
type PricingService struct {
	mu       sync.RWMutex
	modelRepo ModelPricingRepo
	cache     map[string]*ModelPricing
}

// ModelPricingRepo is the minimal interface for pricing lookups.
type ModelPricingRepo interface {
	ListAllPricing(ctx context.Context) ([]domain.ModelRegistry, error)
}

// NewPricingService creates a new pricing service.
func NewPricingService(repo ModelPricingRepo) *PricingService {
	return &PricingService{
		modelRepo: repo,
		cache:     make(map[string]*ModelPricing),
	}
}

// RefreshCache reloads pricing data from the database.
func (ps *PricingService) RefreshCache(ctx context.Context) {
	models, err := ps.modelRepo.ListAllPricing(ctx)
	if err != nil {
		logger.Warn("pricing_refresh_failed", "error", err.Error())
		return
	}

	ps.mu.Lock()
	defer ps.mu.Unlock()

	ps.cache = make(map[string]*ModelPricing, len(models))
	for _, m := range models {
		if m.InputPricePer1k > 0 || m.OutputPricePer1k > 0 {
			// Store by model_id (without provider prefix) for flexible matching
			ps.cache[m.ModelID] = &ModelPricing{
				InputPricePer1k:  m.InputPricePer1k,
				OutputPricePer1k: m.OutputPricePer1k,
			}
		}
	}
}

// GetPricing returns the pricing for a model, or nil if not found.
// Accepts either "provider/model" or just "model" format.
func (ps *PricingService) GetPricing(modelID string) *ModelPricing {
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	// Try exact match
	if p, ok := ps.cache[modelID]; ok {
		return p
	}

	// Try without provider prefix
	if idx := indexOf(modelID, '/'); idx >= 0 {
		short := modelID[idx+1:]
		if p, ok := ps.cache[short]; ok {
			return p
		}
	}

	return nil
}

// CalculateCost calculates the cost in cents for a request using per-model pricing.
// Falls back to the flat formula if no model pricing is found.
func (ps *PricingService) CalculateCost(modelID string, inputTokens, outputTokens int) int {
	pricing := ps.GetPricing(modelID)
	if pricing != nil {
		// pricing is in dollars per 1k tokens, convert to cents
		inputCost := float64(inputTokens) * pricing.InputPricePer1k / 1000 * 100
		outputCost := float64(outputTokens) * pricing.OutputPricePer1k / 1000 * 100
		cost := int(inputCost + outputCost)
		if cost < 1 {
			cost = 1 // minimum 1 cent
		}
		return cost
	}

	// Fallback: flat formula (legacy)
	cost := (inputTokens + outputTokens) * 2
	if cost < 100 {
		cost = 100
	}
	return cost
}

func indexOf(s string, c byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == c {
			return i
		}
	}
	return -1
}
