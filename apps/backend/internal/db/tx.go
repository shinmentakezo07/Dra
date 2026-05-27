package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// Querier abstracts pgxpool.Pool and pgx.Tx so repositories can run inside transactions.
type Querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// WithTx runs fn inside a database transaction. It automatically commits on nil error or rolls back on error.
func (d *DB) WithTx(ctx context.Context, fn func(tx Querier) error) error {
	if d.Type == DBTypeMongoDB {
		return d.withMongoTx(ctx, fn)
	}
	return d.withPgTx(ctx, fn)
}

func (d *DB) withPgTx(ctx context.Context, fn func(tx Querier) error) error {
	tx, err := d.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return fmt.Errorf("tx rollback failed: %v (original: %w)", rbErr, err)
		}
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("tx commit: %w", err)
	}
	return nil
}

func (d *DB) beginMongoTx(ctx context.Context) (Tx, error) {
	client := d.MongoDB.Client()
	session, err := client.StartSession()
	if err != nil {
		return nil, fmt.Errorf("begin mongodb session: %w", err)
	}
	if err := session.StartTransaction(); err != nil {
		session.EndSession(ctx)
		return nil, fmt.Errorf("start mongodb transaction: %w", err)
	}
	return &mongoTx{session: session, db: d.MongoDB}, nil
}

type mongoTx struct {
	session *mongo.Session
	db      *mongo.Database
}

func (t *mongoTx) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	mq := newMongoQuerier(t.db)
	sessionCtx := mongo.NewSessionContext(ctx, t.session)
	return mq.Query(sessionCtx, sql, args...)
}

func (t *mongoTx) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	mq := newMongoQuerier(t.db)
	sessionCtx := mongo.NewSessionContext(ctx, t.session)
	return mq.QueryRow(sessionCtx, sql, args...)
}

func (t *mongoTx) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	mq := newMongoQuerier(t.db)
	sessionCtx := mongo.NewSessionContext(ctx, t.session)
	return mq.Exec(sessionCtx, sql, args...)
}

func (t *mongoTx) Commit(ctx context.Context) error {
	return t.session.CommitTransaction(ctx)
}

func (t *mongoTx) Rollback(ctx context.Context) error {
	return t.session.AbortTransaction(ctx)
}

func (d *DB) withMongoTx(ctx context.Context, fn func(tx Querier) error) error {
	tx, err := d.beginMongoTx(ctx)
	if err != nil {
		return err
	}
	// Ensure session cleanup on completion
	defer func() {
		if s := tx.(*mongoTx).session; s != nil {
			s.EndSession(ctx)
		}
	}()

	if err := fn(tx); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("mongodb tx commit: %w", err)
	}
	return nil
}
