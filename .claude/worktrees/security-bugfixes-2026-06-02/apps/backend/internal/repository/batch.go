package repository

import (
	"context"
	"encoding/json"
	"time"

	"dra-platform/backend/internal/db"

	"github.com/jackc/pgx/v5"
)

// BatchJob represents a batch processing job in the database.
type BatchJob struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	Status    string     `json:"status"`
	Items     []byte     `json:"items"`     // JSONB
	Results   []byte     `json:"results"`   // JSONB
	Error     string     `json:"error,omitempty"`
	Progress  int        `json:"progress"`
	Total     int        `json:"total"`
	CreatedAt time.Time  `json:"created_at"`
	StartedAt *time.Time `json:"started_at,omitempty"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`
}

// BatchJobRepo handles batch job persistence.
type BatchJobRepo struct {
	db *db.DB
}

func NewBatchJobRepo(d *db.DB) *BatchJobRepo { return &BatchJobRepo{db: d} }

// Create inserts a new batch job.
func (r *BatchJobRepo) Create(ctx context.Context, id, userID, status string, itemsJSON []byte, total int) (*BatchJob, error) {
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO batch_jobs (id, user_id, status, items, results, error, progress, total, created_at, started_at, ended_at)
		VALUES ($1, $2, $3, $4, '[]', '', 0, $5, $6, NULL, NULL)
		RETURNING id, user_id, status, items, results, error, progress, total, created_at, started_at, ended_at`,
		id, userID, status, itemsJSON, total, now)
	return scanBatchJob(row)
}

// ByID retrieves a batch job by ID.
func (r *BatchJobRepo) ByID(ctx context.Context, id string) (*BatchJob, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, status, items, results, error, progress, total, created_at, started_at, ended_at FROM batch_jobs WHERE id = $1`, id)
	return scanBatchJob(row)
}

// ByUser lists batch jobs for a user.
func (r *BatchJobRepo) ByUser(ctx context.Context, userID string, limit, offset int) ([]BatchJob, error) {
	if limit <= 0 { limit = 20 }
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, status, items, results, error, progress, total, created_at, started_at, ended_at
		FROM batch_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []BatchJob
	for rows.Next() {
		j, err := scanBatchJob(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *j)
	}
	return result, rows.Err()
}

// UpdateStatus updates a batch job's status and results.
func (r *BatchJobRepo) UpdateStatus(ctx context.Context, id, status string, resultsJSON []byte, errMsg string, progress int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE batch_jobs SET status = $1, results = $2, error = $3, progress = $4 WHERE id = $5`,
		status, resultsJSON, errMsg, progress, id)
	return err
}

// UpdateRunning sets status to running and started_at.
func (r *BatchJobRepo) UpdateRunning(ctx context.Context, id string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE batch_jobs SET status = 'running', started_at = $1 WHERE id = $2`,
		now, id)
	return err
}

// UpdateCompleted sets final status, results, error, ended_at.
func (r *BatchJobRepo) UpdateCompleted(ctx context.Context, id, status string, resultsJSON []byte, errMsg string, progress int) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE batch_jobs SET status = $1, results = $2, error = $3, progress = $4, ended_at = $5 WHERE id = $6`,
		status, resultsJSON, errMsg, progress, now, id)
	return err
}

type batchScanner interface {
	Scan(dest ...interface{}) error
}

func scanBatchJob(row batchScanner) (*BatchJob, error) {
	var j BatchJob
	if err := row.Scan(&j.ID, &j.UserID, &j.Status, &j.Items, &j.Results, &j.Error, &j.Progress, &j.Total, &j.CreatedAt, &j.StartedAt, &j.EndedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &j, nil
}

// RawItemsToJSON marshals batch job items to JSON bytes.
func RawItemsToJSON(items interface{}) ([]byte, error) {
	return json.Marshal(items)
}

// RawResultsToJSON marshals batch job results to JSON bytes.
func RawResultsToJSON(results interface{}) ([]byte, error) {
	return json.Marshal(results)
}
