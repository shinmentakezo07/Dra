package service

import (
	"context"
	"strings"
	"time"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/pkg/email"
)

type CreditService struct {
	db          *db.DB
	creditsRepo *repository.CreditsRepo
	txRepo      *repository.TransactionRepo
	logRepo     *repository.LogRepo
	userRepo    *repository.UserRepo
	emailSender email.Sender
}

func NewCreditService(d *db.DB, c *repository.CreditsRepo, t *repository.TransactionRepo, l *repository.LogRepo) *CreditService {
	return &CreditService{db: d, creditsRepo: c, txRepo: t, logRepo: l}
}

func (s *CreditService) SetUserRepo(r *repository.UserRepo) {
	s.userRepo = r
}

func (s *CreditService) SetEmailSender(sender email.Sender) {
	s.emailSender = sender
}

func (s *CreditService) GetBalance(ctx context.Context, userID string) (*domain.UserCredits, *domain.AppError) {
	credits, err := s.creditsRepo.ByUser(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if credits == nil {
		return &domain.UserCredits{UserID: userID, Balance: 0}, nil
	}
	return credits, nil
}

func (s *CreditService) Purchase(ctx context.Context, userID string, req domain.PurchaseRequest) (*domain.CreditTransaction, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	var result *domain.CreditTransaction
	err := s.db.WithTx(ctx, func(tx db.Querier) error {
		if err := s.creditsRepo.UpsertTx(ctx, tx, userID, req.Amount, req.Amount); err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "failed to update credits", err)
		}
		desc := req.Description
		if desc == "" {
			desc = "Credit purchase"
		}
		txn, err := s.txRepo.CreateTx(ctx, tx, userID, req.Amount, "purchase", desc, nil)
		if err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "failed to record transaction", err)
		}
		result = txn
		return nil
	})
	if err != nil {
		if appErr, ok := err.(*domain.AppError); ok {
			return nil, appErr
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "purchase transaction failed", err)
	}
	return result, nil
}

func (s *CreditService) DeductForUsage(ctx context.Context, userID string, amount int, logID string) *domain.AppError {
	err := s.db.WithTx(ctx, func(tx db.Querier) error {
		ok, err := s.creditsRepo.DeductTx(ctx, tx, userID, amount)
		if err != nil {
			return err
		}
		if !ok {
			return domain.ErrNoCredits
		}
		_, err = s.txRepo.CreateTx(ctx, tx, userID, -amount, "usage", "API usage deduction", &logID)
		return err
	})
	if err != nil {
		if appErr, ok := err.(*domain.AppError); ok {
			return appErr
		}
		return domain.Wrap(domain.ErrInternal, 500, "failed to deduct credits", err)
	}
	return nil
}

func (s *CreditService) ListTransactions(ctx context.Context, userID string, page, limit int) ([]domain.CreditTransaction, int, *domain.AppError) {
	txs, total, err := s.txRepo.ByUser(ctx, userID, page, limit)
	if err != nil {
		return nil, 0, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	return txs, total, nil
}

func (s *CreditService) CheckBalance(ctx context.Context, userID string, required int) *domain.AppError {
	credits, err := s.creditsRepo.ByUser(ctx, userID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if credits == nil || credits.Balance < required {
		return domain.ErrNoCredits
	}
	if err := s.checkBudget(credits, required); err != nil {
		return err
	}
	return nil
}

func (s *CreditService) checkBudget(c *domain.UserCredits, required int) *domain.AppError {
	if c == nil {
		return nil
	}
	now := time.Now()
	dailySpent := c.DailySpent
	monthlySpent := c.MonthlySpent
	if c.BudgetResetAt != nil {
		reset := *c.BudgetResetAt
		if now.Format("2006-01-02") != reset.Format("2006-01-02") {
			dailySpent = 0
		}
		if now.Month() != reset.Month() || now.Year() != reset.Year() {
			monthlySpent = 0
		}
	}
	if c.DailyBudget != nil && dailySpent+required > *c.DailyBudget {
		return domain.NewError(domain.ErrBadRequest, 429, "daily budget exceeded")
	}
	if c.MonthlyBudget != nil && monthlySpent+required > *c.MonthlyBudget {
		return domain.NewError(domain.ErrBadRequest, 429, "monthly budget exceeded")
	}
	return nil
}

func (s *CreditService) SetBudget(ctx context.Context, userID string, dailyBudget, monthlyBudget *int) *domain.AppError {
	_, err := s.db.Exec(ctx,
		`UPDATE user_credits SET daily_budget = $2, monthly_budget = $3, updated_at = NOW() WHERE user_id = $1`,
		userID, dailyBudget, monthlyBudget)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update budget", err)
	}
	return nil
}

func (s *CreditService) LogAndDeduct(ctx context.Context, userID string, apiKeyID *string, model string, inputTokens, outputTokens, cost, latency int) (*domain.APILog, *domain.AppError) {
	var result domain.APILog

	err := s.db.WithTx(ctx, func(tx db.Querier) error {
		// 1. Verify balance and budget
		var credits domain.UserCredits
		if err := tx.QueryRow(ctx,
			`SELECT balance, monthly_budget, daily_budget, daily_spent, monthly_spent, budget_reset_at FROM user_credits WHERE user_id = $1 FOR UPDATE`, userID).Scan(
			&credits.Balance, &credits.MonthlyBudget, &credits.DailyBudget, &credits.DailySpent, &credits.MonthlySpent, &credits.BudgetResetAt); err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "failed to lock balance", err)
		}
		if credits.Balance < cost {
			return domain.ErrNoCredits
		}
		if bErr := s.checkBudget(&credits, cost); bErr != nil {
			return bErr
		}

		// 2. Resolve provider from model
		provName := ""
		if idx := strings.Index(model, "/"); idx > 0 {
			provName = model[:idx]
		}
		if provName == "" {
			provName = "unknown"
		}

		// 3. Insert log
		logID := domain.NewID()
		row := tx.QueryRow(ctx,
			`INSERT INTO api_logs (id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING id, user_id, api_key_id, model, provider, input_tokens, output_tokens, cost, latency, status, error_message, created_at`,
			logID, userID, apiKeyID, model, provName, inputTokens, outputTokens, cost, latency, "success", nil)
		if err := row.Scan(&result.ID, &result.UserID, &result.APIKeyID, &result.Model, &result.Provider,
			&result.InputTokens, &result.OutputTokens, &result.Cost, &result.Latency, &result.Status, &result.ErrorMessage, &result.CreatedAt); err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "failed to create log", err)
		}

		// 4. Deduct credits and update budget spending (with reset logic)
		now := time.Now()
		newDaily := credits.DailySpent + cost
		newMonthly := credits.MonthlySpent + cost
		if credits.BudgetResetAt != nil {
			reset := *credits.BudgetResetAt
			// Compare calendar dates properly — Day() alone misses month boundaries (e.g. Jan 15 → Feb 15)
			if now.Format("2006-01-02") != reset.Format("2006-01-02") {
				newDaily = cost
			}
			if now.Month() != reset.Month() || now.Year() != reset.Year() {
				newMonthly = cost
			}
		}
		if _, err := tx.Exec(ctx,
			`UPDATE user_credits SET balance = balance - $2, total_spent = total_spent + $2, daily_spent = $3, monthly_spent = $4, budget_reset_at = $5, updated_at = NOW() WHERE user_id = $1`,
			userID, cost, newDaily, newMonthly, now); err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "failed to deduct credits", err)
		}

		// 5. Record transaction
		txID := domain.NewID()
		if _, err := tx.Exec(ctx,
			`INSERT INTO credit_transactions (id, user_id, amount, type, description, related_log_id) VALUES ($1, $2, $3, $4, $5, $6)`,
			txID, userID, -cost, "usage", "API usage deduction", result.ID); err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "failed to record transaction", err)
		}

		return nil
	})

	if err != nil {
		if appErr, ok := err.(*domain.AppError); ok {
			return nil, appErr
		}
		return nil, domain.Wrap(domain.ErrInternal, 500, "billing transaction failed", err)
	}

	// Async budget alert check
	go s.checkBudgetAlert(userID)

	return &result, nil
}

func (s *CreditService) checkBudgetAlert(userID string) {
	if s.emailSender == nil || s.userRepo == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	credits, err := s.creditsRepo.ByUser(ctx, userID)
	if err != nil || credits == nil {
		return
	}
	user, err := s.userRepo.ByID(ctx, userID)
	if err != nil || user == nil {
		return
	}

	dailyBudget := 0
	monthlyBudget := 0
	if credits.DailyBudget != nil {
		dailyBudget = *credits.DailyBudget
	}
	if credits.MonthlyBudget != nil {
		monthlyBudget = *credits.MonthlyBudget
	}
	if dailyBudget == 0 && monthlyBudget == 0 {
		return
	}

	// Alert at 80% threshold
	alertSent := false
	if dailyBudget > 0 && credits.DailySpent >= int(float64(dailyBudget)*0.8) && credits.DailySpent < dailyBudget {
		alertSent = true
	}
	if monthlyBudget > 0 && credits.MonthlySpent >= int(float64(monthlyBudget)*0.8) && credits.MonthlySpent < monthlyBudget {
		alertSent = true
	}
	if alertSent {
		if eErr := email.SendBudgetAlert(s.emailSender, user.Email, credits.DailySpent, dailyBudget, credits.MonthlySpent, monthlyBudget); eErr != nil {
			logger.Error("budget_alert_email_failed", "error", eErr.Error())
		}
	}
}
