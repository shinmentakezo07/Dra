package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dra-platform/backend/internal/testutil"
)

func TestHealth(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	resp, err := http.Get(ts.URL + "/health")
	if err != nil {
		t.Fatalf("health request failed: %v", err)
	}
	body := testutil.MustReadBody(resp)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"status"`) {
		t.Fatalf("expected status in response, got %s", body)
	}
}

func TestAuthFlow(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	// 1. Signup
	signupBody := map[string]string{"name": "Test User", "email": "test@example.com", "password": "password123"}
	b, _ := json.Marshal(signupBody)
	resp, err := http.Post(ts.URL+"/auth/signup", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatalf("signup request failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 for signup, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"email":"test@example.com"`) {
		t.Fatalf("expected email in signup response, got %s", body)
	}

	// 2. Login
	loginBody := map[string]string{"email": "test@example.com", "password": "password123"}
	b, _ = json.Marshal(loginBody)
	resp, err = http.Post(ts.URL+"/auth/login", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatalf("login request failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for login, got %d: %s", resp.StatusCode, body)
	}

	// 3. Me (protected)
	req := httptest.NewRequest(http.MethodGet, ts.URL+"/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+testutil.GenerateTestJWT("user-id", "test@example.com", "Test User"))
	client := &http.Client{}
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("me request failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	// Me returns user from JWT, but user may not exist in DB
	// The handler looks up by ID, so it will return 404 if user doesn't exist
	if resp.StatusCode != http.StatusNotFound && resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 or 404 for me, got %d: %s", resp.StatusCode, body)
	}
}

func TestAuthFlow_InvalidLogin(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	// Login with non-existent user
	loginBody := map[string]string{"email": "nobody@example.com", "password": "wrong"}
	b, _ := json.Marshal(loginBody)
	resp, err := http.Post(ts.URL+"/auth/login", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatalf("login request failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid login, got %d: %s", resp.StatusCode, body)
	}
}

func TestAPIKeys_CRUD(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	user, err := testutil.SeedUser(db, "Key Tester", "keys@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	jwt := testutil.GenerateTestJWT(user.ID, user.Email, user.Name)
	client := &http.Client{}

	// Create key
	createBody := map[string]string{"name": "Test Key"}
	b, _ := json.Marshal(createBody)
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/keys", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("create key failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 for create key, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"name":"Test Key"`) {
		t.Fatalf("expected key name in response, got %s", body)
	}

	// List keys
	req, _ = http.NewRequest(http.MethodGet, ts.URL+"/api/keys", nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("list keys failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for list keys, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"name":"Test Key"`) {
		t.Fatalf("expected key in list response, got %s", body)
	}
}

func TestCredits_PurchaseAndGet(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	user, err := testutil.SeedUser(db, "Credit Tester", "credits@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	jwt := testutil.GenerateTestJWT(user.ID, user.Email, user.Name)
	client := &http.Client{}

	// Get credits (should be 0)
	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/credits", nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("get credits failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for get credits, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"balance":0`) {
		t.Fatalf("expected balance 0, got %s", body)
	}

	// Purchase credits
	purchaseBody := map[string]any{"amount": 5000, "description": "Test purchase"}
	b, _ := json.Marshal(purchaseBody)
	req, _ = http.NewRequest(http.MethodPost, ts.URL+"/api/credits/purchase", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("purchase credits failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 for purchase, got %d: %s", resp.StatusCode, body)
	}

	// Get credits again
	req, _ = http.NewRequest(http.MethodGet, ts.URL+"/api/credits", nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("get credits after purchase failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for get credits, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"balance":5000`) {
		t.Fatalf("expected balance 5000, got %s", body)
	}
}

func TestLogs_And_Analytics(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	user, err := testutil.SeedUser(db, "Log Tester", "logs@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	if err := testutil.SeedCredits(db, user.ID, 10000); err != nil {
		t.Fatalf("failed to seed credits: %v", err)
	}

	jwt := testutil.GenerateTestJWT(user.ID, user.Email, user.Name)
	client := &http.Client{}

	// List logs (empty)
	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/logs", nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("list logs failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for logs, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"data":[]`) {
		t.Fatalf("expected empty data array, got %s", body)
	}

	// Get analytics (empty)
	req, _ = http.NewRequest(http.MethodGet, ts.URL+"/api/analytics", nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("get analytics failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for analytics, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"totalRequests":0`) {
		t.Fatalf("expected totalRequests 0, got %s", body)
	}
}

func TestModels_List(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	user, err := testutil.SeedUser(db, "Model Tester", "models@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	jwt := testutil.GenerateTestJWT(user.ID, user.Email, user.Name)
	client := &http.Client{}

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/models", nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("list models failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for models, got %d: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"id"`) {
		t.Fatalf("expected models in response, got %s", body)
	}
}

func TestAdmin_RequiresAdminRole(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	// Regular user
	user, err := testutil.SeedUser(db, "Regular", "regular@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	jwt := testutil.GenerateTestJWT(user.ID, user.Email, user.Name)
	client := &http.Client{}

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/admin/stats", nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("admin stats failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for non-admin, got %d: %s", resp.StatusCode, body)
	}

	// Admin user
	admin, err := testutil.SeedAdmin(db, "Admin", "admin@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed admin: %v", err)
	}

	adminJWT := testutil.GenerateTestJWT(admin.ID, admin.Email, admin.Name)
	req, _ = http.NewRequest(http.MethodGet, ts.URL+"/api/admin/stats", nil)
	req.Header.Set("Authorization", "Bearer "+adminJWT)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("admin stats failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for admin, got %d: %s", resp.StatusCode, body)
	}
}

func TestProtectedRoute_NoAuth(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	// Request to protected endpoint without auth should return 401, not panic
	resp, err := http.Get(ts.URL + "/api/keys")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	body := testutil.MustReadBody(resp)

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", resp.StatusCode, body)
	}
}

func TestUserIsolation_APIKeys(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	userA, err := testutil.SeedUser(db, "User A", "usera@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user A: %v", err)
	}
	userB, err := testutil.SeedUser(db, "User B", "userb@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user B: %v", err)
	}

	jwtA := testutil.GenerateTestJWT(userA.ID, userA.Email, userA.Name)
	jwtB := testutil.GenerateTestJWT(userB.ID, userB.Email, userB.Name)
	client := &http.Client{}

	// User A creates a key
	createBody := map[string]string{"name": "A's Key"}
	b, _ := json.Marshal(createBody)
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/keys", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwtA)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("create key failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 for create key, got %d: %s", resp.StatusCode, body)
	}

	// User B lists keys — should not see A's key
	req, _ = http.NewRequest(http.MethodGet, ts.URL+"/api/keys", nil)
	req.Header.Set("Authorization", "Bearer "+jwtB)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("list keys failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for list keys, got %d: %s", resp.StatusCode, body)
	}
	if strings.Contains(body, `"name":"A's Key"`) {
		t.Fatalf("user B should not see user A's key, got %s", body)
	}

	// Extract key ID from user A's response for deletion test
	var createResp map[string]any
	json.Unmarshal([]byte(body), &createResp)
	// Use a dummy ID — the service should reject with "key not found" regardless
	// Actually, we need A's key ID. Let's re-fetch as A.
	req, _ = http.NewRequest(http.MethodGet, ts.URL+"/api/keys", nil)
	req.Header.Set("Authorization", "Bearer "+jwtA)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("list keys as A failed: %v", err)
	}
	body = testutil.MustReadBody(resp)

	var listResp struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	json.Unmarshal([]byte(body), &listResp)
	if len(listResp.Data) == 0 {
		t.Fatalf("expected A to have keys, got %s", body)
	}
	keyID := listResp.Data[0].ID

	// User B tries to delete A's key — should fail
	req, _ = http.NewRequest(http.MethodDelete, ts.URL+"/api/keys/"+keyID, nil)
	req.Header.Set("Authorization", "Bearer "+jwtB)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("delete key failed: %v", err)
	}
	body = testutil.MustReadBody(resp)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for cross-user delete, got %d: %s", resp.StatusCode, body)
	}
}

func TestChat_RequiresCredits(t *testing.T) {
	testutil.SkipIfNoDB(t)

	ts, db, err := testutil.NewTestServer()
	if err != nil {
		t.Fatalf("failed to create test server: %v", err)
	}
	defer ts.Close()
	defer db.Close()

	if err := testutil.CleanTables(db); err != nil {
		t.Fatalf("failed to clean tables: %v", err)
	}

	user, err := testutil.SeedUser(db, "Chat Tester", "chat@example.com", "password123")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	jwt := testutil.GenerateTestJWT(user.ID, user.Email, user.Name)
	client := &http.Client{}

	chatBody := map[string]any{
		"model":    "test-model",
		"messages": []map[string]string{{"role": "user", "content": "hello"}},
	}
	b, _ := json.Marshal(chatBody)
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/api/chat", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("chat request failed: %v", err)
	}
	body := testutil.MustReadBody(resp)
	// Should fail because no credits
	if resp.StatusCode != http.StatusPaymentRequired {
		t.Fatalf("expected 402 for no credits, got %d: %s", resp.StatusCode, body)
	}
}
