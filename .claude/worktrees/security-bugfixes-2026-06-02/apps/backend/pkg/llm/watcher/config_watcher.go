package watcher

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"os"
	"sync"
	"time"
)

// ConfigChange represents a detected configuration change.
type ConfigChange struct {
	Path      string    `json:"path"`
	OldHash   string    `json:"old_hash"`
	NewHash   string    `json:"new_hash"`
	Timestamp time.Time `json:"timestamp"`
}

// ConfigChangeHandler is called when a config file change is detected.
type ConfigChangeHandler func(ctx context.Context, change ConfigChange)

// ConfigWatcher monitors configuration files for changes with debounced reload.
// Inspired by CLIProxyAPI's watcher pattern with fsnotify-based file monitoring.
type ConfigWatcher struct {
	mu              sync.RWMutex
	paths           map[string]string // path -> last hash
	handlers        []ConfigChangeHandler
	debounce        time.Duration
	pollInterval    time.Duration
	stopped         chan struct{}
	debounceTimers  map[string]*time.Timer
}

// Option configures a ConfigWatcher.
type ConfigWatcherOption func(*ConfigWatcher)

// WithDebounce sets the debounce duration for config changes.
func WithDebounce(d time.Duration) ConfigWatcherOption {
	return func(w *ConfigWatcher) {
		w.debounce = d
	}
}

// WithPollInterval sets how often to check for file changes.
func WithPollInterval(d time.Duration) ConfigWatcherOption {
	return func(w *ConfigWatcher) {
		w.pollInterval = d
	}
}

// NewConfigWatcher creates a new config file watcher.
func NewConfigWatcher(opts ...ConfigWatcherOption) *ConfigWatcher {
	w := &ConfigWatcher{
		paths:          make(map[string]string),
		debounce:       150 * time.Millisecond,
		pollInterval:   5 * time.Second,
		stopped:        make(chan struct{}),
		debounceTimers: make(map[string]*time.Timer),
	}
	for _, opt := range opts {
		opt(w)
	}
	return w
}

// AddPath adds a file path to watch.
func (w *ConfigWatcher) AddPath(path string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	hash, err := hashFile(path)
	if err != nil {
		slog.Warn("config_watcher: cannot hash file", "path", path, "error", err)
		return
	}
	w.paths[path] = hash
	slog.Debug("config_watcher: watching", "path", path, "hash", hash[:16])
}

// OnChange registers a handler for config changes.
func (w *ConfigWatcher) OnChange(handler ConfigChangeHandler) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.handlers = append(w.handlers, handler)
}

// Start begins watching for config changes. Blocks until ctx is cancelled.
func (w *ConfigWatcher) Start(ctx context.Context) error {
	ticker := time.NewTicker(w.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-w.stopped:
			return nil
		case <-ticker.C:
			w.checkAll(ctx)
		}
	}
}

// Stop stops the config watcher.
func (w *ConfigWatcher) Stop() {
	close(w.stopped)
	w.mu.Lock()
	for _, timer := range w.debounceTimers {
		timer.Stop()
	}
	w.debounceTimers = nil
	w.mu.Unlock()
}

// checkAll checks all watched paths for changes.
func (w *ConfigWatcher) checkAll(ctx context.Context) {
	w.mu.RLock()
	paths := make(map[string]string, len(w.paths))
	for p, h := range w.paths {
		paths[p] = h
	}
	w.mu.RUnlock()

	for path, oldHash := range paths {
		newHash, err := hashFile(path)
		if err != nil {
			continue
		}
		if newHash == oldHash {
			continue
		}

		// Update hash
		w.mu.Lock()
		w.paths[path] = newHash
		w.mu.Unlock()

		slog.Info("config_watcher: change detected", "path", path,
			"old_hash", oldHash[:16], "new_hash", newHash[:16])

		// Debounce the change notification
		w.scheduleNotify(ctx, ConfigChange{
			Path:      path,
			OldHash:   oldHash,
			NewHash:   newHash,
			Timestamp: time.Now(),
		})
	}
}

// scheduleNotify debounces change notifications.
func (w *ConfigWatcher) scheduleNotify(ctx context.Context, change ConfigChange) {
	w.mu.Lock()
	if existing, ok := w.debounceTimers[change.Path]; ok {
		existing.Stop()
	}
	w.debounceTimers[change.Path] = time.AfterFunc(w.debounce, func() {
		w.notifyHandlers(ctx, change)
	})
	w.mu.Unlock()
}

// notifyHandlers calls all registered change handlers.
func (w *ConfigWatcher) notifyHandlers(ctx context.Context, change ConfigChange) {
	w.mu.RLock()
	handlers := make([]ConfigChangeHandler, len(w.handlers))
	copy(handlers, w.handlers)
	w.mu.RUnlock()

	for _, handler := range handlers {
		handler(ctx, change)
	}
}

// hashFile computes SHA256 hash of a file's contents.
func hashFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:]), nil
}
