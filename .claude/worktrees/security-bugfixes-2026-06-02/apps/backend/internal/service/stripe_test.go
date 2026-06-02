package service

import (
	"testing"
)

func TestStripeService_IsConfigured(t *testing.T) {
	svc := NewStripeService("sk_test_123", "whsec_test", nil, nil, nil, nil, nil)
	if !svc.IsConfigured() {
		t.Error("expected IsConfigured=true with non-empty secret key")
	}

	svcEmpty := NewStripeService("", "", nil, nil, nil, nil, nil)
	if svcEmpty.IsConfigured() {
		t.Error("expected IsConfigured=false with empty secret key")
	}
}

func TestStripeService_VerifyWebhook_NoSecret(t *testing.T) {
	svc := NewStripeService("sk_test_123", "", nil, nil, nil, nil, nil)
	_, err := svc.VerifyWebhook([]byte(`{}`), "t=123,v1=abc")
	if err == nil {
		t.Error("expected error when webhook secret not configured")
	}
}

func TestStripeService_CreateCheckoutSession_NotConfigured(t *testing.T) {
	svc := NewStripeService("", "", nil, nil, nil, nil, nil)
	_, appErr := svc.CreateCheckoutSession(nil, "user-1", 5000, "https://success", "https://cancel")
	if appErr == nil {
		t.Error("expected error when Stripe not configured")
	}
	if appErr.Status != 500 {
		t.Errorf("expected status 500, got %d", appErr.Status)
	}
}
