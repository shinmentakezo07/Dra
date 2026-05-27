package router

import (
	"context"
	"sort"
	"strings"

	"dra-platform/backend/pkg/llm"
	llmprovider "dra-platform/backend/pkg/llm/provider"
)

// BudgetRouter finds cheaper models when the requested model exceeds budget.
type BudgetRouter struct {
	registry *llmprovider.Registry
}

// NewBudgetRouter creates a budget-aware router.
func NewBudgetRouter(registry *llmprovider.Registry) *BudgetRouter {
	return &BudgetRouter{registry: registry}
}

// ModelOption represents a candidate model with estimated cost.
type ModelOption struct {
	ModelID       string
	Provider      string
	InputPrice    float64
	OutputPrice   float64
	EstimatedCost int
}

// FindAffordableModel searches for a cheaper model the user can afford.
// It returns the model ID to use and true if a downgrade was performed.
func (br *BudgetRouter) FindAffordableModel(ctx context.Context, requestedModel string, budget int, estimatedInputTokens, estimatedOutputTokens int) (string, bool) {
	models, err := br.registry.AllModels(ctx)
	if err != nil {
		return requestedModel, false
	}

	// Find requested model info to get actual capabilities and price
	var requestedInfo *llm.ModelInfo
	for i := range models {
		if matchModel(models[i].ID, requestedModel) || matchModel(models[i].Provider+"/"+models[i].ID, requestedModel) {
			requestedInfo = &models[i]
			break
		}
	}

	// Compute estimated cost for the requested model using the same heuristic as the credit system
	currentCost := CostEstimate(estimatedInputTokens, estimatedOutputTokens)

	// If the requested model is already affordable, no routing needed
	if budget >= currentCost {
		return requestedModel, false
	}

	needsTools := requestedInfo != nil && requestedInfo.SupportsTools
	needsVision := requestedInfo != nil && requestedInfo.SupportsVision
	needsThinking := requestedInfo != nil && requestedInfo.SupportsThinking

	var currentPrice float64
	if requestedInfo != nil {
		currentPrice = requestedInfo.InputPricePer1k + requestedInfo.OutputPricePer1k
	}

	var candidates []ModelOption
	for _, m := range models {
		modelID := m.ID
		if m.Provider != "" && !strings.Contains(m.ID, "/") {
			modelID = m.Provider + "/" + m.ID
		}

		if matchModel(modelID, requestedModel) {
			continue
		}

		if needsTools && !m.SupportsTools {
			continue
		}
		if needsVision && !m.SupportsVision {
			continue
		}
		if needsThinking && !m.SupportsThinking {
			continue
		}

		price := m.InputPricePer1k + m.OutputPricePer1k
		if currentPrice > 0 && price >= currentPrice {
			continue
		}

		estCost := int((float64(estimatedInputTokens)/1000.0*m.InputPricePer1k + float64(estimatedOutputTokens)/1000.0*m.OutputPricePer1k) * 100)
		if estCost < 100 {
			estCost = 100
		}

		candidates = append(candidates, ModelOption{
			ModelID:       modelID,
			Provider:      m.Provider,
			InputPrice:    m.InputPricePer1k,
			OutputPrice:   m.OutputPricePer1k,
			EstimatedCost: estCost,
		})
	}

	if len(candidates) == 0 {
		return requestedModel, false
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].InputPrice+candidates[i].OutputPrice < candidates[j].InputPrice+candidates[j].OutputPrice
	})

	for _, c := range candidates {
		if c.EstimatedCost <= budget {
			return c.ModelID, true
		}
	}

	// If none fit the budget, return the absolute cheapest as a fallback
	return candidates[0].ModelID, true
}

func matchModel(modelID, pattern string) bool {
	if modelID == pattern {
		return true
	}
	parts := strings.Split(modelID, "/")
	if len(parts) == 2 && parts[1] == pattern {
		return true
	}
	return strings.Contains(strings.ToLower(modelID), strings.ToLower(pattern))
}

// CostEstimate calculates estimated credits for given tokens.
func CostEstimate(inputTokens, outputTokens int) int {
	total := (inputTokens + outputTokens) * 2
	if total < 100 {
		return 100
	}
	return total
}
