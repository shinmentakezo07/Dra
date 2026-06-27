package handler

import (
	"encoding/json"
	"net/http"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) MyPermissions(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	perms, err := h.rbacSvc.GetUserPermissions(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, perms)
}

func (h *Handler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.rbacSvc.ListRoles(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, roles)
}

func (h *Handler) GetRolePermissions(w http.ResponseWriter, r *http.Request) {
	role := chi.URLParam(r, "role")
	perms, err := h.rbacSvc.GetRolePermissions(r.Context(), role)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, perms)
}

func (h *Handler) AddRolePermission(w http.ResponseWriter, r *http.Request) {
	role := chi.URLParam(r, "role")
	var req struct {
		PermissionName string `json:"permissionName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.PermissionName == "" {
		response.Error(w, 400, "permissionName is required")
		return
	}
	if err := h.rbacSvc.AddRolePermission(r.Context(), role, req.PermissionName); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"added": true})
}

func (h *Handler) RemoveRolePermission(w http.ResponseWriter, r *http.Request) {
	role := chi.URLParam(r, "role")
	permName := chi.URLParam(r, "permission")
	if err := h.rbacSvc.RemoveRolePermission(r.Context(), role, permName); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"removed": true})
}

func (h *Handler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Role == "" {
		response.Error(w, 400, "role is required")
		return
	}
	if err := h.rbacSvc.UpdateUserRole(r.Context(), userID, req.Role); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	perms, err := h.rbacSvc.ListPermissions(r.Context())
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, perms)
}
