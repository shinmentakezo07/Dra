package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type FineTuningService struct {
	repo *repository.FineTuningRepo
}

func NewFineTuningService(repo *repository.FineTuningRepo) *FineTuningService {
	return &FineTuningService{repo: repo}
}

func (s *FineTuningService) GetJob(ctx context.Context, userID, id string) (*domain.FineTuningJob, *domain.AppError) {
	j, err := s.repo.GetJob(ctx, userID, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get job", err)
	}
	return j, nil
}

func (s *FineTuningService) ListJobs(ctx context.Context, userID string, page, limit int) ([]domain.FineTuningJob, *domain.AppError) {
	jobs, err := s.repo.ListJobs(ctx, userID, limit, (page-1)*limit)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list jobs", err)
	}
	return jobs, nil
}
