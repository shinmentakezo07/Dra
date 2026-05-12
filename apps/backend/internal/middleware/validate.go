package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"
)

type Validator interface {
	Validate() *domain.AppError
}

// ValidateBody decodes reqBody into a Validator and runs Validate(). On failure it writes a 400 and aborts.
func ValidateBody(next http.HandlerFunc, reqBody Validator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Enforce Content-Type: application/json for POST/PUT/PATCH requests
		if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch {
			ct := r.Header.Get("Content-Type")
			if ct == "" || !strings.HasPrefix(ct, "application/json") {
				response.JSON(w, http.StatusUnsupportedMediaType, response.Body{Success: false, Error: "Content-Type must be application/json"})
				return
			}
		}
		if err := json.NewDecoder(r.Body).Decode(reqBody); err != nil {
			response.JSON(w, http.StatusBadRequest, response.Body{Success: false, Error: "Invalid JSON body"})
			return
		}
		if vErr := reqBody.Validate(); vErr != nil {
			response.JSON(w, vErr.Status, response.Body{Success: false, Error: vErr.Message})
			return
		}
		next(w, r)
	}
}
