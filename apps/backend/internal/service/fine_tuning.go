package service

import (
	"context"
	"fmt"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type FineTuningService struct {
	repo *repository.FineTuningRepo
}

func NewFineTuningService(repo *repository.FineTuningRepo) *FineTuningService {
	return &FineTuningService{repo: repo}
}

func (s *FineTuningService) CreateJob(ctx context.Context, userID string, req domain.CreateFineTuningJobRequest) (*domain.FineTuningJob, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	ds, err := s.repo.GetDataset(ctx, userID, req.DatasetID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrNotFound, 404, "dataset not found", err)
	}
	j, err := s.repo.CreateJob(ctx, userID, req.BaseModel, &ds.ID, req.Hyperparams)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create job", err)
	}
	return j, nil
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

func (s *FineTuningService) CreateDataset(ctx context.Context, userID, filename, format string) (*domain.FineTuningDataset, *domain.AppError) {
	if filename == "" || format == "" {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "filename and format are required")
	}
	storageKey := fmt.Sprintf("datasets/%s/%s", userID, filename)
	ds, err := s.repo.CreateDataset(ctx, userID, filename, storageKey, format, 0)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create dataset", err)
	}
	return ds, nil
}

func (s *FineTuningService) ListDatasets(ctx context.Context, userID string) ([]domain.FineTuningDataset, *domain.AppError) {
	datasets, err := s.repo.ListDatasets(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list datasets", err)
	}
	return datasets, nil
}

func (s *FineTuningService) DeleteDataset(ctx context.Context, userID, id string) *domain.AppError {
	ds, err := s.repo.GetDataset(ctx, userID, id)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if ds == nil {
		return domain.NewError(domain.ErrNotFound, 404, "dataset not found")
	}
	if err := s.repo.DeleteDataset(ctx, userID, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete dataset", err)
	}
	return nil
}
