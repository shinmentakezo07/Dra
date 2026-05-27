package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port            string
	DBType          string
	DatabaseURL     string
	MongoDBURI      string
	MongoDBName     string
	AuthSecret      string
	NvidiaAPIKey           string
	NvidiaSecondaryAPIKeys []string
	OpenAIAPIKey           string
	OpenAISecondaryAPIKeys []string
	AnthropicAPIKey        string
	AnthropicSecondaryAPIKeys []string
	GroqAPIKey             string
	GroqSecondaryAPIKeys   []string
	GeminiAPIKey           string
	GeminiSecondaryAPIKeys []string
	YapaAPIKey             string
	ShinwayAPIKey          string
	Env             string
	RedisURL        string
	AllowedOrigins  []string

	RateLimitRPM    int
	RateLimitWindow time.Duration

	RequestTimeout  time.Duration
	ShutdownTimeout time.Duration

	EnableMetrics bool
	MetricsPort   string

	EnableCache     bool
	CacheMaxSize    int
	CacheDefaultTTL time.Duration

	RouterStrategy         string
	EnableSemanticCache    bool
	SemanticCacheThreshold float64

	ABTestVariantA string
	ABTestVariantB string
	ABTestTrafficA float64
	ABTestTrafficB float64

	ModelAliases map[string]string

	// Email
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPass     string
	SMTPFrom     string

	// Stripe
	StripeSecretKey     string
	StripeWebhookSecret string
	StripePriceID       string

	// Frontend
	FrontendURL string
}

func Load() (*Config, error) {
	dbType := getEnv("DB_TYPE", "postgres")
	// Auto-detect Neon from URL if not explicitly set
	if dbType == "postgres" {
		if strings.Contains(getEnv("DATABASE_URL", ""), "neon.tech") {
			dbType = "neon"
		}
	}

	authSecret, err := mustGetEnv("AUTH_SECRET")
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Port:            getEnv("PORT", "8080"),
		DBType:          dbType,
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		MongoDBURI:      getEnv("MONGODB_URI", ""),
		MongoDBName:     getEnv("MONGODB_NAME", "dra_platform"),
		AuthSecret:      authSecret,
		NvidiaAPIKey:              getEnv("NVIDIA_API_KEY", ""),
		NvidiaSecondaryAPIKeys:    getEnvSlice("NVIDIA_API_KEY_2"),
		OpenAIAPIKey:              getEnv("OPENAI_API_KEY", ""),
		OpenAISecondaryAPIKeys:    getEnvSlice("OPENAI_API_KEY_2"),
		AnthropicAPIKey:           getEnv("ANTHROPIC_API_KEY", ""),
		AnthropicSecondaryAPIKeys: getEnvSlice("ANTHROPIC_API_KEY_2"),
		GroqAPIKey:                getEnv("GROQ_API_KEY", ""),
		GroqSecondaryAPIKeys:      getEnvSlice("GROQ_API_KEY_2"),
		GeminiAPIKey:              getEnv("GEMINI_API_KEY", ""),
		GeminiSecondaryAPIKeys:    getEnvSlice("GEMINI_API_KEY_2"),
		YapaAPIKey:                getEnv("YAPA_API_KEY", ""),
		ShinwayAPIKey:             getEnv("SHINWAY_API_KEY", ""),
		Env:             getEnv("ENV", "development"),
		AllowedOrigins:  getEnvSlice("ALLOWED_ORIGINS"),
		RateLimitRPM:    getEnvInt("RATE_LIMIT_RPM", 60),
		RateLimitWindow: time.Minute,
		RequestTimeout:  getEnvDuration("REQUEST_TIMEOUT", 30*time.Second),
		ShutdownTimeout: getEnvDuration("SHUTDOWN_TIMEOUT", 10*time.Second),
		EnableMetrics:   getEnvBool("ENABLE_METRICS", true),
		MetricsPort:     getEnv("METRICS_PORT", "9090"),
		RedisURL:        getEnv("REDIS_URL", ""),
		EnableCache:            getEnvBool("ENABLE_CACHE", true),
		CacheMaxSize:           getEnvInt("CACHE_MAX_SIZE", 10000),
		CacheDefaultTTL:        getEnvDuration("CACHE_DEFAULT_TTL", 5*time.Minute),
		RouterStrategy:         getEnv("ROUTER_STRATEGY", "cost"),
		EnableSemanticCache:    getEnvBool("ENABLE_SEMANTIC_CACHE", false),
		SemanticCacheThreshold: getEnvFloat("SEMANTIC_CACHE_THRESHOLD", 0.92),
		ABTestVariantA:         getEnv("AB_TEST_VARIANT_A", ""),
		ABTestVariantB:         getEnv("AB_TEST_VARIANT_B", ""),
		ABTestTrafficA:         getEnvFloat("AB_TEST_TRAFFIC_A", 0.5),
		ABTestTrafficB:         getEnvFloat("AB_TEST_TRAFFIC_B", 0.5),
		ModelAliases:           parseAliases(getEnv("MODEL_ALIASES", "")),
		SMTPHost:               getEnv("SMTP_HOST", ""),
		SMTPPort:               getEnv("SMTP_PORT", ""),
		SMTPUser:               getEnv("SMTP_USER", ""),
		SMTPPass:               getEnv("SMTP_PASS", ""),
		SMTPFrom:               getEnv("SMTP_FROM", ""),
		StripeSecretKey:        getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret:    getEnv("STRIPE_WEBHOOK_SECRET", ""),
		StripePriceID:          getEnv("STRIPE_PRICE_ID", ""),
		FrontendURL:            getEnv("FRONTEND_URL", getEnv("NEXTAUTH_URL", "")),
	}

	if cfg.AuthSecret == "" {
		return nil, fmt.Errorf("AUTH_SECRET is required")
	}
	if cfg.DBType != "postgres" && cfg.DBType != "neon" && cfg.DBType != "mongodb" {
		return nil, fmt.Errorf("DB_TYPE must be one of: postgres, neon, mongodb")
	}
	if cfg.DBType == "mongodb" {
		if cfg.MongoDBURI == "" {
			return nil, fmt.Errorf("MONGODB_URI is required when DB_TYPE=mongodb")
		}
	} else {
		if cfg.DatabaseURL == "" {
			return nil, fmt.Errorf("DATABASE_URL is required when DB_TYPE=%s", cfg.DBType)
		}
	}
	if len(cfg.AllowedOrigins) == 0 {
		if cfg.IsProduction() {
			return nil, fmt.Errorf("ALLOWED_ORIGINS is required in production")
		}
		cfg.AllowedOrigins = []string{"http://localhost:3000", "http://localhost:3001"}
	}

	return cfg, nil
}

func (c *Config) IsDevelopment() bool { return c.Env == "development" }
func (c *Config) IsProduction() bool  { return c.Env == "production" }

func (c *Config) AIAPIKey() string {
	if c.NvidiaAPIKey != "" {
		return c.NvidiaAPIKey
	}
	return c.OpenAIAPIKey
}

func getEnvSlice(key string) []string {
	v := os.Getenv(key)
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetEnv(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return "", fmt.Errorf("required environment variable %s is not set", key)
	}
	return v, nil
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}

func getEnvBool(key string, fallback bool) bool {
	v := strings.ToLower(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v == "true" || v == "1" || v == "yes"
}

func getEnvFloat(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return f
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func parseAliases(s string) map[string]string {
	aliases := make(map[string]string)
	if s == "" {
		return aliases
	}
	pairs := strings.Split(s, ",")
	for _, p := range pairs {
		parts := strings.SplitN(strings.TrimSpace(p), ":", 2)
		if len(parts) == 2 {
			aliases[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return aliases
}
