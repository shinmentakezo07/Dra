package response

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type Meta struct {
	Total      int `json:"total"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"totalPages"`
}

type Body struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

func JSON(w http.ResponseWriter, status int, body Body) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("response_json_encode_failed", "error", err.Error())
	}
}

func OK(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, Body{Success: true, Data: data})
}

func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, Body{Success: true, Data: data})
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, Body{Success: false, Error: message})
}

func Paginated(w http.ResponseWriter, data interface{}, total, page, limit int) {
	JSON(w, http.StatusOK, Body{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Total:      total,
			Page:       page,
			Limit:      limit,
			TotalPages: (total + limit - 1) / limit,
		},
	})
}
