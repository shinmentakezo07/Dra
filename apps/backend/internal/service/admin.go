package service

import (
	"context"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type AdminService struct {
	userRepo     *repository.AdminUserRepo
	providerRepo *repository.AdminProviderRepo
	modelRepo    *repository.AdminModelRepo
	billingRepo  *repository.AdminBillingRepo
	settingsRepo *repository.AdminSettingsRepo
	auditRepo    *repository.AdminAuditRepo
	securityRepo *repository.AdminSecurityRepo
	featuresRepo *repository.AdminFeaturesRepo
	auditSvc     *AuditService
}

func NewAdminService(
	userRepo *repository.AdminUserRepo,
	providerRepo *repository.AdminProviderRepo,
	modelRepo *repository.AdminModelRepo,
	billingRepo *repository.AdminBillingRepo,
	settingsRepo *repository.AdminSettingsRepo,
	auditRepo *repository.AdminAuditRepo,
	securityRepo *repository.AdminSecurityRepo,
	featuresRepo *repository.AdminFeaturesRepo,
	auditSvc *AuditService,
) *AdminService {
	return &AdminService{
		userRepo: userRepo, providerRepo: providerRepo, modelRepo: modelRepo,
		billingRepo: billingRepo, settingsRepo: settingsRepo, auditRepo: auditRepo,
		securityRepo: securityRepo, featuresRepo: featuresRepo, auditSvc: auditSvc,
	}
}

// ─── Users ───

func (s *AdminService) ListUsers(ctx context.Context, filter domain.UserFilter) ([]domain.AdminUserDetail, int, error) {
	return s.userRepo.ListUsers(ctx, filter)
}

func (s *AdminService) GetUser(ctx context.Context, id string) (*domain.AdminUserDetail, error) {
	return s.userRepo.GetUser(ctx, id)
}

func (s *AdminService) UpdateUserStatus(ctx context.Context, userID, status, reason string) error {
	return s.userRepo.UpdateUserStatus(ctx, userID, status, reason, "")
}

func (s *AdminService) UpdateUserRole(ctx context.Context, userID, role string) error {
	return s.userRepo.UpdateUserRole(ctx, userID, role)
}

func (s *AdminService) DeleteUser(ctx context.Context, userID string) error {
	return s.userRepo.SoftDelete(ctx, userID)
}

// ─── Providers ───

func (s *AdminService) ListProviders(ctx context.Context) ([]domain.Provider, error) {
	return s.providerRepo.List(ctx)
}

func (s *AdminService) GetProvider(ctx context.Context, id string) (*domain.Provider, error) {
	return s.providerRepo.Get(ctx, id)
}

func (s *AdminService) CreateProvider(ctx context.Context, p *domain.Provider) error {
	return s.providerRepo.Create(ctx, p)
}

func (s *AdminService) UpdateProvider(ctx context.Context, p *domain.Provider) error {
	return s.providerRepo.Update(ctx, p)
}

func (s *AdminService) ToggleProviderStatus(ctx context.Context, id string, status domain.ProviderStatus) error {
	return s.providerRepo.UpdateStatus(ctx, id, status)
}

// ─── Provider Keys ───

func (s *AdminService) ListProviderKeys(ctx context.Context, providerID string) ([]domain.ProviderKey, error) {
	return s.providerRepo.ListKeys(ctx, providerID)
}

func (s *AdminService) AddProviderKey(ctx context.Context, k *domain.ProviderKey) error {
	return s.providerRepo.CreateKey(ctx, k)
}

func (s *AdminService) UpdateProviderKey(ctx context.Context, k *domain.ProviderKey) error {
	return s.providerRepo.UpdateKey(ctx, k)
}

func (s *AdminService) DeleteProviderKey(ctx context.Context, id string) error {
	return s.providerRepo.DeleteKey(ctx, id)
}

func (s *AdminService) ReorderProviderKeys(ctx context.Context, providerID string, keyIDs []string) error {
	return s.providerRepo.ReorderKeys(ctx, providerID, keyIDs)
}

func (s *AdminService) GetProviderHealth(ctx context.Context, providerID string, since time.Time) ([]domain.ProviderHealthCheck, error) {
	return s.providerRepo.GetHealthChecks(ctx, providerID, since)
}

// ─── Models ───

func (s *AdminService) ListModels(ctx context.Context, status string) ([]domain.ModelRegistry, error) {
	return s.modelRepo.ListModels(ctx, status)
}

func (s *AdminService) GetModel(ctx context.Context, id string) (*domain.ModelRegistry, error) {
	return s.modelRepo.GetModel(ctx, id)
}

func (s *AdminService) CreateModel(ctx context.Context, m *domain.ModelRegistry) error {
	return s.modelRepo.CreateModel(ctx, m)
}

func (s *AdminService) UpdateModel(ctx context.Context, m *domain.ModelRegistry) error {
	return s.modelRepo.UpdateModel(ctx, m)
}

func (s *AdminService) UpdateModelStatus(ctx context.Context, id string, status domain.ModelStatus, replacementID *string) error {
	return s.modelRepo.UpdateModelStatus(ctx, id, status, replacementID)
}

// ─── Aliases ───

func (s *AdminService) ListAliases(ctx context.Context) ([]domain.ModelAlias, error) {
	return s.modelRepo.ListAliases(ctx)
}

func (s *AdminService) CreateAlias(ctx context.Context, a *domain.ModelAlias) error {
	return s.modelRepo.CreateAlias(ctx, a)
}

func (s *AdminService) DeleteAlias(ctx context.Context, id string) error {
	return s.modelRepo.DeleteAlias(ctx, id)
}

// ─── Billing ───

func (s *AdminService) AdjustCredits(ctx context.Context, adj *domain.CreditAdjustment) error {
	return s.billingRepo.AdjustCredits(ctx, adj)
}

func (s *AdminService) ListAdjustments(ctx context.Context, userID string, page, limit int) ([]domain.CreditAdjustment, int, error) {
	return s.billingRepo.ListAdjustments(ctx, userID, page, limit)
}

func (s *AdminService) RevenueSummary(ctx context.Context, from, to time.Time) ([]domain.RevenueSummary, error) {
	return s.billingRepo.RevenueSummary(ctx, from, to)
}

func (s *AdminService) ListUsageRecords(ctx context.Context, f domain.UsageFilter) ([]domain.UsageRecord, int, error) {
	return s.billingRepo.UsageRecords(ctx, f)
}

func (s *AdminService) UsageDaily(ctx context.Context, from, to time.Time, groupBy string) ([]domain.UsageDaily, error) {
	return s.billingRepo.UsageDaily(ctx, from, to, groupBy)
}

// ─── Settings ───

func (s *AdminService) ListSettings(ctx context.Context, group string) ([]domain.SystemSetting, error) {
	return s.settingsRepo.List(ctx, group)
}

func (s *AdminService) GetSetting(ctx context.Context, key string) (*domain.SystemSetting, error) {
	return s.settingsRepo.Get(ctx, key)
}

func (s *AdminService) UpdateSetting(ctx context.Context, setting *domain.SystemSetting) error {
	return s.settingsRepo.Set(ctx, setting)
}

func (s *AdminService) ListFeatureFlags(ctx context.Context) ([]domain.FeatureFlag, error) {
	return s.settingsRepo.ListFeatureFlags(ctx)
}

func (s *AdminService) CreateFeatureFlag(ctx context.Context, f *domain.FeatureFlag) error {
	return s.settingsRepo.CreateFeatureFlag(ctx, f)
}

func (s *AdminService) ToggleFeatureFlag(ctx context.Context, id string, enabled bool) error {
	return s.settingsRepo.UpdateFeatureFlag(ctx, id, enabled)
}

// ─── Audit ───

func (s *AdminService) ListAuditLogs(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	return s.auditRepo.List(ctx, filter)
}

// ─── Security ───

func (s *AdminService) ListSuspicious(ctx context.Context, f domain.SuspiciousFilter) ([]domain.SuspiciousActivity, int, error) {
	return s.securityRepo.ListSuspicious(ctx, f)
}

func (s *AdminService) ReviewSuspicious(ctx context.Context, id int64, action string, reviewerID string) error {
	return s.securityRepo.ReviewSuspicious(ctx, id, action, reviewerID)
}

func (s *AdminService) AddIPEntry(ctx context.Context, e *domain.IPList) error {
	return s.securityRepo.AddIPEntry(ctx, e)
}

func (s *AdminService) ListIPEntries(ctx context.Context, action string) ([]domain.IPList, error) {
	return s.securityRepo.ListIPEntries(ctx, action)
}

func (s *AdminService) RemoveIPEntry(ctx context.Context, id string) error {
	return s.securityRepo.RemoveIPEntry(ctx, id)
}

func (s *AdminService) StartImpersonation(ctx context.Context, adminID, userID, reason string) (*domain.ImpersonationSession, error) {
	return s.securityRepo.StartImpersonation(ctx, adminID, userID, reason)
}

func (s *AdminService) EndImpersonation(ctx context.Context, id string) error {
	return s.securityRepo.EndImpersonation(ctx, id)
}

func (s *AdminService) ListIPAccessLogs(ctx context.Context, f domain.IPAccessLogFilter) ([]domain.IPAccessLog, int, error) {
	return s.securityRepo.ListIPAccessLogs(ctx, f)
}

// ─── Features ───

func (s *AdminService) ListAnnouncements(ctx context.Context) ([]domain.Announcement, error) {
	return s.featuresRepo.ListAnnouncements(ctx)
}

func (s *AdminService) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	return s.featuresRepo.CreateAnnouncement(ctx, a)
}

func (s *AdminService) ListPromoCodes(ctx context.Context) ([]domain.PromoCode, error) {
	return s.featuresRepo.ListPromoCodes(ctx)
}

func (s *AdminService) CreatePromoCode(ctx context.Context, p *domain.PromoCode) error {
	return s.featuresRepo.CreatePromoCode(ctx, p)
}

func (s *AdminService) GetPromoRedemptions(ctx context.Context, promoID string) ([]domain.PromoRedemption, error) {
	return s.featuresRepo.GetPromoRedemptions(ctx, promoID)
}

func (s *AdminService) ListGroups(ctx context.Context) ([]domain.UserGroup, error) {
	return s.featuresRepo.ListGroups(ctx)
}

func (s *AdminService) CreateGroup(ctx context.Context, g *domain.UserGroup) error {
	return s.featuresRepo.CreateGroup(ctx, g)
}

func (s *AdminService) ListScheduledReports(ctx context.Context) ([]domain.ScheduledReport, error) {
	return s.featuresRepo.ListScheduledReports(ctx)
}

func (s *AdminService) CreateScheduledReport(ctx context.Context, r *domain.ScheduledReport) error {
	return s.featuresRepo.CreateScheduledReport(ctx, r)
}

func (s *AdminService) ListChangelog(ctx context.Context, drafts bool) ([]domain.ChangelogEntry, error) {
	return s.featuresRepo.ListChangelog(ctx, drafts)
}

func (s *AdminService) CreateChangelog(ctx context.Context, e *domain.ChangelogEntry) error {
	return s.featuresRepo.CreateChangelog(ctx, e)
}

func (s *AdminService) PublishChangelog(ctx context.Context, id string) error {
	return s.featuresRepo.PublishChangelog(ctx, id)
}

func (s *AdminService) ListSSOConfigs(ctx context.Context) ([]domain.SSOConfig, error) {
	return s.featuresRepo.ListSSOConfigs(ctx)
}
