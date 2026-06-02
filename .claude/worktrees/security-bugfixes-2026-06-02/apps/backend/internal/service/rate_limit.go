package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type RateLimitService struct {
	repo *repository.RateLimitRepo
}

func NewRateLimitService(repo *repository.RateLimitRepo) *RateLimitService {
	return &RateLimitService{repo: repo}
}

func (s *RateLimitService) GetUserTier(ctx context.Context, userID string) (string, *domain.AppError) {
	tier, err := s.repo.GetUserTier(ctx, userID)
	if err != nil {
		return "free", domain.Wrap(domain.ErrInternal, 500, "failed to get user tier", err)
	}
	return tier, nil
}

func (s *RateLimitService) GetTierLimits(ctx context.Context, tier string) (*domain.RateLimit, *domain.AppError) {
	rl, err := s.repo.GetTierLimits(ctx, tier)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get tier limits", err)
	}
	return rl, nil
}

func (s *RateLimitService) SetUserTier(ctx context.Context, userID, tier string) *domain.AppError {
	if err := s.repo.SetUserTier(ctx, userID, tier); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to set user tier", err)
	}
	return nil
}

func (s *RateLimitService) ListTiers(ctx context.Context) ([]domain.RateLimit, *domain.AppError) {
	tiers, err := s.repo.ListTiers(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list tiers", err)
	}
	return tiers, nil
}

func (s *RateLimitService) UpdateTierLimits(ctx context.Context, tier string, rpm, daily, monthly, maxTokens int) *domain.AppError {
	if err := s.repo.UpdateTierLimits(ctx, tier, rpm, daily, monthly, maxTokens); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update tier limits", err)
	}
	return nil
}
