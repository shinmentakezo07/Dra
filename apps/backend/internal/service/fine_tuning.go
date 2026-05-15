package service

import (
	"context"
	"encoding/json"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type FineTuningService struct {
	repo *repository.FineTuningRepo
}

func NewFineTuningService(repo *repository.FineTuningRepo) *FineTuningService {
	return &FineTuningService{repo: repo}
}

func (s *FineTuningService) CreateDataset(ctx context.Context, userID, filename, storageKey, format string, size int64) (*domain.FineTuningDataset, *domain.AppError) {
	d, err := s.repo.CreateDataset(ctx, userID, filename, storageKey, format, size)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create dataset", err)
	}
	return d, nil
}

func (s *FineTuningService) ListDatasets(ctx context.Context, userID string) ([]domain.FineTuningDataset, *domain.AppError) {
	datasets, err := s.repo.ListDatasets(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list datasets", err)
	}
	return datasets, nil
}

func (s *FineTuningService) GetDataset(ctx context.Context, userID, id string) (*domain.FineTuningDataset, *domain.AppError) {
	d, err := s.repo.GetDataset(ctx, userID, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get dataset", err)
	}
	return d, nil
}

func (s *FineTuningService) CreateJob(ctx context.Context, userID, baseModel string, datasetID *string, hyperparams json.RawMessage) (*domain.FineTuningJob, *domain.AppError) {
	j, err := s.repo.CreateJob(ctx, userID, baseModel, datasetID, hyperparams)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create fine-tuning job", err)
	}
	return j, nil
}

func (s *FineTuningService) UpdateJobStatus(ctx context.Context, id, status string, progress int) *domain.AppError {
	if err := s.repo.UpdateJobStatus(ctx, id, status, progress); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update job status", err)
	}
	return nil
}

func (s *FineTuningService) CompleteJob(ctx context.Context, id, resultModelID string) *domain.AppError {
	if err := s.repo.CompleteJob(ctx, id, resultModelID); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to complete job", err)
	}
	return nil
}

func (s *FineTuningService) FailJob(ctx context.Context, id string) *domain.AppError {
	if err := s.repo.FailJob(ctx, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to mark job as failed", err)
	}
	return nil
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
