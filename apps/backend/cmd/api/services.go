package main

import (
	"context"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/handler"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/service"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/audit"
	"dra-platform/backend/pkg/llm/budget"
	"dra-platform/backend/pkg/llm/cache"
	"dra-platform/backend/pkg/llm/circuitbreaker"
	"dra-platform/backend/pkg/llm/credentials"
	"dra-platform/backend/pkg/llm/guardrails"
	"dra-platform/backend/pkg/llm/embeddings"
	"dra-platform/backend/pkg/llm/loadbalancer"
	"dra-platform/backend/pkg/llm/otel"
	llmprovider "dra-platform/backend/pkg/llm/provider"
	"dra-platform/backend/pkg/llm/router"
	"dra-platform/backend/pkg/llm/security"
	"dra-platform/backend/pkg/llm/stores"
	"dra-platform/backend/pkg/llm/usage"
	"dra-platform/backend/pkg/llm/virtualkeys"
	"dra-platform/backend/pkg/llm/watcher"
	"dra-platform/backend/pkg/llm/ws"
	"dra-platform/backend/pkg/email"

	"github.com/redis/go-redis/v9"
)

// initServices wires all repositories, services, and the handler.
func initServices(ctx context.Context, cfg *config.Config, database *db.DB, redisClient redis.Cmdable) (*handler.Handler, *llmprovider.Registry, cache.Cache, *watcher.Watcher) {
	// Repositories
	userRepo := repository.NewUserRepo(database)
	keyRepo := repository.NewAPIKeyRepoWithPepper(database, cfg.AuthSecret)
	creditsRepo := repository.NewCreditsRepo(database)
	txRepo := repository.NewTransactionRepo(database)
	logRepo := repository.NewLogRepo(database)

	// Repository cache layer
	var repoCache repository.RepoCache
	if redisClient != nil {
		repoCache = repository.NewRedisRepoCache(redisClient, "repo:")
		logger.Info("repo_cache_enabled", "backend", "redis")
	} else {
		repoCache = repository.NewMemoryRepoCache(cfg.CacheMaxSize)
		logger.Info("repo_cache_enabled", "backend", "memory", "max_size", cfg.CacheMaxSize)
	}

	userRepo.SetCache(repoCache, cfg.CacheDefaultTTL)
	keyRepo.SetCache(repoCache, cfg.CacheDefaultTTL)
	creditsRepo.SetCache(repoCache, cfg.CacheDefaultTTL)

	// LLM cache
	llmCache := initLLMCache(cfg, redisClient)

	// LLM watcher
	llmWatcher := watcher.New()
	llmWatcher.RegisterAll(func(_ context.Context, record watcher.ErrorRecord) error {
		logger.Error("llm_provider_error",
			"category", record.Category,
			"provider", record.Provider,
			"model", record.Model,
			"message", record.Message,
			"retryable", record.Retryable,
		)
		return nil
	})

	// Provider registry
	llmRegistry := initProviderRegistry(cfg, llmCache, llmWatcher)

	// Model routers
	modelRouter := initModelRouter(cfg, llmRegistry)
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

	// Email
	emailSender := email.Factory(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom)
	if cfg.SMTPHost != "" {
		logger.Info("email_sender_configured", "host", cfg.SMTPHost)
	} else {
		logger.Info("email_sender_noop")
	}

	// Embedding registry
	embeddingRegistry := initEmbeddingRegistry(cfg)

	// Core services
	userSvc := service.NewUserService(userRepo, cfg.AuthSecret)
	keySvc := service.NewAPIKeyService(keyRepo)
	creditSvc := service.NewCreditService(database, creditsRepo, txRepo, logRepo)
	creditSvc.SetUserRepo(userRepo)
	creditSvc.SetEmailSender(emailSender)
	analyticsSvc := service.NewAnalyticsService(logRepo, userRepo, creditsRepo, keyRepo)
	logSvc := service.NewLogService(logRepo)
	providerSvc := service.NewProviderServiceWithFeatures(llmRegistry, llmCache, llmWatcher)

	// Model group router (LiteLLM-style load balancing + fallbacks)
	groupRouter := router.NewGroupRouter()
	providerSvc.SetGroupRouter(groupRouter)
	logger.Info("group_router_initialized")

	// Pricing service (per-model token pricing from DB)
	modelRepo := repository.NewAdminModelRepo(database)
	pricingSvc := service.NewPricingService(modelRepo)
	pricingSvc.RefreshCache(ctx)
	logger.Info("pricing_service_initialized")
	webhookSvc := service.NewWebhookService(repository.NewWebhookRepo(database))
	webhookSvc.StartRetryWorker(ctx, 10*time.Second)
	orgSvc := service.NewOrganizationService(repository.NewOrganizationRepo(database), userRepo)

	// Admin services
	adminSvc, adminSessionRepo := initAdminServices(ctx, database, repoCache, cfg, llmRegistry, llmCache, llmWatcher)

	// Stripe
	stripeRepo := repository.NewStripeRepo(database)
	stripeSvc := service.NewStripeService(cfg.StripeSecretKey, cfg.StripeWebhookSecret, database, userRepo, creditsRepo, txRepo, stripeRepo)
	if stripeSvc.IsConfigured() {
		logger.Info("stripe_service_configured")
	}

	// --- Enterprise Features (SONAOP packages) ---
	encryptionKey := cfg.AuthSecret // Use auth secret as encryption key base

	// Credential Vault (AES-256-GCM encrypted API key storage)
	credStore := stores.NewPostgresCredentialStore(database.Pool)
	credVault, err := credentials.NewVault(credStore, encryptionKey)
	if err != nil {
		logger.Warn("credential_vault_init_failed", "error", err.Error())
	} else {
		logger.Info("credential_vault_initialized")
	}

	// Virtual Keys (sk-* API keys with team scoping)
	vkeyStore := stores.NewPostgresVirtualKeyStore(database.Pool)
	vkeyManager := virtualkeys.NewManager(vkeyStore)
	logger.Info("virtual_key_manager_initialized")

	// Budget Manager (hierarchical team->user->key budgets)
	budgetStore := stores.NewPostgresBudgetStore(database.Pool)
	budgetMgr := budget.NewManager(budgetStore)
	budgetMgr.SetAlertFunc(func(ctx context.Context, b *budget.Budget, pct int) {
		logger.Warn("budget_threshold_alert", "scope", string(b.Scope), "scope_id", b.ScopeID, "percent", pct, "limit", b.LimitCents)
	})
	logger.Info("budget_manager_initialized")

	// Security Guard (prompt injection, jailbreak, PII, secrets)
	securityGuard := security.NewGuard(security.Config{
		EnablePromptInjection: true,
		EnableJailbreak:       true,
		EnablePIIDetection:    true,
		EnableSecretDetection: true,
		BlockOnDetection:      true,
		RedactPII:             true,
	})
	logger.Info("security_guard_initialized")

	// Usage Tracker (per-request cost tracking)
	usageStore := stores.NewPostgresUsageStore(database.Pool)
	pricingStore := stores.NewPostgresPricingStore(database.Pool)
	usageTracker := usage.NewTracker(usageStore, pricingStore)
	logger.Info("usage_tracker_initialized")

	// Audit Logger (immutable audit trail)
	auditStore := stores.NewPostgresAuditStore(database.Pool)
	auditLogger := audit.NewLogger(auditStore)
	logger.Info("audit_logger_initialized")

	// Load Balancer (6 strategies)
	loadBalancer := loadbalancer.New(loadbalancer.StrategyFromString(cfg.RouterStrategy))
	for _, name := range llmRegistry.Providers() {
		if p, ok := llmRegistry.Get(name); ok {
			loadBalancer.AddEndpoint(&loadbalancer.Endpoint{
				ID:        name,
				Provider:  name,
				Model:     "*",
				IsActive:  true,
				IsHealthy: true,
				Priority:  1,
			})
			_ = p // keep reference
		}
	}
	logger.Info("load_balancer_initialized", "strategy", cfg.RouterStrategy)

	// OpenTelemetry
	otelProvider := otel.NewProvider(&otel.LoggingExporter{}, cfg.EnableMetrics)
	logger.Info("otel_provider_initialized")

	// WebSocket Gateway
	wsGateway := ws.NewGateway(1000) // 1000 max connections
	logger.Info("ws_gateway_initialized")

	// Wire enterprise features into handler
	h := handler.New(cfg, database, userSvc, keySvc, creditSvc, analyticsSvc, logSvc, providerSvc, webhookSvc, nil, orgSvc)
	h.SetEmailSender(emailSender)
	h.SetStripeService(stripeSvc)
	h.SetModelRouter(modelRouter)
	h.SetBudgetRouter(budgetRouter)
	h.SetABRouter(abRouter)
	h.SetLLMCache(llmCache)
	h.SetAdminService(adminSvc)
	h.SetAdminSessionRepo(adminSessionRepo)
	h.SetEmbeddingRegistry(embeddingRegistry)
	h.SetPricingService(pricingSvc)
	// Enterprise features
	h.SetCredentialVault(credVault)
	h.SetVirtualKeyManager(vkeyManager)
	h.SetBudgetManager(budgetMgr)
	h.SetSecurityGuard(securityGuard)
	h.SetUsageTracker(usageTracker)
	h.SetAuditLogger(auditLogger)
	h.SetLoadBalancer(loadBalancer)
	h.SetOtelProvider(otelProvider)
	h.SetWSGateway(wsGateway)

	// Fine-tuning
	fineTuningSvc := service.NewFineTuningService(repository.NewFineTuningRepo(database))
	h.SetFineTuningService(fineTuningSvc)

	// Batch (needs handler's chat function)
	batchSvc := service.NewBatchService(repository.NewBatchJobRepo(database), h.ChatFnForBatch())
	h.SetBatchService(batchSvc)

	return h, llmRegistry, llmCache, llmWatcher
}

func initLLMCache(cfg *config.Config, redisClient redis.Cmdable) cache.Cache {
	if !cfg.EnableCache {
		return nil
	}
	if redisClient != nil {
		c := cache.NewGoRedisCache(redisClient,
			cache.WithGoRedisKeyPrefix("llm:cache:"),
			cache.WithGoRedisTTL(cfg.CacheDefaultTTL),
		)
		logger.Info("llm_cache_enabled", "backend", "redis", "ttl", cfg.CacheDefaultTTL)
		return c
	}
	memCache := cache.NewMemoryCache(
		cache.WithMaxSize(cfg.CacheMaxSize),
		cache.WithDefaultTTL(cfg.CacheDefaultTTL),
	)
	memCache.StartCleanup(1 * time.Minute)
	logger.Info("llm_cache_enabled", "backend", "memory", "max_size", cfg.CacheMaxSize, "ttl", cfg.CacheDefaultTTL)
	return memCache
}

func initProviderRegistry(cfg *config.Config, llmCache cache.Cache, llmWatcher *watcher.Watcher) *llmprovider.Registry {
	registry := llmprovider.NewRegistry()
	cbConfig := circuitbreaker.DefaultConfig()

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
		p := llmprovider.NewGenericProvider("nvidia", "https://integrate.api.nvidia.com/v1",
			llmprovider.WithAPIKey(cfg.NvidiaAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
		)
		registry.Register(circuitbreaker.New(buildProvider("nvidia", p, cfg.NvidiaSecondaryAPIKeys), cbConfig))
	}
	if cfg.OpenAIAPIKey != "" {
		p := llmprovider.NewOpenAIProvider(
			llmprovider.WithAPIKey(cfg.OpenAIAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
		)
		registry.Register(circuitbreaker.New(buildProvider("openai", p, cfg.OpenAISecondaryAPIKeys), cbConfig))
	}
	if cfg.AnthropicAPIKey != "" {
		p := llmprovider.NewAnthropicProvider(
			llmprovider.WithAPIKey(cfg.AnthropicAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
		)
		registry.Register(circuitbreaker.New(buildProvider("anthropic", p, cfg.AnthropicSecondaryAPIKeys), cbConfig))
	}
	if cfg.GroqAPIKey != "" {
		p := llmprovider.NewGenericProvider("groq", "https://api.groq.com/openai/v1",
			llmprovider.WithAPIKey(cfg.GroqAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
			llmprovider.WithModels([]llm.ModelInfo{
				{ID: "groq/llama-3.3-70b-versatile", Name: "Llama 3.3 70B", Provider: "groq", InputPricePer1k: 0.00059, OutputPricePer1k: 0.00079, ContextWindow: 128000, Description: "Meta's Llama 3.3 70B via Groq.", Capabilities: []string{"text", "code"}, SupportsThinking: false, SupportsVision: false, SupportsTools: true},
				{ID: "groq/mixtral-8x7b-32768", Name: "Mixtral 8x7B", Provider: "groq", InputPricePer1k: 0.00024, OutputPricePer1k: 0.00024, ContextWindow: 32768, Description: "Mistral Mixtral 8x7B via Groq.", Capabilities: []string{"text", "code"}, SupportsThinking: false, SupportsVision: false, SupportsTools: true},
				{ID: "groq/gemma2-9b-it", Name: "Gemma 2 9B", Provider: "groq", InputPricePer1k: 0.0002, OutputPricePer1k: 0.0002, ContextWindow: 8192, Description: "Google Gemma 2 9B via Groq.", Capabilities: []string{"text"}, SupportsThinking: false, SupportsVision: false, SupportsTools: false},
			}),
		)
		registry.Register(circuitbreaker.New(buildProvider("groq", p, cfg.GroqSecondaryAPIKeys), cbConfig))
		logger.Info("groq_provider_registered")
	}
	if cfg.GeminiAPIKey != "" {
		p := llmprovider.NewGenericProvider("gemini", "https://generativelanguage.googleapis.com/v1beta/openai",
			llmprovider.WithAPIKey(cfg.GeminiAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
			llmprovider.WithModels([]llm.ModelInfo{
				{ID: "gemini/gemini-2.0-flash", Name: "Gemini 2.0 Flash", Provider: "gemini", InputPricePer1k: 0.0001, OutputPricePer1k: 0.0004, ContextWindow: 1000000, Description: "Google Gemini 2.0 Flash.", Capabilities: []string{"text", "vision", "code"}, SupportsThinking: false, SupportsVision: true, SupportsTools: true},
				{ID: "gemini/gemini-2.5-pro-preview-03-25", Name: "Gemini 2.5 Pro", Provider: "gemini", InputPricePer1k: 0.00125, OutputPricePer1k: 0.01, ContextWindow: 1000000, Description: "Google Gemini 2.5 Pro.", Capabilities: []string{"text", "vision", "code", "reasoning"}, SupportsThinking: true, SupportsVision: true, SupportsTools: true},
				{ID: "gemini/gemini-1.5-flash", Name: "Gemini 1.5 Flash", Provider: "gemini", InputPricePer1k: 0.000075, OutputPricePer1k: 0.0003, ContextWindow: 1000000, Description: "Google Gemini 1.5 Flash.", Capabilities: []string{"text", "vision"}, SupportsThinking: false, SupportsVision: true, SupportsTools: true},
			}),
		)
		registry.Register(circuitbreaker.New(buildProvider("gemini", p, cfg.GeminiSecondaryAPIKeys), cbConfig))
		logger.Info("gemini_provider_registered")
	}
	if cfg.YapaAPIKey != "" {
		p := llmprovider.NewGenericProvider("yapa", "https://yapa.up.railway.app/v1",
			llmprovider.WithAPIKey(cfg.YapaAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
			llmprovider.WithModels([]llm.ModelInfo{
				{ID: "yapa/mimo-v2.5-pro", Name: "Mimo V2.5 Pro", Provider: "yapa", InputPricePer1k: 0.0001, OutputPricePer1k: 0.0004, ContextWindow: 128000, Description: "Mimo V2.5 Pro via Yapa gateway.", Capabilities: []string{"text", "code"}, SupportsThinking: false, SupportsVision: false, SupportsTools: true},
			}),
		)
		registry.Register(circuitbreaker.New(p, cbConfig))
		logger.Info("yapa_provider_registered")
	}

	if cfg.ShinwayAPIKey != "" {
		p := llmprovider.NewGenericProvider("shinway", "http://localhost:20128/v1",
			llmprovider.WithAPIKey(cfg.ShinwayAPIKey),
			llmprovider.WithCache(llmCache),
			llmprovider.WithWatcher(llmWatcher),
			llmprovider.WithModels([]llm.ModelInfo{
				{ID: "shinway/zl/zhipu/glm-5.1-full", Name: "GLM 5.1 Full", Provider: "shinway", InputPricePer1k: 0.0001, OutputPricePer1k: 0.0004, ContextWindow: 128000, Description: "Zhipu GLM 5.1 Full via shinway proxy backend.", Capabilities: []string{"text", "code"}, SupportsThinking: false, SupportsVision: false, SupportsTools: true},
			}),
		)
		registry.Register(circuitbreaker.New(p, cbConfig))
		logger.Info("shinway_provider_registered", "base_url", "http://localhost:20128/v1")
	}

	if cfg.IsDevelopment() {
		registry.Register(guardrails.NewSandboxProvider("sandbox"))
		logger.Info("sandbox_provider_enabled")
	}

	if len(registry.Providers()) == 0 {
		logger.Warn("no_llm_proxy_providers_configured")
	}

	return registry
}

func initModelRouter(cfg *config.Config, registry *llmprovider.Registry) *router.Router {
	strategy := router.StrategyCost
	switch cfg.RouterStrategy {
	case "latency":
		strategy = router.StrategyLatency
	case "reliability":
		strategy = router.StrategyReliability
	case "capability":
		strategy = router.StrategyCapability
	case "random":
		strategy = router.StrategyRandom
	}
	mr := router.New(strategy)
	for _, name := range registry.Providers() {
		if p, ok := registry.Get(name); ok {
			mr.Register(p)
		}
	}
	logger.Info("model_router_configured", "strategy", cfg.RouterStrategy)
	return mr
}

func initAdminServices(ctx context.Context, database *db.DB, repoCache repository.RepoCache, cfg *config.Config, llmRegistry *llmprovider.Registry, llmCache cache.Cache, llmWatcher *watcher.Watcher) (*service.AdminService, *repository.AdminSessionRepo) {
	adminUserRepo := repository.NewAdminUserRepo(database)
	adminProviderRepo := repository.NewAdminProviderRepo(database)
	adminModelRepo := repository.NewAdminModelRepo(database)
	adminBillingRepo := repository.NewAdminBillingRepo(database)
	adminSettingsRepo := repository.NewAdminSettingsRepo(database)
	adminAuditRepo := repository.NewAdminAuditRepo(database)
	adminSecurityRepo := repository.NewAdminSecurityRepo(database)
	adminFeaturesRepo := repository.NewAdminFeaturesRepo(database)

	adminProviderRepo.SetCache(repoCache, cfg.CacheDefaultTTL)
	adminModelRepo.SetCache(repoCache, cfg.CacheDefaultTTL)
	adminSettingsRepo.SetCache(repoCache, cfg.CacheDefaultTTL)

	adminAuditSvc := service.NewAuditService(adminAuditRepo, 1000)
	adminSvc := service.NewAdminService(adminUserRepo, adminProviderRepo, adminModelRepo,
		adminBillingRepo, adminSettingsRepo, adminAuditRepo,
		adminSecurityRepo, adminFeaturesRepo, adminAuditSvc)
	adminSvc.SetLLMRuntime(llmRegistry, llmCache, llmWatcher)
	adminSvc.EnsureBuiltinProviders(ctx)
	adminSvc.LoadProvidersFromDB(ctx, llmRegistry)
	adminSvc.SyncModelRegistryOverlay(ctx)

	adminSessionRepo := repository.NewAdminSessionRepo(database)
	return adminSvc, adminSessionRepo
}

func initEmbeddingRegistry(cfg *config.Config) *embeddings.Registry {
	registry := embeddings.NewRegistry()

	// Register OpenAI embedding provider
	if cfg.OpenAIAPIKey != "" {
		registry.Register(embeddings.NewOpenAIProvider(cfg.OpenAIAPIKey))
		logger.Info("embedding_provider_registered", "provider", "openai")
	}

	// Log warning if no embedding providers are configured
	if _, ok := registry.Get("openai"); !ok {
		logger.Warn("no_embedding_providers_configured")
	}

	return registry
}
