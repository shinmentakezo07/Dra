package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *Handler) AdminListUsers(w http.ResponseWriter, r *http.Request) {
	page, limit := parsePagination(r)
	filter := domain.UserFilter{
		Query:  r.URL.Query().Get("query"),
		Status: r.URL.Query().Get("status"),
		Page:   page,
		Limit:  limit,
	}
	users, total, err := h.adminSvc.ListUsers(r.Context(), filter)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Paginated(w, users, total, page, limit)
}

func (h *Handler) AdminGetUserDetail(w http.ResponseWriter, r *http.Request) {
	user, err := h.adminSvc.GetUser(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	if user == nil {
		response.Error(w, 404, "Not found")
		return
	}
	response.OK(w, user)
}

func (h *Handler) AdminUpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.UpdateUserStatus(r.Context(), id, req.Status, req.Reason); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminUpdateUserRole(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	if err := h.adminSvc.UpdateUserRole(r.Context(), id, req.Role); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	if id == "" {
		response.Error(w, 400, "ID required")
		return
	}
	if err := h.adminSvc.DeleteUser(r.Context(), id); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) AdminBulkSuspendUsers(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserIDs []string `json:"userIds"`
		Reason  string   `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	suspended := 0
	for _, userID := range req.UserIDs {
		if err := h.adminSvc.UpdateUserStatus(r.Context(), userID, "suspended", req.Reason); err == nil {
			suspended++
		}
	}
	response.OK(w, map[string]int{"suspended": suspended})
}

func (h *Handler) AdminListAdminUsers(w http.ResponseWriter, r *http.Request) {
	response.OK(w, []domain.AdminUser{})
}

func (h *Handler) AdminCreateAdminUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"userId"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	response.OK(w, map[string]string{"status": "created", "userId": req.UserID})
}

func (h *Handler) AdminRemoveAdmin(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{"status": "removed"})
}

func (h *Handler) AdminListPromoRedemptions(w http.ResponseWriter, r *http.Request) {
	redemptions, err := h.adminSvc.GetPromoRedemptions(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, redemptions)
}

func (h *Handler) AdminListUserKeys(w http.ResponseWriter, r *http.Request) {
	keys, appErr := h.keySvc.List(r.Context(), chi.URLParam(r, "id"))
	if appErr != nil {
		response.Error(w, appErr.Status, appErr.Message)
		return
	}
	response.OK(w, keys)
}

func (h *Handler) AdminListUserUsage(w http.ResponseWriter, r *http.Request) {
	page, limit := parsePagination(r)
	filter := domain.UsageFilter{
		UserID: chi.URLParam(r, "id"),
		Page:   page,
		Limit:  limit,
	}
	records, total, err := h.adminSvc.ListUsageRecords(r.Context(), filter)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Paginated(w, records, total, page, limit)
}

func (h *Handler) AdminListGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := h.adminSvc.ListGroups(r.Context())
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, groups)
}

func (h *Handler) AdminCreateGroup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	g := domain.UserGroup{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
	}
	if err := h.adminSvc.CreateGroup(r.Context(), &g); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, g)
}

func (h *Handler) AdminListScheduledReports(w http.ResponseWriter, r *http.Request) {
	reports, err := h.adminSvc.ListScheduledReports(r.Context())
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, reports)
}

func (h *Handler) AdminListChangelog(w http.ResponseWriter, r *http.Request) {
	drafts, _ := strconv.ParseBool(r.URL.Query().Get("drafts"))
	entries, err := h.adminSvc.ListChangelog(r.Context(), drafts)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, entries)
}

func (h *Handler) AdminCreateChangelog(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title   string `json:"title"`
		Body    string `json:"body"`
		Version string `json:"version"`
		Type    string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid body")
		return
	}
	e := domain.ChangelogEntry{
		ID:      uuid.New().String(),
		Title:   req.Title,
		Body:    req.Body,
		Version: req.Version,
		Type:    req.Type,
		IsDraft: true,
	}
	if err := h.adminSvc.CreateChangelog(r.Context(), &e); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, e)
}

func (h *Handler) AdminPublishChangelog(w http.ResponseWriter, r *http.Request) {
	if err := h.adminSvc.PublishChangelog(r.Context(), chi.URLParam(r, "id")); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, map[string]string{"status": "published"})
}

func (h *Handler) AdminListSSOConfigs(w http.ResponseWriter, r *http.Request) {
	configs, err := h.adminSvc.ListSSOConfigs(r.Context())
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.OK(w, configs)
}
