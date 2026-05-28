package repository

import (
	"context"
	"fmt"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/jackc/pgx/v5"
)

type AdminProviderRepo struct {
	db    *db.DB
	cache RepoCache
	ttl   time.Duration
}

func NewAdminProviderRepo(d *db.DB) *AdminProviderRepo {
	return &AdminProviderRepo{db: d}
}

func (r *AdminProviderRepo) SetCache(c RepoCache, ttl time.Duration) {
	r.cache = c
	r.ttl = ttl
}

func (r *AdminProviderRepo) Create(ctx context.Context, p *domain.Provider) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO providers (id, name, display_name, provider_type, base_url, status, priority,
			timeout_ms, circuit_breaker_enabled, circuit_breaker_threshold,
			circuit_breaker_recovery_ms, circuit_breaker_half_open_max, max_retries,
			rate_limit_rpm, rate_limit_tpm, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		p.ID, p.Name, p.DisplayName, p.ProviderType, p.BaseURL, p.Status, p.Priority,
		p.TimeoutMS, p.CircuitBreakerEnabled, p.CircuitBreakerThreshold,
		p.CircuitBreakerRecoveryMS, p.CircuitBreakerHalfOpenMax, p.MaxRetries,
		p.RateLimitRPM, p.RateLimitTPM, p.Metadata)
	if err != nil {
		return fmt.Errorf("create provider: %w", err)
	}
	return nil
}

func (r *AdminProviderRepo) Get(ctx context.Context, id string) (*domain.Provider, error) {
	key := providerCacheKey(id)
	var p domain.Provider
	if r.cache != nil && r.cache.Get(ctx, key, &p) {
		return &p, nil
	}
	err := r.db.QueryRow(ctx, `
		SELECT id, name, display_name, provider_type, base_url, status, priority,
			timeout_ms, circuit_breaker_enabled, circuit_breaker_threshold,
			circuit_breaker_recovery_ms, circuit_breaker_half_open_max, max_retries,
			rate_limit_rpm, rate_limit_tpm, metadata, created_at, updated_at
		FROM providers WHERE id = $1`, id).
		Scan(&p.ID, &p.Name, &p.DisplayName, &p.ProviderType, &p.BaseURL, &p.Status,
			&p.Priority, &p.TimeoutMS, &p.CircuitBreakerEnabled, &p.CircuitBreakerThreshold,
			&p.CircuitBreakerRecoveryMS, &p.CircuitBreakerHalfOpenMax, &p.MaxRetries,
			&p.RateLimitRPM, &p.RateLimitTPM, &p.Metadata, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get provider: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, &p, r.ttl)
	}
	return &p, nil
}

func (r *AdminProviderRepo) GetByName(ctx context.Context, name string) (*domain.Provider, error) {
	var p domain.Provider
	err := r.db.QueryRow(ctx, `
		SELECT id, name, display_name, provider_type, base_url, status, priority,
			timeout_ms, circuit_breaker_enabled, circuit_breaker_threshold,
			circuit_breaker_recovery_ms, circuit_breaker_half_open_max, max_retries,
			rate_limit_rpm, rate_limit_tpm, metadata, created_at, updated_at
		FROM providers WHERE name = $1`, name).
		Scan(&p.ID, &p.Name, &p.DisplayName, &p.ProviderType, &p.BaseURL, &p.Status,
			&p.Priority, &p.TimeoutMS, &p.CircuitBreakerEnabled, &p.CircuitBreakerThreshold,
			&p.CircuitBreakerRecoveryMS, &p.CircuitBreakerHalfOpenMax, &p.MaxRetries,
			&p.RateLimitRPM, &p.RateLimitTPM, &p.Metadata, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get provider by name: %w", err)
	}
	return &p, nil
}

func (r *AdminProviderRepo) List(ctx context.Context) ([]domain.Provider, error) {
	key := providerListCacheKey()
	var list []domain.Provider
	if r.cache != nil && r.cache.Get(ctx, key, &list) {
		return list, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, name, display_name, provider_type, base_url, status, priority,
			timeout_ms, circuit_breaker_enabled, rate_limit_rpm, rate_limit_tpm,
			metadata, created_at, updated_at
		FROM providers ORDER BY priority DESC, name ASC`)
	if err != nil {
		return nil, fmt.Errorf("list providers: %w", err)
	}
	defer rows.Close()

	var providers []domain.Provider
	for rows.Next() {
		var p domain.Provider
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.ProviderType, &p.BaseURL,
			&p.Status, &p.Priority, &p.TimeoutMS, &p.CircuitBreakerEnabled,
			&p.RateLimitRPM, &p.RateLimitTPM, &p.Metadata, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan provider: %w", err)
		}
		providers = append(providers, p)
	}
	if r.cache != nil {
		_ = r.cache.Set(ctx, key, providers, r.ttl)
	}
	return providers, nil
}

func (r *AdminProviderRepo) Update(ctx context.Context, p *domain.Provider) error {
	_, err := r.db.Exec(ctx, `
		UPDATE providers SET display_name=$2, base_url=$3, status=$4, priority=$5,
			timeout_ms=$6, max_retries=$7, metadata=$8, updated_at=NOW()
		WHERE id=$1`, p.ID, p.DisplayName, p.BaseURL, p.Status, p.Priority,
		p.TimeoutMS, p.MaxRetries, p.Metadata)
	if err != nil {
		return fmt.Errorf("update provider: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, providerCacheKey(p.ID))
		_ = r.cache.Delete(ctx, providerListCacheKey())
	}
	return nil
}

func (r *AdminProviderRepo) UpdateStatus(ctx context.Context, id string, status domain.ProviderStatus) error {
	tag, err := r.db.Exec(ctx, `UPDATE providers SET status=$2, updated_at=NOW() WHERE id=$1`, id, status)
	if err != nil {
		return fmt.Errorf("update provider status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("provider not found: %s", id)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, providerCacheKey(id))
		_ = r.cache.Delete(ctx, providerListCacheKey())
	}
	return nil
}

func (r *AdminProviderRepo) CreateKey(ctx context.Context, k *domain.ProviderKey) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO provider_keys (id, provider_id, label, key_prefix, key_hash, key_last_four,
			strategy, weight, sort_order, rpm_limit, tpm_limit, monthly_quota, is_active)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		k.ID, k.ProviderID, k.Label, k.KeyPrefix, k.KeyHash, k.KeyLastFour,
		k.Strategy, k.Weight, k.SortOrder, k.RPMLimit, k.TPMLimit, k.MonthlyQuota, k.IsActive)
	if err != nil {
		return fmt.Errorf("create provider key: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	}
	return nil
}

func (r *AdminProviderRepo) ListKeys(ctx context.Context, providerID string) ([]domain.ProviderKey, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, provider_id, label, key_prefix, key_last_four,
			strategy, weight, sort_order, is_active, usage_count, total_tokens,
			rpm_limit, tpm_limit, monthly_quota, monthly_used, last_used_at, expires_at, created_at
		FROM provider_keys WHERE provider_id = $1 ORDER BY sort_order ASC, created_at ASC`, providerID)
	if err != nil {
		return nil, fmt.Errorf("list keys: %w", err)
	}
	defer rows.Close()

	var keys []domain.ProviderKey
	for rows.Next() {
		var k domain.ProviderKey
		if err := rows.Scan(&k.ID, &k.ProviderID, &k.Label, &k.KeyPrefix, &k.KeyLastFour,
			&k.Strategy, &k.Weight, &k.SortOrder, &k.IsActive, &k.UsageCount, &k.TotalTokens,
			&k.RPMLimit, &k.TPMLimit, &k.MonthlyQuota, &k.MonthlyUsed,
			&k.LastUsedAt, &k.ExpiresAt, &k.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan key: %w", err)
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func (r *AdminProviderRepo) UpdateKey(ctx context.Context, k *domain.ProviderKey) error {
	_, err := r.db.Exec(ctx, `
		UPDATE provider_keys SET label=$2, strategy=$3, weight=$4, sort_order=$5,
			rpm_limit=$6, tpm_limit=$7, monthly_quota=$8, is_active=$9
		WHERE id=$1`, k.ID, k.Label, k.Strategy, k.Weight, k.SortOrder,
		k.RPMLimit, k.TPMLimit, k.MonthlyQuota, k.IsActive)
	if err != nil {
		return fmt.Errorf("update key: %w", err)
	}
	if r.cache != nil {
		_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	}
	return nil
}

func (r *AdminProviderRepo) DeleteKey(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM provider_keys WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete key: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("key not found: %s", id)
	}
	if r.cache != nil {
		_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	}
	return nil
}

func (r *AdminProviderRepo) ReorderKeys(ctx context.Context, providerID string, keyIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for i, kid := range keyIDs {
		if _, err := tx.Exec(ctx,
			`UPDATE provider_keys SET sort_order=$1 WHERE id=$2 AND provider_id=$3`,
			i, kid, providerID); err != nil {
			return fmt.Errorf("reorder key %d: %w", i, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if r.cache != nil {
		_ = r.cache.DeletePrefix(ctx, providerCacheKey(""))
	}
	return nil
}

func (r *AdminProviderRepo) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM providers WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("delete provider: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("provider not found: %s", id)
	}
	if r.cache != nil {
		_ = r.cache.Delete(ctx, providerCacheKey(id))
		_ = r.cache.Delete(ctx, providerListCacheKey())
	}
	return nil
}

func (r *AdminProviderRepo) GetHealthChecks(ctx context.Context, providerID string, since time.Time) ([]domain.ProviderHealthCheck, error) {
	rows, err := r.db.Query(ctx, `
		SELECT status, latency_ms, error, checked_at
		FROM provider_health_checks
		WHERE provider_id=$1 AND checked_at >= $2
		ORDER BY checked_at DESC LIMIT 100`, providerID, since)
	if err != nil {
		return nil, fmt.Errorf("get health: %w", err)
	}
	defer rows.Close()

	var checks []domain.ProviderHealthCheck
	for rows.Next() {
		var c domain.ProviderHealthCheck
		if err := rows.Scan(&c.Status, &c.LatencyMS, &c.Error, &c.CheckedAt); err != nil {
			return nil, fmt.Errorf("scan health: %w", err)
		}
		checks = append(checks, c)
	}
	return checks, nil
}
