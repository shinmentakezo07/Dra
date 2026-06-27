package service

import (
	"context"
	"fmt"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/webhook"
)

// StripeService handles Stripe integration.
type StripeService struct {
	secretKey     string
	webhookSecret string
	database      *db.DB
	userRepo      *repository.UserRepo
	creditsRepo   *repository.CreditsRepo
	txRepo        *repository.TransactionRepo
	stripeRepo    *repository.StripeRepo
}

// NewStripeService creates a new Stripe service.
func NewStripeService(secretKey, webhookSecret string, database *db.DB, userRepo *repository.UserRepo, creditsRepo *repository.CreditsRepo, txRepo *repository.TransactionRepo, stripeRepo *repository.StripeRepo) *StripeService {
	stripe.Key = secretKey
	return &StripeService{
		secretKey:     secretKey,
		webhookSecret: webhookSecret,
		database:      database,
		userRepo:      userRepo,
		creditsRepo:   creditsRepo,
		txRepo:        txRepo,
		stripeRepo:    stripeRepo,
	}
}

// IsConfigured returns true if Stripe is configured.
func (s *StripeService) IsConfigured() bool {
	return s.secretKey != ""
}

// CreateCheckoutSession creates a Stripe Checkout session for credit purchase.
func (s *StripeService) CreateCheckoutSession(ctx context.Context, userID string, amount int, successURL, cancelURL string) (string, *domain.AppError) {
	if !s.IsConfigured() {
		return "", domain.NewError(domain.ErrInternal, 500, "Stripe is not configured")
	}

	// Get or create Stripe customer
	customerID, err := s.getOrCreateCustomer(ctx, userID)
	if err != nil {
		return "", domain.Wrap(domain.ErrInternal, 500, "failed to get Stripe customer", err)
	}

	params := &stripe.CheckoutSessionParams{
		Customer:   stripe.String(customerID),
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String("Credits"),
						Description: stripe.String(fmt.Sprintf("%d credits", amount)),
					},
					UnitAmount: stripe.Int64(int64(amount)), // amount in cents
				},
				Quantity: stripe.Int64(1),
			},
		},
		Metadata: map[string]string{
			"user_id": userID,
			"credits": fmt.Sprintf("%d", amount),
		},
	}

	sess, err := session.New(params)
	if err != nil {
		return "", domain.Wrap(domain.ErrInternal, 500, "failed to create checkout session", err)
	}

	return sess.URL, nil
}

// VerifyWebhook verifies a Stripe webhook signature.
func (s *StripeService) VerifyWebhook(payload []byte, sigHeader string) (stripe.Event, error) {
	if s.webhookSecret == "" {
		return stripe.Event{}, fmt.Errorf("webhook secret not configured")
	}
	return webhook.ConstructEvent(payload, sigHeader, s.webhookSecret)
}

// FulfillCheckout fulfills a checkout session by adding credits.
func (s *StripeService) FulfillCheckout(ctx context.Context, session *stripe.CheckoutSession) *domain.AppError {
	userID := session.Metadata["user_id"]
	if userID == "" {
		return domain.NewError(domain.ErrBadRequest, 400, "Missing user_id in session metadata")
	}

	// Check if already fulfilled
	exists, err := s.stripeRepo.InvoiceExists(ctx, session.ID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to check invoice", err)
	}
	if exists {
		return nil // Already fulfilled
	}

	credits := int(session.AmountTotal)
	if c, ok := session.Metadata["credits"]; ok {
		fmt.Sscanf(c, "%d", &credits)
	}

	if s.database != nil {
		if err := s.database.WithTx(ctx, func(tx db.Querier) error {
			if err := s.stripeRepo.CreateInvoiceTx(ctx, tx, userID, session.ID, session.AmountTotal); err != nil {
				return fmt.Errorf("failed to record invoice: %w", err)
			}
			if err := s.creditsRepo.UpsertTx(ctx, tx, userID, credits, credits); err != nil {
				return fmt.Errorf("failed to add credits: %w", err)
			}
			if _, err := s.txRepo.CreateTx(ctx, tx, userID, credits, "purchase", "Stripe checkout", nil); err != nil {
				return fmt.Errorf("failed to record transaction: %w", err)
			}
			return nil
		}); err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "credit fulfillment failed", err)
		}
		return nil
	}

	// Fallback without transaction is not safe for financial operations
	return domain.Wrap(domain.ErrInternal, 500, "database transaction support required for credit fulfillment", fmt.Errorf("no transactional database available"))
}

func (s *StripeService) getOrCreateCustomer(ctx context.Context, userID string) (string, error) {
	// Check if user already has a Stripe customer
	existing, err := s.stripeRepo.GetCustomerByUser(ctx, userID)
	if err != nil {
		return "", err
	}
	if existing != "" {
		return existing, nil
	}

	// Get user details
	user, err := s.userRepo.ByID(ctx, userID)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", fmt.Errorf("user not found")
	}

	// Create Stripe customer
	params := &stripe.CustomerParams{
		Email: stripe.String(user.Email),
		Name:  stripe.String(user.Name),
	}
	c, err := customer.New(params)
	if err != nil {
		return "", err
	}

	// Save mapping
	if err := s.stripeRepo.CreateCustomer(ctx, userID, c.ID); err != nil {
		return "", err
	}

	return c.ID, nil
}
