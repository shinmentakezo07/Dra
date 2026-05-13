package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/handler"
	appmiddleware "dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	appredis "dra-platform/backend/internal/redis"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/service"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/cache"
	"dra-platform/backend/pkg/llm/circuitbreaker"
	llmcontext "dra-platform/backend/pkg/llm/context"
	"dra-platform/backend/pkg/llm/guardrails"
	llmprovider "dra-platform/backend/pkg/llm/provider"
	"dra-platform/backend/pkg/llm/router"
	"dra-platform/backend/pkg/llm/watcher"
	"dra-platform/backend/pkg/email"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config load failed: %v\n", err)
		os.Exit(1)
	}

	if cfg.IsDevelopment() {
		logger.SetLevel(slog.LevelDebug)
	}
	logger.Info("starting server", "env", cfg.Env, "port", cfg.Port)

	database, err := db.New(cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", "error", err.Error())
		os.Exit(1)
	}
	defer database.Close()

	// Redis
	var redisClient redis.Cmdable
	if cfg.RedisURL != "" {
		c, err := appredis.New(cfg.RedisURL)
		if err != nil {
			logger.Error("redis_connection_failed", "error", err.Error())
		} else {
			redisClient = c.Client
			logger.Info("redis_connected", "url", cfg.RedisURL)
		}
	}

	// Repositories
	userRepo := repository.NewUserRepo(database)
	keyRepo := repository.NewAPIKeyRepoWithPepper(database, cfg.AuthSecret)
	creditsRepo := repository.NewCreditsRepo(database)
	txRepo := repository.NewTransactionRepo(database)
	logRepo := repository.NewLogRepo(database)

	// Provider registry with optional SDK features
	var llmCache cache.Cache
	if cfg.EnableCache {
		if redisClient != nil {
			llmCache = cache.NewGoRedisCache(redisClient,
				cache.WithGoRedisKeyPrefix("llm:cache:"),
				cache.WithGoRedisTTL(cfg.CacheDefaultTTL),
			)
			logger.Info("llm_cache_enabled", "backend", "redis", "ttl", cfg.CacheDefaultTTL)
		} else {
			memCache := cache.NewMemoryCache(
				cache.WithMaxSize(cfg.CacheMaxSize),
				cache.WithDefaultTTL(cfg.CacheDefaultTTL),
			)
			memCache.StartCleanup(1 * time.Minute)
			llmCache = memCache
			logger.Info("llm_cache_enabled", "backend", "memory", "max_size", cfg.CacheMaxSize, "ttl", cfg.CacheDefaultTTL)
		}
	}

	// Request deduplication cache
	var dedupCache *cache.DedupCache
	if llmCache != nil {
		dedupCache = cache.NewDedupCache(llmCache)
		logger.Info("dedup_cache_enabled")
	}

	// Semantic cache for fuzzy matching
	var semanticCache *cache.SemanticCache
	if cfg.EnableSemanticCache {
		semanticCache = cache.NewSemanticCache(cfg.CacheMaxSize, cfg.SemanticCacheThreshold)
		logger.Info("semantic_cache_enabled", "threshold", cfg.SemanticCacheThreshold)
	}

	llmWatcher := watcher.New()
	llmWatcher.RegisterAll(func(ctx context.Context, record watcher.ErrorRecord) error {
		logger.Error("llm_provider_error",
			"category", record.Category,
			"provider", record.Provider,
			"model", record.Model,
			"message", record.Message,
			"retryable", record.Retryable,
		)
		return nil
	})

	// --- Unified pkg/llm provider registry ---
	llmRegistry := llmprovider.NewRegistry()
	cbConfig := circuitbreaker.DefaultConfig()

	// Helper to build multi-key provider if secondary keys are configured
	buildProvider := func(name string, primary llm.Provider, secondaryKeys []string) llm.Provider {
		if len(secondaryKeys) == 0 {
			return primary
		}
		instances := []llmprovider.KeyInstance{{APIKey: "primary", Provider: primary, Weight: 1}}
		for i, key := range secondaryKeys {
			var inst llm.Provider
			switch name {
			case "openai":
				inst = llmprovider.NewOpenAIProvider(
					llmprovider.WithAPIKey(key),
					llmprovider.WithCache(llmCache),
					llmprovider.WithWatcher(llmWatcher),
				)
			case "anthropic":
				inst = llmprovider.NewAnthropicProvider(
					llmprovider.WithAPIKey(key),
					llmprovider.WithCache(llmCache),
					llmprovider.WithWatcher(llmWatcher),
				)
			case "nvidia":
				inst = llmprovider.NewGenericProvider("nvidia", "https://integrate.api.nvidia.com/v1",
					llmprovider.WithAPIKey(key),
					llmprovider.WithCache(llmCache),
					llmprovider.WithWatcher(llmWatcher),
				)
			case "groq":
				inst = llmprovider.NewGenericProvider("groq", "https://api.groq.com/openai/v1",
					llmprovider.WithAPIKey(key),
					llmprovider.WithCache(llmCache),
					llmprovider.WithWatcher(llmWatcher),
				)
			case "gemini":
				inst = llmprovider.NewGenericProvider("gemini", "https://generativelanguage.googleapis.com/v1beta/openai",
					llmprovider.WithAPIKey(key),
					llmprovider.WithCache(llmCache),
					llmprovider.WithWatcher(llmWatcher),
				)
			default:
				continue
			}
			instances = append(instances, llmprovider.KeyInstance{APIKey: key, Provider: inst, Weight: 1})
			logger.Info("multi_key_instance_added", "provider", name, "index", i+1)
		}
		return llmprovider.NewMultiKeyProvider(name, instances)
	}

	if cfg.NvidiaAPIKey != "" {
		nvidiaProv := llmprovider.NewGenericProvider("nvidia", "https://integrate.api.nvidia.com/v1",
			llmprovider.WithAPIKey(cfg.NvidiaAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
		)
		nvidiaProvFinal := buildProvider("nvidia", nvidiaProv, cfg.NvidiaSecondaryAPIKeys)
		llmRegistry.Register(circuitbreaker.New(nvidiaProvFinal, cbConfig))
	}
	if cfg.OpenAIAPIKey != "" {
		openaiProv := llmprovider.NewOpenAIProvider(
			llmprovider.WithAPIKey(cfg.OpenAIAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
		)
		openaiProvFinal := buildProvider("openai", openaiProv, cfg.OpenAISecondaryAPIKeys)
		llmRegistry.Register(circuitbreaker.New(openaiProvFinal, cbConfig))
	}
	if cfg.AnthropicAPIKey != "" {
		anthropicProv := llmprovider.NewAnthropicProvider(
			llmprovider.WithAPIKey(cfg.AnthropicAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
		)
		anthropicProvFinal := buildProvider("anthropic", anthropicProv, cfg.AnthropicSecondaryAPIKeys)
		llmRegistry.Register(circuitbreaker.New(anthropicProvFinal, cbConfig))
	}
	if cfg.GroqAPIKey != "" {
		groqProv := llmprovider.NewGenericProvider("groq", "https://api.groq.com/openai/v1",
			llmprovider.WithAPIKey(cfg.GroqAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
			llmprovider.WithModels([]llm.ModelInfo{
				{ID: "groq/llama-3.3-70b-versatile", Name: "Llama 3.3 70B", Provider: "groq", InputPricePer1k: 0.00059, OutputPricePer1k: 0.00079, ContextWindow: 128000, Description: "Meta's Llama 3.3 70B via Groq.", Capabilities: []string{"text", "code"}, SupportsThinking: false, SupportsVision: false, SupportsTools: true},
				{ID: "groq/mixtral-8x7b-32768", Name: "Mixtral 8x7B", Provider: "groq", InputPricePer1k: 0.00024, OutputPricePer1k: 0.00024, ContextWindow: 32768, Description: "Mistral Mixtral 8x7B via Groq.", Capabilities: []string{"text", "code"}, SupportsThinking: false, SupportsVision: false, SupportsTools: true},
				{ID: "groq/gemma2-9b-it", Name: "Gemma 2 9B", Provider: "groq", InputPricePer1k: 0.0002, OutputPricePer1k: 0.0002, ContextWindow: 8192, Description: "Google Gemma 2 9B via Groq.", Capabilities: []string{"text"}, SupportsThinking: false, SupportsVision: false, SupportsTools: false},
			}),
		)
		groqProvFinal := buildProvider("groq", groqProv, cfg.GroqSecondaryAPIKeys)
		llmRegistry.Register(circuitbreaker.New(groqProvFinal, cbConfig))
		logger.Info("groq_provider_registered")
	}
	if cfg.GeminiAPIKey != "" {
		geminiProv := llmprovider.NewGenericProvider("gemini", "https://generativelanguage.googleapis.com/v1beta/openai",
			llmprovider.WithAPIKey(cfg.GeminiAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
			llmprovider.WithModels([]llm.ModelInfo{
				{ID: "gemini/gemini-2.0-flash", Name: "Gemini 2.0 Flash", Provider: "gemini", InputPricePer1k: 0.0001, OutputPricePer1k: 0.0004, ContextWindow: 1000000, Description: "Google Gemini 2.0 Flash.", Capabilities: []string{"text", "vision", "code"}, SupportsThinking: false, SupportsVision: true, SupportsTools: true},
				{ID: "gemini/gemini-2.5-pro-preview-03-25", Name: "Gemini 2.5 Pro", Provider: "gemini", InputPricePer1k: 0.00125, OutputPricePer1k: 0.01, ContextWindow: 1000000, Description: "Google Gemini 2.5 Pro.", Capabilities: []string{"text", "vision", "code", "reasoning"}, SupportsThinking: true, SupportsVision: true, SupportsTools: true},
				{ID: "gemini/gemini-1.5-flash", Name: "Gemini 1.5 Flash", Provider: "gemini", InputPricePer1k: 0.000075, OutputPricePer1k: 0.0003, ContextWindow: 1000000, Description: "Google Gemini 1.5 Flash.", Capabilities: []string{"text", "vision"}, SupportsThinking: false, SupportsVision: true, SupportsTools: true},
			}),
		)
		geminiProvFinal := buildProvider("gemini", geminiProv, cfg.GeminiSecondaryAPIKeys)
		llmRegistry.Register(circuitbreaker.New(geminiProvFinal, cbConfig))
		logger.Info("gemini_provider_registered")
	}

	// Sandbox provider for test mode
	if cfg.IsDevelopment() {
		llmRegistry.Register(guardrails.NewSandboxProvider("sandbox"))
		logger.Info("sandbox_provider_enabled")
	}

	if len(llmRegistry.Providers()) == 0 {
		logger.Warn("no_llm_proxy_providers_configured")
	}

	// Model router for intelligent routing
	routerStrategy := router.StrategyCost
	switch cfg.RouterStrategy {
	case "latency":
		routerStrategy = router.StrategyLatency
	case "reliability":
		routerStrategy = router.StrategyReliability
	case "capability":
		routerStrategy = router.StrategyCapability
	case "random":
		routerStrategy = router.StrategyRandom
	}
	modelRouter := router.New(routerStrategy)
	for _, name := range llmRegistry.Providers() {
		if p, ok := llmRegistry.Get(name); ok {
			modelRouter.Register(p)
		}
	}
	logger.Info("model_router_configured", "strategy", cfg.RouterStrategy)

	budgetRouter := router.NewBudgetRouter(llmRegistry)
	logger.Info("budget_router_configured")

	// A/B test router
	var abRouter *router.ABRouter
	if cfg.ABTestVariantA != "" && cfg.ABTestVariantB != "" {
		abRouter = router.NewABRouter()
		if p, ok := llmRegistry.Get(cfg.ABTestVariantA); ok {
			abRouter.RegisterVariant(&router.Variant{Name: cfg.ABTestVariantA, Provider: p, TrafficPct: cfg.ABTestTrafficA})
		}
		if p, ok := llmRegistry.Get(cfg.ABTestVariantB); ok {
			abRouter.RegisterVariant(&router.Variant{Name: cfg.ABTestVariantB, Provider: p, TrafficPct: cfg.ABTestTrafficB})
		}
		logger.Info("ab_router_configured", "variant_a", cfg.ABTestVariantA, "variant_b", cfg.ABTestVariantB)
	}

	// Guardrails
	guard := guardrails.New()
	logger.Info("guardrails_initialized")

	// Email sender
	emailSender := email.Factory(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom)
	if cfg.SMTPHost != "" {
		logger.Info("email_sender_configured", "host", cfg.SMTPHost)
	} else {
		logger.Info("email_sender_noop")
	}

	// Services
	userSvc := service.NewUserService(userRepo, cfg.AuthSecret)
	keySvc := service.NewAPIKeyService(keyRepo)
	creditSvc := service.NewCreditService(database, creditsRepo, txRepo, logRepo)
	creditSvc.SetUserRepo(userRepo)
	creditSvc.SetEmailSender(emailSender)
	analyticsSvc := service.NewAnalyticsService(logRepo, userRepo, creditsRepo, keyRepo)
	logSvc := service.NewLogService(logRepo)
	providerSvc := service.NewProviderServiceWithFeatures(llmRegistry, llmCache, llmWatcher)
	webhookSvc := service.NewWebhookService(repository.NewWebhookRepo(database))
	orgSvc := service.NewOrganizationService(repository.NewOrganizationRepo(database), userRepo)

	// Admin service
	adminUserRepo := repository.NewAdminUserRepo(database)
	adminProviderRepo := repository.NewAdminProviderRepo(database)
	adminModelRepo := repository.NewAdminModelRepo(database)
	adminBillingRepo := repository.NewAdminBillingRepo(database)
	adminSettingsRepo := repository.NewAdminSettingsRepo(database)
	adminAuditRepo := repository.NewAdminAuditRepo(database)
	adminSecurityRepo := repository.NewAdminSecurityRepo(database)
	adminFeaturesRepo := repository.NewAdminFeaturesRepo(database)
	adminAuditSvc := service.NewAuditService(adminAuditRepo, 1000)
	adminSvc := service.NewAdminService(adminUserRepo, adminProviderRepo, adminModelRepo,
		adminBillingRepo, adminSettingsRepo, adminAuditRepo,
		adminSecurityRepo, adminFeaturesRepo, adminAuditSvc)

	// Stripe service
	stripeRepo := repository.NewStripeRepo(database)
	stripeSvc := service.NewStripeService(cfg.StripeSecretKey, cfg.StripeWebhookSecret, userRepo, creditsRepo, txRepo, stripeRepo)
	if stripeSvc.IsConfigured() {
		logger.Info("stripe_service_configured")
	}

	// Handler
	h := handler.New(cfg, database, userSvc, keySvc, creditSvc, analyticsSvc, logSvc, providerSvc, webhookSvc, nil, orgSvc)
	h.SetEmailSender(emailSender)
	h.SetStripeService(stripeSvc)
	h.SetLLMRegistry(llmRegistry)
	h.SetGuard(guard)
	h.SetModelRouter(modelRouter)
	h.SetBudgetRouter(budgetRouter)
	h.SetDedupCache(dedupCache)
	h.SetSemanticCache(semanticCache)
	h.SetABRouter(abRouter)
	h.SetLLMCache(llmCache)
	h.SetAdminService(adminSvc)

	// Batch service needs the handler's chat function; wire after handler creation
	batchRepo := repository.NewBatchJobRepo(database)
	batchSvc := service.NewBatchService(batchRepo, h.ChatFnForBatch())
	h.SetBatchService(batchSvc)

	sandboxSvc := service.NewSandboxService(providerSvc, creditSvc)
	_ = sandboxSvc

	experimentSvc := service.NewExperimentService(llmRegistry, providerSvc)
	_ = experimentSvc

	compressor := llmcontext.NewCompressor()
	_ = compressor

	// Router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Timeout(cfg.RequestTimeout))
	r.Use(appmiddleware.RequestContext)
	r.Use(appmiddleware.TraceMiddleware)
	// Global body limit: 10MB to support file uploads (upload handler enforces its own MaxUploadSize)
	r.Use(appmiddleware.BodyLimit(10 << 20)) // 10 MB
	r.Use(appmiddleware.RequestLogger)
	r.Use(appmiddleware.Metrics)

	// Request/response transformation middleware
	r.Use(appmiddleware.TransformMiddleware(appmiddleware.TransformConfig{
		SystemPromptInjections: map[string]string{},
		StripHeaders:           []string{},
	}))

	// CORS — rely on config validation; do not silently fallback to insecure defaults
	corsOrigins := cfg.AllowedOrigins
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Api-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Rate limiter (Redis-backed if available)
	if redisClient != nil {
		rlRedis := appmiddleware.NewRedisRateLimiter(redisClient, cfg.RateLimitWindow, cfg.RateLimitRPM)
		r.Use(appmiddleware.RedisRateLimit(rlRedis))
		logger.Info("rate_limiter_enabled", "backend", "redis")
	} else {
		rlMem := appmiddleware.NewRateLimiter(cfg.RateLimitWindow, cfg.RateLimitRPM)
		r.Use(appmiddleware.RateLimit(rlMem))
		logger.Info("rate_limiter_enabled", "backend", "memory")
	}

	// Auth middleware factory
	authMW := appmiddleware.Auth(cfg,
		func(ctx context.Context, key string) (*domain.User, *domain.APIKey, error) {
			return repository.GetUserByAPIKey(ctx, database, key, cfg.AuthSecret)
		},
		func(ctx context.Context, userID string) (*domain.User, error) {
			u, err := userSvc.GetByID(ctx, userID)
			if err != nil {
				return nil, err
			}
			return u, nil
		},
	)

	// Quota tracker for API key scoping (Redis-backed if available)
	var quotaTracker appmiddleware.QuotaTrackerInterface
	if redisClient != nil {
		quotaTracker = appmiddleware.NewRedisQuotaTracker(redisClient)
		logger.Info("quota_tracker_enabled", "backend", "redis")
	} else {
		quotaTracker = appmiddleware.NewQuotaTracker()
		logger.Info("quota_tracker_enabled", "backend", "memory")
	}
	quotaMW := appmiddleware.QuotaCheck(
		quotaTracker,
		func(r *http.Request) *appmiddleware.ScopedAPIKey {
			return appmiddleware.ToScoped(appmiddleware.GetAPIKey(r))
		},
		func(r *http.Request) (string, int) {
			var req struct {
				Model    string `json:"model"`
				Messages []struct {
					Content string `json:"content"`
				} `json:"messages"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			model := req.Model
			tokens := 0
			for _, m := range req.Messages {
				tokens += len(m.Content) / 4
			}
			if tokens == 0 {
				tokens = 100
			}
			return model, tokens
		},
	)

	// Public routes
	r.Get("/health", h.Health)
	r.Get("/health/providers", h.ProviderHealth)

	// Auth endpoints with stricter per-IP rate limiting
	var authRateLimitMW func(http.Handler) http.Handler
	if redisClient != nil {
		authRL := appmiddleware.NewRedisRateLimiter(redisClient, time.Minute, 10)
		authRateLimitMW = appmiddleware.RedisRateLimit(authRL)
	} else {
		authRL := appmiddleware.NewRateLimiter(time.Minute, 10)
		authRateLimitMW = appmiddleware.RateLimit(authRL)
	}
	r.Group(func(r chi.Router) {
		r.Use(authRateLimitMW)
		r.Post("/auth/signup", h.Signup)
		r.Post("/auth/login", h.Login)
		r.Post("/auth/oauth", h.OAuthLogin)
		r.Post("/auth/forgot-password", h.ForgotPassword)
		r.Post("/auth/reset-password", h.ResetPassword)
	})

	// OpenAI & Anthropic-compatible proxy routes (auth + quota enforced)
	r.Group(func(r chi.Router) {
		r.Use(authMW)
		r.Use(quotaMW)
		r.Post("/v1/chat/completions", h.OpenAIChatCompletions)
		r.Post("/v1/messages", h.AnthropicMessages)
		r.Post("/v1/embeddings", h.OpenAIEmbeddings)
		r.Get("/v1/models", h.OpenAIListModels)
	})

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMW)
		r.Use(quotaMW)
		r.Get("/auth/me", h.Me)
		r.Put("/auth/profile", h.UpdateProfile)
		r.Put("/auth/password", h.ChangePassword)

		r.Get("/api/keys", h.ListKeys)
		r.Post("/api/keys", h.CreateKey)
		r.Delete("/api/keys/{id}", h.DeleteKey)
		r.Post("/api/keys/{id}/revoke", h.RevokeKey)

		r.Get("/api/credits", h.GetCredits)
		r.Post("/api/credits/purchase", h.PurchaseCredits)
		r.Get("/api/credits/budget", h.GetBudget)
		r.Put("/api/credits/budget", h.SetBudget)
		r.Post("/api/promos/redeem", h.RedeemPromoCode)

		r.Get("/api/transactions", h.ListTransactions)
		r.Get("/api/logs", h.ListLogs)
		r.Get("/api/analytics", h.GetAnalytics)

		r.Get("/api/models", h.ListModels)
		r.Post("/api/chat", h.ChatProxy)
		r.Post("/api/embeddings", h.Embed)

		// Conversations
		r.Get("/api/conversations", h.ListConversations)
		r.Post("/api/conversations", h.CreateConversation)
		r.Get("/api/conversations/{id}", h.GetConversation)
		r.Delete("/api/conversations/{id}", h.DeleteConversation)
		r.Post("/api/conversations/{id}/messages", h.AddMessage)

		// Prompts
		r.Get("/api/prompts", h.ListPrompts)
		r.Post("/api/prompts", h.CreatePrompt)
		r.Get("/api/prompts/{name}", h.GetPrompt)
		r.Post("/api/prompts/{name}/render", h.RenderPrompt)
		r.Delete("/api/prompts/{name}", h.DeletePrompt)

		// Batch
		r.Post("/api/batch", h.BatchChat)
		r.Get("/api/batch/{id}", h.GetBatchJob)

		// File upload
		r.Post("/api/files/upload", h.UploadFiles)
		r.Get("/api/files", h.ListFiles)

		// Structured output validation
		r.Post("/api/validate", h.ValidateStructuredOutput)

		// Real-time notifications
		r.Get("/api/notifications/stream", h.NotificationsStream)

		// Webhooks
		r.Get("/api/webhooks", h.ListWebhooks)
		r.Post("/api/webhooks", h.CreateWebhook)
		r.Get("/api/webhooks/{id}", h.GetWebhook)
		r.Put("/api/webhooks/{id}", h.UpdateWebhook)
		r.Delete("/api/webhooks/{id}", h.DeleteWebhook)

		// Organizations
		r.Get("/api/organizations", h.ListOrgs)
		r.Post("/api/organizations", h.CreateOrg)
		r.Get("/api/organizations/{id}", h.GetOrg)
		r.Post("/api/organizations/{id}/invite", h.InviteMember)
		r.Post("/api/organizations/{id}/members/{userId}", h.RemoveMember)
		r.Get("/api/organizations/{id}/members", h.ListMembers)
		r.Post("/api/invites/accept", h.AcceptInvite)
	})

	// Stripe webhook (public, signature verified in handler)
	r.Post("/webhooks/stripe", h.StripeWebhook)

	// Provider health (public)
	r.Get("/api/providers/health", h.ProviderHealth)

	// Admin routes
	r.Group(func(r chi.Router) {
		r.Use(authMW)

		// Dashboard
		r.Get("/api/admin/dashboard", appmiddleware.RequireAdmin(h.AdminUpdateDashboard))

		// Users
		r.Get("/api/admin/users", appmiddleware.RequireAdmin(h.AdminListUsers))
		r.Get("/api/admin/users/{id}", appmiddleware.RequireAdmin(h.AdminGetUserDetail))
		r.Put("/api/admin/users/{id}/status", appmiddleware.RequireAdmin(h.AdminUpdateUserStatus))
		r.Put("/api/admin/users/{id}/role", appmiddleware.RequireAdmin(h.AdminUpdateUserRole))
		r.Delete("/api/admin/users/{id}", appmiddleware.RequireAdmin(h.AdminDeleteUser))
		r.Post("/api/admin/users/{id}/impersonate", appmiddleware.RequireAdmin(h.AdminStartImpersonation))
		r.Post("/api/admin/impersonations/{id}/stop", appmiddleware.RequireAdmin(h.AdminStopImpersonation))
		r.Post("/api/admin/users/bulk/suspend", appmiddleware.RequireAdmin(h.AdminBulkSuspendUsers))
		r.Get("/api/admin/users/{id}/keys", appmiddleware.RequireAdmin(h.AdminListUserKeys))
		r.Get("/api/admin/users/{id}/usage", appmiddleware.RequireAdmin(h.AdminListUserUsage))

		// Providers
		r.Get("/api/admin/providers", appmiddleware.RequireAdmin(h.AdminListProviders))
		r.Post("/api/admin/providers", appmiddleware.RequireAdmin(h.AdminCreateProvider))
		r.Get("/api/admin/providers/{id}", appmiddleware.RequireAdmin(h.AdminGetProvider))
		r.Put("/api/admin/providers/{id}", appmiddleware.RequireAdmin(h.AdminUpdateProvider))
		r.Put("/api/admin/providers/{id}/status", appmiddleware.RequireAdmin(h.AdminUpdateProviderStatus))
		r.Get("/api/admin/providers/{id}/keys", appmiddleware.RequireAdmin(h.AdminListProviderKeys))
		r.Post("/api/admin/providers/{id}/keys", appmiddleware.RequireAdmin(h.AdminAddProviderKey))
		r.Delete("/api/admin/providers/{id}/keys/{keyId}", appmiddleware.RequireAdmin(h.AdminDeleteProviderKey))
		r.Put("/api/admin/providers/{id}/keys/reorder", appmiddleware.RequireAdmin(h.AdminReorderProviderKeys))

		// Models
		r.Get("/api/admin/models", appmiddleware.RequireAdmin(h.AdminListModels))
		r.Post("/api/admin/models", appmiddleware.RequireAdmin(h.AdminCreateModel))
		r.Put("/api/admin/models/{id}/status", appmiddleware.RequireAdmin(h.AdminUpdateModelStatus))
		r.Get("/api/admin/aliases", appmiddleware.RequireAdmin(h.AdminListAliases))
		r.Post("/api/admin/aliases", appmiddleware.RequireAdmin(h.AdminCreateAlias))
		r.Delete("/api/admin/aliases/{id}", appmiddleware.RequireAdmin(h.AdminDeleteAlias))

		// Billing
		r.Get("/api/admin/billing/summary", appmiddleware.RequireAdmin(h.AdminRevenueSummary))
		r.Get("/api/admin/billing/transactions", appmiddleware.RequireAdmin(h.AdminListTransactions))
		r.Post("/api/admin/billing/credits/adjust", appmiddleware.RequireAdmin(h.AdminAdjustCredits))
		r.Get("/api/admin/billing/usage-daily", appmiddleware.RequireAdmin(h.AdminUsageDaily))

		// Settings
		r.Get("/api/admin/settings", appmiddleware.RequireAdmin(h.AdminListSettings))
		r.Put("/api/admin/settings/{key}", appmiddleware.RequireAdmin(h.AdminUpdateSetting))
		r.Get("/api/admin/feature-flags", appmiddleware.RequireAdmin(h.AdminListFeatureFlags))
		r.Post("/api/admin/feature-flags", appmiddleware.RequireAdmin(h.AdminCreateFeatureFlag))
		r.Put("/api/admin/feature-flags/{id}", appmiddleware.RequireAdmin(h.AdminToggleFeatureFlag))

		// Security
		r.Get("/api/admin/security/suspicious", appmiddleware.RequireAdmin(h.AdminListSuspicious))
		r.Put("/api/admin/security/suspicious/{id}", appmiddleware.RequireAdmin(h.AdminReviewSuspicious))
		r.Get("/api/admin/ip", appmiddleware.RequireAdmin(h.AdminListIPEntries))
		r.Post("/api/admin/ip", appmiddleware.RequireAdmin(h.AdminAddIPEntry))
		r.Delete("/api/admin/ip/{id}", appmiddleware.RequireAdmin(h.AdminRemoveIPEntry))
		r.Get("/api/admin/logs/ip-access", appmiddleware.RequireAdmin(h.AdminListIPAccessLogs))

		// Audit
		r.Get("/api/admin/audit", appmiddleware.RequireAdmin(h.AdminListAuditLogs))

		// Announcements
		r.Get("/api/admin/announcements", appmiddleware.RequireAdmin(h.AdminListAnnouncements))
		r.Post("/api/admin/announcements", appmiddleware.RequireAdmin(h.AdminCreateAnnouncement))

		// Promo codes
		r.Get("/api/admin/promos", appmiddleware.RequireAdmin(h.AdminListPromoCodes))
		r.Post("/api/admin/promos", appmiddleware.RequireAdmin(h.AdminCreatePromoCodeWithRandom))
		r.Put("/api/admin/promos/{id}/toggle", appmiddleware.RequireAdmin(h.AdminTogglePromoStatus))
		r.Get("/api/admin/promos/{id}/redemptions", appmiddleware.RequireAdmin(h.AdminListPromoRedemptions))

		// Groups
		r.Get("/api/admin/groups", appmiddleware.RequireAdmin(h.AdminListGroups))
		r.Post("/api/admin/groups", appmiddleware.RequireAdmin(h.AdminCreateGroup))

		// Reports & Changelog
		r.Get("/api/admin/reports", appmiddleware.RequireAdmin(h.AdminListScheduledReports))
		r.Get("/api/admin/changelog", appmiddleware.RequireAdmin(h.AdminListChangelog))
		r.Post("/api/admin/changelog", appmiddleware.RequireAdmin(h.AdminCreateChangelog))
		r.Post("/api/admin/changelog/{id}/publish", appmiddleware.RequireAdmin(h.AdminPublishChangelog))

		// Admins
		r.Get("/api/admin/admins", appmiddleware.RequireAdmin(h.AdminListAdminUsers))
		r.Post("/api/admin/admins", appmiddleware.RequireAdmin(h.AdminCreateAdminUser))
		r.Delete("/api/admin/admins/{id}", appmiddleware.RequireAdmin(h.AdminRemoveAdmin))

		// SSO
		r.Get("/api/admin/sso", appmiddleware.RequireAdmin(h.AdminListSSOConfigs))

		// Cost Intelligence
		r.Get("/api/admin/cost/optimizations", appmiddleware.RequireAdmin(h.AdminListOptimizations))
		r.Get("/api/admin/cost/forecast", appmiddleware.RequireAdmin(h.AdminGetForecast))
		r.Get("/api/admin/cost/breakdown", appmiddleware.RequireAdmin(h.AdminCostBreakdown))

		// Operations
		r.Get("/api/admin/cache/stats", appmiddleware.RequireAdmin(h.AdminCacheStats))
		r.Post("/api/admin/cache/clear", appmiddleware.RequireAdmin(h.AdminClearCache))
		r.Get("/api/admin/webhooks/logs", appmiddleware.RequireAdmin(h.AdminListWebhookLogs))
		r.Post("/api/admin/webhooks/{id}/retry", appmiddleware.RequireAdmin(h.AdminRetryWebhook))

		// Existing
		r.Get("/api/admin/stats", appmiddleware.RequireAdmin(h.AdminStats))
		r.Get("/api/admin/circuit-breakers", appmiddleware.RequireAdmin(h.AdminCircuitBreakers))
		r.Get("/api/admin/provider-health", appmiddleware.RequireAdmin(h.ProviderHealth))
	})

	// Metrics server
	if cfg.EnableMetrics {
		go func() {
			mux := http.NewServeMux()
			mux.Handle("/metrics", promhttp.Handler())
			addr := ":" + cfg.MetricsPort
			logger.Info("metrics server starting", "addr", addr)
			// Wrap metrics handler with CORS for browser-based dashboards
			handler := cors.Handler(cors.Options{
				AllowedOrigins:   corsOrigins,
				AllowedMethods:   []string{"GET", "OPTIONS"},
				AllowedHeaders:   []string{"Accept", "Authorization"},
				AllowCredentials: true,
				MaxAge:           300,
			})(mux)
			if err := http.ListenAndServe(addr, handler); err != nil {
				logger.Error("metrics server failed", "error", err.Error())
			}
		}()
	}

	// Main server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	idleConnsClosed := make(chan struct{})
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
		sig := <-sigCh
		logger.Info("shutdown signal received", "signal", sig.String())

		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			logger.Error("server shutdown error", "error", err.Error())
		}
		close(idleConnsClosed)
	}()

	logger.Info("server listening", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != http.ErrServerClosed {
		logger.Error("server failed", "error", err.Error())
		os.Exit(1)
	}

	<-idleConnsClosed
	logger.Info("server stopped gracefully")
}
