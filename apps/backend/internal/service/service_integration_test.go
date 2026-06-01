package service_test

import (
	"context"
	"testing"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/internal/service"
	"dra-platform/backend/internal/testutil"
)

func openTestDB(t *testing.T) *db.DB {
	t.Helper()
	testutil.SkipIfNoDB(t)

	database, err := testutil.NewTestDB()
	if err != nil {
		t.Fatalf("NewTestDB error: %v", err)
	}
	t.Cleanup(database.Close)
	return database
}

func TestUserService_Register(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	svc := service.NewUserService(userRepo, "test-secret")

	resp, appErr := svc.Register(ctx, domain.SignupRequest{
		Name: "Alice", Email: "alice@test.com", Password: "password123",
	})
	if appErr != nil {
		t.Fatalf("Register error: %v", appErr)
	}
	if resp.User.Name != "Alice" {
		t.Errorf("Name = %q, want Alice", resp.User.Name)
	}
	if resp.Token == "" {
		t.Error("expected token")
	}
	if resp.User.Password != nil {
		t.Error("password should be nil in response")
	}

	_, appErr = svc.Register(ctx, domain.SignupRequest{
		Name: "Bob", Email: "alice@test.com", Password: "password456",
	})
	if appErr == nil {
		t.Error("expected duplicate email error")
	}

	_, appErr = svc.Register(ctx, domain.SignupRequest{
		Name: "Bob", Email: "", Password: "password456",
	})
	if appErr == nil {
		t.Error("expected validation error for empty email")
	}
}

func TestUserService_Authenticate(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	svc := service.NewUserService(userRepo, "test-secret")

	_, _ = svc.Register(ctx, domain.SignupRequest{
		Name: "AuthUser", Email: "auth@test.com", Password: "secret123",
	})

	resp, appErr := svc.Authenticate(ctx, domain.LoginRequest{
		Email: "auth@test.com", Password: "secret123",
	})
	if appErr != nil {
		t.Fatalf("Authenticate error: %v", appErr)
	}
	if resp.User.Name != "AuthUser" {
		t.Errorf("Name = %q, want AuthUser", resp.User.Name)
	}
	if resp.Token == "" {
		t.Error("expected token")
	}

	_, appErr = svc.Authenticate(ctx, domain.LoginRequest{
		Email: "auth@test.com", Password: "wrongpassword",
	})
	if appErr == nil {
		t.Error("expected auth error for wrong password")
	}

	_, appErr = svc.Authenticate(ctx, domain.LoginRequest{
		Email: "nobody@test.com", Password: "password",
	})
	if appErr == nil {
		t.Error("expected auth error for nonexistent user")
	}
}

func TestUserService_GetByID(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	svc := service.NewUserService(userRepo, "test-secret")

	_, _ = svc.Register(ctx, domain.SignupRequest{
		Name: "GetUser", Email: "get@test.com", Password: "pass123",
	})

	users, _, _ := svc.List(ctx, 1, 10)
	if len(users) == 0 {
		t.Fatal("expected at least one user")
	}
	userID := users[0].ID

	user, appErr := svc.GetByID(ctx, userID)
	if appErr != nil {
		t.Fatalf("GetByID error: %v", appErr)
	}
	if user.Name != "GetUser" {
		t.Errorf("Name = %q, want GetUser", user.Name)
	}
	if user.Password != nil {
		t.Error("password should be nil")
	}

	_, appErr = svc.GetByID(ctx, "nonexistent-id")
	if appErr == nil {
		t.Error("expected user not found error")
	}
}

func TestUserService_UpdateProfile(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	svc := service.NewUserService(userRepo, "test-secret")

	_, _ = svc.Register(ctx, domain.SignupRequest{
		Name: "OldName", Email: "update@test.com", Password: "pass123",
	})

	users, _, _ := svc.List(ctx, 1, 10)
	userID := users[0].ID

	appErr := svc.UpdateProfile(ctx, userID, "NewName", "new@test.com")
	if appErr != nil {
		t.Fatalf("UpdateProfile error: %v", appErr)
	}

	user, _ := svc.GetByID(ctx, userID)
	if user.Name != "NewName" {
		t.Errorf("Name = %q, want NewName", user.Name)
	}
	if user.Email != "new@test.com" {
		t.Errorf("Email = %q, want new@test.com", user.Email)
	}
}

func TestUserService_ChangePassword(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	svc := service.NewUserService(userRepo, "test-secret")

	_, _ = svc.Register(ctx, domain.SignupRequest{
		Name: "ChangeUser", Email: "changepass@test.com", Password: "oldpass",
	})

	users, _, _ := svc.List(ctx, 1, 10)
	userID := users[0].ID

	appErr := svc.ChangePassword(ctx, userID, "wrongpass", "newpass")
	if appErr == nil {
		t.Error("expected error for wrong current password")
	}

	appErr = svc.ChangePassword(ctx, userID, "oldpass", "newpass123")
	if appErr != nil {
		t.Fatalf("ChangePassword error: %v", appErr)
	}

	_, appErr = svc.Authenticate(ctx, domain.LoginRequest{
		Email: "changepass@test.com", Password: "oldpass",
	})
	if appErr == nil {
		t.Error("old password should not work after change")
	}

	_, appErr = svc.Authenticate(ctx, domain.LoginRequest{
		Email: "changepass@test.com", Password: "newpass123",
	})
	if appErr != nil {
		t.Fatalf("new password should work: %v", appErr)
	}
}

func TestUserService_Delete(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	svc := service.NewUserService(userRepo, "test-secret")

	_, _ = svc.Register(ctx, domain.SignupRequest{
		Name: "DeleteUser", Email: "delete@test.com", Password: "pass123",
	})

	users, _, _ := svc.List(ctx, 1, 10)
	userID := users[0].ID

	appErr := svc.Delete(ctx, userID)
	if appErr != nil {
		t.Fatalf("Delete error: %v", appErr)
	}

	_, appErr = svc.GetByID(ctx, userID)
	if appErr == nil {
		t.Error("expected user not found after delete")
	}
}

func TestUserService_PasswordReset(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	svc := service.NewUserService(userRepo, "test-secret")

	_, _ = svc.Register(ctx, domain.SignupRequest{
		Name: "ResetUser", Email: "reset@test.com", Password: "pass123",
	})

	tokenStr, appErr := svc.RequestPasswordReset(ctx, "reset@test.com")
	if appErr != nil {
		t.Fatalf("RequestPasswordReset error: %v", appErr)
	}
	if tokenStr == "" {
		t.Error("expected reset token")
	}

	_, appErr = svc.RequestPasswordReset(ctx, "nobody@test.com")
	if appErr != nil {
		t.Errorf("should not error for nonexistent email: %v", appErr)
	}

	appErr = svc.ResetPassword(ctx, tokenStr, "newpass456")
	if appErr != nil {
		t.Fatalf("ResetPassword error: %v", appErr)
	}

	_, appErr = svc.Authenticate(ctx, domain.LoginRequest{
		Email: "reset@test.com", Password: "newpass456",
	})
	if appErr != nil {
		t.Fatalf("new password should work: %v", appErr)
	}

	appErr = svc.ResetPassword(ctx, tokenStr, "anotherpass")
	if appErr == nil {
		t.Error("should not be able to reuse token")
	}
}

func TestAPIKeyService(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	userSvc := service.NewUserService(userRepo, "test-secret")

	_, _ = userSvc.Register(ctx, domain.SignupRequest{
		Name: "KeyUser", Email: "keyuser@test.com", Password: "pass123",
	})

	users, _, _ := userSvc.List(ctx, 1, 10)
	userID := users[0].ID

	keyRepo := repository.NewAPIKeyRepo(testDB)
	keySvc := service.NewAPIKeyService(keyRepo)

	key, appErr := keySvc.Create(ctx, userID, domain.CreateKeyRequest{Name: "Test Key"})
	if appErr != nil {
		t.Fatalf("Create key error: %v", appErr)
	}
	if key.Name != "Test Key" {
		t.Errorf("Name = %q, want Test Key", key.Name)
	}
	if key.Key == "" {
		t.Error("expected raw key in response")
	}

	keys, appErr := keySvc.List(ctx, userID)
	if appErr != nil {
		t.Fatalf("List keys error: %v", appErr)
	}
	if len(keys) != 1 {
		t.Errorf("got %d keys, want 1", len(keys))
	}

	appErr = keySvc.Delete(ctx, userID, key.ID)
	if appErr != nil {
		t.Fatalf("Delete key error: %v", appErr)
	}

	key2, _ := keySvc.Create(ctx, userID, domain.CreateKeyRequest{Name: "Other Key"})
	appErr = keySvc.Delete(ctx, "wrong-user-id", key2.ID)
	if appErr == nil {
		t.Error("expected error when deleting other user's key")
	}

	key3, _ := keySvc.Create(ctx, userID, domain.CreateKeyRequest{Name: "Revoke Key"})
	appErr = keySvc.Revoke(ctx, userID, key3.ID)
	if appErr != nil {
		t.Fatalf("Revoke key error: %v", appErr)
	}
}

func TestWebhookService(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	userSvc := service.NewUserService(userRepo, "test-secret")

	_, _ = userSvc.Register(ctx, domain.SignupRequest{
		Name: "WebhookUser", Email: "webhook@test.com", Password: "pass123",
	})

	users, _, _ := userSvc.List(ctx, 1, 10)
	userID := users[0].ID

	webhookRepo := repository.NewWebhookRepo(testDB)
	webhookSvc := service.NewWebhookService(webhookRepo)

	wh, appErr := webhookSvc.Create(ctx, userID, domain.CreateWebhookRequest{
		URL:    "https://example.com/webhook",
		Events: []string{"chat.completed", "key.created"},
	})
	if appErr != nil {
		t.Fatalf("Create webhook error: %v", appErr)
	}
	if wh.URL != "https://example.com/webhook" {
		t.Errorf("URL = %q, want https://example.com/webhook", wh.URL)
	}
	if !wh.Active {
		t.Error("webhook should be active")
	}

	webhooks, appErr := webhookSvc.List(ctx, userID)
	if appErr != nil {
		t.Fatalf("List webhooks error: %v", appErr)
	}
	if len(webhooks) != 1 {
		t.Errorf("got %d webhooks, want 1", len(webhooks))
	}

	found, appErr := webhookSvc.Get(ctx, userID, wh.ID)
	if appErr != nil {
		t.Fatalf("Get error: %v", appErr)
	}
	if found.URL != wh.URL {
		t.Errorf("URL mismatch")
	}

	_, appErr = webhookSvc.Update(ctx, userID, wh.ID, domain.CreateWebhookRequest{
		URL:    "https://example.com/updated",
		Events: []string{"chat.completed"},
	})
	if appErr != nil {
		t.Fatalf("Update error: %v", appErr)
	}

	found, _ = webhookSvc.Get(ctx, userID, wh.ID)
	if found.URL != "https://example.com/updated" {
		t.Errorf("URL not updated")
	}

	appErr = webhookSvc.Delete(ctx, userID, wh.ID)
	if appErr != nil {
		t.Fatalf("Delete error: %v", appErr)
	}

	webhooks, _ = webhookSvc.List(ctx, userID)
	if len(webhooks) != 0 {
		t.Errorf("got %d webhooks after delete, want 0", len(webhooks))
	}
}

func TestLogService(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	userSvc := service.NewUserService(userRepo, "test-secret")

	_, _ = userSvc.Register(ctx, domain.SignupRequest{
		Name: "LogUser", Email: "log@test.com", Password: "pass123",
	})

	users, _, _ := userSvc.List(ctx, 1, 10)
	userID := users[0].ID

	logRepo := repository.NewLogRepo(testDB)
	logSvc := service.NewLogService(logRepo)

	logs, total, appErr := logSvc.ListLogs(ctx, userID, 1, 10)
	if appErr != nil {
		t.Fatalf("ListLogs error: %v", appErr)
	}
	if total != 0 {
		t.Errorf("total = %d, want 0", total)
	}
	if len(logs) != 0 {
		t.Errorf("got %d logs, want 0", len(logs))
	}
}

func TestOrganizationService(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	userSvc := service.NewUserService(userRepo, "test-secret")

	_, _ = userSvc.Register(ctx, domain.SignupRequest{
		Name: "OrgOwner", Email: "orgowner@test.com", Password: "pass123",
	})

	users, _, _ := userSvc.List(ctx, 1, 10)
	userID := users[0].ID

	orgRepo := repository.NewOrganizationRepo(testDB)
	orgSvc := service.NewOrganizationService(orgRepo, userRepo)

	org, appErr := orgSvc.Create(ctx, userID, domain.CreateOrgRequest{Name: "Acme Corp"})
	if appErr != nil {
		t.Fatalf("Create org error: %v", appErr)
	}
	if org.Name != "Acme Corp" {
		t.Errorf("Name = %q, want Acme Corp", org.Name)
	}

	orgs, appErr := orgSvc.List(ctx, userID)
	if appErr != nil {
		t.Fatalf("List error: %v", appErr)
	}
	if len(orgs) != 1 {
		t.Errorf("got %d orgs, want 1", len(orgs))
	}

	found, appErr := orgSvc.Get(ctx, userID, org.ID)
	if appErr != nil {
		t.Fatalf("Get error: %v", appErr)
	}
	if found.Name != "Acme Corp" {
		t.Errorf("Name = %q, want Acme Corp", found.Name)
	}
}

func TestPromptRepo(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	promptRepo := repository.NewPromptRepo(testDB)

	prompt, err := promptRepo.CreatePrompt(ctx, "Test Prompt", "Hello, {{name}}!", "gpt-4o", nil)
	if err != nil {
		t.Fatalf("CreatePrompt error: %v", err)
	}
	if prompt.Name != "Test Prompt" {
		t.Errorf("Name = %q, want Test Prompt", prompt.Name)
	}

	prompts, err := promptRepo.ListPrompts(ctx, 10, 0)
	if err != nil {
		t.Fatalf("ListPrompts error: %v", err)
	}
	if len(prompts) != 1 {
		t.Errorf("got %d prompts, want 1", len(prompts))
	}

	found, err := promptRepo.GetPrompt(ctx, "Test Prompt")
	if err != nil {
		t.Fatalf("GetPrompt error: %v", err)
	}
	if found.Template != "Hello, {{name}}!" {
		t.Errorf("Template = %q, want Hello, {{name}}!", found.Template)
	}

	err = promptRepo.DeletePrompt(ctx, "Test Prompt")
	if err != nil {
		t.Fatalf("DeletePrompt error: %v", err)
	}

	prompts, _ = promptRepo.ListPrompts(ctx, 10, 0)
	if len(prompts) != 0 {
		t.Errorf("got %d prompts after delete, want 0", len(prompts))
	}
}

func TestConversationRepo(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	userSvc := service.NewUserService(userRepo, "test-secret")

	_, _ = userSvc.Register(ctx, domain.SignupRequest{
		Name: "ConvUser", Email: "conv@test.com", Password: "pass123",
	})

	users, _, _ := userSvc.List(ctx, 1, 10)
	userID := users[0].ID

	convRepo := repository.NewConversationRepo(testDB)
	conv, err := convRepo.CreateConversation(ctx, userID, "Test Conversation", "gpt-4o")
	if err != nil {
		t.Fatalf("CreateConversation error: %v", err)
	}
	if conv.Title != "Test Conversation" {
		t.Errorf("Title = %q, want Test Conversation", conv.Title)
	}

	convs, err := convRepo.ListConversations(ctx, userID, 10, 0)
	if err != nil {
		t.Fatalf("ListConversations error: %v", err)
	}
	if len(convs) != 1 {
		t.Errorf("got %d conversations, want 1", len(convs))
	}

	_, err = convRepo.AddMessage(ctx, conv.ID, "user", "Hello!", 10, 5)
	if err != nil {
		t.Fatalf("AddMessage error: %v", err)
	}

	found, err := convRepo.GetConversation(ctx, conv.ID)
	if err != nil {
		t.Fatalf("GetConversation error: %v", err)
	}
	if found.Title != "Test Conversation" {
		t.Errorf("Title = %q, want Test Conversation", found.Title)
	}

	err = convRepo.DeleteConversation(ctx, userID, conv.ID)
	if err != nil {
		t.Fatalf("DeleteConversation error: %v", err)
	}

	convs, _ = convRepo.ListConversations(ctx, userID, 10, 0)
	if len(convs) != 0 {
		t.Errorf("got %d conversations after delete, want 0", len(convs))
	}
}

func TestBatchService(t *testing.T) {
	testDB := openTestDB(t)
	if err := testutil.CleanTables(testDB); err != nil {
		t.Fatalf("CleanTables error: %v", err)
	}

	ctx := context.Background()
	userRepo := repository.NewUserRepo(testDB)
	userSvc := service.NewUserService(userRepo, "test-secret")

	_, _ = userSvc.Register(ctx, domain.SignupRequest{
		Name: "BatchUser", Email: "batch@test.com", Password: "pass123",
	})

	users, _, _ := userSvc.List(ctx, 1, 10)
	userID := users[0].ID

	batchRepo := repository.NewBatchJobRepo(testDB)
	batchSvc := service.NewBatchService(batchRepo, nil)

	job, appErr := batchSvc.Submit(ctx, userID, nil)
	if appErr != nil {
		t.Fatalf("Submit error: %v", appErr)
	}
	if job.Status != "pending" {
		t.Errorf("Status = %q, want pending", job.Status)
	}

	found, appErr := batchSvc.Get(ctx, userID, job.ID)
	if appErr != nil {
		t.Fatalf("Get error: %v", appErr)
	}
	if found.ID != job.ID {
		t.Error("should find created job")
	}

	jobs, appErr := batchSvc.List(ctx, userID)
	if appErr != nil {
		t.Fatalf("List error: %v", appErr)
	}
	if len(jobs) != 1 {
		t.Errorf("got %d jobs, want 1", len(jobs))
	}
}

func TestSignupRequestValidation(t *testing.T) {
	tests := []struct {
		name    string
		req     domain.SignupRequest
		wantErr bool
	}{
		{"valid", domain.SignupRequest{Name: "Ab", Email: "a@b.com", Password: "Test1234"}, false},
		{"empty name", domain.SignupRequest{Name: "", Email: "a@b.com", Password: "Test1234"}, true},
		{"empty email", domain.SignupRequest{Name: "A", Email: "", Password: "Test1234"}, true},
		{"short password", domain.SignupRequest{Name: "A", Email: "a@b.com", Password: "Ab1"}, true},
		{"invalid email", domain.SignupRequest{Name: "A", Email: "notanemail", Password: "Test1234"}, true},
		{"no uppercase", domain.SignupRequest{Name: "A", Email: "a@b.com", Password: "test1234"}, true},
		{"no digit", domain.SignupRequest{Name: "A", Email: "a@b.com", Password: "Testtest"}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestLoginRequestValidation(t *testing.T) {
	tests := []struct {
		name    string
		req     domain.LoginRequest
		wantErr bool
	}{
		{"valid", domain.LoginRequest{Email: "a@b.com", Password: "123456"}, false},
		{"empty email", domain.LoginRequest{Email: "", Password: "123456"}, true},
		{"empty password", domain.LoginRequest{Email: "a@b.com", Password: ""}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestCreateKeyRequestValidation(t *testing.T) {
	req := domain.CreateKeyRequest{Name: ""}
	if err := req.Validate(); err == nil {
		t.Error("expected validation error for empty name")
	}

	req = domain.CreateKeyRequest{Name: "Valid Key"}
	if err := req.Validate(); err != nil {
		t.Errorf("unexpected validation error: %v", err)
	}
}
