package service

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/repository"
)

type AnalyticsService struct {
	logRepo     *repository.LogRepo
	userRepo    *repository.UserRepo
	creditsRepo *repository.CreditsRepo
	keyRepo     *repository.APIKeyRepo
}

func NewAnalyticsService(l *repository.LogRepo, u *repository.UserRepo, c *repository.CreditsRepo, k *repository.APIKeyRepo) *AnalyticsService {
	return &AnalyticsService{logRepo: l, userRepo: u, creditsRepo: c, keyRepo: k}
}

func (s *AnalyticsService) UserAnalytics(ctx context.Context, userID string) (map[string]interface{}, *domain.AppError) {
	logs, total, err := s.logRepo.ByUser(ctx, userID, 1, 100000)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	success, errors := 0, 0
	for _, l := range logs {
		if l.Status == "success" {
			success++
		} else {
			errors++
		}
	}

	recent, _, err := s.logRepo.ByUser(ctx, userID, 1, 10)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	breakdown, err := s.logRepo.ModelBreakdown(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	daily, err := s.logRepo.DailyUsage(ctx, userID, time.Now().AddDate(0, 0, -30))
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	return map[string]interface{}{
		"summary": map[string]int{
			"totalRequests":   total,
			"successRequests": success,
			"errorRequests":   errors,
		},
		"recentLogs":     recent,
		"modelBreakdown": breakdown,
		"dailyUsage":     daily,
	}, nil
}

func (s *AnalyticsService) PlatformStats(ctx context.Context) (map[string]interface{}, *domain.AppError) {
	userCount, err := s.userRepo.Count(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	logCount, err := s.logRepo.Count(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	keyCount, err := s.keyRepo.Count(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	successCount := 0
	errorCount := 0
	if sc, err := s.logRepo.CountByStatus(ctx, "success"); err != nil {
		logger.Warn("platform_stats_success_count_failed", "error", err.Error())
	} else {
		successCount = sc
	}
	if ec, err := s.logRepo.CountByStatus(ctx, "error"); err != nil {
		logger.Warn("platform_stats_error_count_failed", "error", err.Error())
	} else {
		errorCount = ec
	}

	balance, purchased, spent, err := s.creditsRepo.Totals(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	recent, err := s.logRepo.Recent(ctx, 5)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	return map[string]interface{}{
		"users":    map[string]int{"total": userCount},
		"apiKeys":  map[string]int{"total": keyCount},
		"logs":     map[string]int{"total": logCount, "success": successCount, "error": errorCount},
		"credits":  map[string]int64{"totalBalance": balance, "totalPurchased": purchased, "totalSpent": spent},
		"recentActivity": recent,
	}, nil
}
