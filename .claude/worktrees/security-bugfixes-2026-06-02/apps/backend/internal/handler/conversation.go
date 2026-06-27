package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

type createConversationRequest struct {
	Title string `json:"title"`
	Model string `json:"model"`
}

type createMessageRequest struct {
	Role         string `json:"role"`
	Content      string `json:"content"`
	InputTokens  int    `json:"input_tokens"`
	OutputTokens int    `json:"output_tokens"`
}

func (h *Handler) CreateConversation(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	var req createConversationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}

	conv, appErr := h.conversationSvc.CreateConversation(r.Context(), u.ID, req.Title, req.Model)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.Created(w, conv)
}

func (h *Handler) ListConversations(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	page, limit := parsePagination(r)
	convs, appErr := h.conversationSvc.ListConversations(r.Context(), u.ID, page, limit)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, convs)
}

func (h *Handler) GetConversation(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	id := chi.URLParam(r, "id")
	conv, msgs, appErr := h.conversationSvc.GetConversation(r.Context(), u.ID, id)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}

	response.OK(w, map[string]interface{}{
		"conversation": conv,
		"messages":     msgs,
	})
}

func (h *Handler) DeleteConversation(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	id := chi.URLParam(r, "id")
	appErr := h.conversationSvc.DeleteConversation(r.Context(), u.ID, id)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, map[string]string{"deleted": id})
}

func (h *Handler) AddMessage(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	convID := chi.URLParam(r, "id")
	var req createMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}

	msg, appErr := h.conversationSvc.AddMessage(r.Context(), u.ID, convID, req.Role, req.Content, req.InputTokens, req.OutputTokens)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.Created(w, msg)
}

func (h *Handler) UpdateConversationTitle(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	id := chi.URLParam(r, "id")
	var req struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON")
		return
	}
	if req.Title == "" {
		response.Error(w, 400, "Title is required")
		return
	}

	appErr := h.conversationSvc.UpdateTitle(r.Context(), u.ID, id, req.Title)
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}
