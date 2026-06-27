package tools

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm/validator"
)

func TestExecutor_Execute_Success(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:        "echo",
			Description: "Echo back the input",
			Parameters:  json.RawMessage(`{"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			var params struct {
				Message string `json:"message"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, err
			}
			return params.Message, nil
		},
	})

	exec := NewExecutor(reg)
	ctx := context.Background()

	result, err := exec.Execute(ctx, "echo", json.RawMessage(`{"message":"hello"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "hello" {
		t.Errorf("got %v, want hello", result)
	}
}

func TestExecutor_Execute_NotFound(t *testing.T) {
	reg := NewRegistry()
	exec := NewExecutor(reg)
	ctx := context.Background()

	_, err := exec.Execute(ctx, "missing", json.RawMessage(`{}`))
	if err == nil {
		t.Fatal("expected error for missing tool")
	}

	var notFound *ToolNotFoundError
	if !errors.As(err, &notFound) {
		t.Errorf("expected ToolNotFoundError, got %T", err)
	}
}

func TestExecutor_Execute_HandlerError(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:       "fail",
			Parameters: json.RawMessage(`{"type":"object"}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			return nil, errors.New("always fails")
		},
	})

	exec := NewExecutor(reg)
	ctx := context.Background()

	_, err := exec.Execute(ctx, "fail", json.RawMessage(`{}`))
	if err == nil {
		t.Fatal("expected error")
	}

	var execErr *ToolExecutionError
	if !errors.As(err, &execErr) {
		t.Errorf("expected ToolExecutionError, got %T", err)
	}
}

func TestExecutor_Execute_ValidationFails(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:       "validated",
			Parameters: json.RawMessage(`{"type":"object","properties":{"count":{"type":"integer"}},"required":["count"]}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			return "ok", nil
		},
	})

	exec := NewExecutor(reg)
	ctx := context.Background()

	_, err := exec.Execute(ctx, "validated", json.RawMessage(`{"count":"not a number"}`))
	if err == nil {
		t.Fatal("expected validation error")
	}

	var valErr *ToolValidationError
	if !errors.As(err, &valErr) {
		t.Errorf("expected ToolValidationError, got %T", err)
	}
}

func TestExecutor_Execute_SkipValidation(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:       "no_schema",
			Parameters: nil,
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			return "ok", nil
		},
	})

	exec := NewExecutor(reg)
	ctx := context.Background()

	result, err := exec.Execute(ctx, "no_schema", json.RawMessage(`{}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "ok" {
		t.Errorf("got %v, want ok", result)
	}
}

func TestExecutor_Execute_Timeout(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:       "slow",
			Parameters: json.RawMessage(`{"type":"object"}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			select {
			case <-time.After(100 * time.Millisecond):
				return "done", nil
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		},
	})

	exec := NewExecutor(reg)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	_, err := exec.Execute(ctx, "slow", json.RawMessage(`{}`))
	if err == nil {
		t.Fatal("expected timeout error")
	}
}

func TestExecutor_ExecuteParallel(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:       "add",
			Parameters: json.RawMessage(`{"type":"object","properties":{"a":{"type":"number"},"b":{"type":"number"}},"required":["a","b"]}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			var params struct {
				A float64 `json:"a"`
				B float64 `json:"b"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, err
			}
			return params.A + params.B, nil
		},
	})

	exec := NewExecutor(reg)
	ctx := context.Background()

	calls := []ToolCall{
		{ID: "1", Name: "add", Arguments: json.RawMessage(`{"a":1,"b":2}`)},
		{ID: "2", Name: "add", Arguments: json.RawMessage(`{"a":3,"b":4}`)},
		{ID: "3", Name: "add", Arguments: json.RawMessage(`{"a":5,"b":6}`)},
	}

	results := exec.ExecuteParallel(ctx, calls)
	if len(results) != 3 {
		t.Fatalf("got %d results, want 3", len(results))
	}

	expected := map[string]float64{
		"1": 3,
		"2": 7,
		"3": 11,
	}

	for _, r := range results {
		want, ok := expected[r.ID]
		if !ok {
			t.Errorf("unexpected result id %s", r.ID)
			continue
		}
		if r.Error != nil {
			t.Errorf("result %s had error: %v", r.ID, r.Error)
			continue
		}
		if r.Result != want {
			t.Errorf("result %s: got %v, want %v", r.ID, r.Result, want)
		}
	}
}

func TestExecutor_ExecuteParallel_PartialFailure(t *testing.T) {
	reg := NewRegistry()
	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:       "maybe_fail",
			Parameters: json.RawMessage(`{"type":"object","properties":{"should_fail":{"type":"boolean"}},"required":["should_fail"]}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			var params struct {
				ShouldFail bool `json:"should_fail"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, err
			}
			if params.ShouldFail {
				return nil, errors.New("intentional failure")
			}
			return "success", nil
		},
	})

	exec := NewExecutor(reg)
	ctx := context.Background()

	calls := []ToolCall{
		{ID: "1", Name: "maybe_fail", Arguments: json.RawMessage(`{"should_fail":false}`)},
		{ID: "2", Name: "maybe_fail", Arguments: json.RawMessage(`{"should_fail":true}`)},
	}

	results := exec.ExecuteParallel(ctx, calls)
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2", len(results))
	}

	var successCount, failCount int
	for _, r := range results {
		if r.Error != nil {
			failCount++
		} else {
			successCount++
		}
	}

	if successCount != 1 {
		t.Errorf("got %d successes, want 1", successCount)
	}
	if failCount != 1 {
		t.Errorf("got %d failures, want 1", failCount)
	}
}

func TestExecutor_ExecuteParallel_UnknownTool(t *testing.T) {
	reg := NewRegistry()
	exec := NewExecutor(reg)
	ctx := context.Background()

	calls := []ToolCall{
		{ID: "1", Name: "missing", Arguments: json.RawMessage(`{}`)},
	}

	results := exec.ExecuteParallel(ctx, calls)
	if len(results) != 1 {
		t.Fatalf("got %d results, want 1", len(results))
	}
	if results[0].Error == nil {
		t.Error("expected error for unknown tool")
	}
}

func TestValidateArguments_Valid(t *testing.T) {
	schema := &validator.Schema{
		Type: validator.TypeObject,
		Properties: map[string]*validator.Schema{
			"name": {Type: validator.TypeString},
		},
		Required: []string{"name"},
	}

	errs := ValidateArguments(json.RawMessage(`{"name":"test"}`), schema)
	if len(errs) > 0 {
		t.Errorf("expected no errors, got %v", errs)
	}
}

func TestValidateArguments_Invalid(t *testing.T) {
	schema := &validator.Schema{
		Type: validator.TypeObject,
		Properties: map[string]*validator.Schema{
			"count": {Type: validator.TypeInteger},
		},
		Required: []string{"count"},
	}

	errs := ValidateArguments(json.RawMessage(`{"count":"wrong"}`), schema)
	if len(errs) == 0 {
		t.Error("expected validation errors")
	}
}

func TestValidateArguments_NilSchema(t *testing.T) {
	errs := ValidateArguments(json.RawMessage(`{"anything":true}`), nil)
	if len(errs) > 0 {
		t.Errorf("expected no errors with nil schema, got %v", errs)
	}
}
