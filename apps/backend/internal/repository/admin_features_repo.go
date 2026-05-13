package repository

import (
	"context"
	"fmt"

	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/domain"

	"github.com/google/uuid"
)

type AdminFeaturesRepo struct{ db *db.DB }

func NewAdminFeaturesRepo(d *db.DB) *AdminFeaturesRepo { return &AdminFeaturesRepo{db: d} }

func (r *AdminFeaturesRepo) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO announcements(id,title,body,priority,target_type,target_ids,starts_at,ends_at,show_in_app,send_email,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		a.ID, a.Title, a.Body, a.Priority, a.TargetType, a.TargetIDs, a.StartsAt, a.EndsAt, a.ShowInApp, a.SendEmail, a.CreatedBy)
	return fmt.Errorf("create announcement: %w", err)
}

func (r *AdminFeaturesRepo) ListAnnouncements(ctx context.Context) ([]domain.Announcement, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id,title,body,priority,target_type,target_ids,starts_at,ends_at,show_in_app,send_email,created_by,created_at FROM announcements ORDER BY created_at DESC`)
	if err != nil { return nil, fmt.Errorf("list announcements: %w", err) }
	defer rows.Close()
	var announcements []domain.Announcement
	for rows.Next() {
		var a domain.Announcement
		if err := rows.Scan(&a.ID, &a.Title, &a.Body, &a.Priority, &a.TargetType, &a.TargetIDs, &a.StartsAt, &a.EndsAt, &a.ShowInApp, &a.SendEmail, &a.CreatedBy, &a.CreatedAt); err != nil { return nil, fmt.Errorf("scan: %w", err) }
		announcements = append(announcements, a)
	}
	return announcements, nil
}

func (r *AdminFeaturesRepo) CreatePromoCode(ctx context.Context, p *domain.PromoCode) error {
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO promo_codes(id,code,type,value,max_uses,min_purchase,expires_at,is_active,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(code) DO NOTHING`,
		p.ID, p.Code, p.Type, p.Value, p.MaxUses, p.MinPurchase, p.ExpiresAt, p.IsActive, p.CreatedBy)
	return fmt.Errorf("create promo: %w", err)
}

func (r *AdminFeaturesRepo) ListPromoCodes(ctx context.Context) ([]domain.PromoCode, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id,code,type,value,max_uses,current_uses,min_purchase,expires_at,is_active,created_by,created_at FROM promo_codes ORDER BY created_at DESC`)
	if err != nil { return nil, fmt.Errorf("list promos: %w", err) }
	defer rows.Close()
	var promos []domain.PromoCode
	for rows.Next() {
		var p domain.PromoCode
		if err := rows.Scan(&p.ID, &p.Code, &p.Type, &p.Value, &p.MaxUses, &p.CurrentUses, &p.MinPurchase, &p.ExpiresAt, &p.IsActive, &p.CreatedBy, &p.CreatedAt); err != nil { return nil, fmt.Errorf("scan: %w", err) }
		promos = append(promos, p)
	}
	return promos, nil
}

func (r *AdminFeaturesRepo) GetPromoRedemptions(ctx context.Context, promoID string) ([]domain.PromoRedemption, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id,promo_id,user_id,discount,credits_awarded,redeemed_at FROM promo_redemptions WHERE promo_id=$1 ORDER BY redeemed_at DESC`, promoID)
	if err != nil { return nil, fmt.Errorf("list redemptions: %w", err) }
	defer rows.Close()
	var redemptions []domain.PromoRedemption
	for rows.Next() {
		var red domain.PromoRedemption
		if err := rows.Scan(&red.ID, &red.PromoID, &red.UserID, &red.Discount, &red.CreditsAwarded, &red.RedeemedAt); err != nil { return nil, fmt.Errorf("scan: %w", err) }
		redemptions = append(redemptions, red)
	}
	return redemptions, nil
}

func (r *AdminFeaturesRepo) ListGroups(ctx context.Context) ([]domain.UserGroup, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id,name,description,created_by,created_at FROM user_groups ORDER BY name ASC`)
	if err != nil { return nil, fmt.Errorf("list groups: %w", err) }
	defer rows.Close()
	var groups []domain.UserGroup
	for rows.Next() {
		var g domain.UserGroup
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.CreatedBy, &g.CreatedAt); err != nil { return nil, fmt.Errorf("scan: %w", err) }
		groups = append(groups, g)
	}
	return groups, nil
}

func (r *AdminFeaturesRepo) CreateGroup(ctx context.Context, g *domain.UserGroup) error {
	g.ID = uuid.New().String()
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO user_groups(id,name,description,created_by) VALUES($1,$2,$3,$4)`, g.ID, g.Name, g.Description, g.CreatedBy)
	return fmt.Errorf("create group: %w", err)
}

func (r *AdminFeaturesRepo) ListScheduledReports(ctx context.Context) ([]domain.ScheduledReport, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id,name,frequency,format,sections,recipients,next_send_at,last_sent_at,is_active,created_at FROM scheduled_reports ORDER BY is_active DESC,next_send_at ASC`)
	if err != nil { return nil, fmt.Errorf("list reports: %w", err) }
	defer rows.Close()
	var reports []domain.ScheduledReport
	for rows.Next() {
		var s domain.ScheduledReport
		if err := rows.Scan(&s.ID, &s.Name, &s.Frequency, &s.Format, &s.Sections, &s.Recipients, &s.NextSendAt, &s.LastSentAt, &s.IsActive, &s.CreatedAt); err != nil { return nil, fmt.Errorf("scan: %w", err) }
		reports = append(reports, s)
	}
	return reports, nil
}

func (r *AdminFeaturesRepo) CreateScheduledReport(ctx context.Context, s *domain.ScheduledReport) error {
	s.ID = uuid.New().String()
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO scheduled_reports(id,name,frequency,format,sections,recipients,next_send_at,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
		s.ID, s.Name, s.Frequency, s.Format, s.Sections, s.Recipients, s.NextSendAt, s.IsActive)
	return fmt.Errorf("create report: %w", err)
}

func (r *AdminFeaturesRepo) CreateChangelog(ctx context.Context, e *domain.ChangelogEntry) error {
	e.ID = uuid.New().String()
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO api_changelog(id,title,body,version,type,is_draft,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,
		e.ID, e.Title, e.Body, e.Version, e.Type, e.IsDraft, e.CreatedBy)
	return fmt.Errorf("create changelog: %w", err)
}

func (r *AdminFeaturesRepo) ListChangelog(ctx context.Context, drafts bool) ([]domain.ChangelogEntry, error) {
	q := `SELECT id,title,body,version,type,published_at,is_draft,created_by,created_at FROM api_changelog`
	if !drafts { q += " WHERE is_draft=false" }
	q += " ORDER BY COALESCE(published_at,created_at) DESC"
	rows, err := r.db.Pool.Query(ctx, q)
	if err != nil { return nil, fmt.Errorf("list changelog: %w", err) }
	defer rows.Close()
	var entries []domain.ChangelogEntry
	for rows.Next() {
		var e domain.ChangelogEntry
		if err := rows.Scan(&e.ID, &e.Title, &e.Body, &e.Version, &e.Type, &e.PublishedAt, &e.IsDraft, &e.CreatedBy, &e.CreatedAt); err != nil { return nil, fmt.Errorf("scan: %w", err) }
		entries = append(entries, e)
	}
	return entries, nil
}

func (r *AdminFeaturesRepo) PublishChangelog(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE api_changelog SET is_draft=false,published_at=NOW() WHERE id=$1`, id)
	return fmt.Errorf("publish changelog: %w", err)
}

func (r *AdminFeaturesRepo) ListSSOConfigs(ctx context.Context) ([]domain.SSOConfig, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id,provider,label,issuer,client_id,allowed_domains,auto_provision,default_role,is_active,created_at FROM sso_configs ORDER BY provider ASC`)
	if err != nil { return nil, fmt.Errorf("list sso: %w", err) }
	defer rows.Close()
	var configs []domain.SSOConfig
	for rows.Next() {
		var c domain.SSOConfig
		if err := rows.Scan(&c.ID, &c.Provider, &c.Label, &c.Issuer, &c.ClientID, &c.AllowedDomains, &c.AutoProvision, &c.DefaultRole, &c.IsActive, &c.CreatedAt); err != nil { return nil, fmt.Errorf("scan: %w", err) }
		configs = append(configs, c)
	}
	return configs, nil
}
