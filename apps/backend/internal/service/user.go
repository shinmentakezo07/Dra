package service

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/password"
	"dra-platform/backend/internal/pkg/token"
	"dra-platform/backend/internal/repository"
)

type UserService struct {
	repo   *repository.UserRepo
	secret string
}

func isPasswordComplex(password string) bool {
	var hasUpper, hasLower, hasDigit bool
	for _, c := range password {
		switch {
		case c >= 'A' && c <= 'Z':
			hasUpper = true
		case c >= 'a' && c <= 'z':
			hasLower = true
		case c >= '0' && c <= '9':
			hasDigit = true
		}
	}
	return hasUpper && hasLower && hasDigit
}

func NewUserService(repo *repository.UserRepo, secret string) *UserService {
	return &UserService{repo: repo, secret: secret}
}

func (s *UserService) Register(ctx context.Context, req domain.SignupRequest) (*domain.AuthResponse, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	existing, err := s.repo.ByEmail(ctx, req.Email)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if existing != nil {
		return nil, domain.ErrEmailExists
	}

	hash, err := password.Hash(req.Password)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "password hashing failed", err)
	}

	user, err := s.repo.Create(ctx, req.Name, req.Email, hash, "user")
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create user", err)
	}

	token, err := token.Generate(user.ID, user.Email, user.Role, s.secret)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "token generation failed", err)
	}

	user.Password = nil
	return &domain.AuthResponse{User: *user, Token: token}, nil
}

func (s *UserService) Authenticate(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	user, err := s.repo.ByEmail(ctx, req.Email)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if user == nil || user.Password == nil {
		return nil, domain.NewError(domain.ErrUnauthorized, 401, "Invalid credentials")
	}

	if !password.Check(req.Password, *user.Password) {
		return nil, domain.NewError(domain.ErrUnauthorized, 401, "Invalid credentials")
	}

	token, err := token.Generate(user.ID, user.Email, user.Role, s.secret)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "token generation failed", err)
	}

	user.Password = nil
	return &domain.AuthResponse{User: *user, Token: token}, nil
}

func (s *UserService) GetByID(ctx context.Context, id string) (*domain.User, *domain.AppError) {
	user, err := s.repo.ByID(ctx, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if user == nil {
		return nil, domain.ErrUserNotFound
	}
	user.Password = nil
	return user, nil
}

func (s *UserService) List(ctx context.Context, page, limit int) ([]domain.User, int, *domain.AppError) {
	users, total, err := s.repo.List(ctx, page, limit)
	if err != nil {
		return nil, 0, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	for i := range users {
		users[i].Password = nil
	}
	return users, total, nil
}

func (s *UserService) UpdateProfile(ctx context.Context, id, name, email string) *domain.AppError {
	if email != "" {
		existing, err := s.repo.ByEmail(ctx, email)
		if err != nil {
			return domain.Wrap(domain.ErrInternal, 500, "database error", err)
		}
		if existing != nil && existing.ID != id {
			return domain.ErrEmailExists
		}
	}
	if err := s.repo.UpdateProfile(ctx, id, name, email); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update profile", err)
	}
	return nil
}

func (s *UserService) ChangePassword(ctx context.Context, id, currentPassword, newPassword string) *domain.AppError {
	user, err := s.repo.ByID(ctx, id)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if user == nil || user.Password == nil {
		return domain.ErrUserNotFound
	}
	if !password.Check(currentPassword, *user.Password) {
		return domain.NewError(domain.ErrUnauthorized, 401, "Current password is incorrect")
	}
	hash, err := password.Hash(newPassword)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "password hashing failed", err)
	}
	if err := s.repo.UpdatePassword(ctx, id, hash); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update password", err)
	}
	return nil
}

// OAuthLogin creates or finds a user from OAuth and returns an auth token.
func (s *UserService) OAuthLogin(ctx context.Context, email, name, provider string) (*domain.AuthResponse, *domain.AppError) {
	user, err := s.repo.ByEmail(ctx, email)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	if user == nil {
		// Create user with random password for OAuth users
		randomPass, _ := password.Hash(domain.NewID() + "@oauth" + provider)
		user, err = s.repo.Create(ctx, name, email, randomPass, "user")
		if err != nil {
			return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create oauth user", err)
		}
	}

	tokenStr, err := token.Generate(user.ID, user.Email, user.Role, s.secret)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "token generation failed", err)
	}

	user.Password = nil
	return &domain.AuthResponse{User: *user, Token: tokenStr}, nil
}

func (s *UserService) Delete(ctx context.Context, id string) *domain.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete user", err)
	}
	return nil
}

// RequestPasswordReset creates a reset token for the given email.
func (s *UserService) RequestPasswordReset(ctx context.Context, email string) (string, *domain.AppError) {
	user, err := s.repo.ByEmail(ctx, email)
	if err != nil {
		return "", domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if user == nil {
		// Don't reveal if email doesn't exist
		return "", nil
	}

	tokenStr := domain.NewID()
	expiresAt := time.Now().Add(1 * time.Hour)
	if err := s.repo.PasswordReset(ctx, email, tokenStr, expiresAt); err != nil {
		return "", domain.Wrap(domain.ErrInternal, 500, "failed to create reset token", err)
	}

	return tokenStr, nil
}

// ResetPassword validates a reset token and updates the password.
func (s *UserService) ResetPassword(ctx context.Context, tokenStr, newPassword string) *domain.AppError {
	if newPassword == "" || len(newPassword) < 8 {
		return domain.NewError(domain.ErrBadRequest, 400, "Password must be at least 8 characters")
	}
	if !isPasswordComplex(newPassword) {
		return domain.ErrPasswordTooWeak
	}
	pr, err := s.repo.GetPasswordReset(ctx, tokenStr)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if pr == nil || pr.UsedAt != nil || time.Now().After(pr.ExpiresAt) {
		return domain.NewError(domain.ErrBadRequest, 400, "Invalid or expired token")
	}

	user, err := s.repo.ByEmail(ctx, pr.Email)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if user == nil {
		return domain.NewError(domain.ErrBadRequest, 400, "Invalid token")
	}

	hash, err := password.Hash(newPassword)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "password hashing failed", err)
	}

	// Mark token used first to prevent TOCTOU race — concurrent requests with the same
	// token will fail here because the token is already marked used.
	if err := s.repo.MarkPasswordResetUsed(ctx, tokenStr); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to mark token used", err)
	}

	if err := s.repo.UpdatePassword(ctx, user.ID, hash); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update password", err)
	}
	return nil
}
