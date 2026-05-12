package middleware

import (
	"net/http"
	"time"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/pkg/trace"
)

type logRecorder struct {
	http.ResponseWriter
	status int
}

func (lr *logRecorder) WriteHeader(code int) {
	lr.status = code
	lr.ResponseWriter.WriteHeader(code)
}

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lr := &logRecorder{ResponseWriter: w, status: 200}

		next.ServeHTTP(lr, r)

		logger.Info("http_request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", lr.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"remote_addr", r.RemoteAddr,
			"user_agent", r.UserAgent(),
			"request_id", trace.GetRequestID(r.Context()),
		)
	})
}
