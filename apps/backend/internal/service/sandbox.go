package service

import (
	"context"
	"fmt"
	"strings"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/pkg/llm"
)

type SandboxService struct {
	providerSvc *ProviderService
	creditSvc   *CreditService
}

func NewSandboxService(providerSvc *ProviderService, creditSvc *CreditService) *SandboxService {
	return &SandboxService{
		providerSvc: providerSvc,
		creditSvc:   creditSvc,
	}
}

func (s *SandboxService) Chat(ctx context.Context, req domain.ChatRequest, userID string) (*llm.ChatResponse, *domain.AppError) {
	resp, err := s.providerSvc.Chat(ctx, req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *SandboxService) ChatStream(ctx context.Context, req domain.ChatRequest, userID string) (<-chan llm.StreamChunk, *domain.AppError) {
	ch, err := s.providerSvc.ChatStream(ctx, req)
	if err != nil {
		return nil, err
	}
	return ch, nil
}

func (s *SandboxService) ValidateRequest(req domain.ChatRequest) *domain.AppError {
	if req.Model == "" {
		return domain.NewError(domain.ErrBadRequest, 400, "model is required")
	}
	if len(req.Messages) == 0 {
		return domain.NewError(domain.ErrBadRequest, 400, "messages are required")
	}
	for i, m := range req.Messages {
		if m.Role == "" {
			return domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("message %d: role is required", i))
		}
		if m.Content == "" && m.Role != "assistant" {
			return domain.NewError(domain.ErrBadRequest, 400, fmt.Sprintf("message %d: content is required", i))
		}
	}
	return nil
}

func (s *SandboxService) EstimateTokens(model string, messages []domain.ChatMessage) (inputTokens, outputTokens int) {
	return s.providerSvc.EstimateTokens(model, messages)
}

func (s *SandboxService) ListModels(ctx context.Context) ([]llm.ModelInfo, *domain.AppError) {
	return s.providerSvc.ListModels(ctx)
}

func IsSandboxRequest(ctx context.Context) bool {
	if val, ok := ctx.Value("sandbox").(bool); ok {
		return val
	}
	return false
}

func WithSandbox(ctx context.Context) context.Context {
	return context.WithValue(ctx, "sandbox", true)
}

func StripSandboxHeader(headers map[string]string) map[string]string {
	result := make(map[string]string, len(headers))
	for k, v := range headers {
		if !strings.EqualFold(k, "X-Sandbox") {
			result[k] = v
		}
	}
	return result
}
