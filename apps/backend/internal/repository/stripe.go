package repository

import (
	"context"

	"dra-platform/backend/internal/db"
	"github.com/jackc/pgx/v5"
)

type StripeRepo struct {
	db *db.DB
}

func NewStripeRepo(d *db.DB) *StripeRepo {
	return &StripeRepo{db: d}
}

func (r *StripeRepo) GetCustomerByUser(ctx context.Context, userID string) (string, error) {
	var customerID string
	err := r.db.QueryRow(ctx,
		`SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1`, userID).Scan(&customerID)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return customerID, nil
}

func (r *StripeRepo) CreateCustomer(ctx context.Context, userID, stripeCustomerID string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO stripe_customers (user_id, stripe_customer_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2`,
		userID, stripeCustomerID)
	return err
}

func (r *StripeRepo) InvoiceExists(ctx context.Context, stripeInvoiceID string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM stripe_invoices WHERE stripe_invoice_id = $1`, stripeInvoiceID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *StripeRepo) InvoiceExistsTx(ctx context.Context, tx db.Querier, stripeInvoiceID string) (bool, error) {
	var count int
	err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM stripe_invoices WHERE stripe_invoice_id = $1`, stripeInvoiceID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *StripeRepo) CreateInvoice(ctx context.Context, userID, stripeInvoiceID string, amount int64) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO stripe_invoices (user_id, stripe_invoice_id, amount, currency, status) VALUES ($1, $2, $3, $4, $5)`,
		userID, stripeInvoiceID, amount, "usd", "paid")
	return err
}

func (r *StripeRepo) CreateInvoiceTx(ctx context.Context, tx db.Querier, userID, stripeInvoiceID string, amount int64) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO stripe_invoices (user_id, stripe_invoice_id, amount, currency, status) VALUES ($1, $2, $3, $4, $5)`,
		userID, stripeInvoiceID, amount, "usd", "paid")
	return err
}
