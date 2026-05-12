package tools

import "fmt"

// ToolNotFoundError is returned when a requested tool is not registered.
type ToolNotFoundError struct {
	ToolName string
}

func (e *ToolNotFoundError) Error() string {
	return fmt.Sprintf("tool not found: %s", e.ToolName)
}

// ToolExecutionError is returned when a tool handler fails.
type ToolExecutionError struct {
	ToolName string
	Cause    error
}

func (e *ToolExecutionError) Error() string {
	return fmt.Sprintf("tool execution failed for %s: %v", e.ToolName, e.Cause)
}

func (e *ToolExecutionError) Unwrap() error {
	return e.Cause
}

// ToolValidationError is returned when tool arguments fail validation.
type ToolValidationError struct {
	ToolName string
	Message  string
}

func (e *ToolValidationError) Error() string {
	return fmt.Sprintf("tool validation failed for %s: %s", e.ToolName, e.Message)
}

// ToolTimeoutError is returned when a tool execution exceeds its deadline.
type ToolTimeoutError struct {
	ToolName string
	Duration int
}

func (e *ToolTimeoutError) Error() string {
	return fmt.Sprintf("tool timeout for %s after %ds", e.ToolName, e.Duration)
}

// ErrMaxIterationsExceeded is returned when the tool conversation loop reaches its limit.
var ErrMaxIterationsExceeded = fmt.Errorf("max iterations exceeded")
