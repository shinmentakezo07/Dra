package validator

import (
	"strings"
	"testing"
)

func ptr[T any](v T) *T { return &v }

func TestValidateJSON_TypeObject(t *testing.T) {
	schema := &Schema{Type: TypeObject}
	data := []byte(`{"name": "test"}`)
	errs := ValidateJSON(data, schema)
	if len(errs) > 0 {
		t.Errorf("unexpected errors: %v", errs)
	}
}

func TestValidateJSON_TypeMismatch(t *testing.T) {
	schema := &Schema{Type: TypeObject}
	data := []byte(`"not an object"`)
	errs := ValidateJSON(data, schema)
	if len(errs) == 0 {
		t.Error("expected type error")
	}
}

func TestValidateJSON_RequiredFields(t *testing.T) {
	schema := &Schema{
		Type:       TypeObject,
		Required:   []string{"name", "age"},
		Properties: map[string]*Schema{
			"name": {Type: TypeString},
			"age":  {Type: TypeInteger},
		},
	}
	data := []byte(`{"name": "alice"}`)
	errs := ValidateJSON(data, schema)
	if len(errs) != 1 {
		t.Fatalf("expected 1 error, got %d", len(errs))
	}
	if !strings.Contains(errs[0].Error(), "age") {
		t.Errorf("error should mention age: %v", errs[0])
	}
}

func TestValidateJSON_StringConstraints(t *testing.T) {
	schema := &Schema{
		Type:      TypeString,
		MinLength: ptr(3),
		MaxLength: ptr(10),
		Pattern:   `^[a-z]+$`,
	}

	tests := []struct {
		data string
		want int // number of errors
	}{
		{`"hello"`, 0},
		{`"ab"`, 1},     // too short
		{`"hello world"`, 2}, // too long + pattern mismatch
		{`"Hello1"`, 1}, // pattern mismatch
	}

	for _, tt := range tests {
		errs := ValidateJSON([]byte(tt.data), schema)
		if len(errs) != tt.want {
			t.Errorf("ValidateJSON(%q) errors = %d, want %d: %v", tt.data, len(errs), tt.want, errs)
		}
	}
}

func TestValidateJSON_NumberConstraints(t *testing.T) {
	schema := &Schema{
		Type:    TypeNumber,
		Minimum: ptr(0.0),
		Maximum: ptr(100.0),
	}

	tests := []struct {
		data string
		want int
	}{
		{`50`, 0},
		{`-1`, 1},
		{`101`, 1},
	}

	for _, tt := range tests {
		errs := ValidateJSON([]byte(tt.data), schema)
		if len(errs) != tt.want {
			t.Errorf("ValidateJSON(%q) errors = %d, want %d", tt.data, len(errs), tt.want)
		}
	}
}

func TestValidateJSON_IntegerType(t *testing.T) {
	schema := &Schema{Type: TypeInteger}
	errs := ValidateJSON([]byte(`42`), schema)
	if len(errs) > 0 {
		t.Errorf("unexpected errors: %v", errs)
	}

	errs = ValidateJSON([]byte(`42.5`), schema)
	if len(errs) == 0 {
		t.Error("expected error for non-integer")
	}
}

func TestValidateJSON_Enum(t *testing.T) {
	schema := &Schema{
		Type: TypeString,
		Enum: []interface{}{"red", "green", "blue"},
	}

	errs := ValidateJSON([]byte(`"red"`), schema)
	if len(errs) > 0 {
		t.Errorf("unexpected errors: %v", errs)
	}

	errs = ValidateJSON([]byte(`"yellow"`), schema)
	if len(errs) == 0 {
		t.Error("expected enum error")
	}
}

func TestValidateJSON_ArrayItems(t *testing.T) {
	schema := &Schema{
		Type: TypeArray,
		Items: &Schema{Type: TypeString},
	}

	errs := ValidateJSON([]byte(`["a", "b", "c"]`), schema)
	if len(errs) > 0 {
		t.Errorf("unexpected errors: %v", errs)
	}

	errs = ValidateJSON([]byte(`["a", 1, "c"]`), schema)
	if len(errs) == 0 {
		t.Error("expected item type error")
	}
}

func TestValidateJSON_NestedObject(t *testing.T) {
	schema := &Schema{
		Type: TypeObject,
		Properties: map[string]*Schema{
			"user": {
				Type: TypeObject,
				Properties: map[string]*Schema{
					"name": {Type: TypeString},
					"age":  {Type: TypeInteger},
				},
				Required: []string{"name"},
			},
		},
	}

	data := []byte(`{"user": {"name": "alice", "age": 30}}`)
	errs := ValidateJSON(data, schema)
	if len(errs) > 0 {
		t.Errorf("unexpected errors: %v", errs)
	}

	data = []byte(`{"user": {"age": 30}}`)
	errs = ValidateJSON(data, schema)
	if len(errs) == 0 {
		t.Error("expected required field error")
	}
}

func TestValidateJSON_InvalidJSON(t *testing.T) {
	schema := &Schema{Type: TypeObject}
	errs := ValidateJSON([]byte(`{invalid`), schema)
	if len(errs) == 0 {
		t.Error("expected JSON parse error")
	}
}

func TestCorrectionPrompt(t *testing.T) {
	errs := []error{
		&ValidationError{Field: "name", Message: "required field missing"},
		&ValidationError{Field: "age", Message: "expected type integer, got string"},
	}
	prompt := CorrectionPrompt(`{"name": ""}`, errs)
	if !strings.Contains(prompt, "Validation errors:") {
		t.Error("prompt should contain validation errors header")
	}
	if !strings.Contains(prompt, "name") {
		t.Error("prompt should mention name field")
	}
}
