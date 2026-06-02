package embeddings

import "errors"

var (
	ErrNoProvider      = errors.New("no provider specified in model")
	ErrProviderNotFound = errors.New("provider not found")
)
