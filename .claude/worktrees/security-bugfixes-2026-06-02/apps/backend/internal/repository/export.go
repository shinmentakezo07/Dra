package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type ExportRepo struct {
	db *db.DB
}

func NewExportRepo(d *db.DB) *ExportRepo { return &ExportRepo{db: d} }

func (r *ExportRepo) Create(ctx context.Context, userID string, req domain.CreateExportJobRequest) (*domain.ExportJob, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO export_jobs (id, user_id, type, format, status, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, type, format, status, created_at`,
		id, userID, req.Type, req.Format, "pending", now)
	var e domain.ExportJob
	if err := row.Scan(&e.ID, &e.UserID, &e.Type, &e.Format, &e.Status, &e.CreatedAt); err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *ExportRepo) UpdateStatus(ctx context.Context, id, status string, filePath *string) error {
	now := time.Now()
	if filePath != nil {
		_, err := r.db.Exec(ctx,
			`UPDATE export_jobs SET status = $1, file_path = $2, completed_at = $3 WHERE id = $4`,
			status, *filePath, now, id)
		return err
	}
	_, err := r.db.Exec(ctx, `UPDATE export_jobs SET status = $1, completed_at = $2 WHERE id = $3`, status, now, id)
	return err
}

func (r *ExportRepo) GetByID(ctx context.Context, userID, id string) (*domain.ExportJob, error) {
	var e domain.ExportJob
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, type, format, status, file_path, created_at, completed_at FROM export_jobs WHERE id = $1 AND user_id = $2`, id, userID).
		Scan(&e.ID, &e.UserID, &e.Type, &e.Format, &e.Status, &e.FilePath, &e.CreatedAt, &e.CompletedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *ExportRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]domain.ExportJob, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, type, format, status, file_path, created_at, completed_at FROM export_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.ExportJob
	for rows.Next() {
		var e domain.ExportJob
		if err := rows.Scan(&e.ID, &e.UserID, &e.Type, &e.Format, &e.Status, &e.FilePath, &e.CreatedAt, &e.CompletedAt); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
}

func (r *ExportRepo) GetPending(ctx context.Context) ([]domain.ExportJob, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, type, format, status, file_path, created_at, completed_at FROM export_jobs WHERE status = 'pending' ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.ExportJob
	for rows.Next() {
		var e domain.ExportJob
		if err := rows.Scan(&e.ID, &e.UserID, &e.Type, &e.Format, &e.Status, &e.FilePath, &e.CreatedAt, &e.CompletedAt); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
}
