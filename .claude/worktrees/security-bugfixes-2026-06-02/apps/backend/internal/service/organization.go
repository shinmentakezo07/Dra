package service

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type OrganizationService struct {
	repo     *repository.OrganizationRepo
	userRepo *repository.UserRepo
}

func NewOrganizationService(repo *repository.OrganizationRepo, userRepo *repository.UserRepo) *OrganizationService {
	return &OrganizationService{repo: repo, userRepo: userRepo}
}

func (s *OrganizationService) Create(ctx context.Context, userID string, req domain.CreateOrgRequest) (*domain.Organization, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	org, err := s.repo.Create(ctx, req.Name, userID, "free")
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create organization", err)
	}
	// Owner becomes a member with admin role
	if _, err := s.repo.AddMember(ctx, org.ID, userID, "admin"); err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to add owner as member", err)
	}
	return org, nil
}

func (s *OrganizationService) List(ctx context.Context, userID string) ([]domain.Organization, *domain.AppError) {
	// Return orgs owned by user plus orgs they are a member of
	owned, err := s.repo.ByOwner(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	memberOf, err := s.repo.ListByMember(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}

	// Deduplicate by ID
	seen := make(map[string]bool, len(owned)+len(memberOf))
	result := make([]domain.Organization, 0, len(owned)+len(memberOf))
	for _, o := range owned {
		if !seen[o.ID] {
			seen[o.ID] = true
			result = append(result, o)
		}
	}
	for _, o := range memberOf {
		if !seen[o.ID] {
			seen[o.ID] = true
			result = append(result, o)
		}
	}
	return result, nil
}

func (s *OrganizationService) Get(ctx context.Context, userID, orgID string) (*domain.Organization, *domain.AppError) {
	if err := s.requireAccess(ctx, orgID, userID); err != nil {
		return nil, err
	}
	org, err := s.repo.ByID(ctx, orgID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if org == nil {
		return nil, domain.NewError(domain.ErrNotFound, 404, "Organization not found")
	}
	return org, nil
}

func (s *OrganizationService) InviteMember(ctx context.Context, userID, orgID string, req domain.InviteMemberRequest) (*domain.Invite, *domain.AppError) {
	if err := req.Validate(); err != nil {
		return nil, err
	}
	if err := s.requireOwnerOrAdmin(ctx, orgID, userID); err != nil {
		return nil, err
	}
	token, err := repository.GenerateInviteToken()
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to generate invite token", err)
	}
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	invite, err := s.repo.CreateInvite(ctx, orgID, req.Email, req.Role, token, expiresAt)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create invite", err)
	}
	return invite, nil
}

func (s *OrganizationService) AcceptInvite(ctx context.Context, userID, token string) (*domain.Organization, *domain.AppError) {
	invite, err := s.repo.GetInviteByToken(ctx, token)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if invite == nil {
		return nil, domain.NewError(domain.ErrNotFound, 404, "Invite not found")
	}
	if invite.UsedAt != nil {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "Invite already used")
	}
	if time.Now().After(invite.ExpiresAt) {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "Invite expired")
	}
	// Verify user email matches invite email
	user, err := s.userRepo.ByID(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if user == nil {
		return nil, domain.ErrUserNotFound
	}
	if user.Email != invite.Email {
		return nil, domain.NewError(domain.ErrForbidden, 403, "Invite email does not match your account")
	}
	// Mark invite used first to prevent TOCTOU race — concurrent requests with the same
	// token will fail here because the invite is already marked used.
	if err := s.repo.MarkInviteUsed(ctx, invite.ID); err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to mark invite used", err)
	}

	// Add member
	if _, err := s.repo.AddMember(ctx, invite.OrgID, userID, invite.Role); err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to add member", err)
	}
	return s.Get(ctx, userID, invite.OrgID)
}

func (s *OrganizationService) RemoveMember(ctx context.Context, userID, orgID, targetUserID string) *domain.AppError {
	if err := s.requireOwnerOrAdmin(ctx, orgID, userID); err != nil {
		return err
	}
	// Prevent removing owner
	org, err := s.repo.ByID(ctx, orgID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if org == nil {
		return domain.NewError(domain.ErrNotFound, 404, "Organization not found")
	}
	if org.OwnerID == targetUserID {
		return domain.NewError(domain.ErrForbidden, 403, "Cannot remove organization owner")
	}
	if err := s.repo.RemoveMember(ctx, orgID, targetUserID); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to remove member", err)
	}
	return nil
}

func (s *OrganizationService) ListMembers(ctx context.Context, userID, orgID string) ([]domain.OrgMember, *domain.AppError) {
	if err := s.requireAccess(ctx, orgID, userID); err != nil {
		return nil, err
	}
	members, err := s.repo.ListMembers(ctx, orgID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	return members, nil
}

func (s *OrganizationService) requireAccess(ctx context.Context, orgID, userID string) *domain.AppError {
	// Owner always has access
	org, err := s.repo.ByID(ctx, orgID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if org != nil && org.OwnerID == userID {
		return nil
	}
	// Check membership
	member, err := s.repo.GetMember(ctx, orgID, userID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if member == nil {
		return domain.NewError(domain.ErrForbidden, 403, "Access denied")
	}
	return nil
}

func (s *OrganizationService) requireOwnerOrAdmin(ctx context.Context, orgID, userID string) *domain.AppError {
	org, err := s.repo.ByID(ctx, orgID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if org != nil && org.OwnerID == userID {
		return nil
	}
	member, err := s.repo.GetMember(ctx, orgID, userID)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if member == nil || member.Role != "admin" {
		return domain.NewError(domain.ErrForbidden, 403, "Admin access required")
	}
	return nil
}
