package repository

import (
	"context"

	"dra-platform/backend/internal/domain"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, offset, limit int) ([]domain.User, error)
	Count(ctx context.Context) (int, error)
}

type APIKeyRepository interface {
	Create(ctx context.Context, key *domain.APIKey) error
	GetByID(ctx context.Context, id string) (*domain.APIKey, error)
	GetByKey(ctx context.Context, key string) (*domain.APIKey, error)
	GetByUserID(ctx context.Context, userID string) ([]domain.APIKey, error)
	Update(ctx context.Context, key *domain.APIKey) error
	Delete(ctx context.Context, id string) error
	Revoke(ctx context.Context, id string) error
}

type APILogRepository interface {
	Create(ctx context.Context, log *domain.APILog) error
	GetByUserID(ctx context.Context, userID string, offset, limit int) ([]domain.APILog, error)
	CountByUserID(ctx context.Context, userID string) (int, error)
}

type CreditsRepository interface {
	GetByUserID(ctx context.Context, userID string) (*domain.UserCredits, error)
	Create(ctx context.Context, credits *domain.UserCredits) error
	UpdateBalance(ctx context.Context, userID string, amount int) error
	UpdateBudget(ctx context.Context, userID string, monthly, daily *int) error
}

type CreditTransactionRepository interface {
	Create(ctx context.Context, tx *domain.CreditTransaction) error
	GetByUserID(ctx context.Context, userID string, offset, limit int) ([]domain.CreditTransaction, error)
}

type ModelRepository interface {
	List(ctx context.Context) ([]domain.ModelInfo, error)
	GetByID(ctx context.Context, id string) (*domain.ModelInfo, error)
	Create(ctx context.Context, model *domain.ModelInfo) error
	Update(ctx context.Context, model *domain.ModelInfo) error
	Delete(ctx context.Context, id string) error
}

type ConversationRepository interface {
	Create(ctx context.Context, conv *domain.Conversation) error
	GetByID(ctx context.Context, id string) (*domain.Conversation, error)
	GetByUserID(ctx context.Context, userID string, offset, limit int) ([]domain.Conversation, error)
	Delete(ctx context.Context, id string) error
	UpdateTitle(ctx context.Context, id, title string) error
}

type MessageRepository interface {
	Create(ctx context.Context, msg *domain.Message) error
	GetByConversationID(ctx context.Context, convID string, offset, limit int) ([]domain.Message, error)
}

type PromptRepository interface {
	Create(ctx context.Context, prompt *domain.Prompt) error
	GetByName(ctx context.Context, userID, name string) (*domain.Prompt, error)
	GetByUserID(ctx context.Context, userID string) ([]domain.Prompt, error)
	Delete(ctx context.Context, id string) error
}

type WebhookRepository interface {
	Create(ctx context.Context, wh *domain.Webhook) error
	GetByID(ctx context.Context, id string) (*domain.Webhook, error)
	GetByUserID(ctx context.Context, userID string) ([]domain.Webhook, error)
	Update(ctx context.Context, wh *domain.Webhook) error
	Delete(ctx context.Context, id string) error
}

type WebhookDeliveryRepository interface {
	Create(ctx context.Context, delivery *domain.WebhookDelivery) error
	GetPending(ctx context.Context, limit int) ([]domain.WebhookDelivery, error)
	UpdateDelivery(ctx context.Context, id string, statusCode int, err string) error
}

type OrganizationRepository interface {
	Create(ctx context.Context, org *domain.Organization) error
	GetByID(ctx context.Context, id string) (*domain.Organization, error)
	GetByOwnerID(ctx context.Context, ownerID string) ([]domain.Organization, error)
	Update(ctx context.Context, org *domain.Organization) error
	Delete(ctx context.Context, id string) error
}

type OrgMemberRepository interface {
	Create(ctx context.Context, member *domain.OrgMember) error
	GetByOrgID(ctx context.Context, orgID string) ([]domain.OrgMember, error)
	GetByUserID(ctx context.Context, userID string) ([]domain.OrgMember, error)
	Delete(ctx context.Context, orgID, userID string) error
}

type InviteRepository interface {
	Create(ctx context.Context, invite *domain.Invite) error
	GetByToken(ctx context.Context, token string) (*domain.Invite, error)
	GetByOrgID(ctx context.Context, orgID string) ([]domain.Invite, error)
	MarkUsed(ctx context.Context, id string) error
	Delete(ctx context.Context, id string) error
}

type BatchJobRepository interface {
	Create(ctx context.Context, job *domain.BatchJob) error
	GetByID(ctx context.Context, id string) (*domain.BatchJob, error)
	GetByUserID(ctx context.Context, userID string, offset, limit int) ([]domain.BatchJob, error)
	Update(ctx context.Context, job *domain.BatchJob) error
}

type FileRepository interface {
	Create(ctx context.Context, file *domain.File) error
	GetByID(ctx context.Context, id string) (*domain.File, error)
	GetByUserID(ctx context.Context, userID string, offset, limit int) ([]domain.File, error)
	Delete(ctx context.Context, id string) error
}

type PasswordResetRepository interface {
	Create(ctx context.Context, reset *domain.PasswordReset) error
	GetByToken(ctx context.Context, token string) (*domain.PasswordReset, error)
	MarkUsed(ctx context.Context, id string) error
}

type SettingRepository interface {
	Get(ctx context.Context, key string) (*domain.Setting, error)
	Set(ctx context.Context, key, value string) error
	List(ctx context.Context) ([]domain.Setting, error)
}

type AuditLogRepository interface {
	Create(ctx context.Context, log *domain.AuditLog) error
	List(ctx context.Context, offset, limit int) ([]domain.AuditLog, error)
}

type ProviderKeyRepository interface {
	Create(ctx context.Context, pk *domain.ProviderKey) error
	GetByID(ctx context.Context, id string) (*domain.ProviderKey, error)
	List(ctx context.Context) ([]domain.ProviderKey, error)
	Update(ctx context.Context, pk *domain.ProviderKey) error
	Delete(ctx context.Context, id string) error
}
