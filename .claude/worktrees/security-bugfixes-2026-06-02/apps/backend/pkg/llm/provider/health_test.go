package provider

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHealthStatus_String(t *testing.T) {
	tests := []struct {
		status HealthStatus
		want   string
	}{
		{HealthUnknown, "unknown"},
		{HealthHealthy, "healthy"},
		{HealthDegraded, "degraded"},
		{HealthUnhealthy, "unhealthy"},
	}
	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := tt.status.String(); got != tt.want {
				t.Errorf("String() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewHealthChecker_Defaults(t *testing.T) {
	hc := NewHealthChecker(context.Background(), 0, 0)
	if hc.interval != 30*time.Second {
		t.Errorf("interval = %v, want %v", hc.interval, 30*time.Second)
	}
	if hc.timeout != 10*time.Second {
		t.Errorf("timeout = %v, want %v", hc.timeout, 10*time.Second)
	}
}

func TestHealthChecker_RegisterAndStatus(t *testing.T) {
	hc := NewHealthChecker(context.Background(), time.Hour, time.Second)

	checkFn := func(ctx context.Context) (HealthStatus, error) {
		return HealthHealthy, nil
	}

	hc.Register("openai", checkFn)

	status, ok := hc.Status("openai")
	if !ok {
		t.Fatal("expected provider to be registered")
	}
	if status.Provider != "openai" {
		t.Errorf("Provider = %v, want openai", status.Provider)
	}

	if len(hc.AllStatuses()) != 1 {
		t.Errorf("len(AllStatuses) = %v, want 1", len(hc.AllStatuses()))
	}
}

func TestHealthChecker_Unregister(t *testing.T) {
	hc := NewHealthChecker(context.Background(), time.Hour, time.Second)
	hc.Register("test", func(ctx context.Context) (HealthStatus, error) {
		return HealthHealthy, nil
	})

	hc.Unregister("test")

	_, ok := hc.Status("test")
	if ok {
		t.Error("expected provider to be unregistered")
	}
}

func TestHealthChecker_IsHealthy(t *testing.T) {
	hc := NewHealthChecker(context.Background(), time.Hour, time.Second)

	// Before check
	if hc.IsHealthy("test") {
		t.Error("expected unhealthy before registration")
	}

	hc.Register("test", func(ctx context.Context) (HealthStatus, error) {
		return HealthHealthy, nil
	})

	hc.checkProvider("test", func(ctx context.Context) (HealthStatus, error) {
		return HealthHealthy, nil
	})

	if !hc.IsHealthy("test") {
		t.Error("expected healthy after check")
	}
}

func TestHealthChecker_CheckProvider_Error(t *testing.T) {
	hc := NewHealthChecker(context.Background(), time.Hour, time.Second)
	hc.Register("test", func(ctx context.Context) (HealthStatus, error) {
		return HealthHealthy, nil
	})

	wantErr := errors.New("connection refused")
	hc.checkProvider("test", func(ctx context.Context) (HealthStatus, error) {
		return HealthUnhealthy, wantErr
	})

	status, _ := hc.Status("test")
	if status.Status != HealthUnhealthy {
		t.Errorf("Status = %v, want unhealthy", status.Status)
	}
	if !errors.Is(status.LastError, wantErr) {
		t.Errorf("LastError = %v, want %v", status.LastError, wantErr)
	}
}

func TestHTTPHealthCheck(t *testing.T) {
	t.Run("healthy", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()

		fn := HTTPHealthCheck(nil, server.URL)
		status, err := fn(context.Background())
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if status != HealthHealthy {
			t.Errorf("status = %v, want healthy", status)
		}
	})

	t.Run("unhealthy_500", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		fn := HTTPHealthCheck(nil, server.URL)
		status, err := fn(context.Background())
		if err == nil {
			t.Error("expected error")
		}
		if status != HealthUnhealthy {
			t.Errorf("status = %v, want unhealthy", status)
		}
	})

	t.Run("degraded_429", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusTooManyRequests)
		}))
		defer server.Close()

		fn := HTTPHealthCheck(nil, server.URL)
		status, err := fn(context.Background())
		if err == nil {
			t.Error("expected error")
		}
		if status != HealthDegraded {
			t.Errorf("status = %v, want degraded", status)
		}
	})

	t.Run("unhealthy_connection", func(t *testing.T) {
		fn := HTTPHealthCheck(nil, "http://localhost:1")
		status, err := fn(context.Background())
		if err == nil {
			t.Error("expected error")
		}
		if status != HealthUnhealthy {
			t.Errorf("status = %v, want unhealthy", status)
		}
	})
}

func TestHealthChecker_StartStop(t *testing.T) {
	hc := NewHealthChecker(context.Background(), 50*time.Millisecond, time.Second)
	checked := make(chan string, 1)

	hc.Register("test", func(ctx context.Context) (HealthStatus, error) {
		checked <- "checked"
		return HealthHealthy, nil
	})

	hc.Start()

	select {
	case <-checked:
		// initial check ran
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for health check")
	}

	select {
	case <-checked:
		// periodic check ran
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for periodic health check")
	}

	hc.Stop()
}
