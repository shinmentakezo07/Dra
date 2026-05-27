package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

type createPromptRequest struct {
	Name     string                 `json:"name"`
	Template string                 `json:"template"`
	Model    string                 `json:"model"`
	Config   map[string]interface{} `json:"config,omitempty"`
}

type renderPromptRequest struct {
	Variables map[string]string `json:"variables"`
}

func (h *Handler) CreatePrompt(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req createPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}

	prompt, appErr := h.promptSvc.CreatePrompt(r.Context(), u.ID, req.Name, req.Template, req.Model, req.Config)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.Created(w, prompt)
}

func (h *Handler) ListPrompts(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	page, limit := parsePagination(r)
	prompts, appErr := h.promptSvc.ListPrompts(r.Context(), u.ID, page, limit)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, prompts)
}

func (h *Handler) GetPrompt(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	name := chi.URLParam(r, "name")
	prompt, appErr := h.promptSvc.GetPrompt(r.Context(), u.ID, name)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, prompt)
}

func (h *Handler) RenderPrompt(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	name := chi.URLParam(r, "name")
	var req renderPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}

	prompt, rendered, appErr := h.promptSvc.RenderPrompt(r.Context(), u.ID, name, req.Variables)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, map[string]interface{}{
		"prompt":   prompt,
		"rendered": rendered,
		"model":    prompt.Model,
	})
}

func (h *Handler) DeletePrompt(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	name := chi.URLParam(r, "name")
	appErr := h.promptSvc.DeletePrompt(r.Context(), u.ID, name)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, map[string]string{"deleted": name})
}
