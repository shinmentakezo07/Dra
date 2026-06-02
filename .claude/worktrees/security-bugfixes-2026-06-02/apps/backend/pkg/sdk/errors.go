package sdk

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ErrorCode represents an API error code.
type ErrorCode string

const (
	ErrUnauthorized       ErrorCode = "UNAUTHORIZED"
	ErrForbidden          ErrorCode = "FORBIDDEN"
	ErrBadRequest         ErrorCode = "BAD_REQUEST"
	ErrNotFound           ErrorCode = "NOT_FOUND"
	ErrConflict           ErrorCode = "CONFLICT"
	ErrRateLimited        ErrorCode = "RATE_LIMITED"
	ErrPaymentRequired    ErrorCode = "PAYMENT_REQUIRED"
	ErrInternal           ErrorCode = "INTERNAL_ERROR"
	ErrServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
)

// APIError represents an error returned by the API.
type APIError struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
	Status  int       `json:"status"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("[%s] %s (HTTP %d)", e.Code, e.Message, e.Status)
}

func apiError(status int, body string) error {
	// Try to parse as JSON envelope
	var env envelope
	if err := json.Unmarshal([]byte(body), &env); err == nil && env.Error != "" {
		code := inferCode(status)
		return &APIError{Code: code, Message: env.Error, Status: status}
	}
	// Fallback to raw body
	code := inferCode(status)
	msg := strings.TrimSpace(body)
	if msg == "" {
		msg = fmt.Sprintf("HTTP %d", status)
	}
	return &APIError{Code: code, Message: msg, Status: status}
}

func inferCode(status int) ErrorCode {
	switch status {
	case 400:
		return ErrBadRequest
	case 401:
		return ErrUnauthorized
	case 403:
		return ErrForbidden
	case 404:
		return ErrNotFound
	case 409:
		return ErrConflict
	case 402:
		return ErrPaymentRequired
	case 429:
		return ErrRateLimited
	case 503:
		return ErrServiceUnavailable
	default:
		return ErrInternal
	}
}

// IsUnauthorized returns true if the error is an unauthorized error.
func IsUnauthorized(err error) bool {
	if e, ok := err.(*APIError); ok {
		return e.Code == ErrUnauthorized
	}
	return false
}

// IsRateLimited returns true if the error is a rate limit error.
func IsRateLimited(err error) bool {
	if e, ok := err.(*APIError); ok {
		return e.Code == ErrRateLimited
	}
	return false
}

// IsPaymentRequired returns true if the error is a payment required error.
func IsPaymentRequired(err error) bool {
	if e, ok := err.(*APIError); ok {
		return e.Code == ErrPaymentRequired
	}
	return false
}
