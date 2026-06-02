package config

import (
	"os"
	"testing"
	"time"
)

func TestParseAliases(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  map[string]string
	}{
		{"empty", "", map[string]string{}},
		{"single", "gpt4:gpt-4o", map[string]string{"gpt4": "gpt-4o"}},
		{"multiple", "gpt4:gpt-4o,claude:claude-sonnet-4", map[string]string{"gpt4": "gpt-4o", "claude": "claude-sonnet-4"}},
		{"malformed", "no-colon-here", map[string]string{}},
		{"with spaces", " gpt4 : gpt-4o ", map[string]string{"gpt4": "gpt-4o"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseAliases(tt.input)
			if len(got) != len(tt.want) {
				t.Errorf("parseAliases(%q) size = %d, want %d", tt.input, len(got), len(tt.want))
			}
			for k, v := range tt.want {
				if got[k] != v {
					t.Errorf("parseAliases(%q)[%q] = %q, want %q", tt.input, k, got[k], v)
				}
			}
		})
	}
}

func TestGetEnvBool(t *testing.T) {
	tests := []struct {
		value string
		want  bool
	}{
		{"true", true},
		{"True", true},
		{"1", true},
		{"yes", true},
		{"false", false},
		{"no", false},
		{"", false},
	}
	for _, tt := range tests {
		os.Setenv("TEST_BOOL", tt.value)
		got := getEnvBool("TEST_BOOL", false)
		if got != tt.want {
			t.Errorf("getEnvBool(%q) = %v, want %v", tt.value, got, tt.want)
		}
	}
	os.Unsetenv("TEST_BOOL")
}

func TestGetEnvInt(t *testing.T) {
	os.Setenv("TEST_INT", "42")
	if got := getEnvInt("TEST_INT", 0); got != 42 {
		t.Errorf("getEnvInt(42) = %d, want 42", got)
	}

	os.Setenv("TEST_INT", "invalid")
	if got := getEnvInt("TEST_INT", 99); got != 99 {
		t.Errorf("getEnvInt(invalid) = %d, want 99", got)
	}

	os.Unsetenv("TEST_INT")
	if got := getEnvInt("TEST_INT", 77); got != 77 {
		t.Errorf("getEnvInt(empty) = %d, want 77", got)
	}
}

func TestGetEnvFloat(t *testing.T) {
	os.Setenv("TEST_FLOAT", "3.14")
	if got := getEnvFloat("TEST_FLOAT", 0); got != 3.14 {
		t.Errorf("getEnvFloat(3.14) = %f, want 3.14", got)
	}

	os.Setenv("TEST_FLOAT", "bad")
	if got := getEnvFloat("TEST_FLOAT", 1.0); got != 1.0 {
		t.Errorf("getEnvFloat(bad) = %f, want 1.0", got)
	}
	os.Unsetenv("TEST_FLOAT")
}

func TestGetEnvDuration(t *testing.T) {
	os.Setenv("TEST_DUR", "5m")
	if got := getEnvDuration("TEST_DUR", 0); got != 5*time.Minute {
		t.Errorf("getEnvDuration(5m) = %v, want 5m", got)
	}

	os.Setenv("TEST_DUR", "bad")
	if got := getEnvDuration("TEST_DUR", 10*time.Second); got != 10*time.Second {
		t.Errorf("getEnvDuration(bad) = %v, want 10s", got)
	}
	os.Unsetenv("TEST_DUR")
}

func TestGetEnvSlice(t *testing.T) {
	os.Setenv("TEST_SLICE", "a, b, c")
	got := getEnvSlice("TEST_SLICE")
	want := []string{"a", "b", "c"}
	if len(got) != len(want) {
		t.Fatalf("getEnvSlice size = %d, want %d", len(got), len(want))
	}
	for i, v := range want {
		if got[i] != v {
			t.Errorf("getEnvSlice[%d] = %q, want %q", i, got[i], v)
		}
	}
	os.Unsetenv("TEST_SLICE")
}

func TestConfig_IsDevelopment_IsProduction(t *testing.T) {
	c := &Config{Env: "development"}
	if !c.IsDevelopment() {
		t.Error("IsDevelopment() = false, want true")
	}
	if c.IsProduction() {
		t.Error("IsProduction() = true, want false")
	}

	c = &Config{Env: "production"}
	if c.IsDevelopment() {
		t.Error("IsDevelopment() = true, want false")
	}
	if !c.IsProduction() {
		t.Error("IsProduction() = false, want true")
	}
}

func TestConfig_AIAPIKey(t *testing.T) {
	c := &Config{NvidiaAPIKey: "nvidia-key", OpenAIAPIKey: "openai-key"}
	if got := c.AIAPIKey(); got != "nvidia-key" {
		t.Errorf("AIAPIKey() = %q, want nvidia-key", got)
	}

	c = &Config{OpenAIAPIKey: "openai-key"}
	if got := c.AIAPIKey(); got != "openai-key" {
		t.Errorf("AIAPIKey() = %q, want openai-key", got)
	}
}

func TestLoad_MissingAuthSecret(t *testing.T) {
	os.Unsetenv("AUTH_SECRET")
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("DB_TYPE")

	defer func() {
		if r := recover(); r == nil {
			t.Fatal("Load() with missing AUTH_SECRET: expected panic, got none")
		}
	}()
	Load()
}

func TestLoad_MissingDatabaseURL(t *testing.T) {
	os.Setenv("AUTH_SECRET", "test-secret")
	os.Unsetenv("DATABASE_URL")
	os.Setenv("DB_TYPE", "postgres")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() with missing DATABASE_URL: expected error, got nil")
	}
}

func TestLoad_InvalidDBType(t *testing.T) {
	os.Setenv("AUTH_SECRET", "test-secret")
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("DB_TYPE", "mysql")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() with invalid DB_TYPE: expected error, got nil")
	}
}

func TestLoad_Defaults(t *testing.T) {
	os.Setenv("AUTH_SECRET", "test-secret")
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("DB_TYPE", "postgres")
	os.Unsetenv("ENV")
	os.Unsetenv("ALLOWED_ORIGINS")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("Port = %q, want 8080", cfg.Port)
	}
	if cfg.RateLimitRPM != 60 {
		t.Errorf("RateLimitRPM = %d, want 60", cfg.RateLimitRPM)
	}
	if !cfg.EnableMetrics {
		t.Error("EnableMetrics = false, want true")
	}
	if cfg.RouterStrategy != "cost" {
		t.Errorf("RouterStrategy = %q, want cost", cfg.RouterStrategy)
	}
	if len(cfg.AllowedOrigins) != 2 {
		t.Errorf("AllowedOrigins size = %d, want 2", len(cfg.AllowedOrigins))
	}

	os.Unsetenv("AUTH_SECRET")
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("DB_TYPE")
}

func TestLoad_AllowedOriginsInProduction(t *testing.T) {
	os.Setenv("AUTH_SECRET", "test-secret")
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("DB_TYPE", "postgres")
	os.Setenv("ENV", "production")
	os.Unsetenv("ALLOWED_ORIGINS")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() production without ALLOWED_ORIGINS: expected error, got nil")
	}

	os.Unsetenv("ENV")
}
