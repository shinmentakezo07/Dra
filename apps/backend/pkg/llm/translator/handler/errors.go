package handler

import "fmt"

// UnsupportedDirectionError is returned when no translator exists for a provider pair.
type UnsupportedDirectionError struct {
	From string
	To   string
}

func (e *UnsupportedDirectionError) Error() string {
	return fmt.Sprintf("unsupported translation direction: %s -> %s", e.From, e.To)
}

// TranslationError is returned when a translation operation fails.
type TranslationError struct {
	Direction string
	Message   string
}

func (e *TranslationError) Error() string {
	return fmt.Sprintf("translation failed for %s: %s", e.Direction, e.Message)
}
