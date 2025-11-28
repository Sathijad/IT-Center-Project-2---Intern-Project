package models

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type EventStatus string

const (
	StatusDraft      EventStatus = "DRAFT"
	StatusPending    EventStatus = "PENDING_MODERATION"
	StatusScheduled  EventStatus = "SCHEDULED"
	StatusApproved   EventStatus = "APPROVED"
	StatusRejected   EventStatus = "REJECTED"
	StatusPublished  EventStatus = "PUBLISHED"
	StatusArchived   EventStatus = "ARCHIVED"
)

var ModeratableStatuses = map[EventStatus]bool{
	StatusPending:   true,
	StatusApproved:  true,
	StatusRejected:  true,
	StatusScheduled: true,
}

// Event represents the main events table row.
type Event struct {
	ID             uuid.UUID   `json:"id"`
	Title          string      `json:"title"`
	Summary        string      `json:"summary"`
	Status         EventStatus `json:"status"`
	Channel        string      `json:"channel"`
	Tags           []string    `json:"tags"`
	Attachments    []Attachment `json:"attachments"`
	RsvpRequired   bool        `json:"rsvpRequired"`
	CreatedBy      int64       `json:"createdBy"`
	ModeratedBy    *int64      `json:"moderatedBy"`
	ModeratedAt    *time.Time  `json:"moderatedAt"`
	ScheduledFor   *time.Time  `json:"scheduledFor"`
	PublishedAt    *time.Time  `json:"publishedAt"`
	BroadcastAt    *time.Time  `json:"broadcastAt"`
	ExpiresAt      *time.Time  `json:"expiresAt"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
	ETag           string      `json:"etag"`
}

type Attachment struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Type string `json:"type"`
}

// EventBody stores the sanitized HTML + text version.
type EventBody struct {
	ID           uuid.UUID `json:"id"`
	EventID      uuid.UUID `json:"eventId"`
	HTML         string    `json:"html"`
	Sanitized    string    `json:"sanitized"`
	PlainText    string    `json:"plainText"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type PublishAudit struct {
	ID              int64      `json:"id"`
	EventID         uuid.UUID  `json:"eventId"`
	Channel         string     `json:"channel"`
	Status          string     `json:"status"`
	Message         string     `json:"message"`
	DeliveryCount   int        `json:"deliveryCount"`
	ErrorDetails    *string    `json:"errorDetails"`
	RequestID       uuid.UUID  `json:"requestId"`
	IdempotencyKey  string     `json:"idempotencyKey"`
	Metadata        any        `json:"metadata"`
	CreatedAt       time.Time  `json:"createdAt"`
}

// Pagination bundle for list endpoints.
type EventPage struct {
	Items      []Event `json:"items"`
	Page       int     `json:"page"`
	Size       int     `json:"size"`
	Total      int64   `json:"total"`
	HasNext    bool    `json:"hasNext"`
	NextCursor string  `json:"nextCursor,omitempty"`
}

// ListFilter controls GET /events results.
type ListFilter struct {
	Page       int
	Size       int
	Since      *time.Time
	Status     []EventStatus
	Tags       []string
	Channel    string
	UserID     int64
	SearchTerm string
}

type BroadcastRequest struct {
	IdempotencyKey string   `json:"idempotencyKey"`
	Channels       []string `json:"channels"`
}

type ModerationAction struct {
	Action string `json:"action"`
	Notes  string `json:"notes"`
}

func (f *ListFilter) Normalise(maxSize, defaultSize int) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.Size <= 0 {
		f.Size = defaultSize
	}
	if f.Size > maxSize {
		f.Size = maxSize
	}
	if f.Channel != "" {
		f.Channel = strings.ToUpper(f.Channel)
	}
	for i, s := range f.Status {
		f.Status[i] = EventStatus(strings.ToUpper(string(s)))
	}
	for i, tag := range f.Tags {
		f.Tags[i] = strings.TrimSpace(strings.ToLower(tag))
	}
}

