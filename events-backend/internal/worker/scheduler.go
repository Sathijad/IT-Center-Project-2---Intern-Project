package worker

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/it-center/events-backend/internal/repository"
	"github.com/it-center/events-backend/internal/service"
)

type SchedulerWorker struct {
	repo        *repository.Repository
	broadcast   *service.BroadcastService
	pollInterval time.Duration
}

func NewSchedulerWorker(repo *repository.Repository, broadcast *service.BroadcastService, poll time.Duration) *SchedulerWorker {
	if poll <= 0 {
		poll = time.Minute
	}
	return &SchedulerWorker{repo: repo, broadcast: broadcast, pollInterval: poll}
}

func (w *SchedulerWorker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.pollInterval)
	defer ticker.Stop()
	for {
		if err := w.processDue(ctx); err != nil {
			slog.Error("scheduler.process", "err", err)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func (w *SchedulerWorker) processDue(ctx context.Context) error {
	events, err := w.repo.ScheduledEventsDue(ctx, 25)
	if err != nil {
		return err
	}
	for _, event := range events {
		_, err := w.broadcast.Broadcast(ctx, event.ID, []string{}, uuid.NewString(), event.CreatedBy)
		if err != nil && err != service.ErrIdempotentConflict {
			slog.Error("scheduler.broadcast", "event", event.ID, "err", err)
		}
	}
	return nil
}

