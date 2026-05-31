package thinking

// OpenAIApplier applies thinking config to OpenAI-format request bodies.
type OpenAIApplier struct{}

func init() {
	RegisterProvider("openai", &OpenAIApplier{})
}

// Apply sets reasoning_effort in the OpenAI request body.
func (a *OpenAIApplier) Apply(body map[string]interface{}, config ThinkingConfig, support *ThinkingSupport) (map[string]interface{}, error) {
	switch config.Mode {
	case ModeNone:
		body["reasoning_effort"] = "none"
	case ModeAuto:
		body["reasoning_effort"] = "high"
	case ModeLevel:
		body["reasoning_effort"] = string(config.Level)
	case ModeBudget:
		// OpenAI doesn't support numeric budgets, convert to level
		level, ok := ConvertBudgetToLevel(config.Budget)
		if ok {
			body["reasoning_effort"] = level
		}
	}
	return body, nil
}
