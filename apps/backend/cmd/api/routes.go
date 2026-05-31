package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/handler"
	appmiddleware "dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/service"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/redis/go-redis/v9"
)

// registerRoutes sets up all HTTP routes and middleware on the chi router.
func registerRoutes(
	r *chi.Mux,
	h *handler.Handler,
	cfg *config.Config,
	database *db.DB,
	redisClient redis.Cmdable,
	userSvc *service.UserService,
	adminUserRepo *repository.AdminUserRepo,
) {
	// Global middleware
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Timeout(cfg.RequestTimeout))
	r.Use(appmiddleware.RequestContext)
	r.Use(appmiddleware.TraceMiddleware)
	r.Use(appmiddleware.BodyLimit(10 << 20)) // 10 MB
	r.Use(appmiddleware.RequestLogger)
	r.Use(appmiddleware.Metrics)

	r.Use(appmiddleware.TransformMiddleware(appmiddleware.TransformConfig{
		SystemPromptInjections: map[string]string{},
		StripHeaders:           []string{},
	}))

	// CORS
	corsOrigins := cfg.AllowedOrigins
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Api-Key", "X-Sandbox", "X-Request-ID", "X-Webhook-Signature", "X-Webhook-ID", "X-Event-Type", "X-Idempotency-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Rate limiter
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
			if u != nil && u.IsAdmin() {
				au, err := adminUserRepo.GetAdminUser(ctx, userID)
				if err == nil && au != nil {
					u.Permissions = au.Permissions
					if u.Permissions == nil {
						u.Permissions = []string{}
					}
				}
			}
			return u, nil
		},
	)

	// Token blacklist
	tokenBlacklistSvc := service.NewTokenBlacklistService(repository.NewTokenBlacklistRepo(database))
	tokenBlacklistMW := appmiddleware.TokenBlacklist(tokenBlacklistSvc)

	// Quota tracker
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

	// --- Routes ---

	// Public
	r.Get("/health", h.Health)
	r.Get("/health/providers", h.ProviderHealth)

	// Auth (stricter rate limit)
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
		r.Post("/auth/admin-login", h.AdminLogin)
		r.Post("/auth/oauth", h.OAuthLogin)
		r.Post("/auth/forgot-password", h.ForgotPassword)
		r.Post("/auth/reset-password", h.ResetPassword)
	})

	// OpenAI & Anthropic proxy routes
	r.Group(func(r chi.Router) {
		r.Use(authMW)
		r.Use(tokenBlacklistMW)
		r.Use(quotaMW)
		r.Post("/v1/chat/completions", h.OpenAIChatCompletions)
		r.Post("/v1/messages", h.AnthropicMessages)
		r.Post("/v1/embeddings", h.OpenAIEmbeddings)
		r.Get("/v1/models", h.OpenAIListModels)
	})

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMW)
		r.Use(tokenBlacklistMW)
		r.Use(quotaMW)

		r.Get("/auth/me", h.Me)
		r.Put("/auth/profile", h.UpdateProfile)
		r.Put("/auth/password", h.ChangePassword)
		r.Post("/auth/logout", h.Logout)
		r.Delete("/api/account", h.DeleteAccount)

		r.Get("/api/permissions/me", h.MyPermissions)

		r.Get("/api/keys", h.ListKeys)
		r.Post("/api/keys", h.CreateKey)
		r.Delete("/api/keys/{id}", h.DeleteKey)
		r.Post("/api/keys/{id}/revoke", h.RevokeKey)
		r.Put("/api/keys/{id}", h.UpdateKey)

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

		r.Get("/api/conversations", h.ListConversations)
		r.Post("/api/conversations", h.CreateConversation)
		r.Get("/api/conversations/{id}", h.GetConversation)
		r.Delete("/api/conversations/{id}", h.DeleteConversation)
		r.Post("/api/conversations/{id}/messages", h.AddMessage)
		r.Put("/api/conversations/{id}/title", h.UpdateConversationTitle)

		r.Get("/api/prompts", h.ListPrompts)
		r.Post("/api/prompts", h.CreatePrompt)
		r.Get("/api/prompts/{name}", h.GetPrompt)
		r.Post("/api/prompts/{name}/render", h.RenderPrompt)
		r.Delete("/api/prompts/{name}", h.DeletePrompt)

		r.Post("/api/batch", h.BatchChat)
		r.Get("/api/batch/{id}", h.GetBatchJob)
		r.Get("/api/batch", h.ListBatchJobs)
		r.Delete("/api/batch/{id}", h.CancelBatchJob)

		r.Post("/api/files/upload", h.UploadFiles)
		r.Get("/api/files", h.ListFiles)

		r.Post("/api/validate", h.ValidateStructuredOutput)
		r.Get("/api/notifications/stream", h.NotificationsStream)

		r.Get("/api/webhooks", h.ListWebhooks)
		r.Post("/api/webhooks", h.CreateWebhook)
		r.Get("/api/webhooks/{id}", h.GetWebhook)
		r.Put("/api/webhooks/{id}", h.UpdateWebhook)
		r.Delete("/api/webhooks/{id}", h.DeleteWebhook)
		r.Get("/api/webhooks/{id}/deliveries", h.GetWebhookDeliveries)

		r.Get("/api/organizations", h.ListOrgs)
		r.Post("/api/organizations", h.CreateOrg)
		r.Get("/api/organizations/{id}", h.GetOrg)
		r.Post("/api/organizations/{id}/invite", h.InviteMember)
		r.Post("/api/organizations/{id}/members/{userId}", h.RemoveMember)
		r.Get("/api/organizations/{id}/members", h.ListMembers)
		r.Post("/api/invites/accept", h.AcceptInvite)

		r.Get("/api/comparisons", h.ListComparisons)
		r.Post("/api/comparisons", h.CreateComparison)
		r.Get("/api/comparisons/{id}", h.GetComparison)
		r.Delete("/api/comparisons/{id}", h.DeleteComparison)

		r.Get("/api/fine-tuning/jobs", h.ListFineTuningJobs)
		r.Post("/api/fine-tuning/jobs", h.CreateFineTuningJob)
		r.Get("/api/fine-tuning/jobs/{jobId}", h.GetFineTuningJob)
		r.Get("/api/fine-tuning/datasets", h.ListFineTuningDatasets)
		r.Post("/api/fine-tuning/datasets", h.CreateFineTuningDataset)
		r.Delete("/api/fine-tuning/datasets/{id}", h.DeleteFineTuningDataset)

		r.Get("/api/budget/alerts", h.ListBudgetAlerts)
		r.Post("/api/budget/alerts", h.CreateBudgetAlert)
		r.Delete("/api/budget/alerts/{id}", h.DeleteBudgetAlert)
		r.Get("/api/budget/cap", h.GetBudgetCap)
		r.Post("/api/budget/cap", h.CreateBudgetCap)
		r.Put("/api/budget/cap", h.UpdateBudgetCap)
		r.Delete("/api/budget/cap", h.DeleteBudgetCap)

		r.Get("/api/exports", h.ListExportJobs)
		r.Post("/api/exports", h.CreateExportJob)
		r.Get("/api/exports/{id}", h.GetExportJob)
		r.Get("/api/exports/{id}/download", h.DownloadExportJob)

		r.Get("/api/messages", h.GetUserMessages)
		r.Get("/api/messages/unread-count", h.GetUnreadMessageCount)
		r.Post("/api/messages/{id}/read", h.MarkMessageRead)
		r.Post("/api/messages/read-all", h.MarkAllMessagesRead)

		r.Get("/api/announcements", h.GetUserAnnouncements)
	})

	// Stripe webhook (public, signature verified in handler)
	r.Post("/webhooks/stripe", h.StripeWebhook)

	// Provider health (public)
	r.Get("/api/providers/health", h.ProviderHealth)

	// Admin routes
	r.Group(func(r chi.Router) {
		r.Use(authMW)
		r.Use(tokenBlacklistMW)
		r.Use(quotaMW)

		r.Get("/api/admin/dashboard", appmiddleware.RequireAdmin(h.AdminDashboardStats))
		r.Get("/api/admin/users", appmiddleware.RequireAdmin(h.AdminListUsers))
		r.Get("/api/admin/users/{id}", appmiddleware.RequireAdmin(h.AdminGetUserDetail))
		r.Put("/api/admin/users/{id}/status", appmiddleware.RequirePermission("users.write")(h.AdminUpdateUserStatus))
		r.Put("/api/admin/users/{id}/role", appmiddleware.RequirePermission("users.write")(h.AdminUpdateUserRole))
		r.Delete("/api/admin/users/{id}", appmiddleware.RequirePermission("users.write")(h.AdminDeleteUser))
		r.Post("/api/admin/users/{id}/impersonate", appmiddleware.RequirePermission("users.write")(h.AdminStartImpersonation))
		r.Post("/api/admin/impersonations/{id}/stop", appmiddleware.RequirePermission("users.write")(h.AdminStopImpersonation))
		r.Post("/api/admin/users/bulk/suspend", appmiddleware.RequirePermission("users.write")(h.AdminBulkSuspendUsers))
		r.Get("/api/admin/users/{id}/keys", appmiddleware.RequireAdmin(h.AdminListUserKeys))
		r.Get("/api/admin/users/{id}/usage", appmiddleware.RequireAdmin(h.AdminListUserUsage))

		r.Get("/api/admin/providers", appmiddleware.RequireAdmin(h.AdminListProviders))
		r.Post("/api/admin/providers", appmiddleware.RequirePermission("providers.write")(h.AdminCreateProvider))
		r.Post("/api/admin/providers/fetch-models", appmiddleware.RequirePermission("providers.write")(h.AdminFetchModels))
		r.Get("/api/admin/providers/{id}", appmiddleware.RequireAdmin(h.AdminGetProvider))
		r.Put("/api/admin/providers/{id}", appmiddleware.RequirePermission("providers.write")(h.AdminUpdateProvider))
		r.Put("/api/admin/providers/{id}/status", appmiddleware.RequirePermission("providers.write")(h.AdminUpdateProviderStatus))
		r.Get("/api/admin/providers/{id}/keys", appmiddleware.RequireAdmin(h.AdminListProviderKeys))
		r.Post("/api/admin/providers/{id}/keys", appmiddleware.RequirePermission("providers.write")(h.AdminAddProviderKey))
		r.Delete("/api/admin/providers/{id}/keys/{keyId}", appmiddleware.RequirePermission("providers.write")(h.AdminDeleteProviderKey))
		r.Put("/api/admin/providers/{id}/keys/reorder", appmiddleware.RequirePermission("providers.write")(h.AdminReorderProviderKeys))
		r.Delete("/api/admin/providers/{id}", appmiddleware.RequirePermission("providers.write")(h.AdminDeleteProvider))

		r.Get("/api/admin/models", appmiddleware.RequireAdmin(h.AdminListModels))
		r.Post("/api/admin/models", appmiddleware.RequirePermission("models.write")(h.AdminCreateModel))
		r.Get("/api/admin/models/{id}", appmiddleware.RequireAdmin(h.AdminGetModel))
		r.Put("/api/admin/models/{id}", appmiddleware.RequirePermission("models.write")(h.AdminUpdateModel))
		r.Put("/api/admin/models/{id}/status", appmiddleware.RequirePermission("models.write")(h.AdminUpdateModelStatus))
		r.Delete("/api/admin/models/{id}", appmiddleware.RequirePermission("models.write")(h.AdminDeleteModel))
		r.Get("/api/admin/aliases", appmiddleware.RequireAdmin(h.AdminListAliases))
		r.Post("/api/admin/aliases", appmiddleware.RequirePermission("models.write")(h.AdminCreateAlias))
		r.Put("/api/admin/aliases/{id}", appmiddleware.RequirePermission("models.write")(h.AdminUpdateAlias))
		r.Delete("/api/admin/aliases/{id}", appmiddleware.RequirePermission("models.write")(h.AdminDeleteAlias))

		r.Get("/api/admin/billing/summary", appmiddleware.RequireAdmin(h.AdminRevenueSummary))
		r.Get("/api/admin/billing/transactions", appmiddleware.RequireAdmin(h.AdminListTransactions))
		r.Post("/api/admin/billing/credits/adjust", appmiddleware.RequirePermission("billing.write")(h.AdminAdjustCredits))
		r.Get("/api/admin/billing/usage-daily", appmiddleware.RequireAdmin(h.AdminUsageDaily))

		r.Get("/api/admin/settings", appmiddleware.RequireAdmin(h.AdminListSettings))
		r.Put("/api/admin/settings/{key}", appmiddleware.RequirePermission("settings.write")(h.AdminUpdateSetting))
		r.Get("/api/admin/feature-flags", appmiddleware.RequireAdmin(h.AdminListFeatureFlags))
		r.Post("/api/admin/feature-flags", appmiddleware.RequirePermission("settings.write")(h.AdminCreateFeatureFlag))
		r.Put("/api/admin/feature-flags/{id}", appmiddleware.RequirePermission("settings.write")(h.AdminToggleFeatureFlag))

		r.Get("/api/admin/security/suspicious", appmiddleware.RequireAdmin(h.AdminListSuspicious))
		r.Put("/api/admin/security/suspicious/{id}", appmiddleware.RequireAdmin(h.AdminReviewSuspicious))
		r.Get("/api/admin/ip", appmiddleware.RequireAdmin(h.AdminListIPEntries))
		r.Post("/api/admin/ip", appmiddleware.RequireAdmin(h.AdminAddIPEntry))
		r.Delete("/api/admin/ip/{id}", appmiddleware.RequireAdmin(h.AdminRemoveIPEntry))
		r.Get("/api/admin/logs/ip-access", appmiddleware.RequireAdmin(h.AdminListIPAccessLogs))

		r.Get("/api/admin/audit", appmiddleware.RequireAdmin(h.AdminListAuditLogs))

		r.Get("/api/admin/announcements", appmiddleware.RequireAdmin(h.AdminListAnnouncements))
		r.Post("/api/admin/announcements", appmiddleware.RequireAdmin(h.AdminCreateAnnouncement))

		r.Get("/api/admin/messages", appmiddleware.RequireAdmin(h.AdminListMessages))
		r.Get("/api/admin/messages/{id}", appmiddleware.RequireAdmin(h.AdminGetMessage))
		r.Post("/api/admin/messages", appmiddleware.RequireAdmin(h.AdminCreateMessage))
		r.Delete("/api/admin/messages/{id}", appmiddleware.RequireAdmin(h.AdminDeleteMessage))
		r.Get("/api/admin/messages/{id}/stats", appmiddleware.RequireAdmin(h.AdminGetMessageStats))

		r.Get("/api/admin/promos", appmiddleware.RequireAdmin(h.AdminListPromoCodes))
		r.Post("/api/admin/promos", appmiddleware.RequireAdmin(h.AdminCreatePromoCodeWithRandom))
		r.Post("/api/admin/promos/custom", appmiddleware.RequireAdmin(h.AdminCreatePromoCode))
		r.Put("/api/admin/promos/{id}/toggle", appmiddleware.RequireAdmin(h.AdminTogglePromoStatus))
		r.Get("/api/admin/promos/{id}/redemptions", appmiddleware.RequireAdmin(h.AdminListPromoRedemptions))

		r.Get("/api/admin/groups", appmiddleware.RequireAdmin(h.AdminListGroups))
		r.Post("/api/admin/groups", appmiddleware.RequireAdmin(h.AdminCreateGroup))

		r.Get("/api/admin/reports", appmiddleware.RequireAdmin(h.AdminListScheduledReports))
		r.Get("/api/admin/changelog", appmiddleware.RequireAdmin(h.AdminListChangelog))
		r.Post("/api/admin/changelog", appmiddleware.RequireAdmin(h.AdminCreateChangelog))
		r.Post("/api/admin/changelog/{id}/publish", appmiddleware.RequireAdmin(h.AdminPublishChangelog))

		r.Get("/api/admin/admins", appmiddleware.RequireAdmin(h.AdminListAdminUsers))
		r.Post("/api/admin/admins", appmiddleware.RequireAdmin(h.AdminCreateAdminUser))
		r.Delete("/api/admin/admins/{id}", appmiddleware.RequireAdmin(h.AdminRemoveAdmin))

		r.Get("/api/admin/sso", appmiddleware.RequireAdmin(h.AdminListSSOConfigs))

		r.Get("/api/admin/cost/optimizations", appmiddleware.RequireAdmin(h.AdminListOptimizations))
		r.Get("/api/admin/cost/forecast", appmiddleware.RequireAdmin(h.AdminGetForecast))
		r.Get("/api/admin/cost/breakdown", appmiddleware.RequireAdmin(h.AdminCostBreakdown))

		r.Get("/api/admin/cache/stats", appmiddleware.RequireAdmin(h.AdminCacheStats))
		r.Post("/api/admin/cache/clear", appmiddleware.RequireAdmin(h.AdminClearCache))
		r.Get("/api/admin/webhooks/logs", appmiddleware.RequireAdmin(h.AdminListWebhookLogs))
		r.Post("/api/admin/webhooks/{id}/retry", appmiddleware.RequireAdmin(h.AdminRetryWebhook))

		r.Get("/api/admin/stats", appmiddleware.RequireAdmin(h.AdminStats))
		r.Get("/api/admin/circuit-breakers", appmiddleware.RequireAdmin(h.AdminCircuitBreakers))
		r.Get("/api/admin/provider-health", appmiddleware.RequireAdmin(h.ProviderHealth))

		r.Get("/api/admin/rbac/permissions", appmiddleware.RequireAdmin(h.ListPermissions))
		r.Get("/api/admin/rbac/roles", appmiddleware.RequireAdmin(h.ListRoles))
		r.Get("/api/admin/rbac/roles/{role}/permissions", appmiddleware.RequireAdmin(h.GetRolePermissions))
		r.Post("/api/admin/rbac/roles/{role}/permissions", appmiddleware.RequireAdmin(h.AddRolePermission))
		r.Delete("/api/admin/rbac/roles/{role}/permissions/{permission}", appmiddleware.RequireAdmin(h.RemoveRolePermission))
		r.Put("/api/admin/users/{userId}/role", appmiddleware.RequireAdmin(h.UpdateUserRole))

		r.Get("/api/admin/users/{id}/adjustments", appmiddleware.RequireAdmin(h.AdminListAdjustments))

		r.Get("/api/admin/rate-limits/tiers", appmiddleware.RequireAdmin(h.ListTiers))
		r.Put("/api/admin/rate-limits/tiers/{tier}", appmiddleware.RequireAdmin(h.UpdateTierLimits))
		r.Put("/api/admin/users/{userId}/tier", appmiddleware.RequireAdmin(h.SetUserTier))

		r.Get("/api/admin/plugins", appmiddleware.RequireAdmin(h.ListProviderPlugins))
		r.Post("/api/admin/plugins", appmiddleware.RequireAdmin(h.CreateProviderPlugin))
		r.Get("/api/admin/plugins/{id}", appmiddleware.RequireAdmin(h.GetProviderPlugin))
		r.Put("/api/admin/plugins/{id}/toggle", appmiddleware.RequireAdmin(h.ToggleProviderPlugin))
		r.Delete("/api/admin/plugins/{id}", appmiddleware.RequireAdmin(h.DeleteProviderPlugin))

		// --- Enterprise Features (SONAOP) ---
		// Credential Vault
		r.Get("/api/admin/credentials", appmiddleware.RequirePermission("providers.write")(h.ListCredentials))
		r.Post("/api/admin/credentials", appmiddleware.RequirePermission("providers.write")(h.AddCredential))
		r.Post("/api/admin/credentials/{id}/rotate", appmiddleware.RequirePermission("providers.write")(h.RotateCredential))
		r.Delete("/api/admin/credentials/{id}", appmiddleware.RequirePermission("providers.write")(h.DeleteCredential))

		// Security
		r.Get("/api/admin/security/events", appmiddleware.RequireAdmin(h.GetSecurityEvents))
		r.Post("/api/admin/security/scan", appmiddleware.RequireAdmin(h.ScanContent))

		// Usage & Pricing
		r.Get("/api/admin/usage/summary", appmiddleware.RequireAdmin(h.GetUsageSummary))
		r.Get("/api/admin/pricing", appmiddleware.RequireAdmin(h.ListPricing))

		// Load Balancer
		r.Get("/api/admin/load-balancer", appmiddleware.RequireAdmin(h.GetLoadBalancerStats))

		// Provider Health (detailed)
		r.Get("/api/admin/provider-health-detailed", appmiddleware.RequireAdmin(h.ProviderHealthDetailed))
	})

	// Enterprise protected routes (require auth)
	r.Group(func(r chi.Router) {
		r.Use(authMW)
		r.Use(tokenBlacklistMW)

		// Virtual Keys
		r.Get("/api/virtual-keys", h.ListVirtualKeys)
		r.Post("/api/virtual-keys", h.CreateVirtualKey)
		r.Post("/api/virtual-keys/{id}/deactivate", h.DeactivateVirtualKey)

		// WebSocket
		r.Get("/ws", h.WebSocketHandler)
		r.Get("/v1/stream", h.WebSocketHandler)
	})
}
