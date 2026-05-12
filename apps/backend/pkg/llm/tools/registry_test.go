package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
)

func TestRegistry_RegisterAndGet(t *testing.T) {
	reg := NewRegistry()

	tool := Tool{
		Metadata: ToolMetadata{
			Name:        "calculator",
			Description: "Perform arithmetic calculations",
			Parameters:  json.RawMessage(`{"type":"object","properties":{"expression":{"type":"string"}}}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			return "42", nil
		},
	}

	reg.Register(tool)

	got, ok := reg.Get("calculator")
	if !ok {
		t.Fatal("expected tool to be found")
	}
	if got.Metadata.Name != "calculator" {
		t.Errorf("got name %q, want calculator", got.Metadata.Name)
	}
	if got.Metadata.Description != "Perform arithmetic calculations" {
		t.Errorf("got description %q, want Perform arithmetic calculations", got.Metadata.Description)
	}
}

func TestRegistry_Get_NotFound(t *testing.T) {
	reg := NewRegistry()

	_, ok := reg.Get("nonexistent")
	if ok {
		t.Error("expected tool to not be found")
	}
}

func TestRegistry_List(t *testing.T) {
	reg := NewRegistry()

	reg.Register(Tool{
		Metadata: ToolMetadata{Name: "tool_a"},
		Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return nil, nil },
	})
	reg.Register(Tool{
		Metadata: ToolMetadata{Name: "tool_b"},
		Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return nil, nil },
	})

	tools := reg.List()
	if len(tools) != 2 {
		t.Fatalf("got %d tools, want 2", len(tools))
	}

	if tools[0].Metadata.Name != "tool_a" {
		t.Errorf("got first tool %q, want tool_a", tools[0].Metadata.Name)
	}
	if tools[1].Metadata.Name != "tool_b" {
		t.Errorf("got second tool %q, want tool_b", tools[1].Metadata.Name)
	}
}

func TestRegistry_List_Empty(t *testing.T) {
	reg := NewRegistry()

	tools := reg.List()
	if len(tools) != 0 {
		t.Errorf("got %d tools, want 0", len(tools))
	}
}

func TestRegistry_Remove(t *testing.T) {
	reg := NewRegistry()

	reg.Register(Tool{
		Metadata: ToolMetadata{Name: "temp"},
		Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return nil, nil },
	})

	_, ok := reg.Get("temp")
	if !ok {
		t.Fatal("expected tool to exist before removal")
	}

	reg.Remove("temp")

	_, ok = reg.Get("temp")
	if ok {
		t.Error("expected tool to be removed")
	}
}

func TestRegistry_Overwrite(t *testing.T) {
	reg := NewRegistry()

	reg.Register(Tool{
		Metadata: ToolMetadata{Name: "same", Description: "first"},
		Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return "first", nil },
	})

	reg.Register(Tool{
		Metadata: ToolMetadata{Name: "same", Description: "second"},
		Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return "second", nil },
	})

	got, ok := reg.Get("same")
	if !ok {
		t.Fatal("expected tool to be found")
	}
	if got.Metadata.Description != "second" {
		t.Errorf("got description %q, want second", got.Metadata.Description)
	}
}

func TestRegistry_ConcurrentAccess(t *testing.T) {
	reg := NewRegistry()

	for i := 0; i < 100; i++ {
		go func(n int) {
			reg.Register(Tool{
				Metadata: ToolMetadata{Name: fmt.Sprintf("tool_%d", n)},
				Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return nil, nil },
			})
		}(i)
	}

	for i := 0; i < 100; i++ {
		go func(n int) {
			reg.Get(fmt.Sprintf("tool_%d", n))
			reg.List()
		}(i)
	}
}

func TestRegistry_Exists(t *testing.T) {
	reg := NewRegistry()

	if reg.Exists("missing") {
		t.Error("expected Exists to return false for missing tool")
	}

	reg.Register(Tool{
		Metadata: ToolMetadata{Name: "present"},
		Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return nil, nil },
	})

	if !reg.Exists("present") {
		t.Error("expected Exists to return true for present tool")
	}
}

func TestRegistry_ToToolDefinitions(t *testing.T) {
	reg := NewRegistry()

	reg.Register(Tool{
		Metadata: ToolMetadata{
			Name:        "calc",
			Description: "Calculate",
			Parameters:  json.RawMessage(`{"type":"object"}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) { return nil, nil },
	})

	defs := reg.ToToolDefinitions()
	if len(defs) != 1 {
		t.Fatalf("got %d definitions, want 1", len(defs))
	}
	if defs[0].Function.Name != "calc" {
		t.Errorf("got name %q, want calc", defs[0].Function.Name)
	}
	if defs[0].Function.Description != "Calculate" {
		t.Errorf("got description %q, want Calculate", defs[0].Function.Description)
	}
}

func TestRegistry_Len(t *testing.T) {
	reg := NewRegistry()

	if reg.Len() != 0 {
		t.Errorf("got len %d, want 0", reg.Len())
	}

	reg.Register(Tool{
		Metadata: ToolMetadata{Name: "a"},
		Handler:  func(ctx context.Context, args json.RawMessage) (interface{}, error) { return nil, nil },
	})

	if reg.Len() != 1 {
		t.Errorf("got len %d, want 1", reg.Len())
	}
}

func TestToolNotFoundError_Error(t *testing.T) {
	err := &ToolNotFoundError{ToolName: "missing"}
	want := "tool not found: missing"
	if err.Error() != want {
		t.Errorf("got %q, want %q", err.Error(), want)
	}
}

func TestToolExecutionError_Error(t *testing.T) {
	inner := errors.New("division by zero")
	err := &ToolExecutionError{ToolName: "calc", Cause: inner}
	want := "tool execution failed for calc: division by zero"
	if err.Error() != want {
		t.Errorf("got %q, want %q", err.Error(), want)
	}
}

func TestToolValidationError_Error(t *testing.T) {
	err := &ToolValidationError{ToolName: "calc", Message: "missing required field 'expression'"}
	want := "tool validation failed for calc: missing required field 'expression'"
	if err.Error() != want {
		t.Errorf("got %q, want %q", err.Error(), want)
	}
}

func TestToolTimeoutError_Error(t *testing.T) {
	err := &ToolTimeoutError{ToolName: "slow", Duration: 5}
	want := "tool timeout for slow after 5s"
	if err.Error() != want {
		t.Errorf("got %q, want %q", err.Error(), want)
	}
}
