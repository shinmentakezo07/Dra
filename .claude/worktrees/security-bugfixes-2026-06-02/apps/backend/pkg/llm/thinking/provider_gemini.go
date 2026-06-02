package thinking

// GeminiApplier applies thinking config to Gemini-format request bodies.
type GeminiApplier struct{}

func init() {
	RegisterProvider("gemini", &GeminiApplier{})
}

// Apply sets thinkingConfig in the Gemini request body.
func (a *GeminiApplier) Apply(body map[string]interface{}, config ThinkingConfig, support *ThinkingSupport) (map[string]interface{}, error) {
	genConfig, _ := body["generationConfig"].(map[string]interface{})
	if genConfig == nil {
		genConfig = make(map[string]interface{})
	}

	thinkingConfig := make(map[string]interface{})

	switch config.Mode {
	case ModeNone:
		thinkingConfig["thinkingBudget"] = 0
	case ModeAuto:
		thinkingConfig["thinkingBudget"] = -1
	case ModeBudget:
		thinkingConfig["thinkingBudget"] = config.Budget
	case ModeLevel:
		thinkingConfig["thinkingLevel"] = string(config.Level)
	}

	genConfig["thinkingConfig"] = thinkingConfig
	body["generationConfig"] = genConfig
	return body, nil
}
