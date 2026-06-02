package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/service"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/audit"
	"dra-platform/backend/pkg/llm/budget"
	"dra-platform/backend/pkg/llm/cache"
	"dra-platform/backend/pkg/llm/credentials"
	"dra-platform/backend/pkg/llm/embeddings"
	"dra-platform/backend/pkg/llm/loadbalancer"
	"dra-platform/backend/pkg/llm/moderation"
	"dra-platform/backend/pkg/llm/otel"
	"dra-platform/backend/pkg/llm/router"
	"dra-platform/backend/pkg/llm/security"
	"dra-platform/backend/pkg/llm/usage"
	"dra-platform/backend/pkg/llm/virtualkeys"
	"dra-platform/backend/pkg/llm/ws"
	"dra-platform/backend/pkg/webhook"
	"dra-platform/backend/pkg/email"

	"golang.org/x/sync/errgroup"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	cfg             *config.Config
	db              *db.DB
	userSvc         *service.UserService
	keySvc          *service.APIKeyService
	creditSvc       *service.CreditService
	analyticsSvc    *service.AnalyticsService
	logSvc          *service.LogService
	providerSvc     *service.ProviderService
	webhookSvc      *service.WebhookService
	batchSvc        *service.BatchService
	orgSvc          *service.OrganizationService
	conversationSvc   *service.ConversationService
	promptSvc         *service.PromptService
	fileSvc           *service.FileService
	adminSvc          *service.AdminService
	adminSessionRepo  *repository.AdminSessionRepo
	rbacSvc           *service.RBACService
	rateLimitSvc      *service.RateLimitService
	budgetSvc         *service.BudgetService
	comparisonSvc     *service.ComparisonService
	fineTuningSvc     *service.FineTuningService
	providerPluginSvc *service.ProviderPluginService
	exportSvc         *service.ExportService
	tokenBlacklistRepo *repository.TokenBlacklistRepo
	moderator       moderation.Moderator
	notificationHub *NotificationHub
	modelRouter     *router.Router
	budgetRouter    *router.BudgetRouter
	llmCache        cache.Cache
	abRouter        *router.ABRouter
	emailSender     email.Sender
	stripeSvc       *service.StripeService
	embeddingRegistry *embeddings.Registry
	pricingSvc      *service.PricingService
	// Enterprise features
	credVault       *credentials.Vault
	vkeyManager     *virtualkeys.Manager
	budgetMgr       *budget.Manager
	securityGuard   *security.Guard
	usageTracker    *usage.Tracker
	auditLogger     *audit.Logger
	loadBalancer    *loadbalancer.Balancer
	otelProvider    *otel.Provider
	wsGateway       *ws.Gateway
}

func New(cfg *config.Config, database *db.DB, u *service.UserService, k *service.APIKeyService, c *service.CreditService, a *service.AnalyticsService, l *service.LogService, p *service.ProviderService, w *service.WebhookService, b *service.BatchService, o *service.OrganizationService) *Handler {
	return &Handler{
		cfg: cfg, db: database, userSvc: u, keySvc: k, creditSvc: c, analyticsSvc: a,
		logSvc: l, providerSvc: p, webhookSvc: w, batchSvc: b, orgSvc: o,
		adminSvc:          service.NewAdminService(repository.NewAdminUserRepo(database), repository.NewAdminProviderRepo(database), repository.NewAdminModelRepo(database), repository.NewAdminBillingRepo(database), repository.NewAdminSettingsRepo(database), repository.NewAdminAuditRepo(database), repository.NewAdminSecurityRepo(database), repository.NewAdminFeaturesRepo(database), nil),
		adminSessionRepo:  repository.NewAdminSessionRepo(database),
		conversationSvc:   service.NewConversationService(repository.NewConversationRepo(database)),
		promptSvc:         service.NewPromptService(repository.NewPromptRepo(database)),
		fileSvc:           service.NewFileService(repository.NewFileRepo(database)),
		rbacSvc:           service.NewRBACService(repository.NewRBACRepo(database)),
		rateLimitSvc:      service.NewRateLimitService(repository.NewRateLimitRepo(database)),
		budgetSvc:         service.NewBudgetService(repository.NewBudgetRepo(database)),
		comparisonSvc:     service.NewComparisonService(repository.NewComparisonRepo(database)),
		fineTuningSvc:     service.NewFineTuningService(repository.NewFineTuningRepo(database)),
		providerPluginSvc: service.NewProviderPluginService(repository.NewProviderPluginRepo(database)),
		exportSvc:         service.NewExportService(repository.NewExportRepo(database), repository.NewLogRepo(database), repository.NewAdminAuditRepo(database)),
		tokenBlacklistRepo: repository.NewTokenBlacklistRepo(database),
		moderator:         moderation.NewLocalModerator(),
		notificationHub:   NewNotificationHub(),
	}
}

func (h *Handler) UserService() *service.UserService           { return h.userSvc }
func (h *Handler) SetModelRouter(r *router.Router)            { h.modelRouter = r }
func (h *Handler) SetBudgetRouter(r *router.BudgetRouter)     { h.budgetRouter = r }
func (h *Handler) SetBatchService(b *service.BatchService)    { h.batchSvc = b }
func (h *Handler) SetFineTuningService(s *service.FineTuningService) { h.fineTuningSvc = s }
func (h *Handler) SetABRouter(ab *router.ABRouter)           { h.abRouter = ab }
func (h *Handler) SetLLMCache(c cache.Cache)                 { h.llmCache = c }
func (h *Handler) SetAdminService(s *service.AdminService)   { h.adminSvc = s }
func (h *Handler) SetAdminSessionRepo(r *repository.AdminSessionRepo) { h.adminSessionRepo = r }
func (h *Handler) SetEmailSender(s email.Sender)             { h.emailSender = s }
func (h *Handler) SetStripeService(s *service.StripeService) { h.stripeSvc = s }
func (h *Handler) SetEmbeddingRegistry(r *embeddings.Registry) { h.embeddingRegistry = r }
func (h *Handler) SetPricingService(s *service.PricingService) { h.pricingSvc = s }
func (h *Handler) SetCredentialVault(v *credentials.Vault)     { h.credVault = v }
func (h *Handler) SetVirtualKeyManager(m *virtualkeys.Manager) { h.vkeyManager = m }
func (h *Handler) SetBudgetManager(m *budget.Manager)          { h.budgetMgr = m }
func (h *Handler) SetSecurityGuard(g *security.Guard)          { h.securityGuard = g }
func (h *Handler) SetUsageTracker(t *usage.Tracker)            { h.usageTracker = t }
func (h *Handler) SetAuditLogger(l *audit.Logger)              { h.auditLogger = l }
func (h *Handler) SetLoadBalancer(b *loadbalancer.Balancer)    { h.loadBalancer = b }
func (h *Handler) SetOtelProvider(p *otel.Provider)            { h.otelProvider = p }
func (h *Handler) SetWSGateway(g *ws.Gateway)                 { h.wsGateway = g }

func (h *Handler) ChatFnForBatch() func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
	return func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error) {
		domainReq := domain.ChatRequest{
			Model:    req.Model,
			Messages: make([]domain.ChatMessage, len(req.Messages)),
		}
		for i, m := range req.Messages {
			domainReq.Messages[i] = domain.ChatMessage{Role: string(m.Role), Content: m.Content}
		}
		return h.providerSvc.Chat(ctx, domainReq)
	}
}

const maxPaginationPage = 10000

func parsePagination(r *http.Request) (page, limit int) {
	page, _ = strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	if page > maxPaginationPage {
		page = maxPaginationPage
	}
	limit, _ = strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return page, limit
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	if err := h.db.Health(r.Context()); err != nil {
		logger.Error("health_check_failed", "error", err.Error())
		response.JSON(w, http.StatusServiceUnavailable, response.Body{Success: false, Error: "Database unavailable"})
		return
	}
	response.OK(w, map[string]string{"status": "ok", "version": "1.0.0"})
}

// --- API Keys ---

func (h *Handler) ListKeys(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	keys, err := h.keySvc.List(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, keys)
}

func (h *Handler) CreateKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req domain.CreateKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	key, err := h.keySvc.Create(r.Context(), u.ID, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, key)
}

func (h *Handler) DeleteKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	if id == "" {
		response.Error(w, 400, "ID required")
		return
	}
	if err := h.keySvc.Delete(r.Context(), u.ID, id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) RevokeKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	if id == "" {
		response.Error(w, 400, "ID required")
		return
	}
	if err := h.keySvc.Revoke(r.Context(), u.ID, id); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"revoked": true})
}

func (h *Handler) UpdateKey(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	var req struct {
		Name                *string  `json:"name,omitempty"`
		AllowedModels       []string `json:"allowedModels,omitempty"`
		AllowedIPs          []string `json:"allowedIPs,omitempty"`
		MaxTokensPerRequest *int     `json:"maxTokensPerRequest,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if err := h.keySvc.Update(r.Context(), u.ID, id, req.Name, req.AllowedModels, req.AllowedIPs, req.MaxTokensPerRequest); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

// --- Credits & Budget ---

func (h *Handler) GetCredits(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	credits, err := h.creditSvc.GetBalance(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, credits)
}

func (h *Handler) PurchaseCredits(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req domain.PurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}

	if h.stripeSvc != nil && h.stripeSvc.IsConfigured() {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:3000"
		}
		successURL := origin + "/dashboard/billing?success=true"
		cancelURL := origin + "/dashboard/billing?canceled=true"
		checkoutURL, err := h.stripeSvc.CreateCheckoutSession(r.Context(), u.ID, req.Amount, successURL, cancelURL)
		if err != nil {
			response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
			return
		}
		response.OK(w, map[string]string{"checkoutUrl": checkoutURL})
		return
	}

	tx, err := h.creditSvc.Purchase(r.Context(), u.ID, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, tx)

	if h.webhookSvc != nil {
		h.webhookSvc.Dispatch(r.Context(), u.ID, webhook.Event{
			Type:      "credits.purchased",
			Timestamp: time.Now(),
			Payload: map[string]interface{}{
				"user_id":     u.ID,
				"amount":      req.Amount,
				"description": tx.Description,
				"balance":     tx.Amount,
			},
		})
	}
}

func (h *Handler) GetBudget(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	credits, err := h.creditSvc.GetBalance(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]interface{}{
		"daily_budget":   credits.DailyBudget,
		"monthly_budget": credits.MonthlyBudget,
		"daily_spent":    credits.DailySpent,
		"monthly_spent":  credits.MonthlySpent,
	})
}

func (h *Handler) SetBudget(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		DailyBudget   *int `json:"daily_budget"`
		MonthlyBudget *int `json:"monthly_budget"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if err := h.creditSvc.SetBudget(r.Context(), u.ID, req.DailyBudget, req.MonthlyBudget); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

// --- Transactions, Logs, Analytics ---

func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	txs, total, err := h.creditSvc.ListTransactions(r.Context(), u.ID, page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Paginated(w, txs, total, page, limit)
}

func (h *Handler) ListLogs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	logs, total, err := h.logSvc.ListLogs(r.Context(), u.ID, page, limit)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Paginated(w, logs, total, page, limit)
}

func (h *Handler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	data, err := h.analyticsSvc.UserAnalytics(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, data)
}

// --- Models & Chat Proxy ---

func (h *Handler) ListModels(w http.ResponseWriter, r *http.Request) {
	models, err := h.providerSvc.ListModels(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, models)
}

func (h *Handler) ChatProxy(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	var req domain.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if vErr := req.Validate(); vErr != nil {
		response.JSON(w, vErr.Status, response.Body{Success: false, Error: vErr.Message})
		return
	}

	if req.Model == "" {
		req.Model = h.providerSvc.DefaultModel()
	}

	if h.moderator != nil {
		for _, m := range req.Messages {
			if m.Content == "" {
				continue
			}
			modResult, modErr := h.moderator.Moderate(r.Context(), m.Content)
			if modErr == nil && modResult != nil && modResult.Flagged {
				logger.Warn("content_moderation_flagged", "user_id", u.ID, "categories", modResult.Categories, "score", modResult.Score)
				response.Error(w, 400, "Content flagged by moderation policy")
				return
			}
		}
	}

	if apiKey := middleware.GetAPIKey(r); apiKey != nil && apiKey.MaxTokensPerRequest > 0 {
		estInput, estOutput := h.providerSvc.EstimateTokens(req.Model, req.Messages)
		if estInput+estOutput > apiKey.MaxTokensPerRequest {
			response.Error(w, 429, "estimated tokens exceed max allowed per request for this API key")
			return
		}
	}

	estInput, estOutput := h.providerSvc.EstimateTokens(req.Model, req.Messages)
	estimatedCost := (estInput + estOutput) * 2
	if estimatedCost < 100 {
		estimatedCost = 100
	}
	if err := h.creditSvc.CheckBalance(r.Context(), u.ID, estimatedCost); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}

	span := middleware.StartSpan(r.Context(), "chat_proxy")
	span.SetTag("user_id", u.ID)
	span.SetTag("model", req.Model)
	defer span.Finish()

	start := time.Now()
	ch, err := h.providerSvc.ChatStream(r.Context(), req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	var outputTokens int
	var outputBuf strings.Builder
	flusher, ok := w.(http.Flusher)
	done := r.Context().Done()

	for {
		select {
		case chunk, more := <-ch:
			if !more {
				goto FINISH
			}
			if chunk.Delta.Content != "" {
				outputBuf.WriteString(chunk.Delta.Content)
				outputTokens += llm.EstimateTokens(chunk.Delta.Content)
				data, _ := json.Marshal(map[string]interface{}{
					"choices": []map[string]interface{}{{
						"delta": map[string]string{"content": chunk.Delta.Content},
					}},
				})
				fmt.Fprintf(w, "data: %s\n\n", string(data))
				if ok {
					flusher.Flush()
				}
			}
			if chunk.FinishReason != nil {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				if ok {
					flusher.Flush()
				}
				goto FINISH
			}
		case <-done:
			goto FINISH
		}
	}

FINISH:
	// Estimate input tokens from request messages, not output buffer
	inputTokens := 0
	for _, m := range req.Messages {
		inputTokens += llm.EstimateTokens(m.Content)
	}
	if inputTokens == 0 {
		inputTokens = len(req.Messages) * 50
	}
	if outputTokens == 0 {
		outputTokens = inputTokens / 2
	}
	cost := h.calculateCost(req.Model, inputTokens, outputTokens)
	latency := int(time.Since(start).Milliseconds())

	apiKeyID := ""
	if k := middleware.GetAPIKey(r); k != nil {
		apiKeyID = k.ID
	}
	var akID *string
	if apiKeyID != "" {
		akID = &apiKeyID
	}
	userID := u.ID
	model := req.Model

	eg, ctx := errgroup.WithContext(context.Background())
	eg.Go(func() error {
		ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		if _, logErr := h.creditSvc.LogAndDeduct(ctx, userID, akID, model, inputTokens, outputTokens, cost, latency); logErr != nil {
			logger.Error("post_chat_billing_failed", "error", logErr.Error(), "user_id", userID)
		}
		return nil
	})
	eg.Go(func() error {
		if h.webhookSvc == nil {
			return nil
		}
		ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		h.webhookSvc.Dispatch(ctx, userID, webhook.Event{
			Type:      "request.completed",
			Timestamp: time.Now(),
			Payload: map[string]interface{}{
				"user_id":       userID,
				"model":         model,
				"input_tokens":  inputTokens,
				"output_tokens": outputTokens,
				"cost":          cost,
				"api_key_id":    apiKeyID,
			},
		})
		return nil
	})
	go eg.Wait()
}

