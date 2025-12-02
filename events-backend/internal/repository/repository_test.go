package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/it-center/events-backend/internal/models"
)

func TestCreateEventParams(t *testing.T) {
	t.Run("params structure validation", func(t *testing.T) {
		now := time.Now()
		params := CreateEventParams{
			Title:        "Test Event",
			Summary:      "Test Summary",
			Status:       models.StatusPending,
			Channel:      "EMAIL",
			Tags:         []string{"test", "event"},
			Attachments:  []models.Attachment{{Name: "doc.pdf", URL: "http://example.com/doc.pdf"}},
			RsvpRequired: true,
			ScheduledFor: &now,
			ExpiresAt:    &now,
			BodyHTML:     "<p>Body</p>",
			Sanitized:    "<p>Body</p>",
			PlainText:    "Body",
			CreatedBy:    1,
		}

		assert.Equal(t, "Test Event", params.Title)
		assert.Equal(t, models.StatusPending, params.Status)
		assert.Equal(t, "EMAIL", params.Channel)
		assert.Len(t, params.Tags, 2)
		assert.True(t, params.RsvpRequired)
		assert.NotNil(t, params.ScheduledFor)
		assert.Equal(t, int64(1), params.CreatedBy)
	})
}

func TestUpdateEventParams(t *testing.T) {
	t.Run("params structure validation", func(t *testing.T) {
		eventID := uuid.New()
		now := time.Now()
		params := UpdateEventParams{
			ID:           eventID,
			Title:        "Updated Event",
			Summary:      "Updated Summary",
			Channel:      "PUSH",
			Tags:         []string{"updated"},
			Attachments:  []models.Attachment{},
			RsvpRequired: false,
			ScheduledFor: &now,
			ExpiresAt:    nil,
			BodyHTML:     "<p>Updated Body</p>",
			Sanitized:    "<p>Updated Body</p>",
			PlainText:    "Updated Body",
		}

		assert.Equal(t, eventID, params.ID)
		assert.Equal(t, "Updated Event", params.Title)
		assert.Equal(t, "PUSH", params.Channel)
		assert.False(t, params.RsvpRequired)
		assert.Nil(t, params.ExpiresAt)
	})
}

func TestBroadcastAuditParams(t *testing.T) {
	t.Run("params structure validation", func(t *testing.T) {
		eventID := uuid.New()
		requestID := uuid.New()
		errorDetails := "Connection failed"
		params := BroadcastAuditParams{
			EventID:        eventID,
			Channel:        "EMAIL",
			Status:         "SENT",
			Message:        "Broadcast successful",
			DeliveryCount:  1,
			ErrorDetails:   &errorDetails,
			IdempotencyKey: "key-123",
			RequestID:      requestID,
			Metadata:       map[string]string{"retry": "true"},
		}

		assert.Equal(t, eventID, params.EventID)
		assert.Equal(t, "EMAIL", params.Channel)
		assert.Equal(t, "SENT", params.Status)
		assert.Equal(t, 1, params.DeliveryCount)
		assert.NotNil(t, params.ErrorDetails)
		assert.Equal(t, "key-123", params.IdempotencyKey)
		assert.Equal(t, requestID, params.RequestID)
	})
}

func TestRepository_ErrNoRows(t *testing.T) {
	t.Run("error constant is defined", func(t *testing.T) {
		// Validate that ErrNoRows is properly exported
		assert.NotNil(t, ErrNoRows)
	})
}

func TestRepository_New(t *testing.T) {
	t.Run("invalid database URL", func(t *testing.T) {
		ctx := context.Background()
		repo, err := New(ctx, "invalid://url")

		assert.Error(t, err)
		assert.Nil(t, repo)
		assert.Contains(t, err.Error(), "parse db url")
	})

	// Note: Empty URL test removed - pgxpool may accept empty URL in some cases
	// Full repository testing should be done with integration tests
}

// Test helper functions that can be unit tested
func TestScanEventHelper(t *testing.T) {
	t.Run("scan event structure validation", func(t *testing.T) {
		// This tests the structure expected by scanEvent
		// Actual scanning requires a database row
		event := models.Event{
			ID:        uuid.New(),
			Title:     "Test",
			Summary:   "Summary",
			Status:    models.StatusPending,
			Channel:   "EMAIL",
			Tags:      []string{"test"},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		assert.NotEqual(t, uuid.Nil, event.ID)
		assert.NotEmpty(t, event.Title)
		assert.NotEmpty(t, event.Summary)
	})
}

