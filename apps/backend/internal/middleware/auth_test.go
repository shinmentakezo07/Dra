package middleware

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
)

func TestAuth_NoCredentials(t *testing.T) {
	cfg := &config.Config{AuthSecret: "test-secret-key-for-jwt-signing-only-32bytes"}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
	if !contains(rr.Body.String(), "Authentication required") {
		t.Fatalf("expected auth required message, got %q", rr.Body.String())
	}
}

func TestAuth_ValidJWT(t *testing.T) {
	secret := "test-secret-key-for-jwt-signing-only-32bytes"
	cfg := &config.Config{AuthSecret: secret}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return &domain.User{ID: "user-123", Email: "test@example.com", Name: "Test User", Role: "user"}, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := GetUser(r)
		if u == nil {
			t.Fatal("expected user in context")
		}
		if u.ID != "user-123" {
			t.Fatalf("expected user ID user-123, got %s", u.ID)
		}
		if u.Email != "test@example.com" {
			t.Fatalf("expected email test@example.com, got %s", u.Email)
		}
		if u.Role != "user" {
			t.Fatalf("expected role user, got %s", u.Role)
		}
		w.WriteHeader(http.StatusOK)
	}))

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   "user-123",
		"email": "test@example.com",
		"name":  "Test User",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	tokenStr, _ := token.SignedString([]byte(secret))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAuth_ValidCookie(t *testing.T) {
	secret := "test-secret-key-for-jwt-signing-only-32bytes"
	cfg := &config.Config{AuthSecret: secret}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return &domain.User{ID: "user-456", Email: "cookie@example.com", Role: "user"}, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := GetUser(r)
		if u == nil {
			t.Fatal("expected user in context")
		}
		w.WriteHeader(http.StatusOK)
	}))

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   "user-456",
		"email": "cookie@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	tokenStr, _ := token.SignedString([]byte(secret))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(&http.Cookie{Name: "authjs.session-token", Value: tokenStr})
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAuth_DeletedUserJWT(t *testing.T) {
	secret := "test-secret-key-for-jwt-signing-only-32bytes"
	cfg := &config.Config{AuthSecret: secret}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, nil // User no longer exists
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called for deleted user")
	}))

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   "deleted-user",
		"email": "deleted@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	tokenStr, _ := token.SignedString([]byte(secret))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for deleted user, got %d: %s", rr.Code, rr.Body.String())
	}
	if !contains(rr.Body.String(), "Invalid or expired token") {
		t.Fatalf("expected 'Invalid or expired token' message, got %q", rr.Body.String())
	}
}

func TestAuth_AdminRoleFromDB(t *testing.T) {
	secret := "test-secret-key-for-jwt-signing-only-32bytes"
	cfg := &config.Config{AuthSecret: secret}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return &domain.User{ID: "admin-1", Email: "admin@example.com", Name: "Admin", Role: "admin"}, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := GetUser(r)
		if u == nil {
			t.Fatal("expected user in context")
		}
		if u.Role != "admin" {
			t.Fatalf("expected role admin, got %s", u.Role)
		}
		w.WriteHeader(http.StatusOK)
	}))

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   "admin-1",
		"email": "admin@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	tokenStr, _ := token.SignedString([]byte(secret))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAuth_UserLookupError(t *testing.T) {
	secret := "test-secret-key-for-jwt-signing-only-32bytes"
	cfg := &config.Config{AuthSecret: secret}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, fmt.Errorf("database connection lost")
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called when lookup fails")
	}))

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   "user-err",
		"email": "err@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	tokenStr, _ := token.SignedString([]byte(secret))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for lookup error, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAuth_InvalidJWT(t *testing.T) {
	cfg := &config.Config{AuthSecret: "test-secret-key-for-jwt-signing-only-32bytes"}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestAuth_ExpiredJWT(t *testing.T) {
	secret := "test-secret-key-for-jwt-signing-only-32bytes"
	cfg := &config.Config{AuthSecret: secret}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "user-789",
		"exp": time.Now().Add(-time.Hour).Unix(),
	})
	tokenStr, _ := token.SignedString([]byte(secret))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestAuth_APIKey(t *testing.T) {
	cfg := &config.Config{AuthSecret: "test-secret-key-for-jwt-signing-only-32bytes"}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			if key == "valid-key" {
				return &domain.User{ID: "user-api", Email: "api@example.com"}, &domain.APIKey{ID: "key-1"}, nil
			}
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := GetUser(r)
		k := GetAPIKey(r)
		if u == nil || k == nil {
			t.Fatal("expected user and api key in context")
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("x-api-key", "valid-key")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAuth_InvalidAPIKey(t *testing.T) {
	cfg := &config.Config{AuthSecret: "test-secret-key-for-jwt-signing-only-32bytes"}
	auth := Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return nil, nil, nil
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, nil
		},
	)

	handler := auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("x-api-key", "invalid-key")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestRequireAuth(t *testing.T) {
	handler := RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// No user
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestRequireAdmin(t *testing.T) {
	handler := RequireAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// No user
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}

	// Non-admin user
	ctx := context.WithValue(req.Context(), userCtxKey, &domain.User{ID: "u1", Role: "user"})
	req = req.WithContext(ctx)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rr.Code)
	}

	// Admin user
	ctx = context.WithValue(req.Context(), userCtxKey, &domain.User{ID: "u1", Role: "admin"})
	req = req.WithContext(ctx)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
