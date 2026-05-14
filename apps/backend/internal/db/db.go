package db

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/pkg/logger"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type DBType string

const (
	DBTypePostgres DBType = "postgres"
	DBTypeNeon     DBType = "neon"
	DBTypeMongoDB  DBType = "mongodb"
)

// DB is a unified database wrapper that supports PostgreSQL (including Neon)
// and MongoDB backends. It implements the Querier interface so repositories
// can use it directly without caring about the underlying driver.
type DB struct {
	Type    DBType
	Pool    *pgxpool.Pool
	MongoDB *mongo.Database
	mq      *mongoQuerier
}

func NewPostgres(databaseURL string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute
	cfg.HealthCheckPeriod = 5 * time.Minute
	cfg.ConnConfig.ConnectTimeout = 5 * time.Second

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	logger.Info("database connected", "type", "postgres", "max_conns", cfg.MaxConns, "min_conns", cfg.MinConns)
	return &DB{Type: DBTypePostgres, Pool: pool}, nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		logger.Info("database connection pool closing")
		db.Pool.Close()
	}
	if db.MongoDB != nil {
		logger.Info("mongodb client disconnecting")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if client := db.MongoDB.Client(); client != nil {
			_ = client.Disconnect(ctx)
		}
	}
}

func (db *DB) Health(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	switch db.Type {
	case DBTypeMongoDB:
		if db.MongoDB == nil {
			return fmt.Errorf("mongodb not connected")
		}
		return db.MongoDB.Client().Ping(ctx, nil)
	default:
		if db.Pool == nil {
			return fmt.Errorf("postgres pool not connected")
		}
		return db.Pool.Ping(ctx)
	}
}

// ---------------------------------------------------------------------------
// Querier implementation
// ---------------------------------------------------------------------------

func (db *DB) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	if db.Type == DBTypeMongoDB {
		if db.mq == nil {
			db.mq = newMongoQuerier(db.MongoDB)
		}
		return db.mq.Query(ctx, sql, args...)
	}
	return db.Pool.Query(ctx, sql, args...)
}

func (db *DB) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	if db.Type == DBTypeMongoDB {
		if db.mq == nil {
			db.mq = newMongoQuerier(db.MongoDB)
		}
		return db.mq.QueryRow(ctx, sql, args...)
	}
	return db.Pool.QueryRow(ctx, sql, args...)
}

func (db *DB) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	if db.Type == DBTypeMongoDB {
		if db.mq == nil {
			db.mq = newMongoQuerier(db.MongoDB)
		}
		return db.mq.Exec(ctx, sql, args...)
	}
	return db.Pool.Exec(ctx, sql, args...)
}

// ---------------------------------------------------------------------------
// Transaction support
// ---------------------------------------------------------------------------

// Tx extends Querier with commit/rollback for explicit transaction control.
type Tx interface {
	Querier
	Commit(ctx context.Context) error
	Rollback(ctx context.Context) error
}

// Begin starts a new transaction.
func (db *DB) Begin(ctx context.Context) (Tx, error) {
	if db.Type == DBTypeMongoDB {
		return db.beginMongoTx(ctx)
	}
	return db.Pool.Begin(ctx)
}
