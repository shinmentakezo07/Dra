package sdk

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Client is the DRA Platform API client.
type Client struct {
	baseURL       string
	apiKey        string
	httpClient    *http.Client
	retries       int
	lastRequestID string
	lastRateLimit RateLimitInfo
}

// Option configures a Client.
type Option func(*Client)

// WithBaseURL sets the API base URL.
func WithBaseURL(u string) Option {
	return func(c *Client) {
		c.baseURL = strings.TrimRight(u, "/")
	}
}

// WithAPIKey sets the API key for authentication.
func WithAPIKey(key string) Option {
	return func(c *Client) {
		c.apiKey = key
	}
}

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) {
		c.httpClient = hc
	}
}

// WithTimeout sets the request timeout.
func WithTimeout(d time.Duration) Option {
	return func(c *Client) {
		c.httpClient = &http.Client{Timeout: d}
	}
}

// WithRetries sets the number of retries for failed requests.
func WithRetries(n int) Option {
	return func(c *Client) {
		c.retries = n
	}
}

// New creates a new DRA Platform API client.
func New(opts ...Option) *Client {
	c := &Client{
		baseURL:    "",
		httpClient: &http.Client{Timeout: 30 * time.Second},
		retries:    2,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// LastRequestID returns the request ID from the most recent API response.
func (c *Client) LastRequestID() string {
	return c.lastRequestID
}

// LastRateLimit returns rate limit info from the most recent API response.
func (c *Client) LastRateLimit() RateLimitInfo {
	return c.lastRateLimit
}

func (c *Client) extractResponseHeaders(resp *http.Response) {
	c.lastRequestID = resp.Header.Get("X-Request-ID")
	if v := resp.Header.Get("X-RateLimit-Limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.lastRateLimit.Limit = n
		}
	}
	if v := resp.Header.Get("X-RateLimit-Remaining"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.lastRateLimit.Remaining = n
		}
	}
	if v := resp.Header.Get("X-RateLimit-Reset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.lastRateLimit.Reset = n
		}
	}
}

func (c *Client) headers() http.Header {
	h := make(http.Header)
	h.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		h.Set("X-Api-Key", c.apiKey)
	}
	return h
}

func (c *Client) doRequest(ctx context.Context, method, path string, body io.Reader, query url.Values) (*http.Response, error) {
	u, err := url.Parse(c.baseURL + path)
	if err != nil {
		return nil, fmt.Errorf("parse url: %w", err)
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header = c.headers()

	var lastErr error
	for attempt := 0; attempt <= c.retries; attempt++ {
		resp, err := c.httpClient.Do(req)
		if err == nil && resp.StatusCode < 500 {
			c.extractResponseHeaders(resp)
			return resp, nil
		}
		if err != nil {
			lastErr = err
		} else {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			lastErr = apiError(resp.StatusCode, string(body))
		}
		if attempt < c.retries {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(jitteredBackoff(attempt)):
			}
		}
	}
	return nil, fmt.Errorf("request failed after %d retries: %w", c.retries, lastErr)
}

func (c *Client) decodeJSON(resp *http.Response, v interface{}) error {
	defer resp.Body.Close()
	c.extractResponseHeaders(resp)
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return apiError(resp.StatusCode, string(body))
	}
	if v != nil {
		return json.NewDecoder(resp.Body).Decode(v)
	}
	return nil
}

func (c *Client) get(ctx context.Context, path string, query url.Values, v interface{}) error {
	resp, err := c.doRequest(ctx, "GET", path, nil, query)
	if err != nil {
		return err
	}
	return c.decodeJSON(resp, v)
}

func (c *Client) post(ctx context.Context, path string, body interface{}, v interface{}) error {
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	resp, err := c.doRequest(ctx, "POST", path, r, nil)
	if err != nil {
		return err
	}
	return c.decodeJSON(resp, v)
}

func (c *Client) put(ctx context.Context, path string, body interface{}, v interface{}) error {
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	resp, err := c.doRequest(ctx, "PUT", path, r, nil)
	if err != nil {
		return err
	}
	return c.decodeJSON(resp, v)
}

func (c *Client) delete(ctx context.Context, path string, v interface{}) error {
	resp, err := c.doRequest(ctx, "DELETE", path, nil, nil)
	if err != nil {
		return err
	}
	return c.decodeJSON(resp, v)
}

// jitteredBackoff returns a duration with jitter for retry backoff.
func jitteredBackoff(attempt int) time.Duration {
	base := time.Duration(attempt+1) * 500 * time.Millisecond
	n, _ := rand.Int(rand.Reader, big.NewInt(int64(base/2)))
	return base + time.Duration(n.Int64())
}

// doUpload sends a multipart/form-data POST request for file uploads.
func (c *Client) doUpload(ctx context.Context, path string, fileName string, fileReader io.Reader, extraFields map[string]string) (*http.Response, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)

	part, err := mw.CreateFormFile("file", fileName)
	if err != nil {
		return nil, fmt.Errorf("create form file: %w", err)
	}
	if _, err := io.Copy(part, fileReader); err != nil {
		return nil, fmt.Errorf("copy file: %w", err)
	}

	for k, v := range extraFields {
		if err := mw.WriteField(k, v); err != nil {
			return nil, fmt.Errorf("write field %s: %w", k, err)
		}
	}
	mw.Close()

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+path, &buf)
	if err != nil {
		return nil, fmt.Errorf("create upload request: %w", err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if c.apiKey != "" {
		req.Header.Set("X-Api-Key", c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upload request: %w", err)
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, apiError(resp.StatusCode, string(body))
	}
	c.extractResponseHeaders(resp)
	return resp, nil
}

func paginationQuery(page, limit int) url.Values {
	q := make(url.Values)
	if page > 0 {
		q.Set("page", strconv.Itoa(page))
	}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	return q
}

// Health

// HealthResponse is the response from the health endpoint.
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
}

// Health checks the API health.
func (c *Client) Health(ctx context.Context) (*HealthResponse, error) {
	var r envelope
	if err := c.get(ctx, "/health", nil, &r); err != nil {
		return nil, err
	}
	var hr HealthResponse
	if err := unmarshalData(r.Data, &hr); err != nil {
		return nil, err
	}
	return &hr, nil
}

// Auth

// AuthResponse is returned on successful login.
type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

// Signup creates a new user account.
func (c *Client) Signup(ctx context.Context, name, email, password string) (*User, error) {
	var r envelope
	if err := c.post(ctx, "/api/auth/signup", map[string]string{"name": name, "email": email, "password": password}, &r); err != nil {
		return nil, err
	}
	var u User
	if err := unmarshalData(r.Data, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

// Login authenticates a user and returns a token.
func (c *Client) Login(ctx context.Context, email, password string) (*AuthResponse, error) {
	var r envelope
	if err := c.post(ctx, "/api/auth/login", map[string]string{"email": email, "password": password}, &r); err != nil {
		return nil, err
	}
	var a AuthResponse
	if err := unmarshalData(r.Data, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

// Me returns the current authenticated user.
func (c *Client) Me(ctx context.Context) (*User, error) {
	var r envelope
	if err := c.get(ctx, "/api/auth/me", nil, &r); err != nil {
		return nil, err
	}
	var u User
	if err := unmarshalData(r.Data, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

// UpdateProfile updates the current user's profile.
func (c *Client) UpdateProfile(ctx context.Context, name, email string) error {
	return c.put(ctx, "/api/auth/profile", map[string]string{"name": name, "email": email}, nil)
}

// ChangePassword changes the current user's password.
func (c *Client) ChangePassword(ctx context.Context, currentPassword, newPassword string) error {
	return c.put(ctx, "/api/auth/password", map[string]string{"currentPassword": currentPassword, "newPassword": newPassword}, nil)
}

// API Keys

// ListKeys returns all API keys for the current user.
func (c *Client) ListKeys(ctx context.Context) ([]APIKey, error) {
	var r envelope
	if err := c.get(ctx, "/api/keys", nil, &r); err != nil {
		return nil, err
	}
	var keys []APIKey
	if err := unmarshalData(r.Data, &keys); err != nil {
		return nil, err
	}
	return keys, nil
}

// CreateKey creates a new API key.
func (c *Client) CreateKey(ctx context.Context, name string) (*APIKey, error) {
	var r envelope
	if err := c.post(ctx, "/api/keys", map[string]string{"name": name}, &r); err != nil {
		return nil, err
	}
	var k APIKey
	if err := unmarshalData(r.Data, &k); err != nil {
		return nil, err
	}
	return &k, nil
}

// DeleteKey permanently deletes an API key.
func (c *Client) DeleteKey(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/keys/"+id, nil)
}

// RevokeKey revokes an API key.
func (c *Client) RevokeKey(ctx context.Context, id string) error {
	return c.post(ctx, "/api/keys/"+id+"/revoke", nil, nil)
}

// Credits

// GetCredits returns the current user's credit balance.
func (c *Client) GetCredits(ctx context.Context) (*UserCredits, error) {
	var r envelope
	if err := c.get(ctx, "/api/credits", nil, &r); err != nil {
		return nil, err
	}
	var cr UserCredits
	if err := unmarshalData(r.Data, &cr); err != nil {
		return nil, err
	}
	return &cr, nil
}

// PurchaseCredits adds credits to the current user's account.
func (c *Client) PurchaseCredits(ctx context.Context, amount int, description string) (*CreditTransaction, error) {
	var r envelope
	body := map[string]interface{}{"amount": amount}
	if description != "" {
		body["description"] = description
	}
	if err := c.post(ctx, "/api/credits/purchase", body, &r); err != nil {
		return nil, err
	}
	var t CreditTransaction
	if err := unmarshalData(r.Data, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

// Transactions

// ListTransactions returns paginated credit transactions.
func (c *Client) ListTransactions(ctx context.Context, page, limit int) (*PaginatedResult[CreditTransaction], error) {
	var r envelope
	if err := c.get(ctx, "/api/transactions", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[CreditTransaction](&r)
}

// Logs

// ListLogs returns paginated API logs.
func (c *Client) ListLogs(ctx context.Context, page, limit int) (*PaginatedResult[APILog], error) {
	var r envelope
	if err := c.get(ctx, "/api/logs", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[APILog](&r)
}

// Analytics

// GetAnalytics returns user analytics.
func (c *Client) GetAnalytics(ctx context.Context) (*AnalyticsData, error) {
	var r envelope
	if err := c.get(ctx, "/api/analytics", nil, &r); err != nil {
		return nil, err
	}
	var a AnalyticsData
	if err := unmarshalData(r.Data, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

// Models

// ListModels returns available AI models.
func (c *Client) ListModels(ctx context.Context) ([]ModelInfo, error) {
	var r envelope
	if err := c.get(ctx, "/api/models", nil, &r); err != nil {
		return nil, err
	}
	var models []ModelInfo
	if err := unmarshalData(r.Data, &models); err != nil {
		return nil, err
	}
	return models, nil
}

// Chat

// Chat sends a chat completion request.
func (c *Client) Chat(ctx context.Context, model string, messages []ChatMessage) (*ChatCompletionChunk, error) {
	var r envelope
	body := map[string]interface{}{"model": model, "messages": messages}
	if err := c.post(ctx, "/api/chat", body, &r); err != nil {
		return nil, err
	}
	var cc ChatCompletionChunk
	if err := unmarshalData(r.Data, &cc); err != nil {
		return nil, err
	}
	return &cc, nil
}

// ChatStream sends a streaming chat request and yields content chunks.
func (c *Client) ChatStream(ctx context.Context, model string, messages []ChatMessage) (<-chan string, <-chan error) {
	contentCh := make(chan string, 64)
	errCh := make(chan error, 1)

	go func() {
		defer close(contentCh)
		defer close(errCh)

		body, _ := json.Marshal(map[string]interface{}{"model": model, "messages": messages})
		resp, err := c.doRequest(ctx, "POST", "/api/chat", bytes.NewReader(body), nil)
		if err != nil {
			errCh <- err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			b, _ := io.ReadAll(resp.Body)
			errCh <- apiError(resp.StatusCode, string(b))
			return
		}

		ReadSSE(resp.Body, func(line string) bool {
			if !strings.HasPrefix(line, "data: ") {
				return true
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				return false
			}
			var chunk ChatCompletionChunk
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				return true
			}
			if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
				select {
				case contentCh <- chunk.Choices[0].Delta.Content:
				case <-ctx.Done():
					return false
				}
			}
			return true
		})
	}()

	return contentCh, errCh
}

// Admin

// AdminListUsers returns paginated user list (admin only).
func (c *Client) AdminListUsers(ctx context.Context, page, limit int) (*PaginatedResult[User], error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/users", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[User](&r)
}

// AdminDeleteUser deletes a user (admin only).
func (c *Client) AdminDeleteUser(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/admin/users/"+id, nil)
}

// AdminStats returns platform statistics (admin only).
func (c *Client) AdminStats(ctx context.Context) (*PlatformStats, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/stats", nil, &r); err != nil {
		return nil, err
	}
	var s PlatformStats
	if err := unmarshalData(r.Data, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

// Auth — Extended

// OAuthLogin authenticates via OAuth (GitHub/Google).
func (c *Client) OAuthLogin(ctx context.Context, req OAuthRequest) (*OAuthResponse, error) {
	var r envelope
	if err := c.post(ctx, "/api/auth/oauth", req, &r); err != nil {
		return nil, err
	}
	var a OAuthResponse
	if err := unmarshalData(r.Data, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

// ForgotPassword requests a password reset email.
func (c *Client) ForgotPassword(ctx context.Context, email string) error {
	return c.post(ctx, "/api/auth/forgot-password", map[string]string{"email": email}, nil)
}

// ResetPassword resets the password using a reset token.
func (c *Client) ResetPassword(ctx context.Context, token, newPassword string) error {
	return c.post(ctx, "/api/auth/reset-password", map[string]string{"token": token, "newPassword": newPassword}, nil)
}

// Budget

// GetBudget returns the current user's budget configuration.
func (c *Client) GetBudget(ctx context.Context) (*BudgetConfig, error) {
	var r envelope
	if err := c.get(ctx, "/api/credits/budget", nil, &r); err != nil {
		return nil, err
	}
	var b BudgetConfig
	if err := unmarshalData(r.Data, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// SetBudget updates the current user's budget configuration.
func (c *Client) SetBudget(ctx context.Context, cfg BudgetConfig) (*BudgetConfig, error) {
	var r envelope
	if err := c.put(ctx, "/api/credits/budget", cfg, &r); err != nil {
		return nil, err
	}
	var b BudgetConfig
	if err := unmarshalData(r.Data, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// Conversations

// ListConversations returns paginated conversations.
func (c *Client) ListConversations(ctx context.Context, page, limit int) (*PaginatedResult[Conversation], error) {
	var r envelope
	if err := c.get(ctx, "/api/conversations", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[Conversation](&r)
}

// CreateConversation creates a new conversation.
func (c *Client) CreateConversation(ctx context.Context, title, model string) (*Conversation, error) {
	var r envelope
	if err := c.post(ctx, "/api/conversations", map[string]string{"title": title, "model": model}, &r); err != nil {
		return nil, err
	}
	var conv Conversation
	if err := unmarshalData(r.Data, &conv); err != nil {
		return nil, err
	}
	return &conv, nil
}

// GetConversation returns a conversation by ID.
func (c *Client) GetConversation(ctx context.Context, id string) (*Conversation, error) {
	var r envelope
	if err := c.get(ctx, "/api/conversations/"+id, nil, &r); err != nil {
		return nil, err
	}
	var conv Conversation
	if err := unmarshalData(r.Data, &conv); err != nil {
		return nil, err
	}
	return &conv, nil
}

// DeleteConversation deletes a conversation by ID.
func (c *Client) DeleteConversation(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/conversations/"+id, nil)
}

// AddMessage adds a message to a conversation.
func (c *Client) AddMessage(ctx context.Context, conversationID string, role, content string) (*ConversationMessage, error) {
	var r envelope
	if err := c.post(ctx, "/api/conversations/"+conversationID+"/messages", map[string]string{"role": role, "content": content}, &r); err != nil {
		return nil, err
	}
	var msg ConversationMessage
	if err := unmarshalData(r.Data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

// Prompts

// ListPrompts returns all prompts.
func (c *Client) ListPrompts(ctx context.Context) ([]Prompt, error) {
	var r envelope
	if err := c.get(ctx, "/api/prompts", nil, &r); err != nil {
		return nil, err
	}
	var prompts []Prompt
	if err := unmarshalData(r.Data, &prompts); err != nil {
		return nil, err
	}
	return prompts, nil
}

// CreatePrompt creates a new prompt.
func (c *Client) CreatePrompt(ctx context.Context, name, content, description string, template bool) (*Prompt, error) {
	var r envelope
	body := map[string]interface{}{
		"name":    name,
		"content": content,
	}
	if description != "" {
		body["description"] = description
	}
	body["template"] = template
	if err := c.post(ctx, "/api/prompts", body, &r); err != nil {
		return nil, err
	}
	var p Prompt
	if err := unmarshalData(r.Data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// GetPrompt returns a prompt by name.
func (c *Client) GetPrompt(ctx context.Context, name string) (*Prompt, error) {
	var r envelope
	if err := c.get(ctx, "/api/prompts/"+url.PathEscape(name), nil, &r); err != nil {
		return nil, err
	}
	var p Prompt
	if err := unmarshalData(r.Data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// RenderPrompt renders a prompt template with variables.
func (c *Client) RenderPrompt(ctx context.Context, name string, variables map[string]string) (*RenderResponse, error) {
	var r envelope
	if err := c.post(ctx, "/api/prompts/"+url.PathEscape(name)+"/render", map[string]interface{}{"variables": variables}, &r); err != nil {
		return nil, err
	}
	var rr RenderResponse
	if err := unmarshalData(r.Data, &rr); err != nil {
		return nil, err
	}
	return &rr, nil
}

// DeletePrompt deletes a prompt by name.
func (c *Client) DeletePrompt(ctx context.Context, name string) error {
	return c.delete(ctx, "/api/prompts/"+url.PathEscape(name), nil)
}

// Webhooks

// ListWebhooks returns all webhooks for the current user.
func (c *Client) ListWebhooks(ctx context.Context) ([]Webhook, error) {
	var r envelope
	if err := c.get(ctx, "/api/webhooks", nil, &r); err != nil {
		return nil, err
	}
	var webhooks []Webhook
	if err := unmarshalData(r.Data, &webhooks); err != nil {
		return nil, err
	}
	return webhooks, nil
}

// CreateWebhook creates a new webhook.
func (c *Client) CreateWebhook(ctx context.Context, name, url string, events []string) (*Webhook, error) {
	var r envelope
	if err := c.post(ctx, "/api/webhooks", map[string]interface{}{"name": name, "url": url, "events": events}, &r); err != nil {
		return nil, err
	}
	var w Webhook
	if err := unmarshalData(r.Data, &w); err != nil {
		return nil, err
	}
	return &w, nil
}

// GetWebhook returns a webhook by ID.
func (c *Client) GetWebhook(ctx context.Context, id string) (*Webhook, error) {
	var r envelope
	if err := c.get(ctx, "/api/webhooks/"+id, nil, &r); err != nil {
		return nil, err
	}
	var w Webhook
	if err := unmarshalData(r.Data, &w); err != nil {
		return nil, err
	}
	return &w, nil
}

// UpdateWebhook updates a webhook by ID.
func (c *Client) UpdateWebhook(ctx context.Context, id string, webhook Webhook) (*Webhook, error) {
	var r envelope
	if err := c.put(ctx, "/api/webhooks/"+id, webhook, &r); err != nil {
		return nil, err
	}
	var w Webhook
	if err := unmarshalData(r.Data, &w); err != nil {
		return nil, err
	}
	return &w, nil
}

// DeleteWebhook deletes a webhook by ID.
func (c *Client) DeleteWebhook(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/webhooks/"+id, nil)
}

// Organizations

// ListOrganizations returns all organizations for the current user.
func (c *Client) ListOrganizations(ctx context.Context) ([]Organization, error) {
	var r envelope
	if err := c.get(ctx, "/api/organizations", nil, &r); err != nil {
		return nil, err
	}
	var orgs []Organization
	if err := unmarshalData(r.Data, &orgs); err != nil {
		return nil, err
	}
	return orgs, nil
}

// CreateOrganization creates a new organization.
func (c *Client) CreateOrganization(ctx context.Context, name string) (*Organization, error) {
	var r envelope
	if err := c.post(ctx, "/api/organizations", map[string]string{"name": name}, &r); err != nil {
		return nil, err
	}
	var o Organization
	if err := unmarshalData(r.Data, &o); err != nil {
		return nil, err
	}
	return &o, nil
}

// GetOrganization returns an organization by ID.
func (c *Client) GetOrganization(ctx context.Context, id string) (*Organization, error) {
	var r envelope
	if err := c.get(ctx, "/api/organizations/"+id, nil, &r); err != nil {
		return nil, err
	}
	var o Organization
	if err := unmarshalData(r.Data, &o); err != nil {
		return nil, err
	}
	return &o, nil
}

// InviteMember invites a user to an organization.
func (c *Client) InviteMember(ctx context.Context, orgID, email, role string) error {
	return c.post(ctx, "/api/organizations/"+orgID+"/invite", map[string]string{"email": email, "role": role}, nil)
}

// RemoveMember removes a member from an organization.
func (c *Client) RemoveMember(ctx context.Context, orgID, userID string) error {
	return c.delete(ctx, "/api/organizations/"+orgID+"/members/"+userID, nil)
}

// ListMembers returns all members of an organization.
func (c *Client) ListMembers(ctx context.Context, orgID string) ([]OrgMember, error) {
	var r envelope
	if err := c.get(ctx, "/api/organizations/"+orgID+"/members", nil, &r); err != nil {
		return nil, err
	}
	var members []OrgMember
	if err := unmarshalData(r.Data, &members); err != nil {
		return nil, err
	}
	return members, nil
}

// AcceptInvite accepts an organization invitation.
func (c *Client) AcceptInvite(ctx context.Context, token string) error {
	return c.post(ctx, "/api/invites/accept", map[string]string{"token": token}, nil)
}

// Batch

// SubmitBatch submits a batch of chat requests.
func (c *Client) SubmitBatch(ctx context.Context, req BatchSubmitRequest) (*BatchJob, error) {
	var r envelope
	if err := c.post(ctx, "/api/batch", req, &r); err != nil {
		return nil, err
	}
	var b BatchJob
	if err := unmarshalData(r.Data, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// GetBatchJob returns a batch job by ID.
func (c *Client) GetBatchJob(ctx context.Context, id string) (*BatchJob, error) {
	var r envelope
	if err := c.get(ctx, "/api/batch/"+id, nil, &r); err != nil {
		return nil, err
	}
	var b BatchJob
	if err := unmarshalData(r.Data, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// Files

// UploadFile uploads a file using multipart/form-data.
func (c *Client) UploadFile(ctx context.Context, name string, content io.Reader) (*FileInfo, error) {
	resp, err := c.doUpload(ctx, "/api/files/upload", name, content, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read upload response: %w", err)
	}

	var r envelope
	if err := json.Unmarshal(body, &r); err != nil {
		return nil, fmt.Errorf("parse upload response: %w", err)
	}
	if !r.Success {
		return nil, apiError(resp.StatusCode, r.Error)
	}

	var f FileInfo
	if err := unmarshalData(r.Data, &f); err != nil {
		return nil, err
	}
	return &f, nil
}

// ListFiles returns all uploaded files for the current user.
func (c *Client) ListFiles(ctx context.Context) ([]FileInfo, error) {
	var r envelope
	if err := c.get(ctx, "/api/files", nil, &r); err != nil {
		return nil, err
	}
	var files []FileInfo
	if err := unmarshalData(r.Data, &files); err != nil {
		return nil, err
	}
	return files, nil
}

// Embeddings

// Embed generates embeddings for the given inputs.
func (c *Client) Embed(ctx context.Context, req EmbeddingRequest) (*EmbeddingResponse, error) {
	var r envelope
	if err := c.post(ctx, "/api/embeddings", req, &r); err != nil {
		return nil, err
	}
	var e EmbeddingResponse
	if err := unmarshalData(r.Data, &e); err != nil {
		return nil, err
	}
	return &e, nil
}

// Validate validates structured output against a schema.
func (c *Client) Validate(ctx context.Context, req ValidateRequest) (*ValidateResponse, error) {
	var r envelope
	if err := c.post(ctx, "/api/validate", req, &r); err != nil {
		return nil, err
	}
	var v ValidateResponse
	if err := unmarshalData(r.Data, &v); err != nil {
		return nil, err
	}
	return &v, nil
}

// Notifications

// NotificationsStream returns a channel of notification events via SSE.
func (c *Client) NotificationsStream(ctx context.Context) (<-chan NotificationEvent, <-chan error) {
	eventCh := make(chan NotificationEvent, 64)
	errCh := make(chan error, 1)

	go func() {
		defer close(eventCh)
		defer close(errCh)

		resp, err := c.doRequest(ctx, "GET", "/api/notifications/stream", nil, nil)
		if err != nil {
			errCh <- err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			b, _ := io.ReadAll(resp.Body)
			errCh <- apiError(resp.StatusCode, string(b))
			return
		}

		ReadSSE(resp.Body, func(line string) bool {
			if !strings.HasPrefix(line, "data: ") {
				return true
			}
			data := strings.TrimPrefix(line, "data: ")
			var event NotificationEvent
			if err := json.Unmarshal([]byte(data), &event); err != nil {
				return true
			}
			select {
			case eventCh <- event:
			case <-ctx.Done():
				return false
			}
			return true
		})
	}()

	return eventCh, errCh
}

// OpenAI-Compatible Proxy

// OpenAIChatCompletions calls the OpenAI-compatible chat completions endpoint.
func (c *Client) OpenAIChatCompletions(ctx context.Context, req json.RawMessage) (json.RawMessage, error) {
	var r envelope
	if err := c.post(ctx, "/v1/chat/completions", req, &r); err != nil {
		return nil, err
	}
	return r.Data, nil
}

// OpenAIEmbeddings calls the OpenAI-compatible embeddings endpoint.
func (c *Client) OpenAIEmbeddings(ctx context.Context, req json.RawMessage) (json.RawMessage, error) {
	var r envelope
	if err := c.post(ctx, "/v1/embeddings", req, &r); err != nil {
		return nil, err
	}
	return r.Data, nil
}

// OpenAIListModels calls the OpenAI-compatible models list endpoint.
func (c *Client) OpenAIListModels(ctx context.Context) (json.RawMessage, error) {
	var r envelope
	if err := c.get(ctx, "/v1/models", nil, &r); err != nil {
		return nil, err
	}
	return r.Data, nil
}

// Admin — Extended

// AdminCircuitBreakers returns circuit breaker status for all providers (admin only).
func (c *Client) AdminCircuitBreakers(ctx context.Context) ([]CircuitBreakerStatus, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/circuit-breakers", nil, &r); err != nil {
		return nil, err
	}
	var statuses []CircuitBreakerStatus
	if err := unmarshalData(r.Data, &statuses); err != nil {
		return nil, err
	}
	return statuses, nil
}

// AdminProviderHealth returns provider health status (admin only).
func (c *Client) AdminProviderHealth(ctx context.Context) ([]ProviderHealthStatus, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/provider-health", nil, &r); err != nil {
		return nil, err
	}
	var statuses []ProviderHealthStatus
	if err := unmarshalData(r.Data, &statuses); err != nil {
		return nil, err
	}
	return statuses, nil
}

// Public Health

// ProviderHealth returns a public summary of provider health.
func (c *Client) ProviderHealth(ctx context.Context) ([]ProviderSummary, error) {
	var r envelope
	if err := c.get(ctx, "/health/providers", nil, &r); err != nil {
		return nil, err
	}
	var summaries []ProviderSummary
	if err := unmarshalData(r.Data, &summaries); err != nil {
		return nil, err
	}
	return summaries, nil
}

// Budget Alerts & Caps

// ListBudgetAlerts returns all budget alerts for the current user.
func (c *Client) ListBudgetAlerts(ctx context.Context) ([]BudgetAlert, error) {
	var r envelope
	if err := c.get(ctx, "/api/budget/alerts", nil, &r); err != nil {
		return nil, err
	}
	var alerts []BudgetAlert
	if err := unmarshalData(r.Data, &alerts); err != nil {
		return nil, err
	}
	return alerts, nil
}

// CreateBudgetAlert creates a new budget alert.
func (c *Client) CreateBudgetAlert(ctx context.Context, thresholdPercent int, alertType string) (*BudgetAlert, error) {
	var r envelope
	body := map[string]interface{}{"thresholdPercent": thresholdPercent}
	if alertType != "" {
		body["alertType"] = alertType
	}
	if err := c.post(ctx, "/api/budget/alerts", body, &r); err != nil {
		return nil, err
	}
	var a BudgetAlert
	if err := unmarshalData(r.Data, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

// DeleteBudgetAlert deletes a budget alert.
func (c *Client) DeleteBudgetAlert(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/budget/alerts/"+id, nil)
}

// GetBudgetCap returns the current user's budget cap.
func (c *Client) GetBudgetCap(ctx context.Context) (*BudgetCap, error) {
	var r envelope
	if err := c.get(ctx, "/api/budget/cap", nil, &r); err != nil {
		return nil, err
	}
	var cap BudgetCap
	if err := unmarshalData(r.Data, &cap); err != nil {
		return nil, err
	}
	return &cap, nil
}

// CreateBudgetCap creates a new budget cap.
func (c *Client) CreateBudgetCap(ctx context.Context, hardLimit int, softLimit int, actionOnExceed string) (*BudgetCap, error) {
	var r envelope
	body := map[string]interface{}{"hardLimit": hardLimit}
	if softLimit > 0 {
		body["softLimit"] = softLimit
	}
	if actionOnExceed != "" {
		body["actionOnExceed"] = actionOnExceed
	}
	if err := c.post(ctx, "/api/budget/cap", body, &r); err != nil {
		return nil, err
	}
	var cap BudgetCap
	if err := unmarshalData(r.Data, &cap); err != nil {
		return nil, err
	}
	return &cap, nil
}

// UpdateBudgetCap updates the budget cap.
func (c *Client) UpdateBudgetCap(ctx context.Context, hardLimit int, softLimit int, actionOnExceed string) (*BudgetCap, error) {
	var r envelope
	body := map[string]interface{}{"hardLimit": hardLimit}
	if softLimit > 0 {
		body["softLimit"] = softLimit
	}
	if actionOnExceed != "" {
		body["actionOnExceed"] = actionOnExceed
	}
	if err := c.put(ctx, "/api/budget/cap", body, &r); err != nil {
		return nil, err
	}
	var cap BudgetCap
	if err := unmarshalData(r.Data, &cap); err != nil {
		return nil, err
	}
	return &cap, nil
}

// DeleteBudgetCap deletes the budget cap.
func (c *Client) DeleteBudgetCap(ctx context.Context) error {
	return c.delete(ctx, "/api/budget/cap", nil)
}

// Webhook Deliveries

// ListWebhookDeliveries returns delivery attempts for a webhook.
func (c *Client) ListWebhookDeliveries(ctx context.Context, webhookID string) ([]WebhookDelivery, error) {
	var r envelope
	if err := c.get(ctx, "/api/webhooks/"+webhookID+"/deliveries", nil, &r); err != nil {
		return nil, err
	}
	var deliveries []WebhookDelivery
	if err := unmarshalData(r.Data, &deliveries); err != nil {
		return nil, err
	}
	return deliveries, nil
}

// Comparisons

// ListComparisons returns paginated model comparisons.
func (c *Client) ListComparisons(ctx context.Context, page, limit int) (*PaginatedResult[Comparison], error) {
	var r envelope
	if err := c.get(ctx, "/api/comparisons", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[Comparison](&r)
}

// CreateComparison creates a new model comparison.
func (c *Client) CreateComparison(ctx context.Context, modelA, modelB, prompt string) (*Comparison, error) {
	var r envelope
	if err := c.post(ctx, "/api/comparisons", map[string]string{"modelA": modelA, "modelB": modelB, "prompt": prompt}, &r); err != nil {
		return nil, err
	}
	var comp Comparison
	if err := unmarshalData(r.Data, &comp); err != nil {
		return nil, err
	}
	return &comp, nil
}

// GetComparison returns a comparison by ID.
func (c *Client) GetComparison(ctx context.Context, id string) (*Comparison, error) {
	var r envelope
	if err := c.get(ctx, "/api/comparisons/"+id, nil, &r); err != nil {
		return nil, err
	}
	var comp Comparison
	if err := unmarshalData(r.Data, &comp); err != nil {
		return nil, err
	}
	return &comp, nil
}

// DeleteComparison deletes a comparison by ID.
func (c *Client) DeleteComparison(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/comparisons/"+id, nil)
}

// Fine-Tuning

// ListFineTuningJobs returns paginated fine-tuning jobs.
func (c *Client) ListFineTuningJobs(ctx context.Context, page, limit int) (*PaginatedResult[FineTuningJob], error) {
	var r envelope
	if err := c.get(ctx, "/api/fine-tuning/jobs", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[FineTuningJob](&r)
}

// GetFineTuningJob returns a fine-tuning job by ID.
func (c *Client) GetFineTuningJob(ctx context.Context, jobID string) (*FineTuningJob, error) {
	var r envelope
	if err := c.get(ctx, "/api/fine-tuning/jobs/"+jobID, nil, &r); err != nil {
		return nil, err
	}
	var job FineTuningJob
	if err := unmarshalData(r.Data, &job); err != nil {
		return nil, err
	}
	return &job, nil
}

// CreateFineTuningJob creates a new fine-tuning job.
func (c *Client) CreateFineTuningJob(ctx context.Context, baseModel, datasetID string, hyperparams interface{}) (*FineTuningJob, error) {
	var r envelope
	body := map[string]interface{}{"baseModel": baseModel, "datasetId": datasetID}
	if hyperparams != nil {
		body["hyperparams"] = hyperparams
	}
	if err := c.post(ctx, "/api/fine-tuning/jobs", body, &r); err != nil {
		return nil, err
	}
	var job FineTuningJob
	if err := unmarshalData(r.Data, &job); err != nil {
		return nil, err
	}
	return &job, nil
}

// ListFineTuningDatasets returns all fine-tuning datasets.
func (c *Client) ListFineTuningDatasets(ctx context.Context) ([]FineTuningDataset, error) {
	var r envelope
	if err := c.get(ctx, "/api/fine-tuning/datasets", nil, &r); err != nil {
		return nil, err
	}
	var datasets []FineTuningDataset
	if err := unmarshalData(r.Data, &datasets); err != nil {
		return nil, err
	}
	return datasets, nil
}

// CreateFineTuningDataset creates a new fine-tuning dataset.
func (c *Client) CreateFineTuningDataset(ctx context.Context, filename, format string) (*FineTuningDataset, error) {
	var r envelope
	if err := c.post(ctx, "/api/fine-tuning/datasets", map[string]string{"filename": filename, "format": format}, &r); err != nil {
		return nil, err
	}
	var ds FineTuningDataset
	if err := unmarshalData(r.Data, &ds); err != nil {
		return nil, err
	}
	return &ds, nil
}

// DeleteFineTuningDataset deletes a fine-tuning dataset.
func (c *Client) DeleteFineTuningDataset(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/fine-tuning/datasets/"+id, nil)
}

// Exports

// ListExportJobs returns paginated export jobs.
func (c *Client) ListExportJobs(ctx context.Context, page, limit int) (*PaginatedResult[ExportJob], error) {
	var r envelope
	if err := c.get(ctx, "/api/exports", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[ExportJob](&r)
}

// CreateExportJob creates a new export job.
func (c *Client) CreateExportJob(ctx context.Context, exportType, format, dateFrom, dateTo string) (*ExportJob, error) {
	var r envelope
	body := map[string]interface{}{"type": exportType, "format": format}
	if dateFrom != "" {
		body["dateFrom"] = dateFrom
	}
	if dateTo != "" {
		body["dateTo"] = dateTo
	}
	if err := c.post(ctx, "/api/exports", body, &r); err != nil {
		return nil, err
	}
	var job ExportJob
	if err := unmarshalData(r.Data, &job); err != nil {
		return nil, err
	}
	return &job, nil
}

// GetExportJob returns an export job by ID.
func (c *Client) GetExportJob(ctx context.Context, id string) (*ExportJob, error) {
	var r envelope
	if err := c.get(ctx, "/api/exports/"+id, nil, &r); err != nil {
		return nil, err
	}
	var job ExportJob
	if err := unmarshalData(r.Data, &job); err != nil {
		return nil, err
	}
	return &job, nil
}

// Promo Codes

// RedeemPromoCode redeems a promotional code.
func (c *Client) RedeemPromoCode(ctx context.Context, code string) (int, error) {
	var r envelope
	if err := c.post(ctx, "/api/promos/redeem", map[string]string{"code": code}, &r); err != nil {
		return 0, err
	}
	var result struct {
		Success bool `json:"success"`
		Credits int  `json:"credits"`
	}
	if err := unmarshalData(r.Data, &result); err != nil {
		return 0, err
	}
	return result.Credits, nil
}

// User Messages (Inbox)

// GetUserMessages returns messages for the current user.
func (c *Client) GetUserMessages(ctx context.Context) ([]UserMessage, error) {
	var r envelope
	if err := c.get(ctx, "/api/messages", nil, &r); err != nil {
		return nil, err
	}
	var msgs []UserMessage
	if err := unmarshalData(r.Data, &msgs); err != nil {
		return nil, err
	}
	return msgs, nil
}

// GetUserMessageUnreadCount returns the unread message count.
func (c *Client) GetUserMessageUnreadCount(ctx context.Context) (int, error) {
	var r envelope
	if err := c.get(ctx, "/api/messages/unread-count", nil, &r); err != nil {
		return 0, err
	}
	var result struct {
		Unread int `json:"unread"`
	}
	if err := unmarshalData(r.Data, &result); err != nil {
		return 0, err
	}
	return result.Unread, nil
}

// MarkMessageRead marks a message as read.
func (c *Client) MarkMessageRead(ctx context.Context, id string) error {
	return c.post(ctx, "/api/messages/"+id+"/read", nil, nil)
	
}

// MarkAllMessagesRead marks all messages as read.
func (c *Client) MarkAllMessagesRead(ctx context.Context) error {
	return c.post(ctx, "/api/messages/read-all", nil, nil)
	
}

// Files — Delete

// DeleteFile deletes an uploaded file by ID.
func (c *Client) DeleteFile(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/files/"+id, nil)
}

// Admin — Extended

// AdminDashboard returns dashboard statistics.
func (c *Client) AdminDashboard(ctx context.Context) (*PlatformStats, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/dashboard", nil, &r); err != nil {
		return nil, err
	}
	var s PlatformStats
	if err := unmarshalData(r.Data, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

// AdminGetUser returns a user by ID (admin only).
func (c *Client) AdminGetUser(ctx context.Context, id string) (*User, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/users/"+id, nil, &r); err != nil {
		return nil, err
	}
	var u User
	if err := unmarshalData(r.Data, &u); err != nil {
		return nil, err
	}
	return &u, nil
}

// AdminUpdateUserStatus updates a user's status (admin only).
func (c *Client) AdminUpdateUserStatus(ctx context.Context, id, status string) error {
	return c.put(ctx, "/api/admin/users/"+id+"/status", map[string]string{"status": status}, nil)
}

// AdminUpdateUserRole updates a user's role (admin only).
func (c *Client) AdminUpdateUserRole(ctx context.Context, id, role string) error {
	return c.put(ctx, "/api/admin/users/"+id+"/role", map[string]string{"role": role}, nil)
}

// AdminStartImpersonation starts impersonating a user (admin only).
func (c *Client) AdminStartImpersonation(ctx context.Context, id string) (string, error) {
	var r envelope
	if err := c.post(ctx, "/api/admin/users/"+id+"/impersonate", nil, &r); err != nil {
		return "", err
	}
	var result struct {
		Token string `json:"token"`
	}
	if err := unmarshalData(r.Data, &result); err != nil {
		return "", err
	}
	return result.Token, nil
}

// AdminStopImpersonation stops an impersonation session (admin only).
func (c *Client) AdminStopImpersonation(ctx context.Context, sessionID string) error {
	return c.post(ctx, "/api/admin/impersonations/"+sessionID+"/stop", nil, nil)
	
}

// AdminBulkSuspendUsers suspends multiple users (admin only).
func (c *Client) AdminBulkSuspendUsers(ctx context.Context, userIDs []string) (int, error) {
	var r envelope
	if err := c.post(ctx, "/api/admin/users/bulk/suspend", map[string]interface{}{"userIds": userIDs}, &r); err != nil {
		return 0, err
	}
	var result struct {
		Suspended int `json:"suspended"`
	}
	if err := unmarshalData(r.Data, &result); err != nil {
		return 0, err
	}
	return result.Suspended, nil
}

// AdminListUserKeys returns API keys for a specific user (admin only).
func (c *Client) AdminListUserKeys(ctx context.Context, userID string) ([]APIKey, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/users/"+userID+"/keys", nil, &r); err != nil {
		return nil, err
	}
	var keys []APIKey
	if err := unmarshalData(r.Data, &keys); err != nil {
		return nil, err
	}
	return keys, nil
}

// AdminListUserUsage returns usage data for a specific user (admin only).
func (c *Client) AdminListUserUsage(ctx context.Context, userID string) (*AnalyticsData, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/users/"+userID+"/usage", nil, &r); err != nil {
		return nil, err
	}
	var a AnalyticsData
	if err := unmarshalData(r.Data, &a); err != nil {
		return nil, err
	}
	return &a, nil
}

// AdminListProviders returns all providers (admin only).
func (c *Client) AdminListProviders(ctx context.Context) ([]ProviderSummary, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/providers", nil, &r); err != nil {
		return nil, err
	}
	var providers []ProviderSummary
	if err := unmarshalData(r.Data, &providers); err != nil {
		return nil, err
	}
	return providers, nil
}

// AdminCreateProvider creates a new provider (admin only).
func (c *Client) AdminCreateProvider(ctx context.Context, name, baseURL, apiKey string) (string, error) {
	var r envelope
	body := map[string]interface{}{"name": name, "baseUrl": baseURL}
	if apiKey != "" {
		body["apiKey"] = apiKey
	}
	if err := c.post(ctx, "/api/admin/providers", body, &r); err != nil {
		return "", err
	}
	var result struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := unmarshalData(r.Data, &result); err != nil {
		return "", err
	}
	return result.ID, nil
}

// AdminFetchModels fetches models from a provider (admin only).
func (c *Client) AdminFetchModels(ctx context.Context, baseURL, apiKey string) ([]ModelInfo, error) {
	var r envelope
	body := map[string]interface{}{"baseUrl": baseURL}
	if apiKey != "" {
		body["apiKey"] = apiKey
	}
	if err := c.post(ctx, "/api/admin/providers/fetch-models", body, &r); err != nil {
		return nil, err
	}
	var result struct {
		Models []ModelInfo `json:"models"`
		Total  int         `json:"total"`
	}
	if err := unmarshalData(r.Data, &result); err != nil {
		return nil, err
	}
	return result.Models, nil
}

// AdminAddProviderKey adds an API key to a provider (admin only).
func (c *Client) AdminAddProviderKey(ctx context.Context, providerID, label, key, strategy string, weight int) (string, error) {
	var r envelope
	body := map[string]interface{}{"label": label, "key": key}
	if strategy != "" {
		body["strategy"] = strategy
	}
	if weight > 0 {
		body["weight"] = weight
	}
	if err := c.post(ctx, "/api/admin/providers/"+providerID+"/keys", body, &r); err != nil {
		return "", err
	}
	var result struct {
		ID string `json:"id"`
	}
	if err := unmarshalData(r.Data, &result); err != nil {
		return "", err
	}
	return result.ID, nil
}

// Admin Messages

// AdminListMessages returns paginated admin messages.
func (c *Client) AdminListMessages(ctx context.Context, page, limit int) (*PaginatedResult[AdminMessage], error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/messages", paginationQuery(page, limit), &r); err != nil {
		return nil, err
	}
	return paginatedResult[AdminMessage](&r)
}

// AdminCreateMessage creates a new admin message.
func (c *Client) AdminCreateMessage(ctx context.Context, title, body, priority, targetType string, targetIDs []string, expiresAt string) (*AdminMessage, error) {
	var r envelope
	reqBody := map[string]interface{}{
		"title":      title,
		"body":       body,
		"targetType": targetType,
	}
	if priority != "" {
		reqBody["priority"] = priority
	}
	if len(targetIDs) > 0 {
		reqBody["targetIds"] = targetIDs
	}
	if expiresAt != "" {
		reqBody["expiresAt"] = expiresAt
	}
	if err := c.post(ctx, "/api/admin/messages", reqBody, &r); err != nil {
		return nil, err
	}
	var msg AdminMessage
	if err := unmarshalData(r.Data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

// AdminGetMessage returns an admin message by ID.
func (c *Client) AdminGetMessage(ctx context.Context, id string) (*AdminMessage, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/messages/"+id, nil, &r); err != nil {
		return nil, err
	}
	var msg AdminMessage
	if err := unmarshalData(r.Data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

// AdminGetMessageStats returns stats for an admin message.
func (c *Client) AdminGetMessageStats(ctx context.Context, id string) (*MessageStats, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/messages/"+id+"/stats", nil, &r); err != nil {
		return nil, err
	}
	var stats MessageStats
	if err := unmarshalData(r.Data, &stats); err != nil {
		return nil, err
	}
	return &stats, nil
}

// AdminDeleteMessage deletes an admin message.
func (c *Client) AdminDeleteMessage(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/admin/messages/"+id, nil)
}

// Admin Models

// AdminGetModel returns a model by ID (admin only).
func (c *Client) AdminGetModel(ctx context.Context, id string) (*ModelInfo, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/models/"+id, nil, &r); err != nil {
		return nil, err
	}
	var m ModelInfo
	if err := unmarshalData(r.Data, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// Admin Billing — Usage Daily

// AdminUsageDaily returns daily usage data (admin only).
func (c *Client) AdminUsageDaily(ctx context.Context, from, to, groupBy string) ([]map[string]interface{}, error) {
	q := make(url.Values)
	if from != "" {
		q.Set("from", from)
	}
	if to != "" {
		q.Set("to", to)
	}
	if groupBy != "" {
		q.Set("groupBy", groupBy)
	}
	var r envelope
	if err := c.get(ctx, "/api/admin/billing/usage-daily", q, &r); err != nil {
		return nil, err
	}
	var data []map[string]interface{}
	if err := unmarshalData(r.Data, &data); err != nil {
		return nil, err
	}
	return data, nil
}

// Admin Cost Breakdown

// AdminCostBreakdown returns a cost breakdown (admin only).
func (c *Client) AdminCostBreakdown(ctx context.Context) (*CostBreakdown, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/cost/breakdown", nil, &r); err != nil {
		return nil, err
	}
	var cb CostBreakdown
	if err := unmarshalData(r.Data, &cb); err != nil {
		return nil, err
	}
	return &cb, nil
}

// Admin Webhook Retry

// AdminRetryWebhook retries a failed webhook delivery (admin only).
func (c *Client) AdminRetryWebhook(ctx context.Context, id string) error {
	return c.post(ctx, "/api/admin/webhooks/"+id+"/retry", nil, nil)
	
}

// RBAC

// AdminListPermissions returns all RBAC permissions (admin only).
func (c *Client) AdminListPermissions(ctx context.Context) ([]RBACPermission, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/rbac/permissions", nil, &r); err != nil {
		return nil, err
	}
	var perms []RBACPermission
	if err := unmarshalData(r.Data, &perms); err != nil {
		return nil, err
	}
	return perms, nil
}

// AdminListRoles returns all RBAC roles (admin only).
func (c *Client) AdminListRoles(ctx context.Context) ([]RBACRole, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/rbac/roles", nil, &r); err != nil {
		return nil, err
	}
	var roles []RBACRole
	if err := unmarshalData(r.Data, &roles); err != nil {
		return nil, err
	}
	return roles, nil
}

// AdminGetRolePermissions returns permissions for a role (admin only).
func (c *Client) AdminGetRolePermissions(ctx context.Context, role string) ([]string, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/rbac/roles/"+role+"/permissions", nil, &r); err != nil {
		return nil, err
	}
	var perms []string
	if err := unmarshalData(r.Data, &perms); err != nil {
		return nil, err
	}
	return perms, nil
}

// AdminAddRolePermission adds a permission to a role (admin only).
func (c *Client) AdminAddRolePermission(ctx context.Context, role, permissionName string) error {
	return c.post(ctx, "/api/admin/rbac/roles/"+role+"/permissions", map[string]string{"permissionName": permissionName}, nil)
	
}

// AdminRemoveRolePermission removes a permission from a role (admin only).
func (c *Client) AdminRemoveRolePermission(ctx context.Context, role, permission string) error {
	return c.delete(ctx, "/api/admin/rbac/roles/"+role+"/permissions/"+permission, nil)
}

// Rate Limits

// AdminListTiers returns all rate limit tiers (admin only).
func (c *Client) AdminListTiers(ctx context.Context) ([]RateLimitTier, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/rate-limits/tiers", nil, &r); err != nil {
		return nil, err
	}
	var tiers []RateLimitTier
	if err := unmarshalData(r.Data, &tiers); err != nil {
		return nil, err
	}
	return tiers, nil
}

// AdminUpdateTierLimits updates rate limits for a tier (admin only).
func (c *Client) AdminUpdateTierLimits(ctx context.Context, tier string, rpm, daily, monthly, maxTokens int) error {
	return c.put(ctx, "/api/admin/rate-limits/tiers/"+tier, map[string]interface{}{
		"rpm":       rpm,
		"daily":     daily,
		"monthly":   monthly,
		"maxTokens": maxTokens,
	}, nil)
}

// AdminSetUserTier sets the rate limit tier for a user (admin only).
func (c *Client) AdminSetUserTier(ctx context.Context, userID, tier string) error {
	return c.put(ctx, "/api/admin/users/"+userID+"/tier", map[string]string{"tier": tier}, nil)
}

// Provider Plugins

// AdminListPlugins returns all provider plugins (admin only).
func (c *Client) AdminListPlugins(ctx context.Context) ([]ProviderPlugin, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/plugins", nil, &r); err != nil {
		return nil, err
	}
	var plugins []ProviderPlugin
	if err := unmarshalData(r.Data, &plugins); err != nil {
		return nil, err
	}
	return plugins, nil
}

// AdminCreatePlugin creates a new provider plugin (admin only).
func (c *Client) AdminCreatePlugin(ctx context.Context, plugin ProviderPlugin) (*ProviderPlugin, error) {
	var r envelope
	if err := c.post(ctx, "/api/admin/plugins", plugin, &r); err != nil {
		return nil, err
	}
	var p ProviderPlugin
	if err := unmarshalData(r.Data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// AdminGetPlugin returns a provider plugin by ID (admin only).
func (c *Client) AdminGetPlugin(ctx context.Context, id string) (*ProviderPlugin, error) {
	var r envelope
	if err := c.get(ctx, "/api/admin/plugins/"+id, nil, &r); err != nil {
		return nil, err
	}
	var p ProviderPlugin
	if err := unmarshalData(r.Data, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// AdminTogglePlugin toggles a provider plugin active state (admin only).
func (c *Client) AdminTogglePlugin(ctx context.Context, id string, active bool) error {
	return c.put(ctx, "/api/admin/plugins/"+id+"/toggle", map[string]bool{"active": active}, nil)
}

// AdminDeletePlugin deletes a provider plugin (admin only).
func (c *Client) AdminDeletePlugin(ctx context.Context, id string) error {
	return c.delete(ctx, "/api/admin/plugins/"+id, nil)
}
