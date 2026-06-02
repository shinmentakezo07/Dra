package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"dra-platform/backend/pkg/llm/validator"
)

// ToolCall represents a single tool invocation request.
type ToolCall struct {
	ID        string
	Name      string
	Arguments json.RawMessage
}

// ToolResult represents the result of a tool execution.
type ToolResult struct {
	ID     string
	Result interface{}
	Error  error
}

// Executor runs tool handlers from a registry.
type Executor struct {
	registry *Registry
}

// NewExecutor creates a new tool executor.
func NewExecutor(registry *Registry) *Executor {
	return &Executor{registry: registry}
}

// Execute runs a single tool call with validation.
func (e *Executor) Execute(ctx context.Context, name string, arguments json.RawMessage) (interface{}, error) {
	tool, ok := e.registry.Get(name)
	if !ok {
		return nil, &ToolNotFoundError{ToolName: name}
	}

	if len(tool.Metadata.Parameters) > 0 {
		schema, err := parseSchema(tool.Metadata.Parameters)
		if err != nil {
			return nil, &ToolValidationError{
				ToolName: name,
				Message:  fmt.Sprintf("invalid parameter schema: %v", err),
			}
		}
		if errs := ValidateArguments(arguments, schema); len(errs) > 0 {
			return nil, &ToolValidationError{
				ToolName: name,
				Message:  formatValidationErrors(errs),
			}
		}
	}

	result, err := tool.Handler(ctx, arguments)
	if err != nil {
		return nil, &ToolExecutionError{ToolName: name, Cause: err}
	}
	return result, nil
}

// ExecuteParallel runs multiple tool calls concurrently.
func (e *Executor) ExecuteParallel(ctx context.Context, calls []ToolCall) []ToolResult {
	results := make([]ToolResult, len(calls))
	var wg sync.WaitGroup

	for i, call := range calls {
		wg.Add(1)
		go func(idx int, c ToolCall) {
			defer wg.Done()
			res, err := e.Execute(ctx, c.Name, c.Arguments)
			results[idx] = ToolResult{
				ID:     c.ID,
				Result: res,
				Error:  err,
			}
		}(i, call)
	}

	wg.Wait()
	return results
}

// ValidateArguments validates tool arguments against a JSON schema.
func ValidateArguments(arguments json.RawMessage, schema *validator.Schema) []error {
	if schema == nil {
		return nil
	}
	return validator.ValidateJSON(arguments, schema)
}

func parseSchema(params json.RawMessage) (*validator.Schema, error) {
	var schema validator.Schema
	if err := json.Unmarshal(params, &schema); err != nil {
		return nil, err
	}
	return &schema, nil
}

func formatValidationErrors(errs []error) string {
	var msgs []string
	for _, e := range errs {
		msgs = append(msgs, e.Error())
	}
	return strings.Join(msgs, "; ")
}
