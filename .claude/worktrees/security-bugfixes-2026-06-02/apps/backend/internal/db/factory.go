package db

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/pkg/logger"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// NewFromConfig creates the appropriate database connection based on config.
func NewFromConfig(cfg *config.Config) (*DB, error) {
	switch cfg.DBType {
	case "neon":
		// Neon is wire-compatible PostgreSQL
		db, err := NewPostgres(cfg.DatabaseURL)
		if err != nil {
			return nil, err
		}
		db.Type = DBTypeNeon
		logger.Info("database connected", "type", "neon")
		return db, nil
	case "mongodb":
		return NewMongoDB(cfg.MongoDBURI, cfg.MongoDBName)
	default:
		// postgres
		return NewPostgres(cfg.DatabaseURL)
	}
}

// NewMongoDB creates a MongoDB connection.
func NewMongoDB(uri, dbName string) (*DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("connect to mongodb: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("ping mongodb: %w", err)
	}

	mdb := client.Database(dbName)
	logger.Info("database connected", "type", "mongodb", "database", dbName)
	return &DB{Type: DBTypeMongoDB, MongoDB: mdb}, nil
}
