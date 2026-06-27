// Package budget provides hierarchical budget management with team → user → key scoping,
// soft/hard limits, and configurable reset periods.
package budget

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// BudgetScope defines the scope of a budget.
type BudgetScope string

const (
	ScopeTeam BudgetScope = "team"
	ScopeUser BudgetScope = "user"
	ScopeKey  BudgetScope = "key"
)

// BudgetPeriod defines the reset period.
type BudgetPeriod string

const (
	PeriodDaily   BudgetPeriod = "daily"
	PeriodWeekly  BudgetPeriod = "weekly"
	PeriodMonthly BudgetPeriod = "monthly"
	PeriodTotal   BudgetPeriod = "total" // never resets
)

// Budget represents a budget for a scope.
type Budget struct {
	ID            string
	Scope         BudgetScope
	ScopeID       string
	LimitCents    int64        // 0 = unlimited
	UsedCents     int64
	Period        BudgetPeriod
	SoftLimitPct  int          // Alert threshold (e.g., 80 = alert at 80%)
	HardLimit     bool         // true = reject when exceeded, false = warn only
	ResetAt       time.Time
	LastAlertAt   *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// Store is the interface for budget persistence.
type Store interface {
	Save(b *Budget) error
	Get(scope BudgetScope, scopeID string) (*Budget, error)
	GetByScope(scope BudgetScope) ([]*Budget, error)
	UpdateUsage(scope BudgetScope, scopeID string, cents int64) error
	ResetUsage(scope BudgetScope, scopeID string) error
	Delete(scope BudgetScope, scopeID string) error
}

// AlertFunc is called when a budget threshold is reached.
type AlertFunc func(ctx context.Context, b *Budget, currentPct int)

// Manager manages hierarchical budgets.
type Manager struct {
	store      Store
	alertFunc  AlertFunc
	mu         sync.RWMutex
	cache      map[string]*Budget // "scope:id" -> budget
	stopCh     chan struct{}
}

// NewManager creates a new budget manager.
func NewManager(store Store) *Manager {
	m := &Manager{
		store:  store,
		cache:  make(map[string]*Budget),
		stopCh: make(chan struct{}),
	}
	go m.periodicReset()
	return m
}

// SetAlertFunc sets the function called when budget thresholds are reached.
func (m *Manager) SetAlertFunc(fn AlertFunc) {
	m.alertFunc = fn
}

// Create creates or updates a budget.
func (m *Manager) Create(b *Budget) error {
	if b.Scope == "" || b.ScopeID == "" {
		return fmt.Errorf("scope and scope ID are required")
	}
	if b.SoftLimitPct == 0 {
		b.SoftLimitPct = 80
	}
	if b.Period == "" {
		b.Period = PeriodMonthly
	}
	b.ResetAt = m.calculateReset(b.Period)
	b.CreatedAt = time.Now()
	b.UpdatedAt = time.Now()

	if err := m.store.Save(b); err != nil {
		return err
	}

	m.mu.Lock()
	m.cache[cacheKey(b.Scope, b.ScopeID)] = b
	m.mu.Unlock()

	return nil
}

// CheckAndRecord checks if a charge would exceed the budget and records it.
// Returns nil if within budget, error if exceeded.
// Bug #42: hold mutex for entire check-and-record to prevent TOCTOU race on concurrent requests.
func (m *Manager) CheckAndRecord(ctx context.Context, scope BudgetScope, scopeID string, costCents int64) error {
	b, err := m.getBudget(scope, scopeID)
	if err != nil {
		return err
	}
	if b == nil {
		return nil // no budget set = unlimited
	}

	// Serialize check-and-record per budget scope to prevent TOCTOU race
	m.mu.Lock()

	// Check if budget needs reset
	if b.Period != PeriodTotal && time.Now().After(b.ResetAt) {
		b.UsedCents = 0
		b.ResetAt = m.calculateReset(b.Period)
		_ = m.store.ResetUsage(scope, scopeID)
	}

	newTotal := b.UsedCents + costCents

	// Hard limit check
	if b.HardLimit && b.LimitCents > 0 && newTotal > b.LimitCents {
		m.mu.Unlock()
		return fmt.Errorf("budget exceeded for %s/%s: used %d cents, limit %d cents",
			scope, scopeID, newTotal, b.LimitCents)
	}

	// Record usage
	b.UsedCents = newTotal
	if err := m.store.UpdateUsage(scope, scopeID, costCents); err != nil {
		m.mu.Unlock()
		return fmt.Errorf("update usage: %w", err)
	}

	m.mu.Unlock()

	// Soft limit alert
	if b.LimitCents > 0 {
		pct := int((newTotal * 100) / b.LimitCents)
		if pct >= b.SoftLimitPct && m.alertFunc != nil {
			shouldAlert := b.LastAlertAt == nil || time.Since(*b.LastAlertAt) > time.Hour
			if shouldAlert {
				now := time.Now()
				b.LastAlertAt = &now
				go m.alertFunc(ctx, b, pct)
			}
		}
	}

	return nil
}

// GetUsage returns current usage for a scope.
func (m *Manager) GetUsage(scope BudgetScope, scopeID string) (used int64, limit int64, err error) {
	b, err := m.getBudget(scope, scopeID)
	if err != nil {
		return 0, 0, err
	}
	if b == nil {
		return 0, 0, nil
	}
	return b.UsedCents, b.LimitCents, nil
}

// CheckHierarchy checks budgets in hierarchical order: team → user → key.
func (m *Manager) CheckHierarchy(ctx context.Context, teamID, userID, keyID string, costCents int64) error {
	if teamID != "" {
		if err := m.CheckAndRecord(ctx, ScopeTeam, teamID, costCents); err != nil {
			return fmt.Errorf("team budget: %w", err)
		}
	}
	if userID != "" {
		if err := m.CheckAndRecord(ctx, ScopeUser, userID, costCents); err != nil {
			return fmt.Errorf("user budget: %w", err)
		}
	}
	if keyID != "" {
		if err := m.CheckAndRecord(ctx, ScopeKey, keyID, costCents); err != nil {
			return fmt.Errorf("key budget: %w", err)
		}
	}
	return nil
}

// Delete removes a budget.
func (m *Manager) Delete(scope BudgetScope, scopeID string) error {
	m.mu.Lock()
	delete(m.cache, cacheKey(scope, scopeID))
	m.mu.Unlock()
	return m.store.Delete(scope, scopeID)
}

// Stop stops the background reset goroutine.
func (m *Manager) Stop() {
	close(m.stopCh)
}

func (m *Manager) getBudget(scope BudgetScope, scopeID string) (*Budget, error) {
	key := cacheKey(scope, scopeID)

	m.mu.RLock()
	if cached, ok := m.cache[key]; ok {
		m.mu.RUnlock()
		return cached, nil
	}
	m.mu.RUnlock()

	b, err := m.store.Get(scope, scopeID)
	if err != nil {
		return nil, err
	}

	if b != nil {
		m.mu.Lock()
		m.cache[key] = b
		m.mu.Unlock()
	}

	return b, nil
}

func (m *Manager) calculateReset(period BudgetPeriod) time.Time {
	now := time.Now()
	switch period {
	case PeriodDaily:
		return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	case PeriodWeekly:
		daysUntilMonday := (8 - int(now.Weekday())) % 7
		if daysUntilMonday == 0 {
			daysUntilMonday = 7
		}
		return time.Date(now.Year(), now.Month(), now.Day()+daysUntilMonday, 0, 0, 0, 0, now.Location())
	case PeriodMonthly:
		return time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())
	default:
		return time.Date(9999, 12, 31, 23, 59, 59, 0, now.Location())
	}
}

// Bug #60: collect budgets needing reset under lock, then release lock before store calls.
func (m *Manager) periodicReset() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			// Phase 1: identify and update budgets under lock
			type resetItem struct {
				scope   BudgetScope
				scopeID string
			}
			var toReset []resetItem
			m.mu.Lock()
			now := time.Now()
			for key, b := range m.cache {
				if b.Period != PeriodTotal && now.After(b.ResetAt) {
					b.UsedCents = 0
					b.ResetAt = m.calculateReset(b.Period)
					m.cache[key] = b
					toReset = append(toReset, resetItem{b.Scope, b.ScopeID})
				}
			}
			m.mu.Unlock()

			// Phase 2: persist resets without holding the lock
			for _, item := range toReset {
				_ = m.store.ResetUsage(item.scope, item.scopeID)
			}
		case <-m.stopCh:
			return
		}
	}
}

func cacheKey(scope BudgetScope, scopeID string) string {
	return string(scope) + ":" + scopeID
}
