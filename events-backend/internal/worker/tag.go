package worker

import (
	"context"
	"log/slog"
	"time"

	"github.com/it-center/events-backend/internal/repository"
)

type TagWorker struct {
	repo     *repository.Repository
	interval time.Duration
	window   time.Duration
}

func NewTagWorker(repo *repository.Repository, interval, window time.Duration) *TagWorker {
	if interval <= 0 {
		interval = time.Minute * 15
	}
	if window <= 0 {
		window = time.Hour * 24
	}
	return &TagWorker{repo: repo, interval: interval, window: window}
}

func (w *TagWorker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		if err := w.refresh(ctx); err != nil {
			slog.Error("tag.worker.refresh", "err", err)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func (w *TagWorker) refresh(ctx context.Context) error {
	since := time.Now().Add(-w.window)
	tags, err := w.repo.TrendingTags(ctx, since, 20)
	if err != nil {
		return err
	}
	if len(tags) == 0 {
		return nil
	}
	return w.repo.IncrementTagUsage(ctx, tags)
}

