package service

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"dra-platform/backend/internal/domain"
	"dra-platform/backend/internal/repository"
)

type AuditService struct {
	repo  *repository.AdminAuditRepo
	ch    chan domain.AuditLog
	batch []domain.AuditLog
	mu    sync.Mutex
	wg    sync.WaitGroup
}

func NewAuditService(repo *repository.AdminAuditRepo, bufferSize int) *AuditService {
	svc := &AuditService{repo: repo, ch: make(chan domain.AuditLog, bufferSize), batch: make([]domain.AuditLog, 0, 100)}
	svc.wg.Add(1)
	go svc.processLoop()
	return svc
}

func (s *AuditService) Log(ctx context.Context, action domain.AuditAction, targetType, targetID string, changes interface{}) {
	entry := domain.AuditLog{Action: action, TargetType: targetType, TargetID: targetID, Severity: domain.AuditSeverityInfo}
	if c, ok := changes.([]domain.ChangeEntry); ok { entry.Changes = c }
	select {
	case s.ch <- entry:
	default:
	}
}

func (s *AuditService) processLoop() {
	defer s.wg.Done()
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case entry, ok := <-s.ch:
			if !ok { s.flush(); return }
			s.mu.Lock()
			s.batch = append(s.batch, entry)
			if len(s.batch) >= 100 {
				batch := s.batch; s.batch = make([]domain.AuditLog, 0, 100)
				s.mu.Unlock(); s.writeBatch(batch)
			} else { s.mu.Unlock() }
		case <-ticker.C:
			s.mu.Lock()
			if len(s.batch) > 0 {
				batch := s.batch; s.batch = make([]domain.AuditLog, 0, 100)
				s.mu.Unlock(); s.writeBatch(batch)
			} else { s.mu.Unlock() }
		}
	}
}

func (s *AuditService) writeBatch(batch []domain.AuditLog) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	for i := range batch {
		if err := s.repo.Insert(ctx, &batch[i]); err != nil {
			slog.Warn("audit write failed", "error", err, "action", batch[i].Action)
		}
	}
}

func (s *AuditService) flush() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.batch) > 0 { s.writeBatch(s.batch); s.batch = s.batch[:0] }
}

func (s *AuditService) Shutdown() { close(s.ch); s.wg.Wait() }
