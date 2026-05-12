package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"

	"github.com/stripe/stripe-go/v76"
)

// StripeWebhook handles Stripe webhook events.
func (h *Handler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		response.Error(w, 400, "Failed to read body")
		return
	}

	if h.stripeSvc == nil || !h.stripeSvc.IsConfigured() {
		response.Error(w, 500, "Stripe is not configured")
		return
	}

	sigHeader := r.Header.Get("Stripe-Signature")
	event, err := h.stripeSvc.VerifyWebhook(body, sigHeader)
	if err != nil {
		logger.Warn("stripe_webhook_verify_failed", "error", err.Error())
		response.Error(w, 400, "Invalid signature")
		return
	}

	logger.Info("stripe_webhook_received", "type", event.Type)

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			logger.Error("stripe_session_unmarshal_failed", "error", err.Error())
			response.Error(w, 400, "Invalid session data")
			return
		}
		if err := h.stripeSvc.FulfillCheckout(r.Context(), &session); err != nil {
			logger.Error("stripe_fulfill_failed", "error", err.Message, "session", session.ID)
			response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
			return
		}
		logger.Info("stripe_checkout_fulfilled", "session", session.ID)
	case "invoice.payment_succeeded":
		logger.Info("stripe_invoice_paid")
	case "invoice.payment_failed":
		logger.Warn("stripe_invoice_failed")
	default:
		logger.Debug("stripe_unhandled_event", "type", event.Type)
	}

	response.OK(w, map[string]bool{"received": true})
}
