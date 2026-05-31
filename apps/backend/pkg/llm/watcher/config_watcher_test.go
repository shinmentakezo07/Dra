package watcher

import (
	"context"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func TestConfigWatcherDetectsChange(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")
	os.WriteFile(configPath, []byte(`{"version":1}`), 0644)

	w := NewConfigWatcher(
		WithDebounce(10*time.Millisecond),
		WithPollInterval(50*time.Millisecond),
	)
	w.AddPath(configPath)

	var changeCount atomic.Int32
	w.OnChange(func(ctx context.Context, change ConfigChange) {
		changeCount.Add(1)
		if change.Path != configPath {
			t.Errorf("unexpected path: %s", change.Path)
		}
	})

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	go w.Start(ctx)

	// Wait a bit then modify the file
	time.Sleep(100 * time.Millisecond)
	os.WriteFile(configPath, []byte(`{"version":2}`), 0644)

	// Wait for detection
	<-ctx.Done()

	if changeCount.Load() == 0 {
		t.Error("expected at least one config change notification")
	}
}

func TestConfigWatcherNoChange(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")
	os.WriteFile(configPath, []byte(`{"version":1}`), 0644)

	w := NewConfigWatcher(
		WithDebounce(10*time.Millisecond),
		WithPollInterval(50*time.Millisecond),
	)
	w.AddPath(configPath)

	var changeCount atomic.Int32
	w.OnChange(func(ctx context.Context, change ConfigChange) {
		changeCount.Add(1)
	})

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	w.Start(ctx)

	if changeCount.Load() != 0 {
		t.Error("expected no config change notifications")
	}
}

func TestConfigWatcherStop(t *testing.T) {
	w := NewConfigWatcher()
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		w.Start(ctx)
		close(done)
	}()

	cancel()
	select {
	case <-done:
		// OK
	case <-time.After(time.Second):
		t.Error("Start did not return after cancel")
	}
}
