package service

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/token"
	"dra-platform/backend/internal/repository"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	repo   *repository.UserRepo
	secret string
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

	hash, err := HashPassword(req.Password)
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

	if !CheckPassword(req.Password, *user.Password) {
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
	if !CheckPassword(currentPassword, *user.Password) {
		return domain.NewError(domain.ErrUnauthorized, 401, "Current password is incorrect")
	}
	hash, err := HashPassword(newPassword)
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
		randomPass, _ := HashPassword(domain.NewID() + "@oauth" + provider)
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

const (
	argon2Time    = 1
	argon2Memory  = 64 * 1024
	argon2Threads = 4
	argon2KeyLen  = 32
)

func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, argon2Time, argon2Memory, argon2Threads, argon2KeyLen)
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argon2Memory, argon2Time, argon2Threads, b64Salt, b64Hash), nil
}

func CheckPassword(password, hash string) bool {
	if strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$") || strings.HasPrefix(hash, "$2y$") {
		return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
	}
	if !strings.HasPrefix(hash, "$argon2id$") {
		return false
	}
	parts := strings.Split(hash, "$")
	if len(parts) != 6 {
		return false
	}
	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil || version != 19 {
		return false
	}
	var memory, time, threads int
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &threads)
	if err != nil {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	computedHash := argon2.IDKey([]byte(password), salt, uint32(time), uint32(memory), uint8(threads), uint32(len(expectedHash)))
	return subtle.ConstantTimeCompare(computedHash, expectedHash) == 1
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

	hash, err := HashPassword(newPassword)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "password hashing failed", err)
	}
	if err := s.repo.UpdatePassword(ctx, user.ID, hash); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update password", err)
	}
	if err := s.repo.MarkPasswordResetUsed(ctx, tokenStr); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to mark token used", err)
	}
	return nil
}
