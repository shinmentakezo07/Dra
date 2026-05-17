package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type APIKeyService struct {
	repo *repository.APIKeyRepo
}

func NewAPIKeyService(repo *repository.APIKeyRepo) *APIKeyService {
	return &APIKeyService{repo: repo}
}

func (s *APIKeyService) List(ctx context.Context, userID string) ([]domain.APIKey, *domain.AppError) {
	keys, err := s.repo.ByUser(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	return keys, nil
}

func (s *APIKeyService) Create(ctx context.Context, userID string, req domain.CreateKeyRequest) (*domain.APIKey, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	rawKey, err := domain.GenerateAPIKey()
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "key generation failed", err)
	}
	k, err := s.repo.Create(ctx, userID, req.Name, rawKey)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create key", err)
	}
	k.Key = rawKey // return raw key once; repo stores hash
	return k, nil
}

func (s *APIKeyService) Delete(ctx context.Context, userID, keyID string) *domain.AppError {
	key, err := s.repo.ByID(ctx, keyID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if key == nil || key.UserID != userID {
		return domain.ErrKeyNotFound
	}
	if err := s.repo.Delete(ctx, userID, keyID); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete key", err)
	}
	return nil
}

func (s *APIKeyService) Revoke(ctx context.Context, userID, keyID string) *domain.AppError {
	key, err := s.repo.ByID(ctx, keyID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if key == nil || key.UserID != userID {
		return domain.ErrKeyNotFound
	}
	if err := s.repo.Revoke(ctx, keyID); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to revoke key", err)
	}
	return nil
}

func (s *APIKeyService) Update(ctx context.Context, userID, keyID string, name *string, models, ips []string, maxTokens *int) *domain.AppError {
	key, err := s.repo.ByID(ctx, keyID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if key == nil || key.UserID != userID {
		return domain.ErrKeyNotFound
	}
	if err := s.repo.Update(ctx, keyID, name, models, ips, maxTokens); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update key", err)
	}
	return nil
}
