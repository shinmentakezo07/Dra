package service

import (
	"context"

	"dra-platform/backend/internal/repository"
)

// TokenBlacklistService wraps the token blacklist repository for middleware use.
type TokenBlacklistService struct {
	repo *repository.TokenBlacklistRepo
}

// NewTokenBlacklistService creates a new TokenBlacklistService.
func NewTokenBlacklistService(repo *repository.TokenBlacklistRepo) *TokenBlacklistService {
	return &TokenBlacklistService{repo: repo}
}

// IsBlacklisted checks if a token is blacklisted. Implements middleware.TokenBlacklistChecker.
func (s *TokenBlacklistService) IsBlacklisted(token string) (bool, error) {
	return s.repo.IsBlacklisted(context.Background(), token)
}
