package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"dra-platform/backend/internal/middleware"
	"dra-platform/backend/internal/pkg/response"

	"github.com/go-chi/chi/v5"
)

type AdminMessageRequest struct {
	Title      string   `json:"title"`
	Body       string   `json:"body"`
	Priority   string   `json:"priority"`
	TargetType string   `json:"targetType"`
	TargetIds  []string `json:"targetIds"`
	ExpiresAt  *string  `json:"expiresAt"`
}

func (h *Handler) AdminListMessages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, limit := parsePagination(r)
	offset := (page - 1) * limit

	rows, err := h.db.Query(ctx, `
		SELECT am.id, am.title, am.body, am.priority, am.target_type, am.target_ids,
		       am.sent_by, u.email as sender_email, am.sent_at, am.expires_at,
		       am.created_at,
		       (SELECT COUNT(*) FROM admin_message_reads WHERE message_id = am.id) as read_count
		FROM admin_messages am
		JOIN users u ON u.id = am.sent_by
		ORDER BY am.sent_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		response.Error(w, 500, "failed to list messages")
		return
	}
	defer rows.Close()

	type msg struct {
		ID          string    `json:"id"`
		Title       string    `json:"title"`
		Body        string    `json:"body"`
		Priority    string    `json:"priority"`
		TargetType  string    `json:"targetType"`
		TargetIds   []string  `json:"targetIds"`
		SentBy      string    `json:"sentBy"`
		SenderEmail string    `json:"senderEmail"`
		SentAt      time.Time `json:"sentAt"`
		ExpiresAt   *time.Time `json:"expiresAt,omitempty"`
		CreatedAt   time.Time `json:"createdAt"`
		ReadCount   int64     `json:"readCount"`
	}

	var messages []msg
	for rows.Next() {
		var m msg
		if err := rows.Scan(&m.ID, &m.Title, &m.Body, &m.Priority, &m.TargetType, &m.TargetIds,
			&m.SentBy, &m.SenderEmail, &m.SentAt, &m.ExpiresAt, &m.CreatedAt, &m.ReadCount); err != nil {
			continue
		}
		messages = append(messages, m)
	}
	if messages == nil {
		messages = []msg{}
	}

	var total int
	_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM admin_messages").Scan(&total)
	response.Paginated(w, messages, total, page, limit)
}

func (h *Handler) AdminGetMessage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var m struct {
		ID         string     `json:"id"`
		Title      string     `json:"title"`
		Body       string     `json:"body"`
		Priority   string     `json:"priority"`
		TargetType string     `json:"targetType"`
		TargetIds  []string   `json:"targetIds"`
		SentBy     string     `json:"sentBy"`
		SentAt     time.Time  `json:"sentAt"`
		ExpiresAt  *time.Time `json:"expiresAt,omitempty"`
		CreatedAt  time.Time  `json:"createdAt"`
	}
	err := h.db.QueryRow(r.Context(), `
		SELECT id, title, body, priority, target_type, target_ids, sent_by, sent_at, expires_at, created_at
		FROM admin_messages WHERE id = $1`, id).Scan(
		&m.ID, &m.Title, &m.Body, &m.Priority, &m.TargetType, &m.TargetIds,
		&m.SentBy, &m.SentAt, &m.ExpiresAt, &m.CreatedAt)
	if err != nil {
		response.Error(w, 404, "message not found")
		return
	}
	response.OK(w, m)
}

func (h *Handler) AdminCreateMessage(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "not authenticated")
		return
	}

	var req AdminMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, 400, "invalid JSON body")
		return
	}
	if req.Title == "" {
		response.Error(w, 400, "title is required")
		return
	}
	if req.Body == "" {
		response.Error(w, 400, "body is required")
		return
	}
	if req.TargetType == "" {
		req.TargetType = "all"
	}
	if req.Priority == "" {
		req.Priority = "normal"
	}
	if req.TargetIds == nil {
		req.TargetIds = []string{}
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.Error(w, 400, "invalid expiresAt format, use RFC3339")
			return
		}
		expiresAt = &t
	}

	var id string
	var sentAt time.Time
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO admin_messages (title, body, priority, target_type, target_ids, sent_by, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, sent_at`,
		req.Title, req.Body, req.Priority, req.TargetType, req.TargetIds, u.ID, expiresAt,
	).Scan(&id, &sentAt)
	if err != nil {
		response.Error(w, 500, "failed to create message")
		return
	}

	response.Created(w, map[string]interface{}{
		"id":       id,
		"sentAt":   sentAt,
		"targetType": req.TargetType,
	})

	// Send SSE notification to targeted users
	go h.notifyNewMessage(context.Background(), req.TargetType, req.TargetIds, map[string]interface{}{
		"type":     "new_message",
		"id":       id,
		"title":    req.Title,
		"body":     req.Body,
		"priority": req.Priority,
	})
}

func (h *Handler) AdminDeleteMessage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec(r.Context(), "DELETE FROM admin_messages WHERE id = $1", id)
	if err != nil {
		response.Error(w, 500, "failed to delete message")
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}

func (h *Handler) AdminGetMessageStats(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var totalTargets int
	ctx := r.Context()
	var targetType string
	var targetIds []string
	err := h.db.QueryRow(ctx,
		"SELECT target_type, target_ids FROM admin_messages WHERE id = $1", id).Scan(&targetType, &targetIds)
	if err != nil {
		response.Error(w, 404, "message not found")
		return
	}

	switch targetType {
	case "all":
		_ = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE status = 'active'").Scan(&totalTargets)
	case "user":
		totalTargets = len(targetIds)
	case "tier":
		if len(targetIds) > 0 {
			_ = h.db.QueryRow(ctx, `
				SELECT COUNT(*) FROM users u
				JOIN rate_limit_tiers rlt ON rlt.id = u.rate_limit_tier_id
				WHERE rlt.name = ANY($1)`, targetIds).Scan(&totalTargets)
		}
	case "group":
		if len(targetIds) > 0 {
			_ = h.db.QueryRow(ctx, `
				SELECT COUNT(DISTINCT ugm.user_id) FROM user_group_members ugm
				JOIN user_groups ug ON ug.id = ugm.group_id
				WHERE ug.name = ANY($1)`, targetIds).Scan(&totalTargets)
		}
	}

	var readCount int
	_ = h.db.QueryRow(ctx,
		"SELECT COUNT(*) FROM admin_message_reads WHERE message_id = $1", id).Scan(&readCount)

	response.OK(w, map[string]interface{}{
		"totalTargets": totalTargets,
		"readCount":    readCount,
		"unreadCount":  totalTargets - readCount,
	})
}

// --- User-facing endpoints ---

func (h *Handler) GetUserAnnouncements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	rows, err := h.db.Query(ctx, `
		SELECT id, title, body, priority, target_type, starts_at, ends_at, created_at
		FROM announcements
		WHERE show_in_app = true
		  AND (starts_at IS NULL OR starts_at <= NOW())
		  AND (ends_at IS NULL OR ends_at >= NOW())
		ORDER BY created_at DESC
		LIMIT 50`)
	if err != nil {
		response.Error(w, 500, "failed to fetch announcements")
		return
	}
	defer rows.Close()

	type userAnnouncement struct {
		ID        string     `json:"id"`
		Title     string     `json:"title"`
		Body      string     `json:"body"`
		Priority  string     `json:"priority"`
		StartDate time.Time  `json:"startDate"`
		EndDate   *time.Time `json:"endDate,omitempty"`
		CreatedAt time.Time  `json:"createdAt"`
	}

	var announcements []userAnnouncement
	for rows.Next() {
		var a userAnnouncement
		var targetType string
		if err := rows.Scan(&a.ID, &a.Title, &a.Body, &a.Priority, &targetType, &a.StartDate, &a.EndDate, &a.CreatedAt); err != nil {
			continue
		}
		announcements = append(announcements, a)
	}
	if announcements == nil {
		announcements = []userAnnouncement{}
	}

	response.OK(w, announcements)
}

func (h *Handler) GetUserMessages(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "not authenticated")
		return
	}

	ctx := r.Context()

	var userTier string
	_ = h.db.QueryRow(ctx, `
		SELECT COALESCE(rlt.name, '') FROM users u
		LEFT JOIN rate_limit_tiers rlt ON rlt.id = u.rate_limit_tier_id
		WHERE u.id = $1`, u.ID).Scan(&userTier)

	var userGroups []string
	groupRows, err := h.db.Query(ctx, `
		SELECT ug.name FROM user_groups ug
		JOIN user_group_members ugm ON ugm.group_id = ug.id
		WHERE ugm.user_id = $1`, u.ID)
	if err == nil {
		defer groupRows.Close()
		for groupRows.Next() {
			var g string
			if err := groupRows.Scan(&g); err == nil {
				userGroups = append(userGroups, g)
			}
		}
	}

	rows, err := h.db.Query(ctx, `
		SELECT am.id, am.title, am.body, am.priority, am.target_type, am.target_ids,
		       am.sent_by, u.email as sender_email, am.sent_at, am.expires_at,
		       am.created_at,
		       CASE WHEN amr.id IS NOT NULL THEN true ELSE false END as is_read
		FROM admin_messages am
		JOIN users u ON u.id = am.sent_by
		LEFT JOIN admin_message_reads amr ON amr.message_id = am.id AND amr.user_id = $1
		WHERE (
			am.target_type = 'all'
			OR (am.target_type = 'user' AND $1 = ANY(am.target_ids))
			OR (am.target_type = 'tier' AND $2 != '' AND $2 = ANY(am.target_ids))
			OR (am.target_type = 'group' AND $3::text[] && am.target_ids)
		)
		AND (am.expires_at IS NULL OR am.expires_at > NOW())
		ORDER BY am.sent_at DESC`, u.ID, userTier, userGroups)
	if err != nil {
		response.Error(w, 500, "failed to fetch messages")
		return
	}
	defer rows.Close()

	type userMsg struct {
		ID          string     `json:"id"`
		Title       string     `json:"title"`
		Body        string     `json:"body"`
		Priority    string     `json:"priority"`
		SenderEmail string     `json:"senderEmail"`
		SentAt      time.Time  `json:"sentAt"`
		ExpiresAt   *time.Time `json:"expiresAt,omitempty"`
		IsRead      bool       `json:"isRead"`
	}

	var messages []userMsg
	for rows.Next() {
		var m userMsg
		var targetType string
		var targetIds []string
		var sentBy string
		var createdAt time.Time
		if err := rows.Scan(&m.ID, &m.Title, &m.Body, &m.Priority, &targetType, &targetIds,
			&sentBy, &m.SenderEmail, &m.SentAt, &m.ExpiresAt, &createdAt, &m.IsRead); err != nil {
			continue
		}
		messages = append(messages, m)
	}
	if messages == nil {
		messages = []userMsg{}
	}

	response.OK(w, messages)
}

func (h *Handler) MarkMessageRead(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "not authenticated")
		return
	}

	messageID := chi.URLParam(r, "id")
	_, err := h.db.Exec(r.Context(), `
		INSERT INTO admin_message_reads (message_id, user_id)
		VALUES ($1, $2) ON CONFLICT DO NOTHING`, messageID, u.ID)
	if err != nil {
		response.Error(w, 500, "failed to mark as read")
		return
	}
	response.OK(w, map[string]bool{"marked": true})
}

func (h *Handler) GetUnreadMessageCount(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "not authenticated")
		return
	}

	ctx := r.Context()
	var userTier string
	_ = h.db.QueryRow(ctx, `
		SELECT COALESCE(rlt.name, '') FROM users u
		LEFT JOIN rate_limit_tiers rlt ON rlt.id = u.rate_limit_tier_id
		WHERE u.id = $1`, u.ID).Scan(&userTier)

	var userGroups []string
	groupRows, err := h.db.Query(ctx, `
		SELECT ug.name FROM user_groups ug
		JOIN user_group_members ugm ON ugm.group_id = ug.id
		WHERE ugm.user_id = $1`, u.ID)
	if err == nil {
		defer groupRows.Close()
		for groupRows.Next() {
			var g string
			if err := groupRows.Scan(&g); err == nil {
				userGroups = append(userGroups, g)
			}
		}
	}

	var count int
	err = h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM admin_messages am
		WHERE (
			am.target_type = 'all'
			OR (am.target_type = 'user' AND $1 = ANY(am.target_ids))
			OR (am.target_type = 'tier' AND $2 != '' AND $2 = ANY(am.target_ids))
			OR (am.target_type = 'group' AND $3::text[] && am.target_ids)
		)
		AND (am.expires_at IS NULL OR am.expires_at > NOW())
		AND am.id NOT IN (SELECT message_id FROM admin_message_reads WHERE user_id = $1)`,
		u.ID, userTier, userGroups).Scan(&count)
	if err != nil {
		response.OK(w, map[string]int{"unread": 0})
		return
	}
	response.OK(w, map[string]int{"unread": count})
}

func (h *Handler) MarkAllMessagesRead(w http.ResponseWriter, r *http.Request) {
	u := middleware.GetUser(r)
	if u == nil {
		response.Error(w, 401, "not authenticated")
		return
	}

	ctx := r.Context()
	var userTier string
	_ = h.db.QueryRow(ctx, `
		SELECT COALESCE(rlt.name, '') FROM users u
		LEFT JOIN rate_limit_tiers rlt ON rlt.id = u.rate_limit_tier_id
		WHERE u.id = $1`, u.ID).Scan(&userTier)

	var userGroups []string
	groupRows, err := h.db.Query(ctx, `
		SELECT ug.name FROM user_groups ug
		JOIN user_group_members ugm ON ugm.group_id = ug.id
		WHERE ugm.user_id = $1`, u.ID)
	if err == nil {
		defer groupRows.Close()
		for groupRows.Next() {
			var g string
			if err := groupRows.Scan(&g); err == nil {
				userGroups = append(userGroups, g)
			}
		}
	}

	result, err := h.db.Exec(ctx, `
		INSERT INTO admin_message_reads (message_id, user_id)
		SELECT am.id, $1 FROM admin_messages am
		WHERE (
			am.target_type = 'all'
			OR (am.target_type = 'user' AND $1 = ANY(am.target_ids))
			OR (am.target_type = 'tier' AND $2 != '' AND $2 = ANY(am.target_ids))
			OR (am.target_type = 'group' AND $3::text[] && am.target_ids)
		)
		AND (am.expires_at IS NULL OR am.expires_at > NOW())
		AND am.id NOT IN (SELECT message_id FROM admin_message_reads WHERE user_id = $1)
		ON CONFLICT DO NOTHING`, u.ID, userTier, userGroups)
	if err != nil {
		response.Error(w, 500, "failed to mark all as read")
		return
	}

	response.OK(w, map[string]int64{"marked": result.RowsAffected()})
}

// notifyNewMessage sends SSE notifications to targeted users after a message is created.
func (h *Handler) notifyNewMessage(ctx context.Context, targetType string, targetIds []string, payload interface{}) {
	if h.notificationHub == nil {
		return
	}

	switch targetType {
	case "all":
		h.notificationHub.Broadcast("new_message", payload)
	case "user":
		h.notificationHub.SendToUsers(targetIds, "new_message", payload)
	case "tier":
		rows, err := h.db.Query(ctx, `SELECT u.id FROM users u JOIN rate_limit_tiers rlt ON rlt.id = u.rate_limit_tier_id WHERE rlt.name = ANY($1)`, targetIds)
		if err != nil {
			return
		}
		defer rows.Close()
		var userIDs []string
		for rows.Next() {
			var uid string
			if err := rows.Scan(&uid); err == nil {
				userIDs = append(userIDs, uid)
			}
		}
		h.notificationHub.SendToUsers(userIDs, "new_message", payload)
	case "group":
		rows, err := h.db.Query(ctx, `SELECT DISTINCT ugm.user_id FROM user_group_members ugm JOIN user_groups ug ON ug.id = ugm.group_id WHERE ug.name = ANY($1)`, targetIds)
		if err != nil {
			return
		}
		defer rows.Close()
		var userIDs []string
		for rows.Next() {
			var uid string
			if err := rows.Scan(&uid); err == nil {
				userIDs = append(userIDs, uid)
			}
		}
		h.notificationHub.SendToUsers(userIDs, "new_message", payload)
	}
}
