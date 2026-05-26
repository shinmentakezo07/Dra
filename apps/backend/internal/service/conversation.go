package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

// ConversationService handles conversation business logic.
type ConversationService struct {
	repo *repository.ConversationRepo
}

// NewConversationService creates a new ConversationService.
func NewConversationService(repo *repository.ConversationRepo) *ConversationService {
	return &ConversationService{repo: repo}
}

// CreateConversation creates a new conversation thread.
func (s *ConversationService) CreateConversation(ctx context.Context, userID, title, model string) (*repository.Conversation, *domain.AppError) {
	if model == "" {
		model = "openai/gpt-4o"
	}
	conv, err := s.repo.CreateConversation(ctx, userID, title, model)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create conversation", err)
	}
	return conv, nil
}

// ListConversations returns conversations for a user.
func (s *ConversationService) ListConversations(ctx context.Context, userID string, page, limit int) ([]repository.Conversation, *domain.AppError) {
	convs, err := s.repo.ListConversations(ctx, userID, limit, (page-1)*limit)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list conversations", err)
	}
	return convs, nil
}

// GetConversation retrieves a conversation with messages.
func (s *ConversationService) GetConversation(ctx context.Context, userID, id string) (*repository.Conversation, []repository.ConversationMessage, *domain.AppError) {
	conv, err := s.repo.GetConversation(ctx, id)
	if err != nil {
		return nil, nil, domain.Wrap(domain.ErrInternal, 500, "failed to get conversation", err)
	}
	if conv == nil {
		return nil, nil, domain.NewError(domain.ErrNotFound, 404, "Conversation not found")
	}
	if conv.UserID != userID {
		return nil, nil, domain.NewError(domain.ErrForbidden, 403, "Access denied")
	}

	msgs, err := s.repo.GetMessages(ctx, id, 100, 0)
	if err != nil {
		return nil, nil, domain.Wrap(domain.ErrInternal, 500, "failed to load messages", err)
	}
	return conv, msgs, nil
}

// DeleteConversation removes a conversation.
func (s *ConversationService) DeleteConversation(ctx context.Context, userID, id string) *domain.AppError {
	if err := s.repo.DeleteConversation(ctx, userID, id); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to delete conversation", err)
	}
	return nil
}

// AddMessage adds a message to a conversation after verifying ownership.
func (s *ConversationService) AddMessage(ctx context.Context, userID, convID, role, content string, inputTokens, outputTokens int) (*repository.ConversationMessage, *domain.AppError) {
	conv, err := s.repo.GetConversation(ctx, convID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to verify conversation", err)
	}
	if conv == nil {
		return nil, domain.NewError(domain.ErrNotFound, 404, "Conversation not found")
	}
	if conv.UserID != userID {
		return nil, domain.NewError(domain.ErrForbidden, 403, "Access denied")
	}

	msg, err := s.repo.AddMessage(ctx, convID, role, content, inputTokens, outputTokens)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to add message", err)
	}
	return msg, nil
}

// UpdateTitle updates a conversation title.
func (s *ConversationService) UpdateTitle(ctx context.Context, userID, id, title string) *domain.AppError {
	if err := s.repo.UpdateTitle(ctx, userID, id, title); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update title", err)
	}
	return nil
}
