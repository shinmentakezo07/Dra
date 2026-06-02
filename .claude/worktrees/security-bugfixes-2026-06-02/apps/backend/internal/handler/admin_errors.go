package handler

import (
	"net/http"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
)

// adminError handles admin handler errors safely:
// - Logs the actual error for debugging
// - Returns a safe, generic message to the client
// - Prevents internal implementation details from leaking
func adminError(w http.ResponseWriter, r *http.Request, err error, context string) {
	// Log the full error with request context for debugging
	logger.Error(context,
		"error", err.Error(),
		"path", r.URL.Path,
		"method", r.Method,
	)

	// Return a safe, generic error message
	response.Error(w, 500, "An internal error occurred. Please try again later.")
}

// adminErrorWithStatus handles admin handler errors with a specific status code.
func adminErrorWithStatus(w http.ResponseWriter, r *http.Request, err error, status int, context string) {
	logger.Error(context,
		"error", err.Error(),
		"path", r.URL.Path,
		"method", r.Method,
	)

	response.Error(w, status, "An internal error occurred. Please try again later.")
}
