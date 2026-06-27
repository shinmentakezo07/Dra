package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/pkg/llm/validator"
)

type validateRequest struct {
	Data   json.RawMessage `json:"data"`
	Schema *validator.Schema `json:"schema"`
}

// ValidateStructuredOutput validates JSON data against a schema.
func (h *Handler) ValidateStructuredOutput(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}

	var req validateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Schema == nil {
		response.Error(w, 400, "Schema is required")
		return
	}

	errs := validator.ValidateJSON(req.Data, req.Schema)
	if len(errs) > 0 {
		messages := make([]string, len(errs))
		for i, e := range errs {
			messages[i] = e.Error()
		}
		response.JSON(w, 400, response.Body{Success: false, Error: "Validation failed", Data: map[string]interface{}{"errors": messages}})
		return
	}

	response.OK(w, map[string]bool{"valid": true})
}
