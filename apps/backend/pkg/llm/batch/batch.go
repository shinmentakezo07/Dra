package batch

import (
	"context"
	"crypto/rand"
	"fmt"
	"sync"
	"time"

	"dra-platform/backend/pkg/llm"
)

// Status represents the status of a batch job.
type Status string

const (
	StatusPending    Status = "pending"
	StatusRunning    Status = "running"
	StatusCompleted  Status = "completed"
	StatusFailed     Status = "failed"
	StatusPartial    Status = "partial"
	StatusCancelled  Status = "cancelled"
)

// JobItem is a single request within a batch.
type JobItem struct {
	ID      string          `json:"id"`
	Request *llm.ChatRequest `json:"request"`
}

// JobResult is the result for a single item.
type JobResult struct {
	ID       string           `json:"id"`
	Response *llm.ChatResponse `json:"response,omitempty"`
	Error    string           `json:"error,omitempty"`
	Latency  int64            `json:"latency_ms"`
}

// Job represents a batch processing job.
type Job struct {
	ID        string      `json:"id"`
	Status    Status      `json:"status"`
	Items     []JobItem   `json:"items"`
	Results   []JobResult `json:"results"`
	CreatedAt time.Time   `json:"created_at"`
	StartedAt *time.Time  `json:"started_at,omitempty"`
	EndedAt   *time.Time  `json:"ended_at,omitempty"`
	Error     string      `json:"error,omitempty"`
	Progress  int         `json:"progress"`
	Total     int         `json:"total"`
	mu        sync.RWMutex
}

// Processor handles batch job execution.
type Processor struct {
	jobs        map[string]*Job
	mu          sync.RWMutex
	workerCount int
	chatFn      func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)
	ctx         context.Context
	cancel      context.CancelFunc
}

// NewProcessor creates a new batch processor.
func NewProcessor(ctx context.Context, workerCount int, chatFn func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)) *Processor {
	if workerCount <= 0 {
		workerCount = 4
	}
	ctx, cancel := context.WithCancel(ctx)
	return &Processor{
		jobs:        make(map[string]*Job),
		ctx:         ctx,
		cancel:      cancel,
		workerCount: workerCount,
		chatFn:      chatFn,
	}
}

// Stop cancels all in-flight batch processing.
func (p *Processor) Stop() {
	p.cancel()
}

// Submit creates and queues a new batch job.
func (p *Processor) Submit(ctx context.Context, items []JobItem) *Job {
	job := &Job{
		ID:        generateID(),
		Status:    StatusPending,
		Items:     items,
		Results:   make([]JobResult, 0, len(items)),
		CreatedAt: time.Now(),
		Total:     len(items),
	}

	p.mu.Lock()
	p.jobs[job.ID] = job
	p.mu.Unlock()

	go p.process(p.ctx, job)
	return job
}

// Get retrieves a job by ID.
func (p *Processor) Get(id string) (*Job, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	j, ok := p.jobs[id]
	if !ok {
		return nil, false
	}
	j.mu.RLock()
	cpy := Job{
		ID:        j.ID,
		Status:    j.Status,
		Items:     j.Items,
		Results:   make([]JobResult, len(j.Results)),
		CreatedAt: j.CreatedAt,
		StartedAt: j.StartedAt,
		EndedAt:   j.EndedAt,
		Error:     j.Error,
		Progress:  j.Progress,
		Total:     j.Total,
	}
	copy(cpy.Results, j.Results)
	j.mu.RUnlock()
	return &cpy, true
}

// List returns all jobs.
func (p *Processor) List() []*Job {
	p.mu.RLock()
	defer p.mu.RUnlock()
	result := make([]*Job, 0, len(p.jobs))
	for _, j := range p.jobs {
		j.mu.RLock()
		cpy := Job{
			ID:        j.ID,
			Status:    j.Status,
			Items:     j.Items,
			Results:   make([]JobResult, len(j.Results)),
			CreatedAt: j.CreatedAt,
			StartedAt: j.StartedAt,
			EndedAt:   j.EndedAt,
			Error:     j.Error,
			Progress:  j.Progress,
			Total:     j.Total,
		}
		copy(cpy.Results, j.Results)
		j.mu.RUnlock()
		result = append(result, &cpy)
	}
	return result
}

// Cancel attempts to cancel a pending or running job.
func (p *Processor) Cancel(id string) bool {
	p.mu.RLock()
	job, ok := p.jobs[id]
	p.mu.RUnlock()
	if !ok {
		return false
	}

	job.mu.Lock()
	defer job.mu.Unlock()
	if job.Status == StatusPending || job.Status == StatusRunning {
		job.Status = StatusCancelled
		now := time.Now()
		job.EndedAt = &now
		return true
	}
	return false
}

func (p *Processor) process(ctx context.Context, job *Job) {
	job.mu.Lock()
	if job.Status == StatusCancelled {
		job.mu.Unlock()
		return
	}
	job.Status = StatusRunning
	now := time.Now()
	job.StartedAt = &now
	job.mu.Unlock()

	ctx, cancel := context.WithTimeout(ctx, 30*time.Minute)
	defer cancel()

	results := make([]JobResult, len(job.Items))
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, p.workerCount)

	for i, item := range job.Items {
		job.mu.RLock()
		if job.Status == StatusCancelled {
			job.mu.RUnlock()
			break
		}
		job.mu.RUnlock()

		wg.Add(1)
		semaphore <- struct{}{}
		go func(idx int, it JobItem) {
			defer wg.Done()
			defer func() { <-semaphore }()

			start := time.Now()
			resp, err := p.chatFn(ctx, it.Request)
			latency := time.Since(start).Milliseconds()

			if err != nil {
				results[idx] = JobResult{
					ID:      it.ID,
					Error:   err.Error(),
					Latency: latency,
				}
			} else {
				results[idx] = JobResult{
					ID:       it.ID,
					Response: resp,
					Latency:  latency,
				}
			}

			job.mu.Lock()
			job.Progress++
			job.mu.Unlock()
		}(i, item)
	}

	wg.Wait()

	job.mu.Lock()
	defer job.mu.Unlock()

	if job.Status == StatusCancelled {
		return
	}

	job.Results = results
	end := time.Now()
	job.EndedAt = &end

	failCount := 0
	for _, r := range results {
		if r.Error != "" {
			failCount++
		}
	}

	switch {
	case failCount == 0:
		job.Status = StatusCompleted
	case failCount == len(results):
		job.Status = StatusFailed
		job.Error = "all items failed"
	default:
		job.Status = StatusPartial
		job.Error = fmt.Sprintf("%d/%d items failed", failCount, len(results))
	}
}

func generateID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("batch_%x", b)
}
