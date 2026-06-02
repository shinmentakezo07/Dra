package thinking

import "strings"

// levelToBudgetMap defines the standard Level -> Budget mapping.
var levelToBudgetMap = map[string]int{
	"none":    0,
	"auto":    -1,
	"minimal": 512,
	"low":     1024,
	"medium":  8192,
	"high":    24576,
	"xhigh":   32768,
	"max":     128000,
}

// Threshold constants for budget-to-level conversion.
const (
	ThresholdMinimal = 512
	ThresholdLow     = 1024
	ThresholdMedium  = 8192
	ThresholdHigh    = 24576
)

// ConvertLevelToBudget converts a thinking level to a budget value.
func ConvertLevelToBudget(level string) (int, bool) {
	budget, ok := levelToBudgetMap[strings.ToLower(level)]
	return budget, ok
}

// ConvertBudgetToLevel converts a budget value to the nearest thinking level.
func ConvertBudgetToLevel(budget int) (string, bool) {
	switch {
	case budget < -1:
		return "", false
	case budget == -1:
		return string(LevelAuto), true
	case budget == 0:
		return string(LevelNone), true
	case budget <= ThresholdMinimal:
		return string(LevelMinimal), true
	case budget <= ThresholdLow:
		return string(LevelLow), true
	case budget <= ThresholdMedium:
		return string(LevelMedium), true
	case budget <= ThresholdHigh:
		return string(LevelHigh), true
	default:
		return string(LevelXHigh), true
	}
}

// HasLevel reports whether the target level exists in the levels slice.
func HasLevel(levels []string, target string) bool {
	for _, level := range levels {
		if strings.EqualFold(strings.TrimSpace(level), target) {
			return true
		}
	}
	return false
}

// standardLevelOrder defines canonical ordering from lowest to highest.
var standardLevelOrder = []ThinkingLevel{LevelMinimal, LevelLow, LevelMedium, LevelHigh, LevelXHigh, LevelMax}

// ClampLevel clamps a level to the nearest supported level.
func ClampLevel(level ThinkingLevel, supported []string) ThinkingLevel {
	if len(supported) == 0 || HasLevel(supported, string(level)) {
		return level
	}

	pos := levelIndex(string(level))
	if pos == -1 {
		return level
	}

	bestIdx, bestDist := -1, len(standardLevelOrder)+1
	for _, s := range supported {
		if idx := levelIndex(strings.TrimSpace(s)); idx != -1 {
			if dist := abs(pos - idx); dist < bestDist || (dist == bestDist && idx < bestIdx) {
				bestIdx, bestDist = idx, dist
			}
		}
	}

	if bestIdx >= 0 {
		return standardLevelOrder[bestIdx]
	}
	return level
}

// ClampBudget clamps a budget to the model's supported range.
func ClampBudget(value int, support *ThinkingSupport) int {
	if support == nil {
		return value
	}
	if value == -1 {
		return value
	}
	min, max := support.Min, support.Max
	if min == 0 && max == 0 {
		return value
	}
	if value == 0 && !support.ZeroAllowed {
		return min
	}
	if value < min {
		if value == 0 && support.ZeroAllowed {
			return 0
		}
		return min
	}
	if value > max {
		return max
	}
	return value
}

func levelIndex(level string) int {
	for i, l := range standardLevelOrder {
		if strings.EqualFold(level, string(l)) {
			return i
		}
	}
	return -1
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
