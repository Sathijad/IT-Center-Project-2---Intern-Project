package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/it-center/events-backend/internal/clients"
	"github.com/it-center/events-backend/internal/models"
	"github.com/it-center/events-backend/internal/repository"
)

var ErrIdempotentConflict = errors.New("broadcast already requested")

type BroadcastConfig struct {
	EnablePush  bool
	EnableEmail bool
	EnableTeams bool
}

type BroadcastService struct {
	repo  *repository.Repository
	queue clients.Queue
	cfg   BroadcastConfig
}

func NewBroadcastService(repo *repository.Repository, queue clients.Queue, cfg BroadcastConfig) *BroadcastService {
	return &BroadcastService{repo: repo, queue: queue, cfg: cfg}
}

func (b *BroadcastService) Broadcast(ctx context.Context, eventID uuid.UUID, channels []string, idempotencyKey string, requester int64) (*models.PublishAudit, error) {
	if idempotencyKey == "" {
		idempotencyKey = uuid.NewString()
	}
	if existing, err := b.repo.GetAuditByKey(ctx, idempotencyKey); err == nil {
		return existing, ErrIdempotentConflict
	}

	targetChannels := b.filterChannels(channels)
	if len(targetChannels) == 0 {
		targetChannels = b.defaultChannels()
	}
	if len(targetChannels) == 0 {
		return nil, errors.New("no channels enabled")
	}

	message := clients.BroadcastMessage{
		EventID:        eventID.String(),
		Channels:       targetChannels,
		IdempotencyKey: idempotencyKey,
		RequestedBy:    requester,
		RequestedAt:    time.Now().UTC(),
	}
	if err := b.queue.Enqueue(ctx, message); err != nil {
		return nil, err
	}

	audit := repository.BroadcastAuditParams{
		EventID:        eventID,
		Channel:        strings.Join(targetChannels, ","),
		Status:         "QUEUED",
		Message:        "Broadcast enqueued",
		DeliveryCount:  0,
		IdempotencyKey: idempotencyKey,
		RequestID:      uuid.New(),
		Metadata: map[string]any{
			"requested_by": requester,
		},
	}
	if err := b.repo.RecordBroadcastAudit(ctx, audit); err != nil {
		return nil, err
	}
	if err := b.repo.MarkBroadcast(ctx, eventID, time.Now().UTC()); err != nil {
		return nil, err
	}
	return b.repo.GetAuditByKey(ctx, idempotencyKey)
}

func (b *BroadcastService) filterChannels(channels []string) []string {
	if len(channels) == 0 {
		return nil
	}
	allowed := map[string]bool{}
	for _, ch := range channels {
		switch strings.ToUpper(ch) {
		case "PUSH":
			if b.cfg.EnablePush {
				allowed["PUSH"] = true
			}
		case "EMAIL":
			if b.cfg.EnableEmail {
				allowed["EMAIL"] = true
			}
		case "TEAMS":
			if b.cfg.EnableTeams {
				allowed["TEAMS"] = true
			}
		}
	}
	out := make([]string, 0, len(allowed))
	for k := range allowed {
		out = append(out, k)
	}
	return out
}

func (b *BroadcastService) defaultChannels() []string {
	channels := []string{}
	if b.cfg.EnablePush {
		channels = append(channels, "PUSH")
	}
	if b.cfg.EnableEmail {
		channels = append(channels, "EMAIL")
	}
	if b.cfg.EnableTeams {
		channels = append(channels, "TEAMS")
	}
	return channels
}

