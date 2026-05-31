package thinking

// AnthropicApplier applies thinking config to Anthropic-format request bodies.
type AnthropicApplier struct{}

func init() {
	RegisterProvider("anthropic", &AnthropicApplier{})
}

// Apply sets thinking config in the Anthropic request body.
func (a *AnthropicApplier) Apply(body map[string]interface{}, config ThinkingConfig, support *ThinkingSupport) (map[string]interface{}, error) {
	thinking := make(map[string]interface{})

	switch config.Mode {
	case ModeNone:
		thinking["type"] = "disabled"
	case ModeAuto:
		thinking["type"] = "enabled"
		thinking["budget_tokens"] = -1
	case ModeBudget:
		thinking["type"] = "enabled"
		thinking["budget_tokens"] = config.Budget
	case ModeLevel:
		// Anthropic uses budget_tokens, convert level to budget
		thinking["type"] = "enabled"
		if budget, ok := ConvertLevelToBudget(string(config.Level)); ok {
			thinking["budget_tokens"] = ClampBudget(budget, support)
		} else {
			thinking["budget_tokens"] = support.Min
		}
	}

	body["thinking"] = thinking
	return body, nil
}
