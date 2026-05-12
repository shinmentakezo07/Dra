package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/internal/repository"

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

// CreateConversation creates a new conversation thread.
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
	if req.Model == "" {
		req.Model = "openai/gpt-4o"
	}

	repo := repository.NewConversationRepo(h.db)
	conv, err := repo.CreateConversation(r.Context(), u.ID, req.Title, req.Model)
	if err != nil {
		response.Error(w, 500, "Failed to create conversation")
		return
	}
	response.Created(w, conv)
}

// ListConversations returns conversations for the authenticated user.
func (h *Handler) ListConversations(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	page, limit := parsePagination(r)
	repo := repository.NewConversationRepo(h.db)
	convs, err := repo.ListConversations(r.Context(), u.ID, limit, (page-1)*limit)
	if err != nil {
		response.Error(w, 500, "Failed to list conversations")
		return
	}
	response.OK(w, convs)
}

// GetConversation retrieves a single conversation with messages.
func (h *Handler) GetConversation(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	id := chi.URLParam(r, "id")
	repo := repository.NewConversationRepo(h.db)
	conv, err := repo.GetConversation(r.Context(), id)
	if err != nil || conv == nil {
		response.Error(w, 404, "Conversation not found")
		return
	}
	if conv.UserID != u.ID {
		response.Error(w, 403, "Access denied")
		return
	}

	msgs, err := repo.GetMessages(r.Context(), id, 100, 0)
	if err != nil {
		response.Error(w, 500, "Failed to load messages")
		return
	}

	response.OK(w, map[string]interface{}{
		"conversation": conv,
		"messages":     msgs,
	})
}

// DeleteConversation removes a conversation.
func (h *Handler) DeleteConversation(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}

	id := chi.URLParam(r, "id")
	repo := repository.NewConversationRepo(h.db)
	if err := repo.DeleteConversation(r.Context(), u.ID, id); err != nil {
		response.Error(w, 500, "Failed to delete conversation")
		return
	}
	response.OK(w, map[string]string{"deleted": id})
}

// AddMessage adds a message to a conversation.
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

	repo := repository.NewConversationRepo(h.db)
	msg, err := repo.AddMessage(r.Context(), convID, req.Role, req.Content, req.InputTokens, req.OutputTokens)
	if err != nil {
		response.Error(w, 500, "Failed to add message")
		return
	}
	response.Created(w, msg)
}
