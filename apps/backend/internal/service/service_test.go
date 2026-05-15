package service

import (
	"context"
	"testing"

	"dra-platform/backend/internal/domain"
)

const testSecret = "test-secret-key-for-jwt-signing-only-32bytes"

func TestHashPassword(t *testing.T) {
	hash, err := HashPassword("password123")
	if err != nil {
		t.Fatalf("HashPassword error: %v", err)
	}
	if hash == "" {
		t.Fatal("empty hash")
	}
	if hash == "password123" {
		t.Fatal("hash should not equal plaintext")
	}
}

func TestCheckPassword(t *testing.T) {
	hash, err := HashPassword("password123")
	if err != nil {
		t.Fatalf("HashPassword error: %v", err)
	}

	if !CheckPassword("password123", hash) {
		t.Error("correct password should match")
	}
	if CheckPassword("wrong", hash) {
		t.Error("wrong password should not match")
	}
}

func TestHashPassword_Unique(t *testing.T) {
	h1, _ := HashPassword("same")
	h2, _ := HashPassword("same")
	if h1 == h2 {
		t.Error("bcrypt hashes should be unique (different salts)")
	}
}

func TestUserService_Register_Validation(t *testing.T) {
	svc := NewUserService(nil, testSecret)
	_, err := svc.Register(context.Background(), domain.SignupRequest{
		Name: "A",
		Email: "a@example.com",
		Password: "password123",
	})
	if err == nil {
		t.Fatal("expected validation error for short name")
	}
}
