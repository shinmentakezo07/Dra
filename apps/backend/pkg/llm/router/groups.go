package router

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"sync/atomic"

	"dra-platform/backend/pkg/llm"
)

// ModelGroup represents a group of deployments for the same user-facing model.
// E.g., "gpt-4o" can have OpenAI + Azure + self-hosted deployments.
type ModelGroup struct {
	Name         string
	Deployments  []Deployment
}

// Deployment is a single model deployment within a group.
type Deployment struct {
	ModelID       string  // Fully-qualified model ID (e.g., "openai/gpt-4o")
	ProviderName  string  // Provider that hosts this deployment
	Weight        int     // Routing weight (higher = more traffic)
	Active        bool    // Whether this deployment is currently active
}

// FallbackChain defines a sequence of models to try on failure.
type FallbackChain struct {
	Primary   string   // Primary model ID
	Fallbacks []string // Ordered list of fallback model IDs
}

// GroupRouter routes requests through model groups with load balancing and fallbacks.
type GroupRouter struct {
	mu       sync.RWMutex
	groups   map[string]*ModelGroup   // model_group_name -> deployments
	fallbacks map[string]*FallbackChain // model_id -> fallback chain
	wildcards map[string]string        // provider_name -> wildcard pattern
}

// NewGroupRouter creates a new group router.
func NewGroupRouter() *GroupRouter {
	return &GroupRouter{
		groups:    make(map[string]*ModelGroup),
		fallbacks: make(map[string]*FallbackChain),
		wildcards: make(map[string]string),
	}
}

// SetGroups replaces all model groups from DB data.
func (gr *GroupRouter) SetGroups(groups map[string]*ModelGroup) {
	gr.mu.Lock()
	defer gr.mu.Unlock()
	gr.groups = groups
}

// SetFallbacks replaces all fallback chains from DB data.
func (gr *GroupRouter) SetFallbacks(fallbacks map[string]*FallbackChain) {
	gr.mu.Lock()
	defer gr.mu.Unlock()
	gr.fallbacks = fallbacks
}

// SetWildcards replaces all wildcard entries.
func (gr *GroupRouter) SetWildcards(wildcards map[string]string) {
	gr.mu.Lock()
	defer gr.mu.Unlock()
	gr.wildcards = wildcards
}

// ResolveModel resolves a model ID to a fully-qualified provider/model ID.
// Resolution order:
// 1. Model group match (load-balanced)
// 2. Wildcard match
// 3. Direct pass-through (provider/model format)
func (gr *GroupRouter) ResolveModel(modelID string) (providerName, resolvedModel string, err error) {
	gr.mu.RLock()
	defer gr.mu.RUnlock()

	// 1. Check model groups
	if group, ok := gr.groups[modelID]; ok {
		deployment := gr.pickDeployment(group)
		if deployment != nil {
			return deployment.ProviderName, deployment.ModelID, nil
		}
	}

	// 2. Check wildcards
	for provName, pattern := range gr.wildcards {
		if pattern == "*" || pattern == modelID {
			return provName, modelID, nil
		}
	}

	// 3. Direct pass-through (provider/model format)
	providerName, modelName := llm.ParseModelID(modelID)
	if providerName != "" {
		return providerName, modelName, nil
	}

	return "", modelID, fmt.Errorf("no provider found for model: %s", modelID)
}

// GetFallbacks returns the fallback model IDs for a given model.
func (gr *GroupRouter) GetFallbacks(modelID string) []string {
	gr.mu.RLock()
	defer gr.mu.RUnlock()

	if chain, ok := gr.fallbacks[modelID]; ok {
		return chain.Fallbacks
	}
	return nil
}

// pickDeployment selects a deployment using weighted random selection.
func (gr *GroupRouter) pickDeployment(group *ModelGroup) *Deployment {
	var active []Deployment
	var totalWeight int
	for _, d := range group.Deployments {
		if d.Active && d.Weight > 0 {
			active = append(active, d)
			totalWeight += d.Weight
		}
	}
	if len(active) == 0 {
		return nil
	}
	if len(active) == 1 {
		return &active[0]
	}

	// Weighted random selection
	r := rand.Intn(totalWeight)
	cumulative := 0
	for i := range active {
		cumulative += active[i].Weight
		if r < cumulative {
			return &active[i]
		}
	}
	return &active[len(active)-1]
}

// GroupStats returns routing statistics for all groups.
func (gr *GroupRouter) GroupStats() map[string]interface{} {
	gr.mu.RLock()
	defer gr.mu.RUnlock()

	stats := make(map[string]interface{})
	for name, group := range gr.groups {
		var activeCount int
		for _, d := range group.Deployments {
			if d.Active {
				activeCount++
			}
		}
		stats[name] = map[string]interface{}{
			"deployments": len(group.Deployments),
			"active":      activeCount,
		}
	}
	return stats
}

// BuildGroupsFromModels builds model groups from a flat list of model registry entries.
// Models with the same model_group value are grouped together.
func BuildGroupsFromModels(models []struct {
	ModelID      string
	ModelGroup   string
	ProviderName string
	RoutingWeight int
	Status       string
}) map[string]*ModelGroup {
	groups := make(map[string]*ModelGroup)
	for _, m := range models {
		if m.ModelGroup == "" {
			continue
		}
		group, ok := groups[m.ModelGroup]
		if !ok {
			group = &ModelGroup{Name: m.ModelGroup}
			groups[m.ModelGroup] = group
		}
		group.Deployments = append(group.Deployments, Deployment{
			ModelID:      m.ProviderName + "/" + m.ModelID,
			ProviderName: m.ProviderName,
			Weight:       m.RoutingWeight,
			Active:       m.Status == "active",
		})
	}
	return groups
}

// BuildFallbacksFromModels builds fallback chains from model registry entries.
func BuildFallbacksFromModels(models []struct {
	ModelID        string
	ProviderName   string
	FallbackModels json.RawMessage
}) map[string]*FallbackChain {
	chains := make(map[string]*FallbackChain)
	for _, m := range models {
		if len(m.FallbackModels) == 0 {
			continue
		}
		var fallbacks []string
		if err := json.Unmarshal(m.FallbackModels, &fallbacks); err != nil {
			continue
		}
		if len(fallbacks) == 0 {
			continue
		}
		fullID := m.ProviderName + "/" + m.ModelID
		chains[fullID] = &FallbackChain{
			Primary:   fullID,
			Fallbacks: fallbacks,
		}
	}
	return chains
}

// ExpandModelGroup expands a model group name to a specific deployment model ID.
// Used by the provider service before routing to a provider.
func ExpandModelGroup(modelID string, groups map[string]*ModelGroup) string {
	if group, ok := groups[modelID]; ok {
		var active []Deployment
		var totalWeight int
		for _, d := range group.Deployments {
			if d.Active && d.Weight > 0 {
				active = append(active, d)
				totalWeight += d.Weight
			}
		}
		if len(active) == 0 {
			return modelID
		}
		r := rand.Intn(totalWeight)
		cumulative := 0
		for _, d := range active {
			cumulative += d.Weight
			if r < cumulative {
				return d.ModelID
			}
		}
		return active[len(active)-1].ModelID
	}
	return modelID
}

// WrapWithFallback wraps a channel with fallback logic.
// If the primary stream fails (empty or error), it tries fallback models.
func WrapWithFallback(ctx context.Context, modelID string, gr *GroupRouter, chatFn func(ctx context.Context, model string) (<-chan llm.StreamChunk, error)) (<-chan llm.StreamChunk, error) {
	ch, err := chatFn(ctx, modelID)
	if err == nil {
		// Check if the channel actually produces content
		wrapped := make(chan llm.StreamChunk, 64)
		go func() {
			defer close(wrapped)
			var gotContent bool
			for chunk := range ch {
				if chunk.Delta.Content != "" || len(chunk.Delta.ToolCalls) > 0 {
					gotContent = true
				}
				select {
				case wrapped <- chunk:
				case <-ctx.Done():
					return
				}
			}
			if !gotContent {
				// Primary produced no content, try fallbacks
				tryFallbacks(ctx, modelID, gr, chatFn, wrapped)
			}
		}()
		return wrapped, nil
	}

	// Primary failed, try fallbacks
	return tryFallbacksOnError(ctx, modelID, gr, chatFn, err)
}

func tryFallbacks(ctx context.Context, modelID string, gr *GroupRouter, chatFn func(ctx context.Context, model string) (<-chan llm.StreamChunk, error), out chan<- llm.StreamChunk) {
	fallbacks := gr.GetFallbacks(modelID)
	for _, fb := range fallbacks {
		fbCh, fbErr := chatFn(ctx, fb)
		if fbErr != nil {
			continue
		}
		for chunk := range fbCh {
			select {
			case out <- chunk:
			case <-ctx.Done():
				return
			}
		}
		return
	}
}

func tryFallbacksOnError(ctx context.Context, modelID string, gr *GroupRouter, chatFn func(ctx context.Context, model string) (<-chan llm.StreamChunk, error), primaryErr error) (<-chan llm.StreamChunk, error) {
	fallbacks := gr.GetFallbacks(modelID)
	if len(fallbacks) == 0 {
		return nil, primaryErr
	}

	var lastErr error = primaryErr
	for _, fb := range fallbacks {
		ch, err := chatFn(ctx, fb)
		if err != nil {
			lastErr = err
			continue
		}
		return ch, nil
	}
	return nil, fmt.Errorf("all fallbacks failed (last error: %w)", lastErr)
}

// WrapWithFallbackSync is the non-streaming version of fallback wrapping.
func WrapWithFallbackSync(ctx context.Context, modelID string, gr *GroupRouter, chatFn func(ctx context.Context, model string) (*llm.ChatResponse, error)) (*llm.ChatResponse, error) {
	resp, err := chatFn(ctx, modelID)
	if err == nil {
		return resp, nil
	}

	// Try fallbacks
	fallbacks := gr.GetFallbacks(modelID)
	if len(fallbacks) == 0 {
		return nil, err
	}

	var lastErr error = err
	for _, fb := range fallbacks {
		resp, fbErr := chatFn(ctx, fb)
		if fbErr != nil {
			lastErr = fbErr
			continue
		}
		return resp, nil
	}
	return nil, fmt.Errorf("all fallbacks failed (last error: %w)", lastErr)
}

// NormalizeModelName strips provider prefix for group matching.
func NormalizeModelName(modelID string) string {
	if idx := strings.Index(modelID, "/"); idx >= 0 {
		return modelID[idx+1:]
	}
	return modelID
}

// Incrementing counter for group stats.
var groupRequestCount uint64

func nextGroupRequestID() uint64 {
	return atomic.AddUint64(&groupRequestCount, 1)
}
