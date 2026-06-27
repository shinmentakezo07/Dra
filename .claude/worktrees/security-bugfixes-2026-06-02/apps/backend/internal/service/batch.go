package service

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
	"dra-platform/backend/pkg/llm"
	"dra-platform/backend/pkg/llm/batch"
)

// BatchService handles batch job operations with persistence.
type BatchService struct {
	repo      *repository.BatchJobRepo
	chatFn    func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)
}

// NewBatchService creates a new batch service.
func NewBatchService(repo *repository.BatchJobRepo, chatFn func(ctx context.Context, req *llm.ChatRequest) (*llm.ChatResponse, error)) *BatchService {
	return &BatchService{repo: repo, chatFn: chatFn}
}

// Submit creates a pending batch job in the database and launches async processing.
func (s *BatchService) Submit(ctx context.Context, userID string, items []batch.JobItem) (*repository.BatchJob, *domain.AppError) {
	if len(items) == 0 {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "Items are required")
	}
	if len(items) > 100 {
		return nil, domain.NewError(domain.ErrBadRequest, 400, "Maximum 100 items per batch")
	}

	id := generateBatchID()
	itemsJSON, err := json.Marshal(items)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to marshal items", err)
	}

	job, err := s.repo.Create(ctx, id, userID, string(batch.StatusPending), itemsJSON, len(items))
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "failed to create batch job", err)
	}

	go s.process(job.ID, items)

	return job, nil
}

// Get retrieves a batch job by ID for a user.
func (s *BatchService) Get(ctx context.Context, userID, id string) (*repository.BatchJob, *domain.AppError) {
	job, err := s.repo.ByID(ctx, id)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if job == nil || job.UserID != userID {
		return nil, domain.NewError(domain.ErrNotFound, 404, "batch job not found")
	}
	return job, nil
}

// List retrieves all batch jobs for a user.
func (s *BatchService) List(ctx context.Context, userID string) ([]repository.BatchJob, *domain.AppError) {
	jobs, err := s.repo.ByUser(ctx, userID, 100, 0)
	if err != nil {
		return nil, domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	return jobs, nil
}

// Cancel marks a pending/running batch job as cancelled.
func (s *BatchService) Cancel(ctx context.Context, userID, id string) *domain.AppError {
	job, err := s.repo.ByID(ctx, id)
	if err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "database error", err)
	}
	if job == nil || job.UserID != userID {
		return domain.NewError(domain.ErrNotFound, 404, "batch job not found")
	}
	if job.Status == string(batch.StatusCompleted) || job.Status == string(batch.StatusFailed) || job.Status == string(batch.StatusCancelled) {
		return domain.NewError(domain.ErrBadRequest, 400, "batch job cannot be cancelled")
	}
	if err := s.repo.UpdateStatus(ctx, id, string(batch.StatusCancelled), nil, "cancelled by user", job.Progress); err != nil {
		return domain.Wrap(domain.ErrInternal, 500, "failed to cancel batch job", err)
	}
	return nil
}

func (s *BatchService) process(jobID string, items []batch.JobItem) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	if err := s.repo.UpdateRunning(ctx, jobID); err != nil {
		if err := s.repo.UpdateCompleted(ctx, jobID, string(batch.StatusFailed), []byte("[]"), "failed to start job", 0); err != nil {
			slog.Warn("batch_update_failed", "jobID", jobID, "error", err.Error())
		}
		return
	}

	// Process items manually to update DB progress after each item.
	results := make([]batch.JobResult, len(items))
	var progress int
	workerCount := 4
	semaphore := make(chan struct{}, workerCount)
	done := make(chan struct{})

	type result struct {
		idx int
		res batch.JobResult
	}
	resCh := make(chan result, len(items))

	for i, item := range items {
		semaphore <- struct{}{}
		go func(idx int, it batch.JobItem) {
			defer func() { <-semaphore }()

			start := time.Now()
			var resp *llm.ChatResponse
			var err error
			func() {
				defer func() {
					if r := recover(); r != nil {
						err = fmt.Errorf("panic: %v", r)
					}
				}()
				resp, err = s.chatFn(ctx, it.Request)
			}()
			latency := time.Since(start).Milliseconds()

			var jr batch.JobResult
			if err != nil {
				jr = batch.JobResult{ID: it.ID, Error: err.Error(), Latency: latency}
			} else {
				jr = batch.JobResult{ID: it.ID, Response: resp, Latency: latency}
			}
			resCh <- result{idx: idx, res: jr}
		}(i, item)
	}

	go func() {
		for i := 0; i < len(items); i++ {
			r := <-resCh
			results[r.idx] = r.res
			progress++
			resultsJSON, _ := json.Marshal(results)
			if err := s.repo.UpdateStatus(ctx, jobID, string(batch.StatusRunning), resultsJSON, "", progress); err != nil {
					slog.Warn("batch_status_update_failed", "jobID", jobID, "error", err.Error())
				}
		}
		close(done)
	}()

	<-done

	failCount := 0
	for _, r := range results {
		if r.Error != "" {
			failCount++
		}
	}

	var status, errMsg string
	switch {
	case failCount == 0:
		status = string(batch.StatusCompleted)
	case failCount == len(results):
		status = string(batch.StatusFailed)
		errMsg = "all items failed"
	default:
		status = string(batch.StatusPartial)
		errMsg = fmt.Sprintf("%d/%d items failed", failCount, len(results))
	}

	resultsJSON, _ := json.Marshal(results)
	if err := s.repo.UpdateCompleted(ctx, jobID, status, resultsJSON, errMsg, progress); err != nil {
		slog.Warn("batch_complete_update_failed", "jobID", jobID, "error", err.Error())
	}
}

func generateBatchID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("batch_%x", b)
}
