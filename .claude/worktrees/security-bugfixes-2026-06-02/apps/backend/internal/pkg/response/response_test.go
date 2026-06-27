package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJSON_SetsContentType(t *testing.T) {
	w := httptest.NewRecorder()
	JSON(w, http.StatusOK, Body{Success: true, Data: "ok"})

	if w.Header().Get("Content-Type") != "application/json" {
		t.Errorf("Content-Type = %q, want %q", w.Header().Get("Content-Type"), "application/json")
	}
	if w.Code != http.StatusOK {
		t.Errorf("Status = %d, want %d", w.Code, http.StatusOK)
	}
}

func TestJSON_EncodesBody(t *testing.T) {
	w := httptest.NewRecorder()
	JSON(w, http.StatusCreated, Body{Success: true, Data: map[string]string{"id": "1"}})

	var resp Body
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal error = %v", err)
	}
	if !resp.Success {
		t.Error("Success = false, want true")
	}
}

func TestOK(t *testing.T) {
	w := httptest.NewRecorder()
	OK(w, "hello")

	if w.Code != http.StatusOK {
		t.Errorf("Status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp Body
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal error = %v", err)
	}
	if !resp.Success {
		t.Error("Success = false, want true")
	}
	if resp.Data != "hello" {
		t.Errorf("Data = %v, want %q", resp.Data, "hello")
	}
	if resp.Error != "" {
		t.Errorf("Error = %q, want empty", resp.Error)
	}
}

func TestCreated(t *testing.T) {
	w := httptest.NewRecorder()
	Created(w, map[string]int{"id": 42})

	if w.Code != http.StatusCreated {
		t.Errorf("Status = %d, want %d", w.Code, http.StatusCreated)
	}

	var resp Body
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal error = %v", err)
	}
	if !resp.Success {
		t.Error("Success = false, want true")
	}
}

func TestError(t *testing.T) {
	tests := []struct {
		name    string
		status  int
		message string
	}{
		{"bad request", http.StatusBadRequest, "invalid input"},
		{"not found", http.StatusNotFound, "resource not found"},
		{"internal error", http.StatusInternalServerError, "server error"},
		{"unauthorized", http.StatusUnauthorized, "missing token"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			Error(w, tt.status, tt.message)

			if w.Code != tt.status {
				t.Errorf("Status = %d, want %d", w.Code, tt.status)
			}

			var resp Body
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("json.Unmarshal error = %v", err)
			}
			if resp.Success {
				t.Error("Success = true, want false")
			}
			if resp.Error != tt.message {
				t.Errorf("Error = %q, want %q", resp.Error, tt.message)
			}
			if resp.Data != nil {
				t.Errorf("Data = %v, want nil", resp.Data)
			}
		})
	}
}

func TestPaginated(t *testing.T) {
	w := httptest.NewRecorder()
	items := []string{"a", "b", "c"}
	Paginated(w, items, 25, 2, 10)

	if w.Code != http.StatusOK {
		t.Errorf("Status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp Body
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal error = %v", err)
	}
	if !resp.Success {
		t.Error("Success = false, want true")
	}
	if resp.Meta == nil {
		t.Fatal("Meta is nil")
	}
	if resp.Meta.Total != 25 {
		t.Errorf("Meta.Total = %d, want 25", resp.Meta.Total)
	}
	if resp.Meta.Page != 2 {
		t.Errorf("Meta.Page = %d, want 2", resp.Meta.Page)
	}
	if resp.Meta.Limit != 10 {
		t.Errorf("Meta.Limit = %d, want 10", resp.Meta.Limit)
	}
	if resp.Meta.TotalPages != 3 {
		t.Errorf("Meta.TotalPages = %d, want 3", resp.Meta.TotalPages)
	}
}

func TestPaginated_TotalPages(t *testing.T) {
	tests := []struct {
		total      int
		limit      int
		wantPages  int
	}{
		{0, 10, 0},
		{1, 10, 1},
		{10, 10, 1},
		{11, 10, 2},
		{25, 10, 3},
		{100, 10, 10},
		{99, 10, 10},
		{1, 1, 1},
		{5, 2, 3},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			w := httptest.NewRecorder()
			Paginated(w, []string{}, tt.total, 1, tt.limit)

			var resp Body
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("json.Unmarshal error = %v", err)
			}
			if resp.Meta.TotalPages != tt.wantPages {
				t.Errorf("total=%d, limit=%d: TotalPages = %d, want %d",
					tt.total, tt.limit, resp.Meta.TotalPages, tt.wantPages)
			}
		})
	}
}

func TestBody_OmitEmpty(t *testing.T) {
	w := httptest.NewRecorder()
	OK(w, nil)

	body := w.Body.String()
	if contains(body, `"data"`) {
		t.Errorf("response body should omit data field when nil: %s", body)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && search(s, substr)
}

func search(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
