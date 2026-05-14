package repository

import (
	"context"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

// ConversationRepo handles conversation persistence.
type ConversationRepo struct {
	db *db.DB
}

func NewConversationRepo(d *db.DB) *ConversationRepo { return &ConversationRepo{db: d} }

// Conversation represents a chat thread.
type Conversation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Model     string    `json:"model"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ConversationMessage represents a single message in a conversation.
type ConversationMessage struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	InputTokens    int       `json:"input_tokens"`
	OutputTokens   int       `json:"output_tokens"`
	CreatedAt      time.Time `json:"created_at"`
}

// CreateConversation inserts a new conversation.
func (r *ConversationRepo) CreateConversation(ctx context.Context, userID, title, model string) (*Conversation, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, title, model, created_at, updated_at`,
		id, userID, title, model, now, now)
	var c Conversation
	if err := row.Scan(&c.ID, &c.UserID, &c.Title, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, err
	}
	return &c, nil
}

// GetConversation retrieves a conversation by ID.
func (r *ConversationRepo) GetConversation(ctx context.Context, id string) (*Conversation, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, user_id, title, model, created_at, updated_at FROM conversations WHERE id = $1`, id)
	var c Conversation
	if err := row.Scan(&c.ID, &c.UserID, &c.Title, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows { return nil, nil }
		return nil, err
	}
	return &c, nil
}

// ListConversations lists conversations for a user.
func (r *ConversationRepo) ListConversations(ctx context.Context, userID string, limit, offset int) ([]Conversation, error) {
	if limit <= 0 { limit = 20 }
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, title, model, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil { return nil, err }
	defer rows.Close()

	var result []Conversation
	for rows.Next() {
		var c Conversation
		if err := rows.Scan(&c.ID, &c.UserID, &c.Title, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, rows.Err()
}

// DeleteConversation removes a conversation and its messages.
func (r *ConversationRepo) DeleteConversation(ctx context.Context, userID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM conversations WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

// AddMessage inserts a message into a conversation.
func (r *ConversationRepo) AddMessage(ctx context.Context, convID, role, content string, inputTokens, outputTokens int) (*ConversationMessage, error) {
	id := domain.NewID()
	now := time.Now()
	row := r.db.QueryRow(ctx,
		`INSERT INTO conversation_messages (id, conversation_id, role, content, input_tokens, output_tokens, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, conversation_id, role, content, input_tokens, output_tokens, created_at`,
		id, convID, role, content, inputTokens, outputTokens, now)
	var m ConversationMessage
	if err := row.Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &m.InputTokens, &m.OutputTokens, &m.CreatedAt); err != nil {
		return nil, err
	}

	// Update conversation updated_at
	_, _ = r.db.Exec(ctx, `UPDATE conversations SET updated_at = $1 WHERE id = $2`, now, convID)
	return &m, nil
}

// GetMessages retrieves messages for a conversation.
func (r *ConversationRepo) GetMessages(ctx context.Context, convID string, limit, offset int) ([]ConversationMessage, error) {
	if limit <= 0 { limit = 100 }
	rows, err := r.db.Query(ctx,
		`SELECT id, conversation_id, role, content, input_tokens, output_tokens, created_at FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
		convID, limit, offset)
	if err != nil { return nil, err }
	defer rows.Close()

	var result []ConversationMessage
	for rows.Next() {
		var m ConversationMessage
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &m.InputTokens, &m.OutputTokens, &m.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, m)
	}
	return result, rows.Err()
}

// UpdateTitle updates a conversation title.
func (r *ConversationRepo) UpdateTitle(ctx context.Context, userID, id, title string) error {
	_, err := r.db.Exec(ctx, `UPDATE conversations SET title = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`, title, time.Now(), id, userID)
	return err
}
