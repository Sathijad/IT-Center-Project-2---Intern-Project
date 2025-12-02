package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/it-center/events-backend/internal/models"
)

// EventRepository defines the interface for event-related repository operations
type EventRepository interface {
	ListEvents(ctx context.Context, filter models.ListFilter) (models.EventPage, error)
	GetEvent(ctx context.Context, id uuid.UUID) (*models.Event, *models.EventBody, error)
	CreateEvent(ctx context.Context, params CreateEventParams) (*models.Event, error)
	UpdateEvent(ctx context.Context, params UpdateEventParams) (*models.Event, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status models.EventStatus, moderatedBy *int64) error
	SearchTags(ctx context.Context, query string, limit int) ([]string, error)
	ListAudits(ctx context.Context, eventID uuid.UUID, limit int) ([]models.PublishAudit, error)
	GetUserBySub(ctx context.Context, sub string) (int64, []string, error)
	RecordBroadcastAudit(ctx context.Context, params BroadcastAuditParams) error
}

// BroadcastRepository defines the interface for broadcast-related repository operations
type BroadcastRepository interface {
	GetAuditByKey(ctx context.Context, key string) (*models.PublishAudit, error)
	RecordBroadcastAudit(ctx context.Context, params BroadcastAuditParams) error
	MarkBroadcast(ctx context.Context, id uuid.UUID, ts time.Time) error
}

// RepositoryInterface combines all repository interfaces
// Note: The concrete Repository struct implements this interface
type RepositoryInterface interface {
	EventRepository
	BroadcastRepository
	Close()
}

