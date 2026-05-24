package domain

import "fmt"

type ErrorCode string

const (
	ErrUnauthorized     ErrorCode = "UNAUTHORIZED"
	ErrForbidden        ErrorCode = "FORBIDDEN"
	ErrBadRequest       ErrorCode = "BAD_REQUEST"
	ErrNotFound         ErrorCode = "NOT_FOUND"
	ErrConflict         ErrorCode = "CONFLICT"
	ErrRateLimited      ErrorCode = "RATE_LIMITED"
	ErrPaymentRequired  ErrorCode = "PAYMENT_REQUIRED"
	ErrInternal         ErrorCode = "INTERNAL_ERROR"
	ErrServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
)

type AppError struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
	Status  int       `json:"-"`
	Cause   error     `json:"-"`
}

func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.Cause }

func NewError(code ErrorCode, status int, message string) *AppError {
	return &AppError{Code: code, Status: status, Message: message}
}

func Wrap(code ErrorCode, status int, message string, cause error) *AppError {
	return &AppError{Code: code, Status: status, Message: message, Cause: cause}
}

var (
	ErrAuthRequired         = NewError(ErrUnauthorized, 401, "Authentication required")
	ErrInvalidToken         = NewError(ErrUnauthorized, 401, "Invalid or expired token")
	ErrInvalidAPIKey        = NewError(ErrUnauthorized, 401, "Invalid or revoked API key")
	ErrAdminOnly            = NewError(ErrForbidden, 403, "Admin access required")
	ErrBadInput             = NewError(ErrBadRequest, 400, "Invalid request")
	ErrInvalidEmail         = NewError(ErrBadRequest, 400, "Invalid email format")
	ErrPasswordTooWeak      = NewError(ErrBadRequest, 400, "Password does not meet complexity requirements")
	ErrUserNotFound         = NewError(ErrNotFound, 404, "User not found")
	ErrKeyNotFound          = NewError(ErrNotFound, 404, "API key not found")
	ErrWebhookNotFound      = NewError(ErrNotFound, 404, "Webhook not found")
	ErrOrgNotFound          = NewError(ErrNotFound, 404, "Organization not found")
	ErrConversationNotFound = NewError(ErrNotFound, 404, "Conversation not found")
	ErrEmailExists          = NewError(ErrConflict, 409, "Email already registered")
	ErrTooManyRequests      = NewError(ErrRateLimited, 429, "Rate limit exceeded. Please slow down.")
	ErrNoCredits            = NewError(ErrPaymentRequired, 402, "Insufficient credits")
	ErrAIUnavailable        = NewError(ErrServiceUnavailable, 503, "AI service unavailable")
)
