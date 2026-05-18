package tools

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestCalculatorTool(t *testing.T) {
	calc := NewCalculatorTool()
	ctx := context.Background()

	tests := []struct {
		name    string
		args    string
		want    float64
		wantErr bool
	}{
		{"addition", `{"expression":"2 + 3"}`, 5, false},
		{"subtraction", `{"expression":"10 - 4"}`, 6, false},
		{"multiplication", `{"expression":"3 * 4"}`, 12, false},
		{"division", `{"expression":"15 / 3"}`, 5, false},
		{"decimals", `{"expression":"1.5 + 2.5"}`, 4, false},
		{"parentheses", `{"expression":"(2 + 3) * 4"}`, 20, false},
		{"empty", `{"expression":""}`, 0, true},
		{"invalid", `{"expression":"2 + + 3"}`, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := calc.Handler(ctx, json.RawMessage(tt.args))
			if tt.wantErr {
				if err == nil {
					t.Error("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			got, ok := result.(float64)
			if !ok {
				t.Fatalf("expected float64, got %T", result)
			}
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculatorTool_Metadata(t *testing.T) {
	calc := NewCalculatorTool()
	if calc.Metadata.Name != "calculator" {
		t.Errorf("got name %q, want calculator", calc.Metadata.Name)
	}
	if calc.Metadata.Description == "" {
		t.Error("expected non-empty description")
	}
	if len(calc.Metadata.Parameters) == 0 {
		t.Error("expected parameters schema")
	}
}

func TestDateTimeTool(t *testing.T) {
	dt := NewDateTimeTool()
	ctx := context.Background()

	result, err := dt.Handler(ctx, json.RawMessage(`{"format":"RFC3339"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	str, ok := result.(string)
	if !ok {
		t.Fatalf("expected string, got %T", result)
	}
	if str == "" {
		t.Error("expected non-empty datetime string")
	}
}

func TestDateTimeTool_DefaultFormat(t *testing.T) {
	dt := NewDateTimeTool()
	ctx := context.Background()

	result, err := dt.Handler(ctx, json.RawMessage(`{}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	str, ok := result.(string)
	if !ok {
		t.Fatalf("expected string, got %T", result)
	}
	if str == "" {
		t.Error("expected non-empty datetime string")
	}
}

func TestWebSearchTool(t *testing.T) {
	ws := NewWebSearchTool()
	ctx := context.Background()

	result, err := ws.Handler(ctx, json.RawMessage(`{"query":"golang"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	m, ok := result.(map[string]interface{})
	if !ok {
		t.Fatalf("expected map, got %T", result)
	}
	if m["status"] != "provider_not_configured" {
		t.Errorf("expected status provider_not_configured, got %q", m["status"])
	}
	if m["query"] != "golang" {
		t.Errorf("expected query golang, got %q", m["query"])
	}
}

func TestWebSearchTool_RequiresQuery(t *testing.T) {
	ws := NewWebSearchTool()
	ctx := context.Background()

	_, err := ws.Handler(ctx, json.RawMessage(`{"query":""}`))
	if err == nil {
		t.Error("expected error for empty query")
	}
}

func TestCodeExecutionTool(t *testing.T) {
	ce := NewCodeExecutionTool()
	ctx := context.Background()

	result, err := ce.Handler(ctx, json.RawMessage(`{"language":"go","code":"fmt.Println(\"hello\")"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	str, ok := result.(string)
	if !ok {
		t.Fatalf("expected string, got %T", result)
	}
	if !strings.Contains(str, "stub") {
		t.Errorf("expected stub result, got %q", str)
	}
}

func TestCodeExecutionTool_RequiresCode(t *testing.T) {
	ce := NewCodeExecutionTool()
	ctx := context.Background()

	_, err := ce.Handler(ctx, json.RawMessage(`{"language":"go","code":""}`))
	if err == nil {
		t.Error("expected error for empty code")
	}
}

func TestRegisterBuiltins(t *testing.T) {
	reg := NewRegistry()
	RegisterBuiltins(reg)

	if !reg.Exists("calculator") {
		t.Error("expected calculator to be registered")
	}
	if !reg.Exists("datetime") {
		t.Error("expected datetime to be registered")
	}
	if !reg.Exists("web_search") {
		t.Error("expected web_search to be registered")
	}
	if !reg.Exists("code_execution") {
		t.Error("expected code_execution to be registered")
	}

	if reg.Len() != 4 {
		t.Errorf("got %d tools, want 4", reg.Len())
	}
}
