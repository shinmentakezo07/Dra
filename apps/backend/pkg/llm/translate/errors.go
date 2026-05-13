package translate

import "fmt"

// ErrorKind classifies translation errors for caller handling.
type ErrorKind int

const (
	KindNilInput        ErrorKind = iota
	KindInvalidMessage
	KindInvalidContentBlock
	KindMissingRequired
	KindSchemaViolation
	KindConversionFailed
)

// Error represents a structured translation error.
type Error struct {
	Kind    ErrorKind
	Format  string // "anthropic", "openai"
	Message string
	Detail  string
}

func (e *Error) Error() string {
	if e.Detail != "" {
		return fmt.Sprintf("[%s] %s: %s", e.Format, e.Message, e.Detail)
	}
	return fmt.Sprintf("[%s] %s", e.Format, e.Message)
}

// NewError creates a translation error.
func NewError(kind ErrorKind, format, message, detail string) *Error {
	return &Error{Kind: kind, Format: format, Message: message, Detail: detail}
}

// ErrNilInput returns a standard nil input error for the given format.
func ErrNilInput(format string) *Error {
	return NewError(KindNilInput, format, "nil input", "received nil pointer in formatting function")
}

// ErrInvalidMessage returns an invalid message error.
func ErrInvalidMessage(format, detail string) *Error {
	return NewError(KindInvalidMessage, format, "invalid message", detail)
}

// ErrInvalidContentBlock returns an invalid content block error.
func ErrInvalidContentBlock(format, detail string) *Error {
	return NewError(KindInvalidContentBlock, format, "invalid content block", detail)
}

// ErrMissingRequired returns a missing required field error.
func ErrMissingRequired(format, field string) *Error {
	return NewError(KindMissingRequired, format, "missing required field", field)
}
