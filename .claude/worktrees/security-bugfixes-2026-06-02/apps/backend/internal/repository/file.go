package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

// FileRepo handles file metadata persistence.
type FileRepo struct {
	db *db.DB
}

func NewFileRepo(d *db.DB) *FileRepo { return &FileRepo{db: d} }

// FileRecord represents a stored file's metadata.
type FileRecord struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Filename   string    `json:"filename"`
	MIMEType   string    `json:"mime_type"`
	Size       int64     `json:"size"`
	StorageKey string    `json:"storage_key"`
	CreatedAt  time.Time `json:"created_at"`
}

// Create inserts a new file record.
func (r *FileRepo) Create(ctx context.Context, userID, filename, mimeType, storageKey string, size int64) (*FileRecord, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO files (id, user_id, filename, mime_type, size, storage_key, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id, filename, mime_type, size, storage_key, created_at`,
		id, userID, filename, mimeType, size, storageKey, now)
	var f FileRecord
	if err := row.Scan(&f.ID, &f.UserID, &f.Filename, &f.MIMEType, &f.Size, &f.StorageKey, &f.CreatedAt); err != nil {
		return nil, err
	}
	return &f, nil
}

// ByID retrieves a file by ID.
func (r *FileRepo) ByID(ctx context.Context, id string) (*FileRecord, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, filename, mime_type, size, storage_key, created_at FROM files WHERE id = $1`, id)
	var f FileRecord
	if err := row.Scan(&f.ID, &f.UserID, &f.Filename, &f.MIMEType, &f.Size, &f.StorageKey, &f.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &f, nil
}

// ByUser lists files for a user.
func (r *FileRepo) ByUser(ctx context.Context, userID string, page, limit int) ([]FileRecord, int, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, filename, mime_type, size, storage_key, created_at FROM files WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var files []FileRecord
	for rows.Next() {
		var f FileRecord
		if err := rows.Scan(&f.ID, &f.UserID, &f.Filename, &f.MIMEType, &f.Size, &f.StorageKey, &f.CreatedAt); err != nil {
			return nil, 0, err
		}
		files = append(files, f)
	}

	var total int
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM files WHERE user_id = $1`, userID).Scan(&total)
	return files, total, nil
}

// Delete removes a file record.
func (r *FileRepo) Delete(ctx context.Context, userID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM files WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}
