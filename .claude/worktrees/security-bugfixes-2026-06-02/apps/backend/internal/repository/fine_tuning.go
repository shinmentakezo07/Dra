package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type FineTuningRepo struct {
	db *db.DB
}

func NewFineTuningRepo(d *db.DB) *FineTuningRepo { return &FineTuningRepo{db: d} }

func (r *FineTuningRepo) CreateDataset(ctx context.Context, userID, filename, storageKey, format string, size int64) (*domain.FineTuningDataset, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO fine_tuning_datasets (id, user_id, filename, mime_type, size, storage_key, format, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, filename, mime_type, size, storage_key, format, created_at`,
		id, userID, filename, nil, size, storageKey, format, now)
	var d domain.FineTuningDataset
	if err := row.Scan(&d.ID, &d.UserID, &d.Filename, &d.MimeType, &d.Size, &d.StorageKey, &d.Format, &d.CreatedAt); err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *FineTuningRepo) ListDatasets(ctx context.Context, userID string) ([]domain.FineTuningDataset, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, filename, mime_type, size, storage_key, format, created_at FROM fine_tuning_datasets WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.FineTuningDataset
	for rows.Next() {
		var d domain.FineTuningDataset
		if err := rows.Scan(&d.ID, &d.UserID, &d.Filename, &d.MimeType, &d.Size, &d.StorageKey, &d.Format, &d.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, rows.Err()
}

func (r *FineTuningRepo) GetDataset(ctx context.Context, userID, id string) (*domain.FineTuningDataset, error) {
	var d domain.FineTuningDataset
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, filename, mime_type, size, storage_key, format, created_at FROM fine_tuning_datasets WHERE id = $1 AND user_id = $2`, id, userID).
		Scan(&d.ID, &d.UserID, &d.Filename, &d.MimeType, &d.Size, &d.StorageKey, &d.Format, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *FineTuningRepo) CreateJob(ctx context.Context, userID, baseModel string, datasetID *string, hyperparams json.RawMessage) (*domain.FineTuningJob, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO fine_tuning_jobs (id, user_id, base_model, dataset_id, status, hyperparams, progress, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, base_model, dataset_id, status, hyperparams, progress, created_at`,
		id, userID, baseModel, datasetID, "queued", hyperparams, 0, now)
	var j domain.FineTuningJob
	if err := row.Scan(&j.ID, &j.UserID, &j.BaseModel, &j.DatasetID, &j.Status, &j.Hyperparams, &j.Progress, &j.CreatedAt); err != nil {
		return nil, err
	}
	return &j, nil
}

func (r *FineTuningRepo) UpdateJobStatus(ctx context.Context, id, status string, progress int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE fine_tuning_jobs SET status = $1, progress = $2 WHERE id = $3`, status, progress, id)
	return err
}

func (r *FineTuningRepo) CompleteJob(ctx context.Context, id, resultModelID string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE fine_tuning_jobs SET status = 'completed', result_model_id = $1, progress = 100, finished_at = $2 WHERE id = $3`,
		resultModelID, now, id)
	return err
}

func (r *FineTuningRepo) FailJob(ctx context.Context, id string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE fine_tuning_jobs SET status = 'failed', finished_at = $1 WHERE id = $2`, now, id)
	return err
}

func (r *FineTuningRepo) GetJob(ctx context.Context, userID, id string) (*domain.FineTuningJob, error) {
	var j domain.FineTuningJob
	var startedAt, finishedAt sql.NullTime
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, base_model, dataset_id, status, result_model_id, hyperparams, progress, created_at, started_at, finished_at FROM fine_tuning_jobs WHERE id = $1 AND user_id = $2`, id, userID).
		Scan(&j.ID, &j.UserID, &j.BaseModel, &j.DatasetID, &j.Status, &j.ResultModelID, &j.Hyperparams, &j.Progress, &j.CreatedAt, &startedAt, &finishedAt)
	if err != nil {
		return nil, err
	}
	if startedAt.Valid {
		j.StartedAt = &startedAt.Time
	}
	if finishedAt.Valid {
		j.FinishedAt = &finishedAt.Time
	}
	return &j, nil
}

func (r *FineTuningRepo) ListJobs(ctx context.Context, userID string, limit, offset int) ([]domain.FineTuningJob, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, base_model, dataset_id, status, result_model_id, hyperparams, progress, created_at, started_at, finished_at FROM fine_tuning_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.FineTuningJob
	for rows.Next() {
		var j domain.FineTuningJob
		var startedAt, finishedAt sql.NullTime
		if err := rows.Scan(&j.ID, &j.UserID, &j.BaseModel, &j.DatasetID, &j.Status, &j.ResultModelID, &j.Hyperparams, &j.Progress, &j.CreatedAt, &startedAt, &finishedAt); err != nil {
			return nil, err
		}
		if startedAt.Valid {
			j.StartedAt = &startedAt.Time
		}
		if finishedAt.Valid {
			j.FinishedAt = &finishedAt.Time
		}
		result = append(result, j)
	}
	return result, rows.Err()
}

func (r *FineTuningRepo) DeleteDataset(ctx context.Context, userID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM fine_tuning_datasets WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}
