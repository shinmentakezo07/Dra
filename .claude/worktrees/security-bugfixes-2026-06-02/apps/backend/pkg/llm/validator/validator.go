package validator

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// SchemaType represents a JSON Schema type.
type SchemaType string

const (
	TypeObject  SchemaType = "object"
	TypeArray   SchemaType = "array"
	TypeString  SchemaType = "string"
	TypeNumber  SchemaType = "number"
	TypeInteger SchemaType = "integer"
	TypeBoolean SchemaType = "boolean"
	TypeNull    SchemaType = "null"
)

// Schema is a lightweight JSON Schema representation.
type Schema struct {
	Type       SchemaType        `json:"type,omitempty"`
	Properties map[string]*Schema `json:"properties,omitempty"`
	Required   []string          `json:"required,omitempty"`
	Items      *Schema           `json:"items,omitempty"`
	Enum       []interface{}     `json:"enum,omitempty"`
	Pattern    string            `json:"pattern,omitempty"`
	MinLength  *int              `json:"minLength,omitempty"`
	MaxLength  *int              `json:"maxLength,omitempty"`
	Minimum    *float64          `json:"minimum,omitempty"`
	Maximum    *float64          `json:"maximum,omitempty"`
}

// ValidationError represents a schema validation error.
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *ValidationError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("%s: %s", e.Field, e.Message)
	}
	return e.Message
}

// ValidateJSON validates that data conforms to the given schema.
func ValidateJSON(data []byte, schema *Schema) []error {
	var value interface{}
	if err := json.Unmarshal(data, &value); err != nil {
		return []error{&ValidationError{Message: fmt.Sprintf("invalid JSON: %v", err)}}
	}
	return validateValue("", value, schema)
}

// ValidateString validates that a JSON string conforms to the given schema.
func ValidateString(data string, schema *Schema) []error {
	return ValidateJSON([]byte(data), schema)
}

func validateValue(path string, value interface{}, schema *Schema) []error {
	if schema == nil {
		return nil
	}

	var errors []error

	// Type validation
	if schema.Type != "" {
		if errs := validateType(path, value, schema.Type); len(errs) > 0 {
			errors = append(errors, errs...)
		}
	}

	// Enum validation
	if len(schema.Enum) > 0 {
		found := false
		for _, e := range schema.Enum {
			if fmt.Sprintf("%v", value) == fmt.Sprintf("%v", e) {
				found = true
				break
			}
		}
		if !found {
			errors = append(errors, &ValidationError{
				Field:   path,
				Message: fmt.Sprintf("value must be one of %v", schema.Enum),
			})
		}
	}

	switch v := value.(type) {
	case map[string]interface{}:
		errors = append(errors, validateObject(path, v, schema)...)
	case []interface{}:
		errors = append(errors, validateArray(path, v, schema)...)
	case string:
		errors = append(errors, validateString(path, v, schema)...)
	case float64:
		errors = append(errors, validateNumber(path, v, schema)...)
	}

	return errors
}

func validateType(path string, value interface{}, expected SchemaType) []error {
	var actual SchemaType
	switch value.(type) {
	case map[string]interface{}:
		actual = TypeObject
	case []interface{}:
		actual = TypeArray
	case string:
		actual = TypeString
	case float64:
		actual = TypeNumber
	case bool:
		actual = TypeBoolean
	case nil:
		actual = TypeNull
	default:
		actual = TypeString
	}

	if expected == TypeInteger && actual == TypeNumber {
		if v, ok := value.(float64); ok && v == float64(int64(v)) {
			return nil
		}
	}

	if actual != expected {
		return []error{&ValidationError{
			Field:   path,
			Message: fmt.Sprintf("expected type %s, got %s", expected, actual),
		}}
	}
	return nil
}

func validateObject(path string, obj map[string]interface{}, schema *Schema) []error {
	var errors []error

	// Required fields
	for _, req := range schema.Required {
		if _, ok := obj[req]; !ok {
			field := joinPath(path, req)
			errors = append(errors, &ValidationError{
				Field:   field,
				Message: "required field missing",
			})
		}
	}

	// Properties
	for key, val := range obj {
		if propSchema, ok := schema.Properties[key]; ok {
			field := joinPath(path, key)
			errors = append(errors, validateValue(field, val, propSchema)...)
		}
	}

	return errors
}

func validateArray(path string, arr []interface{}, schema *Schema) []error {
	var errors []error
	if schema.Items != nil {
		for i, item := range arr {
			field := fmt.Sprintf("%s[%d]", path, i)
			errors = append(errors, validateValue(field, item, schema.Items)...)
		}
	}
	return errors
}

func validateString(path string, s string, schema *Schema) []error {
	var errors []error
	if schema.MinLength != nil && len(s) < *schema.MinLength {
		errors = append(errors, &ValidationError{
			Field:   path,
			Message: fmt.Sprintf("string length %d is less than minimum %d", len(s), *schema.MinLength),
		})
	}
	if schema.MaxLength != nil && len(s) > *schema.MaxLength {
		errors = append(errors, &ValidationError{
			Field:   path,
			Message: fmt.Sprintf("string length %d exceeds maximum %d", len(s), *schema.MaxLength),
		})
	}
	if schema.Pattern != "" {
		re, err := regexp.Compile(schema.Pattern)
		if err == nil && !re.MatchString(s) {
			errors = append(errors, &ValidationError{
				Field:   path,
				Message: fmt.Sprintf("string does not match pattern %s", schema.Pattern),
			})
		}
	}
	return errors
}

func validateNumber(path string, n float64, schema *Schema) []error {
	var errors []error
	if schema.Minimum != nil && n < *schema.Minimum {
		errors = append(errors, &ValidationError{
			Field:   path,
			Message: fmt.Sprintf("value %v is less than minimum %v", n, *schema.Minimum),
		})
	}
	if schema.Maximum != nil && n > *schema.Maximum {
		errors = append(errors, &ValidationError{
			Field:   path,
			Message: fmt.Sprintf("value %v exceeds maximum %v", n, *schema.Maximum),
		})
	}
	return errors
}

func joinPath(base, field string) string {
	if base == "" {
		return field
	}
	return base + "." + field
}

// CorrectionPrompt generates a prompt asking the model to fix JSON output.
func CorrectionPrompt(content string, errs []error) string {
	var messages []string
	messages = append(messages, "The previous response did not match the required JSON schema.")
	messages = append(messages, "Please correct the output and ensure it is valid JSON.")
	messages = append(messages, "")
	messages = append(messages, "Validation errors:")
	for _, e := range errs {
		messages = append(messages, "- "+e.Error())
	}
	messages = append(messages, "")
	messages = append(messages, "Previous response:")
	messages = append(messages, content)
	return strings.Join(messages, "\n")
}
