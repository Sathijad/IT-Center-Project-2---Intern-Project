package models

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestListFilter_Normalise(t *testing.T) {
	tests := []struct {
		name           string
		filter         ListFilter
		maxSize        int
		defaultSize    int
		expectedPage   int
		expectedSize   int
		expectedStatus []EventStatus
		expectedTags   []string
		expectedChannel string
	}{
		{
			name: "normalize page and size",
			filter: ListFilter{
				Page: 0,
				Size: 0,
			},
			maxSize:        100,
			defaultSize:    20,
			expectedPage:   1,
			expectedSize:   20,
		},
		{
			name: "limit size to max",
			filter: ListFilter{
				Page: 1,
				Size: 200,
			},
			maxSize:        100,
			defaultSize:    20,
			expectedPage:   1,
			expectedSize:   100,
		},
		{
			name: "preserve valid values",
			filter: ListFilter{
				Page: 2,
				Size: 50,
			},
			maxSize:        100,
			defaultSize:    20,
			expectedPage:   2,
			expectedSize:   50,
		},
		{
			name: "normalize channel to uppercase",
			filter: ListFilter{
				Page:    1,
				Size:    20,
				Channel: "email",
			},
			maxSize:         100,
			defaultSize:     20,
			expectedPage:    1,
			expectedSize:    20,
			expectedChannel: "EMAIL",
		},
		{
			name: "normalize status to uppercase",
			filter: ListFilter{
				Page:   1,
				Size:   20,
				Status: []EventStatus{"pending", "approved"},
			},
			maxSize:         100,
			defaultSize:     20,
			expectedPage:    1,
			expectedSize:    20,
			expectedStatus:  []EventStatus{"PENDING", "APPROVED"},
		},
		{
			name: "normalize tags to lowercase and trim",
			filter: ListFilter{
				Page: 1,
				Size: 20,
				Tags: []string{"  HR  ", "Tech", "  CULTURE  "},
			},
			maxSize:         100,
			defaultSize:     20,
			expectedPage:    1,
			expectedSize:    20,
			expectedTags:    []string{"hr", "tech", "culture"},
		},
		{
			name: "preserve empty channel",
			filter: ListFilter{
				Page:    1,
				Size:    20,
				Channel: "",
			},
			maxSize:         100,
			defaultSize:     20,
			expectedPage:    1,
			expectedSize:    20,
			expectedChannel: "",
		},
		{
			name: "handle all normalizations together",
			filter: ListFilter{
				Page:    0,
				Size:    0,
				Channel: "push",
				Status:  []EventStatus{"pending"},
				Tags:    []string{"  TECH  "},
			},
			maxSize:         100,
			defaultSize:     20,
			expectedPage:    1,
			expectedSize:    20,
			expectedChannel: "PUSH",
			expectedStatus:  []EventStatus{"PENDING"},
			expectedTags:    []string{"tech"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.filter.Normalise(tt.maxSize, tt.defaultSize)

			assert.Equal(t, tt.expectedPage, tt.filter.Page)
			assert.Equal(t, tt.expectedSize, tt.filter.Size)

			if tt.expectedChannel != "" {
				assert.Equal(t, tt.expectedChannel, tt.filter.Channel)
			}

			if len(tt.expectedStatus) > 0 {
				assert.Equal(t, tt.expectedStatus, tt.filter.Status)
			}

			if len(tt.expectedTags) > 0 {
				assert.Equal(t, tt.expectedTags, tt.filter.Tags)
			}
		})
	}
}

func TestEventStatus(t *testing.T) {
	t.Run("status constants", func(t *testing.T) {
		assert.Equal(t, EventStatus("DRAFT"), StatusDraft)
		assert.Equal(t, EventStatus("PENDING_MODERATION"), StatusPending)
		assert.Equal(t, EventStatus("SCHEDULED"), StatusScheduled)
		assert.Equal(t, EventStatus("APPROVED"), StatusApproved)
		assert.Equal(t, EventStatus("REJECTED"), StatusRejected)
		assert.Equal(t, EventStatus("PUBLISHED"), StatusPublished)
		assert.Equal(t, EventStatus("ARCHIVED"), StatusArchived)
	})

	t.Run("moderatable statuses", func(t *testing.T) {
		assert.True(t, ModeratableStatuses[StatusPending])
		assert.True(t, ModeratableStatuses[StatusApproved])
		assert.True(t, ModeratableStatuses[StatusRejected])
		assert.True(t, ModeratableStatuses[StatusScheduled])
		assert.False(t, ModeratableStatuses[StatusDraft])
		assert.False(t, ModeratableStatuses[StatusPublished])
		assert.False(t, ModeratableStatuses[StatusArchived])
	})
}

func TestEventPage(t *testing.T) {
	t.Run("has next page calculation", func(t *testing.T) {
		page := EventPage{
			Page:  1,
			Size:  10,
			Total: 25,
		}
		assert.True(t, page.HasNext)

		page = EventPage{
			Page:  2,
			Size:  10,
			Total: 25,
		}
		assert.True(t, page.HasNext)

		page = EventPage{
			Page:  3,
			Size:  10,
			Total: 25,
		}
		assert.False(t, page.HasNext)
	})

	t.Run("empty result", func(t *testing.T) {
		page := EventPage{
			Page:  1,
			Size:  10,
			Total: 0,
		}
		assert.False(t, page.HasNext)
		assert.Empty(t, page.Items)
	})
}

func TestEvent(t *testing.T) {
	t.Run("event structure", func(t *testing.T) {
		now := time.Now()
		event := Event{
			ID:        uuid.MustParse("123e4567-e89b-12d3-a456-426614174000"),
			Title:     "Test Event",
			Summary:   "Test Summary",
			Status:    StatusPending,
			Channel:   "EMAIL",
			Tags:      []string{"test", "event"},
			CreatedAt: now,
			UpdatedAt: now,
		}

		assert.Equal(t, "Test Event", event.Title)
		assert.Equal(t, StatusPending, event.Status)
		assert.Equal(t, "EMAIL", event.Channel)
		assert.Len(t, event.Tags, 2)
	})
}

func TestAttachment(t *testing.T) {
	t.Run("attachment structure", func(t *testing.T) {
		attachment := Attachment{
			Name: "document.pdf",
			URL:  "https://example.com/docs/document.pdf",
			Type: "application/pdf",
		}

		assert.Equal(t, "document.pdf", attachment.Name)
		assert.Equal(t, "https://example.com/docs/document.pdf", attachment.URL)
		assert.Equal(t, "application/pdf", attachment.Type)
	})
}

func TestEventBody(t *testing.T) {
	t.Run("event body structure", func(t *testing.T) {
		eventID := uuid.MustParse("123e4567-e89b-12d3-a456-426614174000")
		now := time.Now()
		body := EventBody{
			ID:        uuid.New(),
			EventID:   eventID,
			HTML:      "<p>Test HTML</p>",
			Sanitized: "<p>Test HTML</p>",
			PlainText: "Test HTML",
			CreatedAt: now,
			UpdatedAt: now,
		}

		assert.Equal(t, eventID, body.EventID)
		assert.Equal(t, "<p>Test HTML</p>", body.HTML)
		assert.Equal(t, "Test HTML", body.PlainText)
	})
}

func TestPublishAudit(t *testing.T) {
	t.Run("publish audit structure", func(t *testing.T) {
		eventID := uuid.MustParse("123e4567-e89b-12d3-a456-426614174000")
		now := time.Now()
		errorDetails := "Connection timeout"
		audit := PublishAudit{
			ID:             1,
			EventID:        eventID,
			Channel:        "EMAIL",
			Status:         "FAILED",
			Message:        "Delivery failed",
			DeliveryCount:  3,
			ErrorDetails:   &errorDetails,
			RequestID:      uuid.New(),
			IdempotencyKey: "key-123",
			Metadata:       map[string]string{"retry": "true"},
			CreatedAt:      now,
		}

		assert.Equal(t, int64(1), audit.ID)
		assert.Equal(t, eventID, audit.EventID)
		assert.Equal(t, "EMAIL", audit.Channel)
		assert.Equal(t, "FAILED", audit.Status)
		assert.Equal(t, 3, audit.DeliveryCount)
		assert.NotNil(t, audit.ErrorDetails)
		assert.Equal(t, "key-123", audit.IdempotencyKey)
	})
}

