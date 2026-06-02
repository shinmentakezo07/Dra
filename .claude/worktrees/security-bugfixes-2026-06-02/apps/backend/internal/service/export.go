package service

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type ExportService struct {
	repo      *repository.ExportRepo
	logRepo   *repository.LogRepo
	auditRepo *repository.AdminAuditRepo
}

func NewExportService(repo *repository.ExportRepo, logRepo *repository.LogRepo, auditRepo *repository.AdminAuditRepo) *ExportService {
	return &ExportService{repo: repo, logRepo: logRepo, auditRepo: auditRepo}
}

func (s *ExportService) CreateJob(ctx context.Context, userID string, req domain.CreateExportJobRequest) (*domain.ExportJob, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	job, err := s.repo.Create(ctx, userID, req)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create export job", err)
	}
	return job, nil
}

func (s *ExportService) GetJob(ctx context.Context, userID, id string) (*domain.ExportJob, *domain.AppError) {
	job, err := s.repo.GetByID(ctx, userID, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get export job", err)
	}
	return job, nil
}

func (s *ExportService) ListJobs(ctx context.Context, userID string, page, limit int) ([]domain.ExportJob, *domain.AppError) {
	jobs, err := s.repo.ListByUser(ctx, userID, limit, (page-1)*limit)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list export jobs", err)
	}
	return jobs, nil
}

func (s *ExportService) ProcessJob(ctx context.Context, job *domain.ExportJob, exportDir string) *domain.AppError {
	var filePath string
	var err error

	switch job.Type {
	case "logs":
		filePath, err = s.exportLogs(ctx, job.UserID, job.Format, exportDir)
	case "audit":
		filePath, err = s.exportAuditLogs(ctx, job.UserID, job.Format, exportDir)
	default:
		return domain.NewError(domain.ErrBadRequest, 400, "Unknown export type: "+job.Type)
	}

	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to process export", err)
	}

	if uErr := s.repo.UpdateStatus(ctx, job.ID, "completed", &filePath); uErr != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update export status", uErr)
	}
	return nil
}

func (s *ExportService) exportLogs(ctx context.Context, userID, format, dir string) (string, error) {
	logs, _, err := s.logRepo.ByUser(ctx, userID, 1, 10000)
	if err != nil {
		return "", err
	}

	filename := fmt.Sprintf("logs_%s_%d.%s", userID, time.Now().Unix(), format)
	filePath := filepath.Join(dir, filename)

	f, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	_ = w.Write([]string{"id", "model", "provider", "input_tokens", "output_tokens", "cost", "latency", "status", "created_at"})
	for _, l := range logs {
		_ = w.Write([]string{l.ID, l.Model, l.Provider, fmt.Sprintf("%d", l.InputTokens), fmt.Sprintf("%d", l.OutputTokens), fmt.Sprintf("%d", l.Cost), fmt.Sprintf("%d", l.Latency), l.Status, l.CreatedAt.Format(time.RFC3339)})
	}
	return filePath, nil
}

func (s *ExportService) exportAuditLogs(ctx context.Context, userID, format, dir string) (string, error) {
	logs, _, err := s.auditRepo.List(ctx, domain.AuditLogFilter{ActorID: userID, Page: 1, Limit: 10000})
	if err != nil {
		return "", err
	}

	filename := fmt.Sprintf("audit_%s_%d.%s", userID, time.Now().Unix(), format)
	filePath := filepath.Join(dir, filename)

	f, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	_ = w.Write([]string{"id", "actor_id", "actor_email", "action", "target_type", "target_id", "changes", "ip_address", "severity", "created_at"})
	for _, l := range logs {
		changes := ""
		if l.Changes != nil {
			if data, err := json.Marshal(l.Changes); err == nil {
				changes = string(data)
			}
		}
		_ = w.Write([]string{
			fmt.Sprintf("%d", l.ID),
			l.ActorID,
			l.ActorEmail,
			string(l.Action),
			l.TargetType,
			l.TargetID,
			changes,
			l.IPAddress,
			string(l.Severity),
			l.CreatedAt.Format(time.RFC3339),
		})
	}
	return filePath, nil
}
