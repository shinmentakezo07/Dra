package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type ProviderPluginService struct {
	repo *repository.ProviderPluginRepo
}

func NewProviderPluginService(repo *repository.ProviderPluginRepo) *ProviderPluginService {
	return &ProviderPluginService{repo: repo}
}

func (s *ProviderPluginService) Create(ctx context.Context, userID string, req domain.CreateProviderPluginRequest) (*domain.ProviderPlugin, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	p, err := s.repo.Create(ctx, userID, req)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create provider plugin", err)
	}
	return p, nil
}

func (s *ProviderPluginService) List(ctx context.Context) ([]domain.ProviderPlugin, *domain.AppError) {
	plugins, err := s.repo.List(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list provider plugins", err)
	}
	return plugins, nil
}

func (s *ProviderPluginService) GetByID(ctx context.Context, id string) (*domain.ProviderPlugin, *domain.AppError) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get provider plugin", err)
	}
	return p, nil
}

func (s *ProviderPluginService) Toggle(ctx context.Context, id string, active bool) *domain.AppError {
	if err := s.repo.Toggle(ctx, id, active); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to toggle provider plugin", err)
	}
	return nil
}

func (s *ProviderPluginService) Delete(ctx context.Context, id string) *domain.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete provider plugin", err)
	}
	return nil
}
