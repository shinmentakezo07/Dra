package service

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/provider"
	"dra-platform/backend/pkg/llm"
	llmprovider "dra-platform/backend/pkg/llm/provider"
)

type Experiment struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	VariantA    Variant   `json:"variant_a"`
	VariantB    Variant   `json:"variant_b"`
	TrafficSplit float64  `json:"traffic_split"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Variant struct {
	Name       string  `json:"name"`
	Model      string  `json:"model"`
	Provider   string  `json:"provider"`
	Config     map[string]interface{} `json:"config,omitempty"`
	TrafficPct float64 `json:"traffic_pct"`
}

type ExperimentResult struct {
	ExperimentID string    `json:"experiment_id"`
	Variant      string    `json:"variant"`
	RequestCount int64     `json:"request_count"`
	AvgLatency   float64   `json:"avg_latency_ms"`
	ErrorRate    float64   `json:"error_rate"`
	AvgTokens    float64   `json:"avg_tokens"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ExperimentService struct {
	mu          sync.RWMutex
	experiments map[string]*Experiment
	results     map[string]map[string]*ExperimentResult
	registry    *llmprovider.Registry
	providerSvc *ProviderService
}

func NewExperimentService(registry *llmprovider.Registry, providerSvc *ProviderService) *ExperimentService {
	return &ExperimentService{
		experiments: make(map[string]*Experiment),
		results:     make(map[string]map[string]*ExperimentResult),
		registry:    registry,
		providerSvc: providerSvc,
	}
}

func (s *ExperimentService) CreateExperiment(exp *Experiment) error {
	if exp.Name == "" {
		return fmt.Errorf("experiment name is required")
	}
	if exp.VariantA.Name == "" || exp.VariantB.Name == "" {
		return fmt.Errorf("both variants are required")
	}
	if exp.TrafficSplit < 0 || exp.TrafficSplit > 1 {
		return fmt.Errorf("traffic split must be between 0 and 1")
	}

	exp.ID = generateExperimentID()
	exp.Status = "active"
	exp.CreatedAt = time.Now()
	exp.UpdatedAt = time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()
	s.experiments[exp.ID] = exp
	s.results[exp.ID] = map[string]*ExperimentResult{
		exp.VariantA.Name: {
			ExperimentID: exp.ID,
			Variant:      exp.VariantA.Name,
			UpdatedAt:    time.Now(),
		},
		exp.VariantB.Name: {
			ExperimentID: exp.ID,
			Variant:      exp.VariantB.Name,
			UpdatedAt:    time.Now(),
		},
	}

	return nil
}

func (s *ExperimentService) GetExperiment(id string) (*Experiment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	exp, ok := s.experiments[id]
	if !ok {
		return nil, fmt.Errorf("experiment not found")
	}
	return exp, nil
}

func (s *ExperimentService) ListExperiments() []*Experiment {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*Experiment, 0, len(s.experiments))
	for _, exp := range s.experiments {
		result = append(result, exp)
	}
	return result
}

func (s *ExperimentService) StopExperiment(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	exp, ok := s.experiments[id]
	if !ok {
		return fmt.Errorf("experiment not found")
	}
	exp.Status = "stopped"
	exp.UpdatedAt = time.Now()
	return nil
}

func (s *ExperimentService) SelectVariant(experimentID string) (*Variant, error) {
	exp, err := s.GetExperiment(experimentID)
	if err != nil {
		return nil, err
	}
	if exp.Status != "active" {
		return nil, fmt.Errorf("experiment is not active")
	}

	if rand.Float64() < exp.TrafficSplit {
		return &exp.VariantA, nil
	}
	return &exp.VariantB, nil
}

func (s *ExperimentService) SelectVariantByName(experimentID, variantName string) (*Variant, error) {
	exp, err := s.GetExperiment(experimentID)
	if err != nil {
		return nil, err
	}
	if exp.VariantA.Name == variantName {
		return &exp.VariantA, nil
	}
	if exp.VariantB.Name == variantName {
		return &exp.VariantB, nil
	}
	return nil, fmt.Errorf("variant not found")
}

func (s *ExperimentService) RecordResult(experimentID, variantName string, latency time.Duration, tokens int, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	results, ok := s.results[experimentID]
	if !ok {
		return
	}

	result, ok := results[variantName]
	if !ok {
		return
	}

	result.RequestCount++
	result.AvgLatency = (result.AvgLatency*float64(result.RequestCount-1) + float64(latency.Milliseconds())) / float64(result.RequestCount)
	result.AvgTokens = (result.AvgTokens*float64(result.RequestCount-1) + float64(tokens)) / float64(result.RequestCount)

	if err != nil {
		errors := result.ErrorRate * float64(result.RequestCount-1)
		result.ErrorRate = (errors + 1.0) / float64(result.RequestCount)
	} else {
		errors := result.ErrorRate * float64(result.RequestCount-1)
		result.ErrorRate = errors / float64(result.RequestCount)
	}

	result.UpdatedAt = time.Now()
}

func (s *ExperimentService) GetResults(experimentID string) ([]*ExperimentResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	results, ok := s.results[experimentID]
	if !ok {
		return nil, fmt.Errorf("experiment not found")
	}

	result := make([]*ExperimentResult, 0, len(results))
	for _, r := range results {
		result = append(result, r)
	}
	return result, nil
}

func (s *ExperimentService) ChatWithVariant(ctx context.Context, experimentID string, req domain.ChatRequest) (*provider.ChatResponse, *domain.AppError) {
	variant, err := s.SelectVariant(experimentID)
	if err != nil {
		return nil, domain.NewError(domain.ErrBadRequest, 400, err.Error())
	}

	req.Model = variant.Model
	start := time.Now()
	resp, appErr := s.providerSvc.Chat(ctx, req)
	latency := time.Since(start)

	tokens := 0
	if resp != nil {
		tokens = resp.InputTokens + resp.OutputTokens
	}
	s.RecordResult(experimentID, variant.Name, latency, tokens, nil)
	if appErr != nil {
		s.RecordResult(experimentID, variant.Name, latency, tokens, appErr)
	}

	return resp, appErr
}

func (s *ExperimentService) ChatStreamWithVariant(ctx context.Context, experimentID string, req domain.ChatRequest) (<-chan provider.StreamChunk, *domain.AppError) {
	variant, err := s.SelectVariant(experimentID)
	if err != nil {
		return nil, domain.NewError(domain.ErrBadRequest, 400, err.Error())
	}

	req.Model = variant.Model
	return s.providerSvc.ChatStream(ctx, req)
}

func (s *ExperimentService) GetProviderForVariant(variant *Variant) (llm.Provider, error) {
	if variant.Provider == "" {
		return nil, fmt.Errorf("provider not specified")
	}
	p, ok := s.registry.Get(variant.Provider)
	if !ok {
		return nil, fmt.Errorf("provider not found: %s", variant.Provider)
	}
	return p, nil
}

func generateExperimentID() string {
	return fmt.Sprintf("exp-%d", time.Now().UnixNano())
}
