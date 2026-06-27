package thinking

import "fmt"

// ErrorCode represents the type of thinking configuration error.
type ErrorCode string

const (
	ErrInvalidSuffix       ErrorCode = "INVALID_SUFFIX"
	ErrUnknownLevel        ErrorCode = "UNKNOWN_LEVEL"
	ErrThinkingNotSupported ErrorCode = "THINKING_NOT_SUPPORTED"
	ErrLevelNotSupported   ErrorCode = "LEVEL_NOT_SUPPORTED"
	ErrBudgetOutOfRange    ErrorCode = "BUDGET_OUT_OF_RANGE"
)

// ThinkingError represents an error during thinking configuration processing.
type ThinkingError struct {
	Code    ErrorCode
	Message string
	Model   string
}

// Error implements the error interface.
func (e *ThinkingError) Error() string {
	return e.Message
}

// NewThinkingError creates a new ThinkingError.
func NewThinkingError(code ErrorCode, message string) *ThinkingError {
	return &ThinkingError{Code: code, Message: message}
}

// NewThinkingErrorWithModel creates a new ThinkingError with model context.
func NewThinkingErrorWithModel(code ErrorCode, message, model string) *ThinkingError {
	return &ThinkingError{Code: code, Message: message, Model: model}
}

// StatusCode returns HTTP 400 for thinking errors.
func (e *ThinkingError) StatusCode() int {
	return 400
}

func errBudgetOutOfRange(budget, min, max int) *ThinkingError {
	return NewThinkingError(ErrBudgetOutOfRange,
		fmt.Sprintf("budget %d out of range [%d,%d]", budget, min, max))
}

func errLevelNotSupported(level string, supported []string) *ThinkingError {
	return NewThinkingError(ErrLevelNotSupported,
		fmt.Sprintf("level %q not supported, valid levels: %v", level, supported))
}
