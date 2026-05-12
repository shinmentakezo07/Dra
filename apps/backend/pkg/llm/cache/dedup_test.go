package cache

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"dra-platform/backend/pkg/llm"
)

type fakeCache struct {
	data map[string]*llm.ChatResponse
	mu   sync.RWMutex
}

func newFakeCache() *fakeCache {
	return &fakeCache{data: make(map[string]*llm.ChatResponse)}
}

func (f *fakeCache) Get(ctx context.Context, key string) (*llm.ChatResponse, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	if v, ok := f.data[key]; ok {
		return v, nil
	}
	return nil, ErrCacheMiss
}

func (f *fakeCache) Set(ctx context.Context, key string, value *llm.ChatResponse, ttl time.Duration) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.data[key] = value
	return nil
}

func (f *fakeCache) Delete(ctx context.Context, key string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.data, key)
	return nil
}

func (f *fakeCache) Clear(ctx context.Context) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.data = make(map[string]*llm.ChatResponse)
	return nil
}

func TestDedupCache_Get_CacheHit(t *testing.T) {
	fc := newFakeCache()
	_ = fc.Set(context.Background(), "key1", &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "cached"}}}}, time.Minute)

	dc := NewDedupCache(fc)
	resp, err := dc.Get(context.Background(), "key1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "cached" {
		t.Errorf("Content = %v, want cached", resp.Choices[0].Message.Content)
	}
}

func TestDedupCache_Get_CacheMiss(t *testing.T) {
	fc := newFakeCache()
	dc := NewDedupCache(fc)
	_, err := dc.Get(context.Background(), "missing")
	if !errors.Is(err, ErrCacheMiss) {
		t.Errorf("error = %v, want ErrCacheMiss", err)
	}
}

func TestDedupCache_Do_Deduplicates(t *testing.T) {
	fc := newFakeCache()
	dc := NewDedupCache(fc)

	var callCount int32
	fn := func() (*llm.ChatResponse, error) {
		time.Sleep(50 * time.Millisecond)
		atomic.AddInt32(&callCount, 1)
		return &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "result"}}}}, nil
	}

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := dc.Do(context.Background(), "shared-key", time.Minute, fn)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if resp.Choices[0].Message.Content != "result" {
				t.Errorf("Content = %v, want result", resp.Choices[0].Message.Content)
			}
		}()
	}
	wg.Wait()

	if atomic.LoadInt32(&callCount) != 1 {
		t.Errorf("callCount = %v, want 1 (deduplication failed)", callCount)
	}
}

func TestDedupCache_Do_CacheHit_SkipsFn(t *testing.T) {
	fc := newFakeCache()
	_ = fc.Set(context.Background(), "key", &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "cached"}}}}, time.Minute)

	dc := NewDedupCache(fc)
	var callCount int32
	fn := func() (*llm.ChatResponse, error) {
		atomic.AddInt32(&callCount, 1)
		return &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "new"}}}}, nil
	}

	resp, err := dc.Do(context.Background(), "key", time.Minute, fn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Choices[0].Message.Content != "cached" {
		t.Errorf("Content = %v, want cached", resp.Choices[0].Message.Content)
	}
	if atomic.LoadInt32(&callCount) != 0 {
		t.Errorf("callCount = %v, want 0", callCount)
	}
}

func TestDedupCache_Do_ErrorPropagated(t *testing.T) {
	fc := newFakeCache()
	dc := NewDedupCache(fc)

	wantErr := errors.New("upstream error")
	fn := func() (*llm.ChatResponse, error) {
		return nil, wantErr
	}

	_, err := dc.Do(context.Background(), "err-key", time.Minute, fn)
	if !errors.Is(err, wantErr) {
		t.Errorf("error = %v, want %v", err, wantErr)
	}
}

func TestDedupCache_SetAndDelete(t *testing.T) {
	fc := newFakeCache()
	dc := NewDedupCache(fc)

	_ = dc.Set(context.Background(), "k", &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "v"}}}}, time.Minute)
	resp, _ := dc.Get(context.Background(), "k")
	if resp.Choices[0].Message.Content != "v" {
		t.Errorf("Content = %v, want v", resp.Choices[0].Message.Content)
	}

	_ = dc.Delete(context.Background(), "k")
	_, err := dc.Get(context.Background(), "k")
	if !errors.Is(err, ErrCacheMiss) {
		t.Errorf("error = %v, want ErrCacheMiss", err)
	}
}

func TestDedupCache_Clear(t *testing.T) {
	fc := newFakeCache()
	dc := NewDedupCache(fc)

	_ = dc.Set(context.Background(), "k", &llm.ChatResponse{Choices: []llm.Choice{{Message: llm.Message{Content: "v"}}}}, time.Minute)
	_ = dc.Clear(context.Background())

	_, err := dc.Get(context.Background(), "k")
	if !errors.Is(err, ErrCacheMiss) {
		t.Errorf("error = %v, want ErrCacheMiss", err)
	}
}

func (f *fakeCache) Stats(ctx context.Context) (Stats, error) {
	return Stats{}, nil
}
