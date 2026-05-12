package embeddings

import "strings"

// splitModelID splits "provider/model-id" into [provider, model].
func splitModelID(id string) [2]string {
	parts := strings.SplitN(id, "/", 2)
	if len(parts) == 2 {
		return [2]string{parts[0], parts[1]}
	}
	return [2]string{"", id}
}

// EstimateTokens estimates token count for embedding inputs.
// Rough heuristic: 4 chars ≈ 1 token.
func EstimateTokens(text string) int {
	if text == "" {
		return 0
	}
	tokens := len([]rune(text)) / 4
	if tokens < 1 {
		return 1
	}
	return tokens
}

// EstimateRequestTokens estimates total tokens for an embedding request.
func EstimateRequestTokens(req *EmbeddingRequest) int {
	total := 0
	for _, input := range req.Input {
		total += EstimateTokens(input)
	}
	return total
}
