package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/microcosm-cc/bluemonday"

	"github.com/it-center/events-backend/internal/models"
	"github.com/it-center/events-backend/internal/repository"
)

var (
	ErrNotFound        = errors.New("event not found")
	ErrAlreadyHandled  = errors.New("event already handled")
	ErrInvalidAction   = errors.New("invalid action")
	ErrModerationState = errors.New("cannot moderate event in current state")
)

type EventService struct {
	repo       *repository.Repository
	sanitizer  *bluemonday.Policy
	validate   *validator.Validate
	defaultTag string
}

func NewEventService(repo *repository.Repository) *EventService {
	validate := validator.New(validator.WithRequiredStructEnabled())
	sanitizer := bluemonday.UGCPolicy()
	return &EventService{
		repo:       repo,
		sanitizer:  sanitizer,
		validate:   validate,
		defaultTag: "general",
	}
}

type CreateEventRequest struct {
	Title        string             `json:"title" validate:"required,min=4,max=180"`
	Summary      string             `json:"summary" validate:"required,min=10,max=500"`
	Body         string             `json:"body" validate:"required"`
	Channel      string             `json:"channel" validate:"required"`
	Tags         []string           `json:"tags"`
	Attachments  []models.Attachment `json:"attachments"`
	RsvpRequired bool               `json:"rsvpRequired"`
	ScheduledFor *time.Time         `json:"scheduledFor"`
	ExpiresAt    *time.Time         `json:"expiresAt"`
}

type UpdateEventRequest struct {
	Title        string             `json:"title" validate:"required,min=4,max=180"`
	Summary      string             `json:"summary" validate:"required,min=10,max=500"`
	Body         string             `json:"body" validate:"required"`
	Channel      string             `json:"channel" validate:"required"`
	Tags         []string           `json:"tags"`
	Attachments  []models.Attachment `json:"attachments"`
	RsvpRequired bool               `json:"rsvpRequired"`
	ScheduledFor *time.Time         `json:"scheduledFor"`
	ExpiresAt    *time.Time         `json:"expiresAt"`
}

func (s *EventService) ListEvents(ctx context.Context, filter models.ListFilter) (models.EventPage, error) {
	return s.repo.ListEvents(ctx, filter)
}

func (s *EventService) GetEvent(ctx context.Context, id uuid.UUID) (*models.Event, *models.EventBody, error) {
	event, body, err := s.repo.GetEvent(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}
	return event, body, nil
}

func (s *EventService) CreateEvent(ctx context.Context, req CreateEventRequest, userID int64) (*models.Event, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}
	if len(req.Tags) == 0 {
		req.Tags = []string{s.defaultTag}
	}
	params := repository.CreateEventParams{
		Title:        req.Title,
		Summary:      req.Summary,
		Status:       models.StatusPending,
		Channel:      strings.ToUpper(req.Channel),
		Tags:         normaliseTags(req.Tags),
		Attachments:  req.Attachments,
		RsvpRequired: req.RsvpRequired,
		ScheduledFor: req.ScheduledFor,
		ExpiresAt:    req.ExpiresAt,
		BodyHTML:     req.Body,
		Sanitized:    s.sanitizeHTML(req.Body),
		PlainText:    stripHTML(req.Body),
		CreatedBy:    userID,
	}
	return s.repo.CreateEvent(ctx, params)
}

func (s *EventService) UpdateEvent(ctx context.Context, id uuid.UUID, req UpdateEventRequest) (*models.Event, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, err
	}
	params := repository.UpdateEventParams{
		ID:           id,
		Title:        req.Title,
		Summary:      req.Summary,
		Channel:      strings.ToUpper(req.Channel),
		Tags:         normaliseTags(req.Tags),
		Attachments:  req.Attachments,
		RsvpRequired: req.RsvpRequired,
		ScheduledFor: req.ScheduledFor,
		ExpiresAt:    req.ExpiresAt,
		BodyHTML:     req.Body,
		Sanitized:    s.sanitizeHTML(req.Body),
		PlainText:    stripHTML(req.Body),
	}
	return s.repo.UpdateEvent(ctx, params)
}

func (s *EventService) Moderate(ctx context.Context, id uuid.UUID, action, notes string, moderatorID int64) error {
	var targetStatus models.EventStatus
	switch strings.ToUpper(action) {
	case "APPROVE":
		targetStatus = models.StatusApproved
	case "REJECT":
		targetStatus = models.StatusRejected
	default:
		return ErrInvalidAction
	}
	if err := s.repo.UpdateStatus(ctx, id, targetStatus, &moderatorID); err != nil {
		return err
	}
	_ = s.repo.RecordBroadcastAudit(ctx, repository.BroadcastAuditParams{
		EventID:        id,
		Channel:        "MODERATION",
		Status:         string(targetStatus),
		Message:        fmt.Sprintf("Moderator %d: %s", moderatorID, notes),
		DeliveryCount:  0,
		IdempotencyKey: uuid.NewString(),
		RequestID:      uuid.New(),
		Metadata:       map[string]string{"notes": notes},
	})
	return nil
}

func (s *EventService) TagSuggestions(ctx context.Context, query string, limit int) ([]string, error) {
	if limit <= 0 || limit > 10 {
		limit = 5
	}
	return s.repo.SearchTags(ctx, query, limit)
}

func (s *EventService) ListAudits(ctx context.Context, eventID uuid.UUID, limit int) ([]models.PublishAudit, error) {
	if limit <= 0 || limit > 20 {
		limit = 10
	}
	return s.repo.ListAudits(ctx, eventID, limit)
}

func (s *EventService) sanitizeHTML(html string) string {
	safe := s.sanitizer.Sanitize(html)
	if strings.TrimSpace(safe) == "" {
		return "<p></p>"
	}
	return safe
}

func stripHTML(html string) string {
	withoutTags := bluemonday.StrictPolicy().Sanitize(html)
	return strings.TrimSpace(withoutTags)
}

func normaliseTags(tags []string) []string {
	if len(tags) == 0 {
		return []string{}
	}
	clean := make([]string, 0, len(tags))
	seen := map[string]struct{}{}
	for _, t := range tags {
		tag := strings.ToLower(strings.TrimSpace(t))
		if tag == "" {
			continue
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		clean = append(clean, tag)
	}
	return clean
}

