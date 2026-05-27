package db

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"dra-platform/backend/internal/pkg/logger"
)

// AutoMigrate runs pending migrations for PostgreSQL/Neon databases.
// It creates a schema_migrations table to track applied migrations.
func AutoMigrate(ctx context.Context, database *DB) error {
	if database.Type == DBTypeMongoDB {
		logger.Info("auto_migrate_skipped", "reason", "mongodb does not use sql migrations")
		return nil
	}

	if database.Pool == nil {
		return fmt.Errorf("postgres pool is nil")
	}

	// Ensure migrations table exists
	_, err := database.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	// Find migration files
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		// Try relative to executable or working directory
		migrationsDir = filepath.Join("apps", "backend", "migrations")
		if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
			logger.Warn("migrations directory not found, skipping auto-migrate", "path", migrationsDir)
			return nil
		}
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, f := range files {
		var applied bool
		err := database.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, f).Scan(&applied)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", f, err)
		}
		if applied {
			continue
		}

		data, err := os.ReadFile(filepath.Join(migrationsDir, f))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", f, err)
		}

		// Run migration inside a transaction and record it atomically
		err = database.WithTx(ctx, func(tx Querier) error {
			_, err := tx.Exec(ctx, string(data))
			if err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, f)
			return err
		})
		if err != nil {
			return fmt.Errorf("apply migration %s: %w", f, err)
		}

		logger.Info("migration applied", "file", f)
	}

	logger.Info("auto_migrate_complete", "count", len(files))
	return nil
}
