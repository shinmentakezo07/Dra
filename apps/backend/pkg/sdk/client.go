package sdk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Client is the DRA Platform API client.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	retries    int
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
			case <-time.After(time.Duration(attempt+1) * 500 * time.Millisecond):
			}
		}
	}
	return nil, fmt.Errorf("request failed after %d retries: %w", c.retries, lastErr)
}

func (c *Client) decodeJSON(resp *http.Response, v interface{}) error {
	defer resp.Body.Close()
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
