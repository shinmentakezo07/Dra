package repository

import (
	"context"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
)

type TransactionRepo struct {
	db *db.DB
}

func NewTransactionRepo(d *db.DB) *TransactionRepo { return &TransactionRepo{db: d} }

func (r *TransactionRepo) ByUser(ctx context.Context, userID string, page, limit int) ([]domain.CreditTransaction, int, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, amount, type, description, related_log_id, created_at FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil { return nil, 0, err }
	defer rows.Close()

	var txs []domain.CreditTransaction
	for rows.Next() {
		var t domain.CreditTransaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Type, &t.Description, &t.RelatedLogID, &t.CreatedAt); err != nil {
			return nil, 0, err
		}
		txs = append(txs, t)
	}

	var total int
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM credit_transactions WHERE user_id = $1`, userID).Scan(&total)
	return txs, total, rows.Err()
}

func (r *TransactionRepo) Create(ctx context.Context, userID string, amount int, txType, description string, relatedLogID *string) (*domain.CreditTransaction, error) {
	id := domain.NewID()
	row := r.db.QueryRow(ctx,
		`INSERT INTO credit_transactions (id, user_id, amount, type, description, related_log_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, amount, type, description, related_log_id, created_at`,
		id, userID, amount, txType, description, relatedLogID)
	var t domain.CreditTransaction
	if err := row.Scan(&t.ID, &t.UserID, &t.Amount, &t.Type, &t.Description, &t.RelatedLogID, &t.CreatedAt); err != nil {
		return nil, err
	}
	return &t, nil
}

// CreateTx runs Create within an existing transaction.
func (r *TransactionRepo) CreateTx(ctx context.Context, tx db.Querier, userID string, amount int, txType, description string, relatedLogID *string) (*domain.CreditTransaction, error) {
	id := domain.NewID()
	row := tx.QueryRow(ctx,
		`INSERT INTO credit_transactions (id, user_id, amount, type, description, related_log_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, amount, type, description, related_log_id, created_at`,
		id, userID, amount, txType, description, relatedLogID)
	var t domain.CreditTransaction
	if err := row.Scan(&t.ID, &t.UserID, &t.Amount, &t.Type, &t.Description, &t.RelatedLogID, &t.CreatedAt); err != nil {
		return nil, err
	}
	return &t, nil
}
