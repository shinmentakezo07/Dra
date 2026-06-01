package llm

import (
	"strings"
	"testing"
)

func TestCacheKey(t *testing.T) {
	req := &ChatRequest{
		Model: "gpt-4o",
		Messages: []Message{
			{Role: RoleUser, Content: "Hello"},
		},
	}
	key1 := CacheKey(req)
	key2 := CacheKey(req)
	if key1 != key2 {
		t.Error("CacheKey should be deterministic")
	}

	req2 := &ChatRequest{
		Model: "gpt-4o",
		Messages: []Message{
			{Role: RoleUser, Content: "World"},
		},
	}
	key3 := CacheKey(req2)
	if key1 == key3 {
		t.Error("CacheKey should differ for different requests")
	}
}

// TestCacheKey_TenantIsolation (C9) — identical prompts from different
// users MUST produce different cache keys. Without tenant identity in
// the hash, user B receives user A's cached response and A's quota is
// not decremented for B's request.
func TestCacheKey_TenantIsolation(t *testing.T) {
	reqA := &ChatRequest{
		Model:    "gpt-4o",
		Messages: []Message{{Role: RoleUser, Content: "2+2?"}},
		Metadata: map[string]string{"user_id": "u-1"},
	}
	reqB := &ChatRequest{
		Model:    "gpt-4o",
		Messages: []Message{{Role: RoleUser, Content: "2+2?"}},
		Metadata: map[string]string{"user_id": "u-2"},
	}
	if CacheKey(reqA) == CacheKey(reqB) {
		t.Error("cache key for different users must differ (cross-tenant isolation)")
	}
}

// TestCacheKey_VirtualKeyIsolation (C9) — different virtual API keys
// (e.g. multiple keys for the same user) must produce different cache
// entries so per-key quotas are not collapsed.
func TestCacheKey_VirtualKeyIsolation(t *testing.T) {
	reqA := &ChatRequest{
		Model:    "gpt-4o",
		Messages: []Message{{Role: RoleUser, Content: "2+2?"}},
		Metadata: map[string]string{"virtual_key_id": "vk-1"},
	}
	reqB := &ChatRequest{
		Model:    "gpt-4o",
		Messages: []Message{{Role: RoleUser, Content: "2+2?"}},
		Metadata: map[string]string{"virtual_key_id": "vk-2"},
	}
	if CacheKey(reqA) == CacheKey(reqB) {
		t.Error("cache key must differ across virtual keys")
	}
}

func TestEstimateTokens(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"", 0},
		{"Hello world", 3},
		{"This is a longer sentence with more words to estimate.", 12},
	}

	for _, tt := range tests {
		tokens := EstimateTokens(tt.input)
		if tokens < 0 {
			t.Errorf("EstimateTokens(%q) = %d, want >= 0", tt.input, tokens)
		}
	}
}

func TestValidateRequest(t *testing.T) {
	temp := 0.5
	req := &ChatRequest{
		Model:    "gpt-4o",
		Messages: []Message{{Role: RoleUser, Content: "Hi"}},
		Temperature: &temp,
	}
	if err := ValidateRequest(req); err != nil {
		t.Errorf("ValidateRequest failed: %v", err)
	}

	invalid := &ChatRequest{Model: "gpt-4o"}
	if err := ValidateRequest(invalid); err == nil {
		t.Error("ValidateRequest should fail for empty messages")
	}
}

func TestParseModelID(t *testing.T) {
	provider, model := ParseModelID("openai/gpt-4o")
	if provider != "openai" || model != "gpt-4o" {
		t.Errorf("ParseModelID(openai/gpt-4o) = %s, %s", provider, model)
	}

	provider, model = ParseModelID("gpt-4o")
	if provider != "" || model != "gpt-4o" {
		t.Errorf("ParseModelID(gpt-4o) = %s, %s", provider, model)
	}
}

func TestIsThinkingModel(t *testing.T) {
	if !IsThinkingModel("o1-preview") {
		t.Error("o1 should be a thinking model")
	}
	if !IsThinkingModel("claude-opus-4") {
		t.Error("claude-opus-4 should be a thinking model")
	}
	if IsThinkingModel("gpt-3.5-turbo") {
		t.Error("gpt-3.5 should not be a thinking model")
	}
}

func TestCost(t *testing.T) {
	c := Cost(1000, 500, 0.01, 0.03)
	if c <= 0 {
		t.Error("Cost should be positive")
	}
}

func TestEstimateMessageTokens(t *testing.T) {
	msgs := []Message{{Role: RoleUser, Content: "Hello world"}}
	n := EstimateMessageTokens(msgs)
	if n <= 0 {
		t.Errorf("got %d tokens, want > 0", n)
	}
}

func TestEstimateRequestTokens(t *testing.T) {
	req := &ChatRequest{
		System:   "be helpful",
		Messages: []Message{{Role: RoleUser, Content: "hi"}},
	}
	n := EstimateRequestTokens(req)
	if n <= 0 {
		t.Errorf("got %d tokens, want > 0", n)
	}
}

func TestIsWithinContextWindow(t *testing.T) {
	req := &ChatRequest{
		Messages: []Message{{Role: RoleUser, Content: "hi"}},
	}
	if !IsWithinContextWindow(req, 128000) {
		t.Error("short request should fit in context window")
	}

	long := strings.Repeat("word ", 50000)
	req2 := &ChatRequest{
		Messages:  []Message{{Role: RoleUser, Content: long}},
		MaxTokens: ptrInt(32000),
	}
	if IsWithinContextWindow(req2, 8000) {
		t.Error("long request should not fit in small context window")
	}
}

func TestClampTemperature(t *testing.T) {
	if ClampTemperature(-0.5) != 0 {
		t.Error("should clamp negative to 0")
	}
	if ClampTemperature(3.0) != 2 {
		t.Error("should clamp >2 to 2")
	}
	if ClampTemperature(0.7) != 0.7 {
		t.Error("should pass through valid value")
	}
}

func TestClampTopP(t *testing.T) {
	if ClampTopP(-0.1) != 0 {
		t.Error("should clamp negative to 0")
	}
	if ClampTopP(1.5) != 1 {
		t.Error("should clamp >1 to 1")
	}
	if ClampTopP(0.9) != 0.9 {
		t.Error("should pass through valid value")
	}
}

func TestDefaultMaxTokens(t *testing.T) {
	tests := []struct {
		model string
		want  int
	}{
		{"opus", 8192},
		{"sonnet", 8192},
		{"haiku", 4096},
		{"o1", 32768},
		{"o3", 32768},
		{"gpt-4", 8192},
		{"gpt-3.5", 4096},
		{"unknown", 4096},
	}
	for _, tt := range tests {
		if got := DefaultMaxTokens(tt.model); got != tt.want {
			t.Errorf("DefaultMaxTokens(%q) = %d, want %d", tt.model, got, tt.want)
		}
	}
}

func TestNormalizeModelName(t *testing.T) {
	if NormalizeModelName("Anthropic/Claude") != "claude" {
		t.Errorf("got %q", NormalizeModelName("Anthropic/Claude"))
	}
	if NormalizeModelName("OpenAI/GPT-4") != "gpt-4" {
		t.Errorf("got %q", NormalizeModelName("OpenAI/GPT-4"))
	}
}

func TestIsStreamingModel(t *testing.T) {
	if !IsStreamingModel("gpt-4") {
		t.Error("all models should support streaming")
	}
}

func TestIsVisionModel(t *testing.T) {
	if !IsVisionModel("gpt-4o") {
		t.Error("gpt-4o should be vision model")
	}
	if !IsVisionModel("claude-3-opus") {
		t.Error("claude-3 should be vision model")
	}
	if IsVisionModel("gpt-3.5-turbo") {
		t.Error("gpt-3.5 should not be vision model")
	}
}

func TestIsToolModel(t *testing.T) {
	if !IsToolModel("gpt-4") {
		t.Error("gpt-4 should support tools")
	}
	if IsToolModel("gpt-3.5-turbo-instruct") {
		t.Error("instruct should not support tools")
	}
	if IsToolModel("text-embedding-3") {
		t.Error("text- models should not support tools")
	}
}

func TestFormatMessagesForLog(t *testing.T) {
	msgs := []Message{
		{Role: RoleUser, Content: "hello"},
		{Role: RoleAssistant, Content: "hi there"},
	}
	log := FormatMessagesForLog(msgs)
	if !strings.Contains(log, "[user]") || !strings.Contains(log, "[assistant]") {
		t.Errorf("log = %q", log)
	}
}

func TestFormatMessagesForLog_Truncate(t *testing.T) {
	long := strings.Repeat("x", 200)
	msgs := []Message{{Role: RoleUser, Content: long}}
	log := FormatMessagesForLog(msgs)
	if len(log) > 150 {
		t.Errorf("log should be truncated, got %d chars", len(log))
	}
}

func TestTruncateMessages_KeepAll(t *testing.T) {
	msgs := []Message{{Role: RoleUser, Content: "short"}}
	result := TruncateMessages(msgs, 10000)
	if len(result) != 1 {
		t.Errorf("got %d messages, want 1", len(result))
	}
}

func TestTruncateMessages_Truncate(t *testing.T) {
	msgs := []Message{
		{Role: RoleSystem, Content: "system"},
		{Role: RoleUser, Content: strings.Repeat("word ", 500)},
		{Role: RoleUser, Content: "keep this"},
	}
	result := TruncateMessages(msgs, 100)
	if len(result) < 1 {
		t.Error("should keep at least some messages")
	}
}

func TestMergeContentBlocks(t *testing.T) {
	blocks := []ContentBlock{
		{Type: ContentTypeText, Text: "hello "},
		{Type: ContentTypeThinking, Thinking: "thinking..."},
	}
	got := MergeContentBlocks(blocks)
	want := "hello thinking..."
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestExtractThinking(t *testing.T) {
	blocks := []ContentBlock{
		{Type: ContentTypeText, Text: "visible"},
		{Type: ContentTypeThinking, Thinking: "reasoning"},
	}
	got := ExtractThinking(blocks)
	if got != "reasoning" {
		t.Errorf("got %q, want reasoning", got)
	}
}

func TestSanitizeContent(t *testing.T) {
	got := SanitizeContent("hello\x00world\x01")
	if strings.Contains(got, "\x00") || strings.Contains(got, "\x01") {
		t.Errorf("control chars not removed: %q", got)
	}
}

func TestValidateRequest_MissingModel(t *testing.T) {
	err := ValidateRequest(&ChatRequest{Messages: []Message{{Role: RoleUser, Content: "hi"}}})
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "model is required") {
		t.Errorf("error = %v", err)
	}
}

func TestValidateRequest_MissingRole(t *testing.T) {
	err := ValidateRequest(&ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "", Content: "hi"}}})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestValidateRequest_MissingContent(t *testing.T) {
	err := ValidateRequest(&ChatRequest{Model: "gpt-4", Messages: []Message{{Role: RoleUser, Content: ""}}})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestValidateRequest_ClampsValues(t *testing.T) {
	temp := 5.0
	topP := 2.0
	req := &ChatRequest{
		Model:       "gpt-4",
		Messages:    []Message{{Role: RoleUser, Content: "hi"}},
		Temperature: &temp,
		TopP:        &topP,
	}
	if err := ValidateRequest(req); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if *req.Temperature != 2.0 {
		t.Errorf("temperature = %f, want 2.0", *req.Temperature)
	}
	if *req.TopP != 1.0 {
		t.Errorf("topP = %f, want 1.0", *req.TopP)
	}
}

func TestBuildMessages(t *testing.T) {
	sys := BuildSystemMessage("be helpful")
	if sys.Role != RoleSystem || sys.Content != "be helpful" {
		t.Errorf("system msg = %+v", sys)
	}

	user := BuildUserMessage("hello")
	if user.Role != RoleUser || user.Content != "hello" {
		t.Errorf("user msg = %+v", user)
	}

	assistant := BuildAssistantMessage("hi")
	if assistant.Role != RoleAssistant || assistant.Content != "hi" {
		t.Errorf("assistant msg = %+v", assistant)
	}

	tool := BuildToolResultMessage("call-1", "result", false)
	if tool.Role != RoleTool || tool.ToolCallID != "call-1" {
		t.Errorf("tool msg = %+v", tool)
	}
}

func TestDeepCopyRequest_Nil(t *testing.T) {
	if DeepCopyRequest(nil) != nil {
		t.Error("nil should return nil")
	}
}

func TestDeepCopyRequest_Independent(t *testing.T) {
	temp := 0.7
	req := &ChatRequest{
		Model:       "gpt-4",
		Messages:    []Message{{Role: RoleUser, Content: "hi"}},
		Temperature: &temp,
		Tools:       []ToolDefinition{{Type: "function"}},
	}

	cpy := DeepCopyRequest(req)
	cpy.Model = "changed"
	cpy.Temperature = ptrFloat(0.1)

	if req.Model != "gpt-4" {
		t.Error("original was mutated")
	}
	if *req.Temperature != 0.7 {
		t.Error("original temperature was mutated")
	}
}

func ptrInt(v int) *int     { return &v }
func ptrFloat(v float64) *float64 { return &v }

