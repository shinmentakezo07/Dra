package service

import (
	"context"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type RBACService struct {
	repo *repository.RBACRepo
}

func NewRBACService(repo *repository.RBACRepo) *RBACService {
	return &RBACService{repo: repo}
}

func (s *RBACService) GetUserPermissions(ctx context.Context, userID string) ([]domain.Permission, *domain.AppError) {
	perms, err := s.repo.GetUserPermissions(ctx, userID)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get user permissions", err)
	}
	return perms, nil
}

func (s *RBACService) HasPermission(ctx context.Context, userID, resource, action string) (bool, *domain.AppError) {
	ok, err := s.repo.HasPermission(ctx, userID, resource, action)
	if err != nil {
		return false, domain.Wrap(domain.ErrInternal, 500, "failed to check permission", err)
	}
	return ok, nil
}

func (s *RBACService) ListRoles(ctx context.Context) ([]string, *domain.AppError) {
	roles, err := s.repo.ListRoles(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list roles", err)
	}
	return roles, nil
}

func (s *RBACService) GetRolePermissions(ctx context.Context, role string) ([]domain.Permission, *domain.AppError) {
	perms, err := s.repo.GetRolePermissions(ctx, role)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to get role permissions", err)
	}
	return perms, nil
}

func (s *RBACService) AddRolePermission(ctx context.Context, role, permissionName string) *domain.AppError {
	if err := s.repo.AddRolePermission(ctx, role, permissionName); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to add role permission", err)
	}
	return nil
}

func (s *RBACService) RemoveRolePermission(ctx context.Context, role, permissionName string) *domain.AppError {
	if err := s.repo.RemoveRolePermission(ctx, role, permissionName); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to remove role permission", err)
	}
	return nil
}

func (s *RBACService) UpdateUserRole(ctx context.Context, userID, role string) *domain.AppError {
	if err := s.repo.UpdateUserRole(ctx, userID, role); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to update user role", err)
	}
	return nil
}

func (s *RBACService) ListPermissions(ctx context.Context) ([]domain.Permission, *domain.AppError) {
	perms, err := s.repo.ListPermissions(ctx)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to list permissions", err)
	}
	return perms, nil
}
