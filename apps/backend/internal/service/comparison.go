package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"

	"github.com/jackc/pgx/v5"
)

type ComparisonService struct {
	repo *repository.ComparisonRepo
}

func NewComparisonService(repo *repository.ComparisonRepo) *ComparisonService {
	return &ComparisonService{repo: repo}
}

func (s *ComparisonService) Create(ctx context.Context, userID string, req domain.CreateABComparisonRequest) (*domain.ABComparison, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	c, err := s.repo.Create(ctx, userID, req)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create comparison", err)
	}
	return c, nil
}

func (s *ComparisonService) GetByID(ctx context.Context, userID, id string) (*domain.ABComparison, *domain.AppError) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domain.NewError(domain.ErrNotFound, 404, "Comparison not found")
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get comparison", err)
	}
	if c.UserID != userID {
		return nil, domain.NewError(domain.ErrForbidden, 403, "Access denied")
	}
	return c, nil
}

func (s *ComparisonService) ListByUser(ctx context.Context, userID string, page, limit int) ([]domain.ABComparison, *domain.AppError) {
	items, err := s.repo.ListByUser(ctx, userID, limit, (page-1)*limit)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list comparisons", err)
	}
	return items, nil
}

func (s *ComparisonService) Delete(ctx context.Context, userID, id string) *domain.AppError {
	if err := s.repo.Delete(ctx, userID, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete comparison", err)
	}
	return nil
}
