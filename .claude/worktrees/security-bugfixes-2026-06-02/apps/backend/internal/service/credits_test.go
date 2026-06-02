package service

import (
	"testing"

	"dra-platform/backend/internal/domain"
)

func TestCreditService_PurchaseValidation(t *testing.T) {
	tests := []struct {
		name    string
		req     domain.PurchaseRequest
		wantErr bool
	}{
		{"valid amount", domain.PurchaseRequest{Amount: 5000}, false},
		{"too small", domain.PurchaseRequest{Amount: 50}, true},
		{"too large", domain.PurchaseRequest{Amount: 200_000_000}, true},
		{"zero", domain.PurchaseRequest{Amount: 0}, true},
		{"negative", domain.PurchaseRequest{Amount: -100}, true},
		{"min boundary", domain.PurchaseRequest{Amount: 1000}, false},
		{"max boundary", domain.PurchaseRequest{Amount: 100_000_000}, false},
		{"below min", domain.PurchaseRequest{Amount: 999}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestCreditService_checkBudget_NoBudget(t *testing.T) {
	svc := NewCreditService(nil, nil, nil, nil)
	err := svc.checkBudget(nil, 100)
	if err != nil {
		t.Errorf("expected no error with nil credits, got %v", err)
	}
}

func TestCreditService_checkBudget_DailyExceeded(t *testing.T) {
	svc := NewCreditService(nil, nil, nil, nil)
	daily := 1000
	credits := &domain.UserCredits{
		DailySpent:  900,
		DailyBudget: &daily,
	}
	err := svc.checkBudget(credits, 200)
	if err == nil {
		t.Error("expected daily budget exceeded error")
	}
}

func TestCreditService_checkBudget_MonthlyExceeded(t *testing.T) {
	svc := NewCreditService(nil, nil, nil, nil)
	monthly := 5000
	credits := &domain.UserCredits{
		MonthlySpent:  4500,
		MonthlyBudget: &monthly,
	}
	err := svc.checkBudget(credits, 600)
	if err == nil {
		t.Error("expected monthly budget exceeded error")
	}
}

func TestCreditService_checkBudget_WithinBudget(t *testing.T) {
	svc := NewCreditService(nil, nil, nil, nil)
	daily := 1000
	monthly := 5000
	credits := &domain.UserCredits{
		DailySpent:    100,
		DailyBudget:   &daily,
		MonthlySpent:  500,
		MonthlyBudget: &monthly,
	}
	err := svc.checkBudget(credits, 100)
	if err != nil {
		t.Errorf("expected no error within budget, got %v", err)
	}
}
