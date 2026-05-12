package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/internal/repository"

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

// CreatePrompt creates a new prompt template version.
func (h *Handler) CreatePrompt(w http.ResponseWriter, r *http.Request) {
	if !requirePromptUser(w, r) {
		return
	}
	var req createPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}
	if req.Name == "" || req.Template == "" {
		response.Error(w, 400, "Name and template are required")
		return
	}

	var configBytes []byte
	if req.Config != nil {
		configBytes, _ = json.Marshal(req.Config)
	}

	repo := repository.NewPromptRepo(h.db)
	prompt, err := repo.CreatePrompt(r.Context(), req.Name, req.Template, req.Model, configBytes)
	if err != nil {
		response.Error(w, 500, "Failed to create prompt")
		return
	}
	response.Created(w, prompt)
}

// ListPrompts returns all prompt templates.
func (h *Handler) ListPrompts(w http.ResponseWriter, r *http.Request) {
	if !requirePromptUser(w, r) {
		return
	}
	page, limit := parsePagination(r)
	repo := repository.NewPromptRepo(h.db)
	prompts, err := repo.ListPrompts(r.Context(), limit, (page-1)*limit)
	if err != nil {
		response.Error(w, 500, "Failed to list prompts")
		return
	}
	response.OK(w, prompts)
}

// GetPrompt retrieves a prompt template by name.
func (h *Handler) GetPrompt(w http.ResponseWriter, r *http.Request) {
	if !requirePromptUser(w, r) {
		return
	}
	name := chi.URLParam(r, "name")
	repo := repository.NewPromptRepo(h.db)
	prompt, err := repo.GetPrompt(r.Context(), name)
	if err != nil || prompt == nil {
		response.Error(w, 404, "Prompt not found")
		return
	}
	response.OK(w, prompt)
}

// RenderPrompt renders a prompt template with variables and executes it.
func (h *Handler) RenderPrompt(w http.ResponseWriter, r *http.Request) {
	if !requirePromptUser(w, r) {
		return
	}
	name := chi.URLParam(r, "name")
	var req renderPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}

	repo := repository.NewPromptRepo(h.db)
	prompt, err := repo.GetPrompt(r.Context(), name)
	if err != nil || prompt == nil {
		response.Error(w, 404, "Prompt not found")
		return
	}

	rendered := renderTemplate(prompt.Template, req.Variables)
	response.OK(w, map[string]interface{}{
		"prompt":   prompt,
		"rendered": rendered,
		"model":    prompt.Model,
	})
}

// DeletePrompt removes all versions of a prompt.
func (h *Handler) DeletePrompt(w http.ResponseWriter, r *http.Request) {
	if !requirePromptUser(w, r) {
		return
	}
	name := chi.URLParam(r, "name")
	repo := repository.NewPromptRepo(h.db)
	if err := repo.DeletePrompt(r.Context(), name); err != nil {
		response.Error(w, 500, "Failed to delete prompt")
		return
	}
	response.OK(w, map[string]string{"deleted": name})
}

func requirePromptUser(w http.ResponseWriter, r *http.Request) bool {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return false
	}
	return true
}

func renderTemplate(template string, vars map[string]string) string {
	result := template
	for k, v := range vars {
		result = strings.ReplaceAll(result, "{{"+k+"}}", v)
	}
	return result
}
