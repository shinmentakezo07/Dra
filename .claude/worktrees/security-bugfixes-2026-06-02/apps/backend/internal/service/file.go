package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

// FileService handles file upload business logic.
type FileService struct {
	repo *repository.FileRepo
}

// NewFileService creates a new FileService.
func NewFileService(repo *repository.FileRepo) *FileService {
	return &FileService{repo: repo}
}

// CreateFile persists file metadata after upload processing.
func (s *FileService) CreateFile(ctx context.Context, userID, filename, mimeType, storageKey string, size int64) (*repository.FileRecord, *domain.AppError) {
	record, err := s.repo.Create(ctx, userID, filename, mimeType, storageKey, size)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to persist file record", err)
	}
	return record, nil
}

// ListFiles returns uploaded files for a user.
func (s *FileService) ListFiles(ctx context.Context, userID string, page, limit int) ([]repository.FileRecord, int, *domain.AppError) {
	files, total, err := s.repo.ByUser(ctx, userID, page, limit)
	if err != nil {
		return nil, 0, domain.Wrap(domain.ErrInternal, 500, "failed to list files", err)
	}
	return files, total, nil
}

// GetFile retrieves a file by ID.
func (s *FileService) GetFile(ctx context.Context, userID, id string) (*repository.FileRecord, *domain.AppError) {
	f, err := s.repo.ByID(ctx, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get file", err)
	}
	if f == nil {
		return nil, domain.NewError(domain.ErrNotFound, 404, "File not found")
	}
	if f.UserID != userID {
		return nil, domain.NewError(domain.ErrForbidden, 403, "Access denied")
	}
	return f, nil
}

// DeleteFile removes a file record.
func (s *FileService) DeleteFile(ctx context.Context, userID, id string) *domain.AppError {
	if err := s.repo.Delete(ctx, userID, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete file", err)
	}
	return nil
}
