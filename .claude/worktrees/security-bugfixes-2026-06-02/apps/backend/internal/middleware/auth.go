package middleware

import (
	"context"
	"net/http"
	"strings"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const userCtxKey ctxKey = "user"
const apiKeyCtxKey ctxKey = "apiKey"

type APIKeyLookup func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error)
type UserLookup func(ctx context.Context, userID string) (*domain.User, error)

func Auth(cfg *config.Config, apiKeyLookup APIKeyLookup, userLookup UserLookup) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Try API key
			if apiKey := r.Header.Get("x-api-key"); apiKey != "" {
				user, key, err := apiKeyLookup(r.Context(), apiKey)
				if err != nil {
					logger.Warn("api_key_db_error", "error", err.Error())
					response.Error(w, 401, "Invalid API key")
					return
				}
				if user == nil {
					response.Error(w, 401, "Invalid or revoked API key")
					return
				}
				ctx := context.WithValue(r.Context(), userCtxKey, user)
				ctx = context.WithValue(ctx, apiKeyCtxKey, key)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// 2. Try JWT session
			tokenStr := extractBearer(r)
			if tokenStr == "" {
				for _, name := range []string{"authjs.session-token", "__Secure-authjs.session-token", "next-auth.session-token", "__Secure-next-auth.session-token"} {
					if c, err := r.Cookie(name); err == nil {
						tokenStr = c.Value
						break
					}
				}
			}

			if tokenStr == "" {
				response.Error(w, 401, "Authentication required. Pass session cookie, Bearer token, or x-api-key.")
				return
			}

			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, domain.NewError(domain.ErrUnauthorized, 401, "unexpected signing method")
				}
				return []byte(cfg.AuthSecret), nil
			}, jwt.WithValidMethods([]string{"HS256"}))

			if err != nil || !token.Valid {
				errMsg := "token invalid"
				if err != nil {
					errMsg = err.Error()
				}
				logger.Warn("jwt_validation_failed", "error", errMsg, "remote_addr", r.RemoteAddr)
				response.Error(w, 401, "Invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				logger.Warn("jwt_invalid_claims", "remote_addr", r.RemoteAddr)
				response.Error(w, 401, "Invalid token claims")
				return
			}

			userID, _ := claims["sub"].(string)

			if userID == "" {
				logger.Warn("jwt_missing_sub", "remote_addr", r.RemoteAddr)
				response.Error(w, 401, "Invalid token")
				return
			}

			// Verify user exists in database and fetch real role
			user, err := userLookup(r.Context(), userID)
			if err != nil {
				logger.Warn("user_lookup_failed", "error", err.Error(), "user_id", userID, "remote_addr", r.RemoteAddr)
				response.Error(w, 401, "Invalid or expired token")
				return
			}
			if user == nil {
				logger.Warn("user_not_found", "user_id", userID, "remote_addr", r.RemoteAddr)
				response.Error(w, 401, "Invalid or expired token")
				return
			}

			ctx := context.WithValue(r.Context(), userCtxKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUser(r *http.Request) *domain.User {
	if u, ok := r.Context().Value(userCtxKey).(*domain.User); ok {
		return u
	}
	return nil
}

func GetAPIKey(r *http.Request) *domain.APIKey {
	if k, ok := r.Context().Value(apiKeyCtxKey).(*domain.APIKey); ok {
		return k
	}
	return nil
}

func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if GetUser(r) == nil {
			response.Error(w, 401, "Authentication required")
			return
		}
		next(w, r)
	}
}

func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := GetUser(r)
		if u == nil {
			response.Error(w, 401, "Authentication required")
			return
		}
		if !u.IsAdmin() {
			response.Error(w, 403, "Admin access required")
			return
		}
		next(w, r)
	}
}

func RequirePermission(permission string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			u := GetUser(r)
			if u == nil {
				response.Error(w, 401, "Authentication required")
				return
			}
			if !u.IsAdmin() {
				response.Error(w, 403, "Admin access required")
				return
			}
			if !u.HasPermission(permission) {
				response.Error(w, 403, "Permission denied: "+permission)
				return
			}
			next(w, r)
		}
	}
}

func extractBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}
	return parts[1]
}
