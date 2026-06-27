// Package stores provides PostgreSQL implementations of all enterprise package store interfaces.
package stores

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"dra-platform/backend/pkg/llm/audit"
	"dra-platform/backend/pkg/llm/budget"
	"dra-platform/backend/pkg/llm/credentials"
	"dra-platform/backend/pkg/llm/usage"
	"dra-platform/backend/pkg/llm/virtualkeys"
)

// PostgresCredentialStore implements credentials.Store with PostgreSQL.
type PostgresCredentialStore struct {
	pool *pgxpool.Pool
}

func NewPostgresCredentialStore(pool *pgxpool.Pool) *PostgresCredentialStore {
	return &PostgresCredentialStore{pool: pool}
}

func (s *PostgresCredentialStore) Save(c *credentials.Credential) error {
	if c.ID == "" {
		_, err := s.pool.Exec(context.Background(), `
			INSERT INTO credentials (name, provider_type, encrypted_key, key_hash, key_last_four, api_base, priority, is_active, health_status)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			RETURNING id, created_at, updated_at`,
			c.Name, c.ProviderType, c.EncryptedKey, c.KeyHash, c.KeyLastFour, c.APIBase, c.Priority, c.IsActive, c.HealthStatus)
		return err
	}
	_, err := s.pool.Exec(context.Background(), `
		INSERT INTO credentials (id, name, provider_type, encrypted_key, key_hash, key_last_four, api_base, priority, is_active, health_status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (id) DO UPDATE SET encrypted_key=$4, key_hash=$5, key_last_four=$6, api_base=$7, priority=$8, is_active=$9, health_status=$10, updated_at=now()`,
		c.ID, c.Name, c.ProviderType, c.EncryptedKey, c.KeyHash, c.KeyLastFour, c.APIBase, c.Priority, c.IsActive, c.HealthStatus)
	return err
}

func (s *PostgresCredentialStore) GetByID(id string) (*credentials.Credential, error) {
	row := s.pool.QueryRow(context.Background(), `
		SELECT id, name, provider_type, encrypted_key, key_hash, key_last_four, api_base, priority, is_active, health_status,
			last_health_check, last_rotated_at, failure_count, success_count, total_requests, last_error
		FROM credentials WHERE id=$1`, id)
	var c credentials.Credential
	var lastHC, lastRot *time.Time
	err := row.Scan(&c.ID, &c.Name, &c.ProviderType, &c.EncryptedKey, &c.KeyHash, &c.KeyLastFour, &c.APIBase,
		&c.Priority, &c.IsActive, &c.HealthStatus, &lastHC, &lastRot, &c.FailureCount, &c.SuccessCount, &c.TotalRequests, &c.LastError)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c.LastHealthCheck = lastHC
	c.LastRotatedAt = lastRot
	return &c, nil
}

func (s *PostgresCredentialStore) scanCredential(row pgx.Row) (*credentials.Credential, error) {
	var c credentials.Credential
	var lastHC, lastRot *time.Time
	err := row.Scan(&c.ID, &c.Name, &c.ProviderType, &c.EncryptedKey, &c.KeyHash, &c.KeyLastFour, &c.APIBase,
		&c.Priority, &c.IsActive, &c.HealthStatus, &lastHC, &lastRot, &c.FailureCount, &c.SuccessCount, &c.TotalRequests, &c.LastError)
	if err != nil {
		return nil, err
	}
	c.LastHealthCheck = lastHC
	c.LastRotatedAt = lastRot
	return &c, nil
}

const credSelectCols = `id, name, provider_type, encrypted_key, key_hash, key_last_four, api_base, priority, is_active, health_status, last_health_check, last_rotated_at, failure_count, success_count, total_requests, last_error`

func (s *PostgresCredentialStore) GetByProvider(providerType string) ([]*credentials.Credential, error) {
	rows, err := s.pool.Query(context.Background(), credSelectCols+` FROM credentials WHERE provider_type=$1 ORDER BY priority DESC`, providerType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*credentials.Credential
	for rows.Next() {
		var c credentials.Credential
		var lastHC, lastRot *time.Time
		if err := rows.Scan(&c.ID, &c.Name, &c.ProviderType, &c.EncryptedKey, &c.KeyHash, &c.KeyLastFour, &c.APIBase,
			&c.Priority, &c.IsActive, &c.HealthStatus, &lastHC, &lastRot, &c.FailureCount, &c.SuccessCount, &c.TotalRequests, &c.LastError); err != nil {
			return nil, err
		}
		c.LastHealthCheck = lastHC
		c.LastRotatedAt = lastRot
		result = append(result, &c)
	}
	return result, nil
}

func (s *PostgresCredentialStore) GetActiveByProvider(providerType string) ([]*credentials.Credential, error) {
	rows, err := s.pool.Query(context.Background(), credSelectCols+` FROM credentials WHERE provider_type=$1 AND is_active=true ORDER BY priority DESC`, providerType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*credentials.Credential
	for rows.Next() {
		var c credentials.Credential
		var lastHC, lastRot *time.Time
		if err := rows.Scan(&c.ID, &c.Name, &c.ProviderType, &c.EncryptedKey, &c.KeyHash, &c.KeyLastFour, &c.APIBase,
			&c.Priority, &c.IsActive, &c.HealthStatus, &lastHC, &lastRot, &c.FailureCount, &c.SuccessCount, &c.TotalRequests, &c.LastError); err != nil {
			return nil, err
		}
		c.LastHealthCheck = lastHC
		c.LastRotatedAt = lastRot
		result = append(result, &c)
	}
	return result, nil
}

func (s *PostgresCredentialStore) UpdateHealth(id, status string, failureCount int, lastError string) error {
	_, err := s.pool.Exec(context.Background(),
		`UPDATE credentials SET health_status=$2, failure_count=$3, last_error=$4, last_health_check=now() WHERE id=$1`,
		id, status, failureCount, lastError)
	return err
}

func (s *PostgresCredentialStore) Delete(id string) error {
	_, err := s.pool.Exec(context.Background(), `DELETE FROM credentials WHERE id=$1`, id)
	return err
}

func (s *PostgresCredentialStore) List() ([]*credentials.Credential, error) {
	rows, err := s.pool.Query(context.Background(), credSelectCols+` FROM credentials ORDER BY provider_type, priority DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*credentials.Credential
	for rows.Next() {
		var c credentials.Credential
		var lastHC, lastRot *time.Time
		if err := rows.Scan(&c.ID, &c.Name, &c.ProviderType, &c.EncryptedKey, &c.KeyHash, &c.KeyLastFour, &c.APIBase,
			&c.Priority, &c.IsActive, &c.HealthStatus, &lastHC, &lastRot, &c.FailureCount, &c.SuccessCount, &c.TotalRequests, &c.LastError); err != nil {
			return nil, err
		}
		c.LastHealthCheck = lastHC
		c.LastRotatedAt = lastRot
		result = append(result, &c)
	}
	return result, nil
}

// PostgresVirtualKeyStore implements virtualkeys.Store with PostgreSQL.
type PostgresVirtualKeyStore struct {
	pool *pgxpool.Pool
}

func NewPostgresVirtualKeyStore(pool *pgxpool.Pool) *PostgresVirtualKeyStore {
	return &PostgresVirtualKeyStore{pool: pool}
}

const vkSelectCols = `id, key_hash, key_prefix, name, COALESCE(team_id::text,''), COALESCE(user_id::text,''), model_access,
	rate_limit_rpm, rate_limit_rpd, rate_limit_tpm, budget_limit_cents, budget_used_cents, budget_reset_period,
	max_tokens_per_request, allowed_ips, expires_at, last_used_at, request_count, total_tokens, is_active, created_at, updated_at`

func (s *PostgresVirtualKeyStore) scanVK(row pgx.Row) (*virtualkeys.VirtualKey, error) {
	var vk virtualkeys.VirtualKey
	var teamID, userID string
	var expiresAt, lastUsed *time.Time
	err := row.Scan(&vk.ID, &vk.KeyHash, &vk.KeyPrefix, &vk.Name, &teamID, &userID, &vk.ModelAccess,
		&vk.RateLimitRPM, &vk.RateLimitRPD, &vk.RateLimitTPM, &vk.BudgetLimitCents, &vk.BudgetUsedCents, &vk.BudgetResetPeriod,
		&vk.MaxTokensPerReq, &vk.AllowedIPs, &expiresAt, &lastUsed, &vk.RequestCount, &vk.TotalTokens, &vk.IsActive, &vk.CreatedAt, &vk.UpdatedAt)
	if err != nil {
		return nil, err
	}
	vk.TeamID = teamID
	vk.UserID = userID
	vk.ExpiresAt = expiresAt
	vk.LastUsedAt = lastUsed
	return &vk, nil
}

func (s *PostgresVirtualKeyStore) Save(vk *virtualkeys.VirtualKey) error {
	if vk.ID == "" {
		return s.pool.QueryRow(context.Background(), `
			INSERT INTO virtual_keys (key_hash, key_prefix, name, team_id, user_id, model_access, rate_limit_rpm, rate_limit_rpd, rate_limit_tpm,
				budget_limit_cents, budget_reset_period, max_tokens_per_request, allowed_ips, expires_at, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
			RETURNING id, created_at, updated_at`,
			vk.KeyHash, vk.KeyPrefix, vk.Name, nullStr(vk.TeamID), nullStr(vk.UserID), vk.ModelAccess,
			vk.RateLimitRPM, vk.RateLimitRPD, vk.RateLimitTPM, vk.BudgetLimitCents, vk.BudgetResetPeriod,
			vk.MaxTokensPerReq, vk.AllowedIPs, vk.ExpiresAt, vk.IsActive).Scan(&vk.ID, &vk.CreatedAt, &vk.UpdatedAt)
	}
	_, err := s.pool.Exec(context.Background(), `
		UPDATE virtual_keys SET name=$2, model_access=$3, rate_limit_rpm=$4, rate_limit_rpd=$5, rate_limit_tpm=$6,
			budget_limit_cents=$7, budget_reset_period=$8, max_tokens_per_request=$9, allowed_ips=$10, expires_at=$11, is_active=$12, updated_at=now()
		WHERE id=$1`,
		vk.ID, vk.Name, vk.ModelAccess, vk.RateLimitRPM, vk.RateLimitRPD, vk.RateLimitTPM,
		vk.BudgetLimitCents, vk.BudgetResetPeriod, vk.MaxTokensPerReq, vk.AllowedIPs, vk.ExpiresAt, vk.IsActive)
	return err
}

func (s *PostgresVirtualKeyStore) GetByHash(hash string) (*virtualkeys.VirtualKey, error) {
	row := s.pool.QueryRow(context.Background(), vkSelectCols+` FROM virtual_keys WHERE key_hash=$1`, hash)
	vk, err := s.scanVK(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return vk, err
}

func (s *PostgresVirtualKeyStore) GetByID(id string) (*virtualkeys.VirtualKey, error) {
	row := s.pool.QueryRow(context.Background(), vkSelectCols+` FROM virtual_keys WHERE id=$1`, id)
	vk, err := s.scanVK(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return vk, err
}

func (s *PostgresVirtualKeyStore) GetByUser(userID string) ([]*virtualkeys.VirtualKey, error) {
	rows, err := s.pool.Query(context.Background(), vkSelectCols+` FROM virtual_keys WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanVKRows(rows)
}

func (s *PostgresVirtualKeyStore) GetByTeam(teamID string) ([]*virtualkeys.VirtualKey, error) {
	rows, err := s.pool.Query(context.Background(), vkSelectCols+` FROM virtual_keys WHERE team_id=$1 ORDER BY created_at DESC`, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanVKRows(rows)
}

func (s *PostgresVirtualKeyStore) scanVKRows(rows pgx.Rows) ([]*virtualkeys.VirtualKey, error) {
	var result []*virtualkeys.VirtualKey
	for rows.Next() {
		var vk virtualkeys.VirtualKey
		var teamID, userID string
		var expiresAt, lastUsed *time.Time
		if err := rows.Scan(&vk.ID, &vk.KeyHash, &vk.KeyPrefix, &vk.Name, &teamID, &userID, &vk.ModelAccess,
			&vk.RateLimitRPM, &vk.RateLimitRPD, &vk.RateLimitTPM, &vk.BudgetLimitCents, &vk.BudgetUsedCents, &vk.BudgetResetPeriod,
			&vk.MaxTokensPerReq, &vk.AllowedIPs, &expiresAt, &lastUsed, &vk.RequestCount, &vk.TotalTokens, &vk.IsActive, &vk.CreatedAt, &vk.UpdatedAt); err != nil {
			return nil, err
		}
		vk.TeamID = teamID
		vk.UserID = userID
		vk.ExpiresAt = expiresAt
		vk.LastUsedAt = lastUsed
		result = append(result, &vk)
	}
	return result, nil
}

func (s *PostgresVirtualKeyStore) UpdateUsage(id string, cents int64, tokens int) error {
	_, err := s.pool.Exec(context.Background(),
		`UPDATE virtual_keys SET budget_used_cents = budget_used_cents + $2, total_tokens = total_tokens + $3,
			request_count = request_count + 1, last_used_at = now(), updated_at = now()
		WHERE id = $1`, id, cents, tokens)
	return err
}

func (s *PostgresVirtualKeyStore) Deactivate(id string) error {
	_, err := s.pool.Exec(context.Background(), `UPDATE virtual_keys SET is_active=false, updated_at=now() WHERE id=$1`, id)
	return err
}

func (s *PostgresVirtualKeyStore) Delete(id string) error {
	_, err := s.pool.Exec(context.Background(), `DELETE FROM virtual_keys WHERE id=$1`, id)
	return err
}

func (s *PostgresVirtualKeyStore) List() ([]*virtualkeys.VirtualKey, error) {
	rows, err := s.pool.Query(context.Background(), vkSelectCols+` FROM virtual_keys ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanVKRows(rows)
}

// PostgresBudgetStore implements budget.Store with PostgreSQL.
type PostgresBudgetStore struct {
	pool *pgxpool.Pool
}

func NewPostgresBudgetStore(pool *pgxpool.Pool) *PostgresBudgetStore {
	return &PostgresBudgetStore{pool: pool}
}

func (s *PostgresBudgetStore) Save(b *budget.Budget) error {
	// Use UPSERT on a virtual table key
	_, err := s.pool.Exec(context.Background(), `
		INSERT INTO budget_alerts (target_type, target_id, threshold_percent, current_usage_cents, budget_limit_cents, alert_type)
		VALUES ($1, $2, 0, $3, $4, 'internal')
		ON CONFLICT (target_type, target_id, threshold_percent) DO UPDATE SET current_usage_cents=$3, budget_limit_cents=$4`,
		string(b.Scope), b.ScopeID, b.UsedCents, b.LimitCents)
	return err
}

func (s *PostgresBudgetStore) Get(scope budget.BudgetScope, scopeID string) (*budget.Budget, error) {
	row := s.pool.QueryRow(context.Background(), `
		SELECT target_type, target_id, current_usage_cents, budget_limit_cents
		FROM budget_alerts WHERE target_type=$1 AND target_id=$2 AND threshold_percent=0`, string(scope), scopeID)
	var b budget.Budget
	err := row.Scan(&b.Scope, &b.ScopeID, &b.UsedCents, &b.LimitCents)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (s *PostgresBudgetStore) GetByScope(scope budget.BudgetScope) ([]*budget.Budget, error) {
	rows, err := s.pool.Query(context.Background(), `
		SELECT target_type, target_id, current_usage_cents, budget_limit_cents
		FROM budget_alerts WHERE target_type=$1 AND threshold_percent=0`, string(scope))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*budget.Budget
	for rows.Next() {
		var b budget.Budget
		if err := rows.Scan(&b.Scope, &b.ScopeID, &b.UsedCents, &b.LimitCents); err != nil {
			return nil, err
		}
		result = append(result, &b)
	}
	return result, nil
}

func (s *PostgresBudgetStore) UpdateUsage(scope budget.BudgetScope, scopeID string, cents int64) error {
	_, err := s.pool.Exec(context.Background(), `
		UPDATE budget_alerts SET current_usage_cents = current_usage_cents + $3
		WHERE target_type=$1 AND target_id=$2 AND threshold_percent=0`, string(scope), scopeID, cents)
	return err
}

func (s *PostgresBudgetStore) ResetUsage(scope budget.BudgetScope, scopeID string) error {
	_, err := s.pool.Exec(context.Background(), `
		UPDATE budget_alerts SET current_usage_cents = 0
		WHERE target_type=$1 AND target_id=$2 AND threshold_percent=0`, string(scope), scopeID)
	return err
}

func (s *PostgresBudgetStore) Delete(scope budget.BudgetScope, scopeID string) error {
	_, err := s.pool.Exec(context.Background(), `
		DELETE FROM budget_alerts WHERE target_type=$1 AND target_id=$2`, string(scope), scopeID)
	return err
}

// PostgresUsageStore implements usage.Store with PostgreSQL.
type PostgresUsageStore struct {
	pool *pgxpool.Pool
}

func NewPostgresUsageStore(pool *pgxpool.Pool) *PostgresUsageStore {
	return &PostgresUsageStore{pool: pool}
}

func (s *PostgresUsageStore) Save(r *usage.Record) error {
	if r.ID == "" {
		return s.pool.QueryRow(context.Background(), `
			INSERT INTO usage_records (request_id, virtual_key_id, user_id, team_id, model, provider,
				input_tokens, output_tokens, total_tokens, thinking_tokens, cost_microcents, latency_ms, status, error_message, ip_address, user_agent)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
			RETURNING id, created_at`,
			r.RequestID, nullStr(r.VirtualKeyID), nullStr(r.UserID), nullStr(r.TeamID), r.Model, r.Provider,
			r.InputTokens, r.OutputTokens, r.TotalTokens, r.ThinkingTokens, r.CostMicroCents, r.LatencyMs, r.Status, r.ErrorMessage, r.IPAddress, r.UserAgent).
			Scan(&r.ID, &r.CreatedAt)
	}
	_, err := s.pool.Exec(context.Background(), `
		INSERT INTO usage_records (id, request_id, virtual_key_id, user_id, team_id, model, provider,
			input_tokens, output_tokens, total_tokens, thinking_tokens, cost_microcents, latency_ms, status, error_message)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		r.ID, r.RequestID, nullStr(r.VirtualKeyID), nullStr(r.UserID), nullStr(r.TeamID), r.Model, r.Provider,
		r.InputTokens, r.OutputTokens, r.TotalTokens, r.ThinkingTokens, r.CostMicroCents, r.LatencyMs, r.Status, r.ErrorMessage)
	return err
}

func (s *PostgresUsageStore) GetByRequest(requestID string) (*usage.Record, error) {
	row := s.pool.QueryRow(context.Background(), `
		SELECT id, request_id, COALESCE(virtual_key_id::text,''), COALESCE(user_id::text,''), COALESCE(team_id::text,''),
			model, provider, input_tokens, output_tokens, total_tokens, thinking_tokens, cost_microcents, latency_ms, status, error_message, created_at
		FROM usage_records WHERE request_id=$1`, requestID)
	var r usage.Record
	err := row.Scan(&r.ID, &r.RequestID, &r.VirtualKeyID, &r.UserID, &r.TeamID, &r.Model, &r.Provider,
		&r.InputTokens, &r.OutputTokens, &r.TotalTokens, &r.ThinkingTokens, &r.CostMicroCents, &r.LatencyMs, &r.Status, &r.ErrorMessage, &r.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &r, err
}

func (s *PostgresUsageStore) queryRecords(query string, args ...any) ([]*usage.Record, error) {
	rows, err := s.pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*usage.Record
	for rows.Next() {
		var r usage.Record
		if err := rows.Scan(&r.ID, &r.RequestID, &r.VirtualKeyID, &r.UserID, &r.TeamID, &r.Model, &r.Provider,
			&r.InputTokens, &r.OutputTokens, &r.TotalTokens, &r.ThinkingTokens, &r.CostMicroCents, &r.LatencyMs, &r.Status, &r.ErrorMessage, &r.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, &r)
	}
	return result, nil
}

const usageSelectCols = `id, request_id, COALESCE(virtual_key_id::text,''), COALESCE(user_id::text,''), COALESCE(team_id::text,''),
	model, provider, input_tokens, output_tokens, total_tokens, thinking_tokens, cost_microcents, latency_ms, status, error_message, created_at`

func (s *PostgresUsageStore) GetByUser(userID string, since time.Time) ([]*usage.Record, error) {
	return s.queryRecords(usageSelectCols+` FROM usage_records WHERE user_id=$1 AND created_at>$2 ORDER BY created_at DESC`, userID, since)
}

func (s *PostgresUsageStore) GetByModel(model string, since time.Time) ([]*usage.Record, error) {
	return s.queryRecords(usageSelectCols+` FROM usage_records WHERE model=$1 AND created_at>$2 ORDER BY created_at DESC`, model, since)
}

func (s *PostgresUsageStore) GetByProvider(provider string, since time.Time) ([]*usage.Record, error) {
	return s.queryRecords(usageSelectCols+` FROM usage_records WHERE provider=$1 AND created_at>$2 ORDER BY created_at DESC`, provider, since)
}

func (s *PostgresUsageStore) GetByTeam(teamID string, since time.Time) ([]*usage.Record, error) {
	return s.queryRecords(usageSelectCols+` FROM usage_records WHERE team_id=$1 AND created_at>$2 ORDER BY created_at DESC`, teamID, since)
}

func (s *PostgresUsageStore) aggregate(query string, args ...any) (*usage.Aggregate, error) {
	row := s.pool.QueryRow(context.Background(), query, args...)
	var a usage.Aggregate
	err := row.Scan(&a.TotalRequests, &a.TotalTokens, &a.TotalInputTokens, &a.TotalOutputTokens, &a.TotalThinkingTokens, &a.TotalCostCents, &a.AvgLatencyMs, &a.ErrorCount)
	if err != nil {
		return &a, nil
	}
	return &a, nil
}

func (s *PostgresUsageStore) AggregateByUser(userID string, since time.Time) (*usage.Aggregate, error) {
	return s.aggregate(`SELECT COUNT(*), COALESCE(SUM(total_tokens),0), COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		COALESCE(SUM(thinking_tokens),0), COALESCE(SUM(cost_microcents/1000000),0), COALESCE(AVG(latency_ms),0), COUNT(*) FILTER (WHERE status<>'success')
		FROM usage_records WHERE user_id=$1 AND created_at>$2`, userID, since)
}

func (s *PostgresUsageStore) AggregateByModel(model string, since time.Time) (*usage.Aggregate, error) {
	return s.aggregate(`SELECT COUNT(*), COALESCE(SUM(total_tokens),0), COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		COALESCE(SUM(thinking_tokens),0), COALESCE(SUM(cost_microcents/1000000),0), COALESCE(AVG(latency_ms),0), COUNT(*) FILTER (WHERE status<>'success')
		FROM usage_records WHERE model=$1 AND created_at>$2`, model, since)
}

func (s *PostgresUsageStore) AggregateByProvider(provider string, since time.Time) (*usage.Aggregate, error) {
	return s.aggregate(`SELECT COUNT(*), COALESCE(SUM(total_tokens),0), COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		COALESCE(SUM(thinking_tokens),0), COALESCE(SUM(cost_microcents/1000000),0), COALESCE(AVG(latency_ms),0), COUNT(*) FILTER (WHERE status<>'success')
		FROM usage_records WHERE provider=$1 AND created_at>$2`, provider, since)
}

func (s *PostgresUsageStore) AggregateGlobal(since time.Time) (*usage.Aggregate, error) {
	return s.aggregate(`SELECT COUNT(*), COALESCE(SUM(total_tokens),0), COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		COALESCE(SUM(thinking_tokens),0), COALESCE(SUM(cost_microcents/1000000),0), COALESCE(AVG(latency_ms),0), COUNT(*) FILTER (WHERE status<>'success')
		FROM usage_records WHERE created_at>$1`, since)
}

// PostgresPricingStore implements usage.PricingStore with PostgreSQL.
type PostgresPricingStore struct {
	pool *pgxpool.Pool
}

func NewPostgresPricingStore(pool *pgxpool.Pool) *PostgresPricingStore {
	return &PostgresPricingStore{pool: pool}
}

func (s *PostgresPricingStore) GetPricing(model, provider string) (*usage.Pricing, error) {
	row := s.pool.QueryRow(context.Background(), `
		SELECT model, provider, input_cost_per_million_cents, output_cost_per_million_cents, thinking_cost_per_million_cents
		FROM model_pricing WHERE model=$1 AND (provider=$2 OR provider='') AND is_active=true`, model, provider)
	var p usage.Pricing
	err := row.Scan(&p.Model, &p.Provider, &p.InputCostPerMillion, &p.OutputCostPerMillion, &p.ThinkingCostPerMillion)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func (s *PostgresPricingStore) ListPricing() ([]*usage.Pricing, error) {
	rows, err := s.pool.Query(context.Background(), `
		SELECT model, provider, input_cost_per_million_cents, output_cost_per_million_cents, thinking_cost_per_million_cents
		FROM model_pricing WHERE is_active=true ORDER BY model`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []*usage.Pricing
	for rows.Next() {
		var p usage.Pricing
		if err := rows.Scan(&p.Model, &p.Provider, &p.InputCostPerMillion, &p.OutputCostPerMillion, &p.ThinkingCostPerMillion); err != nil {
			return nil, err
		}
		result = append(result, &p)
	}
	return result, nil
}

func (s *PostgresPricingStore) SavePricing(p *usage.Pricing) error {
	_, err := s.pool.Exec(context.Background(), `
		INSERT INTO model_pricing (model, provider, input_cost_per_million_cents, output_cost_per_million_cents, thinking_cost_per_million_cents)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (model, provider) DO UPDATE SET input_cost_per_million_cents=$3, output_cost_per_million_cents=$4, thinking_cost_per_million_cents=$5, updated_at=now()`,
		p.Model, p.Provider, p.InputCostPerMillion, p.OutputCostPerMillion, p.ThinkingCostPerMillion)
	return err
}

// PostgresAuditStore implements audit.Store with PostgreSQL.
type PostgresAuditStore struct {
	pool *pgxpool.Pool
}

func NewPostgresAuditStore(pool *pgxpool.Pool) *PostgresAuditStore {
	return &PostgresAuditStore{pool: pool}
}

func (s *PostgresAuditStore) Save(entry *audit.Entry) error {
	detailsJSON, _ := json.Marshal(entry.Details)
	return s.pool.QueryRow(context.Background(), `
		INSERT INTO audit_logs (actor_id, actor_type, action, resource_type, resource_id, details, ip_address, user_agent, severity)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, created_at`,
		nullStr(entry.ActorID), entry.ActorType, string(entry.Action), entry.ResourceType, nullStr(entry.ResourceID),
		detailsJSON, entry.IPAddress, entry.UserAgent, string(entry.Severity)).Scan(&entry.ID, &entry.CreatedAt)
}

func (s *PostgresAuditStore) Query(filter audit.Filter) ([]*audit.Entry, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if filter.ActorID != "" {
		where += fmt.Sprintf(" AND actor_id=$%d", argIdx)
		args = append(args, filter.ActorID)
		argIdx++
	}
	if filter.Action != "" {
		where += fmt.Sprintf(" AND action=$%d", argIdx)
		args = append(args, string(filter.Action))
		argIdx++
	}
	if filter.Severity != "" {
		where += fmt.Sprintf(" AND severity=$%d", argIdx)
		args = append(args, string(filter.Severity))
		argIdx++
	}
	if filter.StartDate != nil {
		where += fmt.Sprintf(" AND created_at>=$%d", argIdx)
		args = append(args, *filter.StartDate)
		argIdx++
	}
	if filter.EndDate != nil {
		where += fmt.Sprintf(" AND created_at<=$%d", argIdx)
		args = append(args, *filter.EndDate)
		argIdx++
	}

	// Count
	var total int
	err := s.pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM audit_logs "+where, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Paginate
	offset := (filter.Page - 1) * filter.Limit
	query := fmt.Sprintf("SELECT id, COALESCE(actor_id::text,''), actor_type, action, resource_type, COALESCE(resource_id::text,''), details, COALESCE(ip_address::text,''), user_agent, severity, created_at FROM audit_logs %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d", where, argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := s.pool.Query(context.Background(), query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []*audit.Entry
	for rows.Next() {
		var e audit.Entry
		var details []byte
		if err := rows.Scan(&e.ID, &e.ActorID, &e.ActorType, &e.Action, &e.ResourceType, &e.ResourceID, &details, &e.IPAddress, &e.UserAgent, &e.Severity, &e.CreatedAt); err != nil {
			return nil, 0, err
		}
		json.Unmarshal(details, &e.Details)
		entries = append(entries, &e)
	}
	return entries, total, nil
}

func (s *PostgresAuditStore) GetByID(id string) (*audit.Entry, error) {
	row := s.pool.QueryRow(context.Background(), `
		SELECT id, COALESCE(actor_id::text,''), actor_type, action, resource_type, COALESCE(resource_id::text,''), details, COALESCE(ip_address::text,''), user_agent, severity, created_at
		FROM audit_logs WHERE id=$1`, id)
	var e audit.Entry
	var details []byte
	err := row.Scan(&e.ID, &e.ActorID, &e.ActorType, &e.Action, &e.ResourceType, &e.ResourceID, &details, &e.IPAddress, &e.UserAgent, &e.Severity, &e.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal(details, &e.Details)
	return &e, nil
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
