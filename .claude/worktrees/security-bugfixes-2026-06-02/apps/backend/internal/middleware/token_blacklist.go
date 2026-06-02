package middleware

import (
	"net/http"
	"strings"

	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
)

// TokenBlacklistChecker checks if a token is blacklisted.
type TokenBlacklistChecker interface {
	IsBlacklisted(token string) (bool, error)
}

// TokenBlacklist returns middleware that rejects blacklisted tokens.
// Chain after Auth middleware.
func TokenBlacklist(checker TokenBlacklistChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only check if user was authenticated (Auth middleware ran successfully)
			u := GetUser(r)
			if u == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Extract token or API key from request
			tokenStr := ""
			if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
				tokenStr = auth[7:]
			}
			if tokenStr == "" {
				for _, name := range []string{"authjs.session-token", "__Secure-authjs.session-token", "next-auth.session-token", "__Secure-next-auth.session-token"} {
					if c, err := r.Cookie(name); err == nil {
						tokenStr = c.Value
						break
					}
				}
			}
			if tokenStr == "" {
				if k := GetAPIKey(r); k != nil {
					tokenStr = k.Key
				}
			}

			if tokenStr == "" {
				next.ServeHTTP(w, r)
				return
			}

			blacklisted, err := checker.IsBlacklisted(tokenStr)
			if err != nil {
				logger.Warn("blacklist_check_error", "error", err.Error())
				// Fail-closed: deny request on checker error
				response.Error(w, 503, "Token verification unavailable. Please try again.")
				return
			}

			if blacklisted {
				logger.Warn("blacklisted_token_used", "user_id", u.ID, "remote_addr", r.RemoteAddr)
				response.Error(w, 401, "Token has been revoked. Please sign in again.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
