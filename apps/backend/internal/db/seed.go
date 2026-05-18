package db

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/password"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// AutoSeed seeds the database with demo data if it is empty.
func AutoSeed(ctx context.Context, database *DB) error {
	isEmpty, err := isDBEmpty(ctx, database)
	if err != nil {
		return fmt.Errorf("check if db empty: %w", err)
	}
	if !isEmpty {
		logger.Info("auto_seed_skipped", "reason", "database already has data")
		return nil
	}

	logger.Info("auto_seed_starting")

	adminPass, _ := password.Hash("admin123")
	userPass, _ := password.Hash("user123")

	// Deterministic IDs so re-seeding doesn't invalidate existing dev tokens
	adminID := uuid.NewSHA1(uuid.NameSpaceURL, []byte("dra-platform:user:admin@example.com")).String()
	user1ID := uuid.NewSHA1(uuid.NameSpaceURL, []byte("dra-platform:user:john@example.com")).String()
	user2ID := uuid.NewSHA1(uuid.NameSpaceURL, []byte("dra-platform:user:jane@example.com")).String()

	now := time.Now()

	switch database.Type {
	case DBTypeMongoDB:
		return seedMongoDB(ctx, database.MongoDB, adminID, user1ID, user2ID, string(adminPass), string(userPass), now)
	default:
		return seedPostgres(ctx, database, adminID, user1ID, user2ID, string(adminPass), string(userPass), now)
	}
}

func isDBEmpty(ctx context.Context, database *DB) (bool, error) {
	switch database.Type {
	case DBTypeMongoDB:
		if database.MongoDB == nil {
			return false, fmt.Errorf("mongodb not connected")
		}
		count, err := database.MongoDB.Collection("users").EstimatedDocumentCount(ctx)
		if err != nil {
			return false, err
		}
		return count == 0, nil
	default:
		if database.Pool == nil {
			return false, fmt.Errorf("postgres pool not connected")
		}
		var count int
		err := database.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count)
		if err != nil {
			// Table may not exist yet (migrate hasn't run)
			return true, nil
		}
		return count == 0, nil
	}
}

func seedPostgres(ctx context.Context, database *DB, adminID, user1ID, user2ID, adminHash, userHash string, now time.Time) error {
	users := []struct {
		ID    string
		Name  string
		Email string
		Pass  string
		Role  string
	}{
		{adminID, "Admin User", "admin@example.com", adminHash, "admin"},
		{user1ID, "John Doe", "john@example.com", userHash, "user"},
		{user2ID, "Jane Smith", "jane@example.com", userHash, "user"},
	}

	for _, u := range users {
		_, err := database.Pool.Exec(ctx,
			`INSERT INTO users (id, name, email, password, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
			u.ID, u.Name, u.Email, u.Pass, u.Role, now)
		if err != nil {
			return fmt.Errorf("seed user %s: %w", u.Email, err)
		}
	}
	logger.Info("seed_users_created", "count", len(users))

	// Grant the seeded admin full permissions via admin_users table
	_, err := database.Pool.Exec(ctx,
		`INSERT INTO admin_users (user_id, role, permissions, is_active, created_by)
		 VALUES ($1, 'superadmin', ARRAY['*'], true, $1)
		 ON CONFLICT (user_id) DO UPDATE SET permissions=ARRAY['*'], role='superadmin', is_active=true`,
		adminID)
	if err != nil {
		return fmt.Errorf("seed admin_users: %w", err)
	}
	logger.Info("seed_admin_permissions_granted")

	credits := []struct {
		ID             string
		UserID         string
		Balance        int
		TotalPurchased int
		TotalSpent     int
	}{
		{domain.NewID(), adminID, 1000000, 1000000, 0},
		{domain.NewID(), user1ID, 500000, 750000, 250000},
		{domain.NewID(), user2ID, 250000, 500000, 250000},
	}
	for _, c := range credits {
		_, err := database.Pool.Exec(ctx,
			`INSERT INTO user_credits (id, user_id, balance, total_purchased, total_spent) VALUES ($1, $2, $3, $4, $5)`,
			c.ID, c.UserID, c.Balance, c.TotalPurchased, c.TotalSpent)
		if err != nil {
			return fmt.Errorf("seed credits: %w", err)
		}
	}
	logger.Info("seed_credits_created", "count", len(credits))

	apiKeys := []struct {
		ID     string
		UserID string
		Name   string
		Key    string
	}{
		{domain.NewID(), user1ID, "Production Key", "dra_prod_" + uuid.New().String()},
		{domain.NewID(), user1ID, "Development Key", "dra_dev_" + uuid.New().String()},
		{domain.NewID(), user2ID, "Personal Project", "dra_pers_" + uuid.New().String()},
	}
	for _, k := range apiKeys {
		_, err := database.Pool.Exec(ctx,
			`INSERT INTO api_keys (id, user_id, name, key, created_at) VALUES ($1, $2, $3, $4, $5)`,
			k.ID, k.UserID, k.Name, k.Key, now)
		if err != nil {
			return fmt.Errorf("seed api key: %w", err)
		}
	}
	logger.Info("seed_api_keys_created", "count", len(apiKeys))

	logs := []struct {
		ID           string
		UserID       string
		APIKeyID     string
		Model        string
		Provider     string
		InputTokens  int
		OutputTokens int
		Cost         int
		Latency      int
		Status       string
		ErrorMessage *string
	}{
		{domain.NewID(), user1ID, apiKeys[0].ID, "gpt-4", "openai", 150, 320, 12500, 1250, "success", nil},
		{domain.NewID(), user1ID, apiKeys[0].ID, "claude-3-opus", "anthropic", 2000, 1500, 87500, 3200, "success", nil},
		{domain.NewID(), user1ID, apiKeys[1].ID, "gpt-3.5-turbo", "openai", 50, 120, 1500, 450, "success", nil},
		{domain.NewID(), user2ID, apiKeys[2].ID, "gpt-4", "openai", 500, 800, 28500, 2100, "success", nil},
	}
	errMsg := "Rate limit exceeded"
	logs = append(logs, struct {
		ID           string
		UserID       string
		APIKeyID     string
		Model        string
		Provider     string
		InputTokens  int
		OutputTokens int
		Cost         int
		Latency      int
		Status       string
		ErrorMessage *string
	}{domain.NewID(), user2ID, apiKeys[2].ID, "claude-3-sonnet", "anthropic", 100, 0, 0, 0, "error", &errMsg})

	for _, l := range logs {
		_, err := database.Pool.Exec(ctx,
			`INSERT INTO api_logs (id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			l.ID, l.UserID, l.APIKeyID, l.Model, l.Provider, l.InputTokens, l.OutputTokens, l.Cost, l.Latency, l.Status, l.ErrorMessage, now)
		if err != nil {
			return fmt.Errorf("seed api log: %w", err)
		}
	}
	logger.Info("seed_api_logs_created", "count", len(logs))

	transactions := []struct {
		ID           string
		UserID       string
		Amount       int
		Type         string
		Description  string
		RelatedLogID *string
	}{
		{domain.NewID(), adminID, 1000000, "purchase", "Initial credit purchase", nil},
		{domain.NewID(), user1ID, 500000, "purchase", "Credit purchase via Stripe", nil},
		{domain.NewID(), user1ID, 250000, "purchase", "Credit purchase via Stripe", nil},
		{domain.NewID(), user1ID, -121500, "usage", "API usage deduction", &logs[0].ID},
		{domain.NewID(), user2ID, 500000, "purchase", "Credit purchase via Stripe", nil},
		{domain.NewID(), user2ID, -250000, "usage", "API usage deduction", &logs[3].ID},
		{domain.NewID(), user2ID, 50000, "bonus", "Welcome bonus credits", nil},
	}
	for _, t := range transactions {
		_, err := database.Pool.Exec(ctx,
			`INSERT INTO credit_transactions (id, user_id, amount, type, description, related_log_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			t.ID, t.UserID, t.Amount, t.Type, t.Description, t.RelatedLogID, now)
		if err != nil {
			return fmt.Errorf("seed transaction: %w", err)
		}
	}
	logger.Info("seed_credit_transactions_created", "count", len(transactions))

	logger.Info("auto_seed_complete", "db_type", "postgres")
	return nil
}

func seedMongoDB(ctx context.Context, mdb *mongo.Database, adminID, user1ID, user2ID, adminHash, userHash string, now time.Time) error {
	users := []bson.M{
		{"_id": adminID, "id": adminID, "name": "Admin User", "email": "admin@example.com", "password": adminHash, "role": "admin", "created_at": now},
		{"_id": user1ID, "id": user1ID, "name": "John Doe", "email": "john@example.com", "password": userHash, "role": "user", "created_at": now},
		{"_id": user2ID, "id": user2ID, "name": "Jane Smith", "email": "jane@example.com", "password": userHash, "role": "user", "created_at": now},
	}
	if _, err := mdb.Collection("users").InsertMany(ctx, toAnySlice(users)); err != nil {
		return fmt.Errorf("seed users: %w", err)
	}
	logger.Info("seed_users_created", "count", len(users))

	// Grant the seeded admin full permissions via admin_users collection
	adminUserDoc := bson.M{
		"_id":         domain.NewID(),
		"user_id":     adminID,
		"role":        "superadmin",
		"permissions": []string{"*"},
		"is_active":   true,
		"created_by":  adminID,
		"created_at":  now,
		"updated_at":  now,
	}
	if _, err := mdb.Collection("admin_users").InsertOne(ctx, adminUserDoc); err != nil {
		return fmt.Errorf("seed admin_users: %w", err)
	}
	logger.Info("seed_admin_permissions_granted")

	credits := []bson.M{
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": adminID, "balance": 1000000, "total_purchased": 1000000, "total_spent": 0},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user1ID, "balance": 500000, "total_purchased": 750000, "total_spent": 250000},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user2ID, "balance": 250000, "total_purchased": 500000, "total_spent": 250000},
	}
	if _, err := mdb.Collection("user_credits").InsertMany(ctx, toAnySlice(credits)); err != nil {
		return fmt.Errorf("seed credits: %w", err)
	}
	logger.Info("seed_credits_created", "count", len(credits))

	apiKey1ID := domain.NewID()
	apiKey2ID := domain.NewID()
	apiKey3ID := domain.NewID()
	apiKeys := []bson.M{
		{"_id": apiKey1ID, "id": apiKey1ID, "user_id": user1ID, "name": "Production Key", "key_hash": "dra_prod_" + uuid.New().String(), "scopes": []string{"all"}, "rate_limit": 1000, "created_at": now},
		{"_id": apiKey2ID, "id": apiKey2ID, "user_id": user1ID, "name": "Development Key", "key_hash": "dra_dev_" + uuid.New().String(), "scopes": []string{"all"}, "rate_limit": 1000, "created_at": now},
		{"_id": apiKey3ID, "id": apiKey3ID, "user_id": user2ID, "name": "Personal Project", "key_hash": "dra_pers_" + uuid.New().String(), "scopes": []string{"all"}, "rate_limit": 1000, "created_at": now},
	}
	if _, err := mdb.Collection("api_keys").InsertMany(ctx, toAnySlice(apiKeys)); err != nil {
		return fmt.Errorf("seed api keys: %w", err)
	}
	logger.Info("seed_api_keys_created", "count", len(apiKeys))

	log1ID := domain.NewID()
	log2ID := domain.NewID()
	log3ID := domain.NewID()
	log4ID := domain.NewID()
	log5ID := domain.NewID()
	logs := []bson.M{
		{"_id": log1ID, "id": log1ID, "user_id": user1ID, "api_key_id": apiKey1ID, "model": "gpt-4", "provider": "openai", "input_tokens": 150, "output_tokens": 320, "cost": 12500, "latency": 1250, "status": "success", "created_at": now},
		{"_id": log2ID, "id": log2ID, "user_id": user1ID, "api_key_id": apiKey1ID, "model": "claude-3-opus", "provider": "anthropic", "input_tokens": 2000, "output_tokens": 1500, "cost": 87500, "latency": 3200, "status": "success", "created_at": now},
		{"_id": log3ID, "id": log3ID, "user_id": user1ID, "api_key_id": apiKey2ID, "model": "gpt-3.5-turbo", "provider": "openai", "input_tokens": 50, "output_tokens": 120, "cost": 1500, "latency": 450, "status": "success", "created_at": now},
		{"_id": log4ID, "id": log4ID, "user_id": user2ID, "api_key_id": apiKey3ID, "model": "gpt-4", "provider": "openai", "input_tokens": 500, "output_tokens": 800, "cost": 28500, "latency": 2100, "status": "success", "created_at": now},
		{"_id": log5ID, "id": log5ID, "user_id": user2ID, "api_key_id": apiKey3ID, "model": "claude-3-sonnet", "provider": "anthropic", "input_tokens": 100, "output_tokens": 0, "cost": 0, "latency": 0, "status": "error", "error_message": "Rate limit exceeded", "created_at": now},
	}
	if _, err := mdb.Collection("api_logs").InsertMany(ctx, toAnySlice(logs)); err != nil {
		return fmt.Errorf("seed api logs: %w", err)
	}
	logger.Info("seed_api_logs_created", "count", len(logs))

	transactions := []bson.M{
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": adminID, "amount": 1000000, "type": "purchase", "description": "Initial credit purchase", "created_at": now},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user1ID, "amount": 500000, "type": "purchase", "description": "Credit purchase via Stripe", "created_at": now},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user1ID, "amount": 250000, "type": "purchase", "description": "Credit purchase via Stripe", "created_at": now},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user1ID, "amount": -121500, "type": "usage", "description": "API usage deduction", "related_log_id": log1ID, "created_at": now},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user2ID, "amount": 500000, "type": "purchase", "description": "Credit purchase via Stripe", "created_at": now},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user2ID, "amount": -250000, "type": "usage", "description": "API usage deduction", "related_log_id": log4ID, "created_at": now},
		{"_id": domain.NewID(), "id": domain.NewID(), "user_id": user2ID, "amount": 50000, "type": "bonus", "description": "Welcome bonus credits", "created_at": now},
	}
	if _, err := mdb.Collection("credit_transactions").InsertMany(ctx, toAnySlice(transactions)); err != nil {
		return fmt.Errorf("seed transactions: %w", err)
	}
	logger.Info("seed_credit_transactions_created", "count", len(transactions))

	logger.Info("auto_seed_complete", "db_type", "mongodb")
	return nil
}

func toAnySlice[T any](s []T) []any {
	result := make([]any, len(s))
	for i, v := range s {
		result[i] = v
	}
	return result
}

// ErrNoRows is the unified "not found" error used by the db package.
// Repositories should compare against this instead of pgx.ErrNoRows directly.
var ErrNoRows = pgx.ErrNoRows
