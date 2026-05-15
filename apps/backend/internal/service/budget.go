package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type BudgetService struct {
	repo *repository.BudgetRepo
}

func NewBudgetService(repo *repository.BudgetRepo) *BudgetService {
	return &BudgetService{repo: repo}
}

func (s *BudgetService) CreateAlert(ctx context.Context, userID string, req domain.CreateBudgetAlertRequest) (*domain.BudgetAlert, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	alert, err := s.repo.CreateAlert(ctx, userID, req)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create budget alert", err)
	}
	return alert, nil
}

func (s *BudgetService) GetUserAlerts(ctx context.Context, userID string) ([]domain.BudgetAlert, *domain.AppError) {
	alerts, err := s.repo.GetUserAlerts(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list budget alerts", err)
	}
	return alerts, nil
}

func (s *BudgetService) DeleteAlert(ctx context.Context, userID, id string) *domain.AppError {
	if err := s.repo.DeleteAlert(ctx, userID, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete budget alert", err)
	}
	return nil
}

func (s *BudgetService) CreateCap(ctx context.Context, userID string, req domain.CreateBudgetCapRequest) (*domain.BudgetCap, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	cap, err := s.repo.CreateCap(ctx, userID, req)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create budget cap", err)
	}
	return cap, nil
}

func (s *BudgetService) GetUserCap(ctx context.Context, userID string) (*domain.BudgetCap, *domain.AppError) {
	cap, err := s.repo.GetUserCap(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get budget cap", err)
	}
	return cap, nil
}

func (s *BudgetService) UpdateCap(ctx context.Context, userID string, req domain.CreateBudgetCapRequest) *domain.AppError {
	if err := req.Validate(); err != nil {
		return err
	}
	if err := s.repo.UpdateCap(ctx, userID, req); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update budget cap", err)
	}
	return nil
}

func (s *BudgetService) DeleteCap(ctx context.Context, userID string) *domain.AppError {
	if err := s.repo.DeleteCap(ctx, userID); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete budget cap", err)
	}
	return nil
}

func (s *BudgetService) CheckCapExceeded(ctx context.Context, userID string, cost int) (bool, string, *domain.AppError) {
	exceeded, action, err := s.repo.CheckCapExceeded(ctx, userID, cost)
	if err != nil {
		return false, "", domain.Wrap(domain.ErrInternal, 500, "failed to check budget cap", err)
	}
	return exceeded, action, nil
}
