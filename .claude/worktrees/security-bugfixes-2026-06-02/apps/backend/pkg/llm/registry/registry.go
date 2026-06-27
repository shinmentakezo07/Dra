// Package registry provides centralized model management for all AI providers.
// Inspired by CLIProxyAPI's model_registry.go — implements a dynamic model registry
// with reference counting, quota tracking, suspension, and hooks.
package registry

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"
)

// ModelInfo represents metadata about an available model.
type ModelInfo struct {
	ID                      string   `json:"id"`
	Object                  string   `json:"object,omitempty"`
	Created                 int64    `json:"created,omitempty"`
	OwnedBy                 string   `json:"owned_by,omitempty"`
	Type                    string   `json:"type,omitempty"`
	DisplayName             string   `json:"display_name,omitempty"`
	Name                    string   `json:"name,omitempty"`
	Version                 string   `json:"version,omitempty"`
	Description             string   `json:"description,omitempty"`
	ContextLength           int      `json:"context_length,omitempty"`
	MaxCompletionTokens     int      `json:"max_completion_tokens,omitempty"`
	SupportedParameters     []string `json:"supported_parameters,omitempty"`
	SupportedInputModalities  []string `json:"supported_input_modalities,omitempty"`
	SupportedOutputModalities []string `json:"supported_output_modalities,omitempty"`
	Thinking                *ThinkingSupport `json:"thinking,omitempty"`
	UserDefined             bool     `json:"-"`
}

// ThinkingSupport describes a model's reasoning/thinking capabilities.
type ThinkingSupport struct {
	Min            int      `json:"min,omitempty"`
	Max            int      `json:"max,omitempty"`
	ZeroAllowed    bool     `json:"zero_allowed,omitempty"`
	DynamicAllowed bool     `json:"dynamic_allowed,omitempty"`
	Levels         []string `json:"levels,omitempty"`
}

// ModelRegistration tracks a model's availability across clients.
type ModelRegistration struct {
	Info                 *ModelInfo
	InfoByProvider       map[string]*ModelInfo
	Count                int
	LastUpdated          time.Time
	QuotaExceededClients map[string]*time.Time
	Providers            map[string]int
	SuspendedClients     map[string]string
}

// ModelRegistryHook provides callbacks for model registration changes.
type ModelRegistryHook interface {
	OnModelsRegistered(ctx context.Context, provider, clientID string, models []*ModelInfo)
	OnModelsUnregistered(ctx context.Context, provider, clientID string)
}

// ModelRegistry manages the global registry of available models.
type ModelRegistry struct {
	models          map[string]*ModelRegistration
	clientModels    map[string][]string
	clientModelInfos map[string]map[string]*ModelInfo
	clientProviders map[string]string
	mutex           sync.RWMutex
	hook            ModelRegistryHook
}

const modelQuotaExceededWindow = 5 * time.Minute

// New creates a new ModelRegistry.
func New() *ModelRegistry {
	return &ModelRegistry{
		models:          make(map[string]*ModelRegistration),
		clientModels:    make(map[string][]string),
		clientModelInfos: make(map[string]map[string]*ModelInfo),
		clientProviders: make(map[string]string),
	}
}

// SetHook sets an optional hook for observing model registration changes.
func (r *ModelRegistry) SetHook(hook ModelRegistryHook) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	r.hook = hook
}

// RegisterClient registers a client and its supported models.
func (r *ModelRegistry) RegisterClient(clientID, provider string, models []*ModelInfo) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	provider = strings.ToLower(strings.TrimSpace(provider))
	uniqueModelIDs := make([]string, 0, len(models))
	rawModelIDs := make([]string, 0, len(models))
	newModels := make(map[string]*ModelInfo, len(models))
	newCounts := make(map[string]int, len(models))

	for _, model := range models {
		if model == nil || model.ID == "" {
			continue
		}
		rawModelIDs = append(rawModelIDs, model.ID)
		newCounts[model.ID]++
		if _, exists := newModels[model.ID]; exists {
			continue
		}
		newModels[model.ID] = model
		uniqueModelIDs = append(uniqueModelIDs, model.ID)
	}

	if len(uniqueModelIDs) == 0 {
		r.unregisterClientInternal(clientID)
		delete(r.clientModels, clientID)
		delete(r.clientModelInfos, clientID)
		delete(r.clientProviders, clientID)
		return
	}

	now := time.Now()
	oldModels, hadExisting := r.clientModels[clientID]
	oldProvider := r.clientProviders[clientID]

	if !hadExisting {
		for _, modelID := range rawModelIDs {
			r.addModelRegistration(modelID, provider, newModels[modelID], now)
		}
		r.clientModels[clientID] = append([]string(nil), rawModelIDs...)
		clientInfos := make(map[string]*ModelInfo, len(newModels))
		for id, m := range newModels {
			clientInfos[id] = cloneModelInfo(m)
		}
		r.clientModelInfos[clientID] = clientInfos
		if provider != "" {
			r.clientProviders[clientID] = provider
		}
		r.triggerModelsRegistered(provider, clientID, models)
		slog.Debug("registry: registered client", "client", clientID, "provider", provider, "models", len(rawModelIDs))
		return
	}

	// Reconciliation: compute added/removed
	oldCounts := make(map[string]int, len(oldModels))
	for _, id := range oldModels {
		oldCounts[id]++
	}

	var added, removed []string
	for _, id := range uniqueModelIDs {
		if oldCounts[id] == 0 {
			added = append(added, id)
		}
	}
	for id := range oldCounts {
		if newCounts[id] == 0 {
			removed = append(removed, id)
		}
	}

	// Apply removals
	for _, id := range removed {
		for i := 0; i < oldCounts[id]; i++ {
			r.removeModelRegistration(clientID, id, oldProvider, now)
		}
	}
	for id, oldCount := range oldCounts {
		newCount := newCounts[id]
		if newCount == 0 || oldCount <= newCount {
			continue
		}
		for i := 0; i < oldCount-newCount; i++ {
			r.removeModelRegistration(clientID, id, oldProvider, now)
		}
	}

	// Apply additions
	for id, newCount := range newCounts {
		oldCount := oldCounts[id]
		if newCount <= oldCount {
			continue
		}
		for i := 0; i < newCount-oldCount; i++ {
			r.addModelRegistration(id, provider, newModels[id], now)
		}
	}

	// Update metadata
	for _, id := range uniqueModelIDs {
		if reg, ok := r.models[id]; ok {
			reg.Info = cloneModelInfo(newModels[id])
			if provider != "" {
				if reg.InfoByProvider == nil {
					reg.InfoByProvider = make(map[string]*ModelInfo)
				}
				reg.InfoByProvider[provider] = cloneModelInfo(newModels[id])
			}
			reg.LastUpdated = now
			if reg.QuotaExceededClients != nil {
				delete(reg.QuotaExceededClients, clientID)
			}
			if reg.SuspendedClients != nil {
				delete(reg.SuspendedClients, clientID)
			}
		}
	}

	r.clientModels[clientID] = append([]string(nil), rawModelIDs...)
	clientInfos := make(map[string]*ModelInfo, len(newModels))
	for id, m := range newModels {
		clientInfos[id] = cloneModelInfo(m)
	}
	r.clientModelInfos[clientID] = clientInfos
	if provider != "" {
		r.clientProviders[clientID] = provider
	}

	r.triggerModelsRegistered(provider, clientID, models)
	slog.Debug("registry: reconciled client", "client", clientID, "provider", provider, "added", len(added), "removed", len(removed))
}

// UnregisterClient removes a client and decrements counts for its models.
func (r *ModelRegistry) UnregisterClient(clientID string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	r.unregisterClientInternal(clientID)
}

func (r *ModelRegistry) unregisterClientInternal(clientID string) {
	models, exists := r.clientModels[clientID]
	provider := r.clientProviders[clientID]
	if !exists {
		return
	}

	now := time.Now()
	for _, modelID := range models {
		if reg, ok := r.models[modelID]; ok {
			reg.Count--
			reg.LastUpdated = now
			delete(reg.QuotaExceededClients, clientID)
			if reg.SuspendedClients != nil {
				delete(reg.SuspendedClients, clientID)
			}
			if provider != "" && reg.Providers != nil {
				if count, ok := reg.Providers[provider]; ok {
					if count <= 1 {
						delete(reg.Providers, provider)
						if reg.InfoByProvider != nil {
							delete(reg.InfoByProvider, provider)
						}
					} else {
						reg.Providers[provider] = count - 1
					}
				}
			}
			if reg.Count <= 0 {
				delete(r.models, modelID)
			}
		}
	}

	delete(r.clientModels, clientID)
	delete(r.clientModelInfos, clientID)
	delete(r.clientProviders, clientID)
	r.triggerModelsUnregistered(provider, clientID)
	slog.Debug("registry: unregistered client", "client", clientID)
}

// SetModelQuotaExceeded marks a model as quota exceeded for a client.
func (r *ModelRegistry) SetModelQuotaExceeded(clientID, modelID string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	if reg, ok := r.models[modelID]; ok {
		now := time.Now()
		reg.QuotaExceededClients[clientID] = &now
	}
}

// ClearModelQuotaExceeded removes quota exceeded status.
func (r *ModelRegistry) ClearModelQuotaExceeded(clientID, modelID string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	if reg, ok := r.models[modelID]; ok {
		delete(reg.QuotaExceededClients, clientID)
	}
}

// SuspendClientModel temporarily disables a client's model.
func (r *ModelRegistry) SuspendClientModel(clientID, modelID, reason string) {
	if clientID == "" || modelID == "" {
		return
	}
	r.mutex.Lock()
	defer r.mutex.Unlock()
	reg, ok := r.models[modelID]
	if !ok || reg == nil {
		return
	}
	if reg.SuspendedClients == nil {
		reg.SuspendedClients = make(map[string]string)
	}
	if _, already := reg.SuspendedClients[clientID]; already {
		return
	}
	reg.SuspendedClients[clientID] = reason
	reg.LastUpdated = time.Now()
	slog.Debug("registry: suspended client model", "client", clientID, "model", modelID, "reason", reason)
}

// ResumeClientModel clears a suspension.
func (r *ModelRegistry) ResumeClientModel(clientID, modelID string) {
	if clientID == "" || modelID == "" {
		return
	}
	r.mutex.Lock()
	defer r.mutex.Unlock()
	reg, ok := r.models[modelID]
	if !ok || reg == nil || reg.SuspendedClients == nil {
		return
	}
	delete(reg.SuspendedClients, clientID)
	reg.LastUpdated = time.Now()
}

// GetAvailableModels returns all models with at least one available client.
func (r *ModelRegistry) GetAvailableModels(handlerType string) []map[string]any {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	now := time.Now()
	models := make([]map[string]any, 0, len(r.models))

	for _, reg := range r.models {
		effectiveClients := r.effectiveClientCount(reg, now)
		if effectiveClients > 0 {
			model := r.convertModelToMap(reg.Info, handlerType)
			if model != nil {
				models = append(models, model)
			}
		}
	}
	return models
}

// GetModelInfo returns ModelInfo, prioritizing provider-specific definition.
func (r *ModelRegistry) GetModelInfo(modelID, provider string) *ModelInfo {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	if reg, ok := r.models[modelID]; ok && reg != nil {
		if provider != "" && reg.InfoByProvider != nil && reg.Providers != nil {
			if count, ok := reg.Providers[provider]; ok && count > 0 {
				if info, ok := reg.InfoByProvider[provider]; ok && info != nil {
					return cloneModelInfo(info)
				}
			}
		}
		return cloneModelInfo(reg.Info)
	}
	return nil
}

// GetModelCount returns the number of available clients for a model.
func (r *ModelRegistry) GetModelCount(modelID string) int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	if reg, ok := r.models[modelID]; ok {
		return r.effectiveClientCount(reg, time.Now())
	}
	return 0
}

// GetModelProviders returns providers that supply the given model.
func (r *ModelRegistry) GetModelProviders(modelID string) []string {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	reg, ok := r.models[modelID]
	if !ok || reg == nil || len(reg.Providers) == 0 {
		return nil
	}

	type providerCount struct {
		name  string
		count int
	}
	providers := make([]providerCount, 0, len(reg.Providers))
	for name, count := range reg.Providers {
		if count > 0 {
			providers = append(providers, providerCount{name: name, count: count})
		}
	}

	sort.Slice(providers, func(i, j int) bool {
		if providers[i].count == providers[j].count {
			return providers[i].name < providers[j].name
		}
		return providers[i].count > providers[j].count
	})

	result := make([]string, 0, len(providers))
	for _, p := range providers {
		result = append(result, p.name)
	}
	return result
}

// ClientSupportsModel reports whether a client registered support for a model.
func (r *ModelRegistry) ClientSupportsModel(clientID, modelID string) bool {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	models, exists := r.clientModels[clientID]
	if !exists {
		return false
	}
	for _, id := range models {
		if strings.EqualFold(id, modelID) {
			return true
		}
	}
	return false
}

// GetModelsForClient returns models registered for a specific client.
func (r *ModelRegistry) GetModelsForClient(clientID string) []*ModelInfo {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	modelIDs, exists := r.clientModels[clientID]
	if !exists || len(modelIDs) == 0 {
		return nil
	}

	clientInfos := r.clientModelInfos[clientID]
	seen := make(map[string]struct{})
	result := make([]*ModelInfo, 0, len(modelIDs))

	for _, modelID := range modelIDs {
		if _, dup := seen[modelID]; dup {
			continue
		}
		seen[modelID] = struct{}{}

		if clientInfos != nil {
			if info, ok := clientInfos[modelID]; ok && info != nil {
				result = append(result, cloneModelInfo(info))
				continue
			}
		}
		if reg, ok := r.models[modelID]; ok && reg.Info != nil {
			result = append(result, cloneModelInfo(reg.Info))
		}
	}
	return result
}

// CleanupExpiredQuotas removes expired quota tracking entries.
func (r *ModelRegistry) CleanupExpiredQuotas() {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	now := time.Now()
	for _, reg := range r.models {
		for clientID, quotaTime := range reg.QuotaExceededClients {
			if quotaTime != nil && now.Sub(*quotaTime) >= modelQuotaExceededWindow {
				delete(reg.QuotaExceededClients, clientID)
			}
		}
	}
}

// GetFirstAvailableModel returns the first available model for a handler type.
func (r *ModelRegistry) GetFirstAvailableModel(handlerType string) (string, error) {
	models := r.GetAvailableModels(handlerType)
	if len(models) == 0 {
		return "", fmt.Errorf("no models available for handler type: %s", handlerType)
	}

	sort.Slice(models, func(i, j int) bool {
		createdI, _ := models[i]["created"].(int64)
		createdJ, _ := models[j]["created"].(int64)
		return createdI > createdJ
	})

	for _, model := range models {
		if modelID, ok := model["id"].(string); ok {
			if r.GetModelCount(modelID) > 0 {
				return modelID, nil
			}
		}
	}
	return "", fmt.Errorf("no available clients for any model in handler type: %s", handlerType)
}

// ModelCount returns the total number of registered models.
func (r *ModelRegistry) ModelCount() int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return len(r.models)
}

// ClientCount returns the total number of registered clients.
func (r *ModelRegistry) ClientCount() int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return len(r.clientModels)
}

// --- Internal helpers ---

func (r *ModelRegistry) addModelRegistration(modelID, provider string, model *ModelInfo, now time.Time) {
	if model == nil || modelID == "" {
		return
	}
	if existing, ok := r.models[modelID]; ok {
		existing.Count++
		existing.LastUpdated = now
		existing.Info = cloneModelInfo(model)
		if provider != "" {
			if existing.Providers == nil {
				existing.Providers = make(map[string]int)
			}
			existing.Providers[provider]++
			if existing.InfoByProvider == nil {
				existing.InfoByProvider = make(map[string]*ModelInfo)
			}
			existing.InfoByProvider[provider] = cloneModelInfo(model)
		}
		return
	}

	reg := &ModelRegistration{
		Info:                 cloneModelInfo(model),
		InfoByProvider:       make(map[string]*ModelInfo),
		Count:                1,
		LastUpdated:          now,
		QuotaExceededClients: make(map[string]*time.Time),
		SuspendedClients:     make(map[string]string),
	}
	if provider != "" {
		reg.Providers = map[string]int{provider: 1}
		reg.InfoByProvider[provider] = cloneModelInfo(model)
	}
	r.models[modelID] = reg
}

func (r *ModelRegistry) removeModelRegistration(clientID, modelID, provider string, now time.Time) {
	reg, ok := r.models[modelID]
	if !ok {
		return
	}
	reg.Count--
	reg.LastUpdated = now
	delete(reg.QuotaExceededClients, clientID)
	if reg.SuspendedClients != nil {
		delete(reg.SuspendedClients, clientID)
	}
	if reg.Count < 0 {
		reg.Count = 0
	}
	if provider != "" && reg.Providers != nil {
		if count, ok := reg.Providers[provider]; ok {
			if count <= 1 {
				delete(reg.Providers, provider)
				if reg.InfoByProvider != nil {
					delete(reg.InfoByProvider, provider)
				}
			} else {
				reg.Providers[provider] = count - 1
			}
		}
	}
	if reg.Count <= 0 {
		delete(r.models, modelID)
	}
}

func (r *ModelRegistry) effectiveClientCount(reg *ModelRegistration, now time.Time) int {
	expiredClients := 0
	for _, quotaTime := range reg.QuotaExceededClients {
		if quotaTime != nil && now.Sub(*quotaTime) < modelQuotaExceededWindow {
			expiredClients++
		}
	}
	suspendedClients := 0
	if reg.SuspendedClients != nil {
		suspendedClients = len(reg.SuspendedClients)
	}
	result := reg.Count - expiredClients - suspendedClients
	if result < 0 {
		return 0
	}
	return result
}

func (r *ModelRegistry) triggerModelsRegistered(provider, clientID string, models []*ModelInfo) {
	if r.hook == nil {
		return
	}
	modelsCopy := cloneModelInfos(models)
	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("registry: hook panic", "error", rec)
			}
		}()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		r.hook.OnModelsRegistered(ctx, provider, clientID, modelsCopy)
	}()
}

func (r *ModelRegistry) triggerModelsUnregistered(provider, clientID string) {
	if r.hook == nil {
		return
	}
	go func() {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("registry: hook panic", "error", rec)
			}
		}()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		r.hook.OnModelsUnregistered(ctx, provider, clientID)
	}()
}

func (r *ModelRegistry) convertModelToMap(model *ModelInfo, handlerType string) map[string]any {
	if model == nil {
		return nil
	}

	switch handlerType {
	case "openai":
		result := map[string]any{
			"id":        model.ID,
			"object":    "model",
			"owned_by":  model.OwnedBy,
		}
		if model.Created > 0 {
			result["created"] = model.Created
		}
		if model.ContextLength > 0 {
			result["context_length"] = model.ContextLength
		}
		if model.MaxCompletionTokens > 0 {
			result["max_completion_tokens"] = model.MaxCompletionTokens
		}
		if len(model.SupportedParameters) > 0 {
			result["supported_parameters"] = append([]string(nil), model.SupportedParameters...)
		}
		return result

	case "anthropic", "claude":
		result := map[string]any{
			"id":       model.ID,
			"object":   "model",
			"owned_by": model.OwnedBy,
		}
		if model.Created > 0 {
			result["created_at"] = model.Created
		}
		return result

	case "gemini":
		result := map[string]any{
			"name": model.Name,
		}
		if model.Name == "" {
			result["name"] = model.ID
		}
		if model.Version != "" {
			result["version"] = model.Version
		}
		if model.DisplayName != "" {
			result["displayName"] = model.DisplayName
		}
		if model.ContextLength > 0 {
			result["inputTokenLimit"] = model.ContextLength
		}
		if model.MaxCompletionTokens > 0 {
			result["outputTokenLimit"] = model.MaxCompletionTokens
		}
		return result

	default:
		return map[string]any{
			"id":       model.ID,
			"object":   "model",
			"owned_by": model.OwnedBy,
		}
	}
}

func cloneModelInfo(model *ModelInfo) *ModelInfo {
	if model == nil {
		return nil
	}
	cpy := *model
	if len(model.SupportedParameters) > 0 {
		cpy.SupportedParameters = append([]string(nil), model.SupportedParameters...)
	}
	if len(model.SupportedInputModalities) > 0 {
		cpy.SupportedInputModalities = append([]string(nil), model.SupportedInputModalities...)
	}
	if len(model.SupportedOutputModalities) > 0 {
		cpy.SupportedOutputModalities = append([]string(nil), model.SupportedOutputModalities...)
	}
	if model.Thinking != nil {
		thinkingCopy := *model.Thinking
		if len(model.Thinking.Levels) > 0 {
			thinkingCopy.Levels = append([]string(nil), model.Thinking.Levels...)
		}
		cpy.Thinking = &thinkingCopy
	}
	return &cpy
}

func cloneModelInfos(models []*ModelInfo) []*ModelInfo {
	if len(models) == 0 {
		return nil
	}
	out := make([]*ModelInfo, 0, len(models))
	seen := make(map[string]struct{})
	for _, m := range models {
		if m == nil || m.ID == "" {
			continue
		}
		if _, dup := seen[m.ID]; dup {
			continue
		}
		seen[m.ID] = struct{}{}
		out = append(out, cloneModelInfo(m))
	}
	return out
}
