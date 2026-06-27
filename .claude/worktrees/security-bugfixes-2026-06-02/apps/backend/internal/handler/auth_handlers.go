package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/pkg/response"
	"dra-platform/backend/pkg/email"
)

func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var req domain.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	auth, appErr := h.userSvc.Register(r.Context(), req)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}
	response.Created(w, auth)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	auth, appErr := h.userSvc.Authenticate(r.Context(), req)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}
	response.OK(w, auth)
}

func (h *Handler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	auth, appErr := h.userSvc.Authenticate(r.Context(), req)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}
	if auth == nil || auth.User.ID == "" || !auth.User.IsAdmin() {
		response.Error(w, 403, "Admin access required")
		return
	}
	if h.adminSessionRepo != nil {
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip = r.RemoteAddr
		}
		_, _ = h.adminSessionRepo.Create(r.Context(), auth.User.ID, "", ip, r.UserAgent(), time.Now().Add(24*time.Hour))
	}
	response.OK(w, auth)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Not authenticated")
		return
	}
	user, err := h.userSvc.GetByID(r.Context(), u.ID)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, user)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Name == "" || len(req.Name) < 2 {
		response.Error(w, 400, "Name must be at least 2 characters")
		return
	}
	if req.Email == "" {
		response.Error(w, 400, "Email is required")
		return
	}
	if err := h.userSvc.UpdateProfile(r.Context(), u.ID, req.Name, req.Email); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		response.Error(w, 400, "Current and new passwords are required")
		return
	}
	if len(req.NewPassword) < 6 {
		response.Error(w, 400, "New password must be at least 6 characters")
		return
	}
	if err := h.userSvc.ChangePassword(r.Context(), u.ID, req.CurrentPassword, req.NewPassword); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) OAuthLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Provider string `json:"provider"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Email == "" || req.Name == "" {
		response.Error(w, 400, "Email and name are required")
		return
	}
	auth, appErr := h.userSvc.OAuthLogin(r.Context(), req.Email, req.Name, req.Provider)
	if appErr != nil {
		response.JSON(w, appErr.Status, response.Body{Success: false, Error: appErr.Message})
		return
	}
	response.OK(w, auth)
}

func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Email == "" {
		response.Error(w, 400, "Email is required")
		return
	}
	token, err := h.userSvc.RequestPasswordReset(r.Context(), req.Email)
	if err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	if token != "" && h.emailSender != nil {
		origin := h.cfg.FrontendURL
		if origin == "" {
			origin = "http://localhost:3000"
		}
		resetURL := fmt.Sprintf("%s/reset-password?token=%s", origin, token)
		if eErr := email.SendPasswordReset(h.emailSender, req.Email, resetURL); eErr != nil {
			logger.Error("password_reset_email_failed", "error", eErr.Error())
		}
	}
	response.OK(w, map[string]bool{"sent": true})
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		response.Error(w, 400, "Token and new password are required")
		return
	}
	if len(req.NewPassword) < 6 {
		response.Error(w, 400, "Password must be at least 6 characters")
		return
	}
	if err := h.userSvc.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"updated": true})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	tokenStr := ""
	if auth := r.Header.Get("Authorization"); auth != "" && len(auth) > 7 && auth[:7] == "Bearer " {
		tokenStr = auth[7:]
	}
	if tokenStr == "" {
		for _, name := range []string{"authjs.session-token", "__Secure-authjs.session-token", "next-auth.session-token", "__Secure-next-auth.session-token"} {
			if c, err := r.Cookie(name); err == nil {
				tokenStr = c.Value
				break
			}
		}
	}

	if tokenStr != "" {
		u := middleware.GetUser(r)
		userID := ""
		if u != nil {
			userID = u.ID
		}
		if err := h.tokenBlacklistRepo.Blacklist(r.Context(), tokenStr, userID, time.Now().Add(24*time.Hour)); err != nil {
			logger.Warn("logout_blacklist_failed", "error", err.Error())
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "authjs.session-token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "__Secure-authjs.session-token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	response.OK(w, map[string]bool{"logged_out": true})
}

func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "Authentication required")
		return
	}
	if err := h.userSvc.Delete(r.Context(), u.ID); err != nil {
		response.JSON(w, err.Status, response.Body{Success: false, Error: err.Message})
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}
