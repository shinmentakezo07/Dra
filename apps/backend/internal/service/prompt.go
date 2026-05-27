package service

import (
	"context"
	"encoding/json"
	"strings"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

// PromptService handles prompt template business logic.
type PromptService struct {
	repo *repository.PromptRepo
}

// NewPromptService creates a new PromptService.
func NewPromptService(repo *repository.PromptRepo) *PromptService {
	return &PromptService{repo: repo}
}

// CreatePrompt creates a new prompt template version.
func (s *PromptService) CreatePrompt(ctx context.Context, userID, name, template, model string, config map[string]interface{}) (*repository.Prompt, *domain.AppError) {
	if name == "" || template == "" {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "Name and template are required")
	}

	var configBytes []byte
	if config != nil {
		configBytes, _ = json.Marshal(config)
	}

	prompt, err := s.repo.CreatePrompt(ctx, userID, name, template, model, configBytes)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create prompt", err)
	}
	return prompt, nil
}

// ListPrompts returns all prompt templates for a user.
func (s *PromptService) ListPrompts(ctx context.Context, userID string, page, limit int) ([]repository.Prompt, *domain.AppError) {
	prompts, err := s.repo.ListPrompts(ctx, userID, limit, (page-1)*limit)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list prompts", err)
	}
	return prompts, nil
}

// GetPrompt retrieves the latest version of a prompt by name for a user.
func (s *PromptService) GetPrompt(ctx context.Context, userID, name string) (*repository.Prompt, *domain.AppError) {
	prompt, err := s.repo.GetPrompt(ctx, userID, name)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get prompt", err)
	}
	if prompt == nil {
		return nil, domain.NewError(domain.ErrNotFound, 404, "Prompt not found")
	}
	return prompt, nil
}

// RenderPrompt renders a prompt template with variables.
func (s *PromptService) RenderPrompt(ctx context.Context, userID, name string, variables map[string]string) (*repository.Prompt, string, *domain.AppError) {
	prompt, err := s.repo.GetPrompt(ctx, userID, name)
	if err != nil {
		return nil, "", domain.Wrap(domain.ErrInternal, 500, "failed to get prompt", err)
	}
	if prompt == nil {
		return nil, "", domain.NewError(domain.ErrNotFound, 404, "Prompt not found")
	}

	rendered := renderTemplate(prompt.Template, variables)
	return prompt, rendered, nil
}

// DeletePrompt removes all versions of a prompt for a user.
func (s *PromptService) DeletePrompt(ctx context.Context, userID, name string) *domain.AppError {
	if err := s.repo.DeletePrompt(ctx, userID, name); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete prompt", err)
	}
	return nil
}

func renderTemplate(template string, vars map[string]string) string {
	result := template
	for k, v := range vars {
		result = strings.ReplaceAll(result, "{{"+k+"}}", v)
	}
	return result
}
