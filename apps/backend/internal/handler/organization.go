package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/pkg/email"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListOrgs(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	orgs, err := h.orgSvc.List(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, orgs)
}

func (h *Handler) CreateOrg(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req domain.CreateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	org, err := h.orgSvc.Create(r.Context(), u.ID, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.Created(w, org)
}

func (h *Handler) GetOrg(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, 400, "Organization ID required")
		return
	}
	org, err := h.orgSvc.Get(r.Context(), u.ID, id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, org)
}

func (h *Handler) InviteMember(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, 400, "Organization ID required")
		return
	}
	var req domain.InviteMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	invite, err := h.orgSvc.InviteMember(r.Context(), u.ID, id, req)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	// Send invite email
	if h.emailSender != nil && invite != nil {
		org, _ := h.orgSvc.Get(r.Context(), u.ID, id)
		orgName := id
		if org != nil {
			orgName = org.Name
		}
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:3000"
		}
		inviteURL := fmt.Sprintf("%s/dashboard/organization?invite=%s", origin, invite.Token)
		if eErr := email.SendInvite(h.emailSender, req.Email, orgName, inviteURL); eErr != nil {
			logger.Error("invite_email_failed", "error", eErr.Error())
		}
	}
	response.Created(w, invite)
}

func (h *Handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Token == "" {
		response.Error(w, 400, "Token is required")
		return
	}
	org, err := h.orgSvc.AcceptInvite(r.Context(), u.ID, req.Token)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, org)
}

func (h *Handler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, 400, "Organization ID required")
		return
	}
	userID := chi.URLParam(r, "userId")
	if userID == "" {
		response.Error(w, 400, "User ID required")
		return
	}
	if err := h.orgSvc.RemoveMember(r.Context(), u.ID, id, userID); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"removed": true})
}

func (h *Handler) ListMembers(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		response.Error(w, 400, "Organization ID required")
		return
	}
	members, err := h.orgSvc.ListMembers(r.Context(), u.ID, id)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, members)
}
