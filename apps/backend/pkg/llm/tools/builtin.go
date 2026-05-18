package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// NewCalculatorTool creates a calculator tool that evaluates arithmetic expressions.
func NewCalculatorTool() Tool {
	return Tool{
		Metadata: ToolMetadata{
			Name:        "calculator",
			Description: "Evaluate arithmetic expressions. Supports +, -, *, /, parentheses, and decimal numbers.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"expression": {
						"type": "string",
						"description": "The arithmetic expression to evaluate, e.g. '2 + 3 * 4'"
					}
				},
				"required": ["expression"]
			}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			var params struct {
				Expression string `json:"expression"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, err
			}
			if strings.TrimSpace(params.Expression) == "" {
				return nil, fmt.Errorf("expression is required")
			}
			result, err := evaluateExpression(params.Expression)
			if err != nil {
				return nil, err
			}
			return result, nil
		},
	}
}

// NewDateTimeTool creates a tool that returns the current date and time.
func NewDateTimeTool() Tool {
	return Tool{
		Metadata: ToolMetadata{
			Name:        "datetime",
			Description: "Get the current date and time in the specified format.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"format": {
						"type": "string",
						"description": "Date format: 'RFC3339', 'date' (YYYY-MM-DD), 'time' (HH:MM:SS), or 'datetime' (YYYY-MM-DD HH:MM:SS). Defaults to RFC3339."
					}
				}
			}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			var params struct {
				Format string `json:"format"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, err
			}
			now := time.Now()
			switch strings.ToLower(params.Format) {
			case "date":
				return now.Format("2006-01-02"), nil
			case "time":
				return now.Format("15:04:05"), nil
			case "datetime":
				return now.Format("2006-01-02 15:04:05"), nil
			default:
				return now.Format(time.RFC3339), nil
			}
		},
	}
}

// NewWebSearchTool creates a web search tool.
// Configure a search provider (e.g., SerpAPI) for real results.
func NewWebSearchTool() Tool {
	return Tool{
		Metadata: ToolMetadata{
			Name:        "web_search",
			Description: "Search the web for information. Configure a search provider (e.g., SerpAPI) for real results.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"query": {
						"type": "string",
						"description": "The search query"
					}
				},
				"required": ["query"]
			}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			var params struct {
				Query string `json:"query"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, err
			}
			if strings.TrimSpace(params.Query) == "" {
				return nil, fmt.Errorf("query is required")
			}
			return map[string]interface{}{
				"status":  "provider_not_configured",
				"message": "Web search requires a configured search provider. Set SERPAPI_KEY or similar environment variable.",
				"query":   params.Query,
			}, nil
		},
	}
}

// NewCodeExecutionTool creates a stub code execution tool.
func NewCodeExecutionTool() Tool {
	return Tool{
		Metadata: ToolMetadata{
			Name:        "code_execution",
			Description: "Execute code in a sandboxed environment. (Stub implementation - does not actually execute code)",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"language": {
						"type": "string",
						"description": "Programming language: go, python, javascript, etc."
					},
					"code": {
						"type": "string",
						"description": "The code to execute"
					}
				},
				"required": ["language", "code"]
			}`),
		},
		Handler: func(ctx context.Context, args json.RawMessage) (interface{}, error) {
			var params struct {
				Language string `json:"language"`
				Code     string `json:"code"`
			}
			if err := json.Unmarshal(args, &params); err != nil {
				return nil, err
			}
			if strings.TrimSpace(params.Code) == "" {
				return nil, fmt.Errorf("code is required")
			}
			return fmt.Sprintf("[code_execution stub] Language: %s\nCode:\n%s\n\nOutput: (not executed in stub mode)", params.Language, params.Code), nil
		},
	}
}

// RegisterBuiltins registers all built-in tools to the given registry.
func RegisterBuiltins(reg *Registry) {
	reg.Register(NewCalculatorTool())
	reg.Register(NewDateTimeTool())
	reg.Register(NewWebSearchTool())
	reg.Register(NewCodeExecutionTool())
}

// evaluateExpression parses and evaluates a simple arithmetic expression.
func evaluateExpression(expr string) (float64, error) {
	p := &exprParser{s: expr}
	return p.parse()
}

type exprParser struct {
	s string
	i int
}

func (p *exprParser) parse() (float64, error) {
	result, err := p.parseExpression()
	if err != nil {
		return 0, err
	}
	p.skipWhitespace()
	if p.i < len(p.s) {
		return 0, fmt.Errorf("unexpected character '%c' at position %d", p.s[p.i], p.i)
	}
	return result, nil
}

func (p *exprParser) parseExpression() (float64, error) {
	return p.parseAddSub()
}

func (p *exprParser) parseAddSub() (float64, error) {
	left, err := p.parseMulDiv()
	if err != nil {
		return 0, err
	}

	for {
		p.skipWhitespace()
		if p.i >= len(p.s) {
			break
		}
		op := p.s[p.i]
		if op != '+' && op != '-' {
			break
		}
		p.i++
		right, err := p.parseMulDiv()
		if err != nil {
			return 0, err
		}
		if op == '+' {
			left += right
		} else {
			left -= right
		}
	}
	return left, nil
}

func (p *exprParser) parseMulDiv() (float64, error) {
	left, err := p.parseUnary()
	if err != nil {
		return 0, err
	}

	for {
		p.skipWhitespace()
		if p.i >= len(p.s) {
			break
		}
		op := p.s[p.i]
		if op != '*' && op != '/' {
			break
		}
		p.i++
		right, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		if op == '*' {
			left *= right
		} else {
			if right == 0 {
				return 0, fmt.Errorf("division by zero")
			}
			left /= right
		}
	}
	return left, nil
}

func (p *exprParser) parseUnary() (float64, error) {
	p.skipWhitespace()
	if p.i < len(p.s) && p.s[p.i] == '-' {
		p.i++
		val, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		return -val, nil
	}
	return p.parsePrimary()
}

func (p *exprParser) parsePrimary() (float64, error) {
	p.skipWhitespace()
	if p.i >= len(p.s) {
		return 0, fmt.Errorf("unexpected end of expression")
	}

	if p.s[p.i] == '(' {
		p.i++
		val, err := p.parseExpression()
		if err != nil {
			return 0, err
		}
		p.skipWhitespace()
		if p.i >= len(p.s) || p.s[p.i] != ')' {
			return 0, fmt.Errorf("expected ')'")
		}
		p.i++
		return val, nil
	}

	return p.parseNumber()
}

func (p *exprParser) parseNumber() (float64, error) {
	p.skipWhitespace()
	start := p.i
	hasDot := false

	for p.i < len(p.s) && (unicode.IsDigit(rune(p.s[p.i])) || p.s[p.i] == '.') {
		if p.s[p.i] == '.' {
			if hasDot {
				return 0, fmt.Errorf("invalid number with multiple dots at position %d", p.i)
			}
			hasDot = true
		}
		p.i++
	}

	if start == p.i {
		return 0, fmt.Errorf("expected number at position %d, got '%c'", p.i, p.s[p.i])
	}

	numStr := p.s[start:p.i]
	val, err := strconv.ParseFloat(numStr, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid number %q: %w", numStr, err)
	}
	return val, nil
}

func (p *exprParser) skipWhitespace() {
	for p.i < len(p.s) && unicode.IsSpace(rune(p.s[p.i])) {
		p.i++
	}
}
