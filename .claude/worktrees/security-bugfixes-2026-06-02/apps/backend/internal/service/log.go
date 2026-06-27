package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type LogService struct {
	repo *repository.LogRepo
}

func NewLogService(repo *repository.LogRepo) *LogService {
	return &LogService{repo: repo}
}

func (s *LogService) ListLogs(ctx context.Context, userID string, page, limit int) ([]domain.APILog, int, *domain.AppError) {
	logs, total, err := s.repo.ByUser(ctx, userID, page, limit)
	if err != nil {
		return nil, 0, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	return logs, total, nil
}
