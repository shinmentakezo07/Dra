package middleware

import (
	"context"
	"log/slog"
	"net/http"

	"dra-platform/backend/internal/pkg/logger"

	"github.com/go-chi/chi/v5/middleware"
)

// ReqContext holds per-request values.
type ReqContext struct {
	RequestID string
}

func RequestContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := middleware.GetReqID(r.Context())
		if reqID == "" {
			reqID = "unknown"
		}

		ctx := context.WithValue(r.Context(), ctxKey("requestID"), reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetRequestID(r *http.Request) string {
	if id, ok := r.Context().Value(ctxKey("requestID")).(string); ok {
		return id
	}
	return ""
}

// LogWithRequest returns a logger scoped with the request ID.
func LogWithRequest(r *http.Request) *slog.Logger {
	reqID := GetRequestID(r)
	return logger.With("request_id", reqID)
}
