package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

// PromptRepo handles prompt template persistence.
type PromptRepo struct {
	db *db.DB
}

func NewPromptRepo(d *db.DB) *PromptRepo { return &PromptRepo{db: d} }

// Prompt represents a prompt template.
type Prompt struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Version   int       `json:"version"`
	Template  string    `json:"template"`
	Model     string    `json:"model"`
	Config    []byte    `json:"config,omitempty"`
	UserID    string    `json:"user_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// CreatePrompt inserts a new prompt template.
func (r *PromptRepo) CreatePrompt(ctx context.Context, userID, name, template, model string, config []byte) (*Prompt, error) {
	id := domain.NewID()
	now := time.Now()
	// Determine next version for this user
	var version int
	_ = r.db.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM prompts WHERE name = $1 AND user_id = $2`, name, userID).Scan(&version)

	row := r.db.QueryRow(ctx,
		`INSERT INTO prompts (id, user_id, name, version, template, model, config, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, user_id, name, version, template, model, config, created_at`,
		id, userID, name, version, template, model, config, now)
	var p Prompt
	if err := row.Scan(&p.ID, &p.UserID, &p.Name, &p.Version, &p.Template, &p.Model, &p.Config, &p.CreatedAt); err != nil {
		return nil, err
	}
	return &p, nil
}

// GetPrompt retrieves the latest version of a prompt by name for a specific user.
func (r *PromptRepo) GetPrompt(ctx context.Context, userID, name string) (*Prompt, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, name, version, template, model, config, created_at FROM prompts WHERE name = $1 AND user_id = $2 ORDER BY version DESC LIMIT 1`, name, userID)
	var p Prompt
	if err := row.Scan(&p.ID, &p.UserID, &p.Name, &p.Version, &p.Template, &p.Model, &p.Config, &p.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// ListPrompts lists all unique prompt names for a user with their latest version.
func (r *PromptRepo) ListPrompts(ctx context.Context, userID string, limit, offset int) ([]Prompt, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.db.Query(ctx,
		`SELECT DISTINCT ON (name) id, user_id, name, version, template, model, config, created_at FROM prompts WHERE user_id = $1 ORDER BY name, version DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Prompt
	for rows.Next() {
		var p Prompt
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Version, &p.Template, &p.Model, &p.Config, &p.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

// DeletePrompt removes all versions of a prompt for a specific user.
func (r *PromptRepo) DeletePrompt(ctx context.Context, userID, name string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM prompts WHERE name = $1 AND user_id = $2`, name, userID)
	return err
}
