package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *Handler) AdminListSuspicious(w http.ResponseWriter, r *http.Request) {
	page, limit := parsePagination(r)
	f := domain.SuspiciousFilter{
		Category: r.URL.Query().Get("category"),
		Severity: r.URL.Query().Get("severity"),
		Page:     page,
		Limit:    limit,
	}
	if v := r.URL.Query().Get("reviewed"); v != "" {
		b, _ := strconv.ParseBool(v)
		f.Reviewed = &b
	}
	if v := r.URL.Query().Get("resolved"); v != "" {
		b, _ := strconv.ParseBool(v)
		f.Resolved = &b
	}
	items, total, err := h.adminSvc.ListSuspicious(r.Context(), f)
	if err != nil {
		adminError(w, r, err, "admin_list_suspicious_failed")
		return
	}
	response.Paginated(w, items, total, page, limit)
}

func (h *Handler) AdminReviewSuspicious(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}
	adminID := u.ID
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		response.Error(w, 400, "Invalid ID")
		return
	}
	var req struct{ Action string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.ReviewSuspicious(r.Context(), id, req.Action, adminID); err != nil {
		adminError(w, r, err, "admin_review_suspicious_failed")
		return
	}
	response.OK(w, map[string]string{"status": "reviewed"})
}

func (h *Handler) AdminListIPEntries(w http.ResponseWriter, r *http.Request) {
	entries, err := h.adminSvc.ListIPEntries(r.Context(), r.URL.Query().Get("action"))
	if err != nil {
		adminError(w, r, err, "admin_list_ip_entries_failed")
		return
	}
	response.OK(w, entries)
}

func (h *Handler) AdminAddIPEntry(w http.ResponseWriter, r *http.Request) {
	var entry domain.IPList
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.AddIPEntry(r.Context(), &entry); err != nil {
		adminError(w, r, err, "admin_add_ip_entry_failed")
		return
	}
	response.OK(w, entry)
}

func (h *Handler) AdminRemoveIPEntry(w http.ResponseWriter, r *http.Request) {
	if err := h.adminSvc.RemoveIPEntry(r.Context(), chi.URLParam(r, "id")); err != nil {
		adminError(w, r, err, "admin_remove_ip_entry_failed")
		return
	}
	response.OK(w, map[string]string{"status": "deleted"})
}

func (h *Handler) AdminListIPAccessLogs(w http.ResponseWriter, r *http.Request) {
	page, limit := parsePagination(r)
	f := domain.IPAccessLogFilter{
		IPAddress: r.URL.Query().Get("ipAddress"),
		UserID:    r.URL.Query().Get("userId"),
		Page:      page,
		Limit:     limit,
	}
	if v := r.URL.Query().Get("blocked"); v != "" {
		b, _ := strconv.ParseBool(v)
		f.Blocked = &b
	}
	logs, total, err := h.adminSvc.ListIPAccessLogs(r.Context(), f)
	if err != nil {
		adminError(w, r, err, "admin_list_ip_access_logs_failed")
		return
	}
	response.Paginated(w, logs, total, page, limit)
}

func (h *Handler) AdminStartImpersonation(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}
	adminID := u.ID
	targetUserID := chi.URLParam(r, "id")
	var req struct{ Reason string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	session, err := h.adminSvc.StartImpersonation(r.Context(), adminID, targetUserID, req.Reason)
	if err != nil {
		adminError(w, r, err, "admin_start_impersonation_failed")
		return
	}
	response.OK(w, session)
}

func (h *Handler) AdminStopImpersonation(w http.ResponseWriter, r *http.Request) {
	if err := h.adminSvc.EndImpersonation(r.Context(), chi.URLParam(r, "id")); err != nil {
		adminError(w, r, err, "admin_stop_impersonation_failed")
		return
	}
	response.OK(w, map[string]string{"status": "ended"})
}

func (h *Handler) AdminListAuditLogs(w http.ResponseWriter, r *http.Request) {
	page, limit := parsePagination(r)
	filter := domain.AuditLogFilter{
		ActorID:    r.URL.Query().Get("actorId"),
		Action:     r.URL.Query().Get("action"),
		TargetType: r.URL.Query().Get("targetType"),
		Severity:   r.URL.Query().Get("severity"),
		Page:       page,
		Limit:      limit,
	}
	if v := r.URL.Query().Get("startDate"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err == nil {
			filter.StartDate = &t
		}
	}
	if v := r.URL.Query().Get("endDate"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err == nil {
			filter.EndDate = &t
		}
	}
	logs, total, err := h.adminSvc.ListAuditLogs(r.Context(), filter)
	if err != nil {
		adminError(w, r, err, "admin_list_audit_logs_failed")
		return
	}
	response.Paginated(w, logs, total, page, limit)
}

func (h *Handler) AdminListAnnouncements(w http.ResponseWriter, r *http.Request) {
	announcements, err := h.adminSvc.ListAnnouncements(r.Context())
	if err != nil {
		adminError(w, r, err, "admin_list_announcements_failed")
		return
	}
	response.OK(w, announcements)
}

func (h *Handler) AdminCreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "not authenticated")
		return
	}

	var a domain.Announcement
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if a.Title == "" {
		response.Error(w, 400, "title is required")
		return
	}
	if a.Body == "" {
		response.Error(w, 400, "body is required")
		return
	}
	a.ID = uuid.New().String()
	a.CreatedBy = u.ID
	if err := h.adminSvc.CreateAnnouncement(r.Context(), &a); err != nil {
		adminError(w, r, err, "admin_create_announcement_failed")
		return
	}
	response.Created(w, a)

	// Send SSE notification to all users if show_in_app
	if a.ShowInApp {
		go h.notifyNewMessage(context.Background(), "all", nil, map[string]interface{}{
			"type":     "new_announcement",
			"id":       a.ID,
			"title":    a.Title,
			"body":     a.Body,
			"priority": a.Priority,
		})
	}
}

func (h *Handler) AdminListPromoCodes(w http.ResponseWriter, r *http.Request) {
	codes, err := h.adminSvc.ListPromoCodes(r.Context())
	if err != nil {
		adminError(w, r, err, "admin_list_promo_codes_failed")
		return
	}
	response.OK(w, codes)
}

func (h *Handler) AdminCreatePromoCode(w http.ResponseWriter, r *http.Request) {
	var p domain.PromoCode
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	p.ID = uuid.New().String()
	if err := h.adminSvc.CreatePromoCode(r.Context(), &p); err != nil {
		adminError(w, r, err, "admin_create_promo_code_failed")
		return
	}
	response.OK(w, p)
}
