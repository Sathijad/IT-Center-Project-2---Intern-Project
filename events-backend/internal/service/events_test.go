package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/it-center/events-backend/internal/models"
	"github.com/it-center/events-backend/internal/repository"
)

// MockRepository is a mock implementation of repository methods
// It implements repository.EventRepository interface
type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) ListEvents(ctx context.Context, filter models.ListFilter) (models.EventPage, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(models.EventPage), args.Error(1)
}

func (m *MockRepository) GetEvent(ctx context.Context, id uuid.UUID) (*models.Event, *models.EventBody, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, nil, args.Error(2)
	}
	event := args.Get(0).(*models.Event)
	var body *models.EventBody
	if args.Get(1) != nil {
		body = args.Get(1).(*models.EventBody)
	}
	return event, body, args.Error(2)
}

func (m *MockRepository) CreateEvent(ctx context.Context, params repository.CreateEventParams) (*models.Event, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Event), args.Error(1)
}

func (m *MockRepository) UpdateEvent(ctx context.Context, params repository.UpdateEventParams) (*models.Event, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Event), args.Error(1)
}

func (m *MockRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.EventStatus, moderatedBy *int64) error {
	args := m.Called(ctx, id, status, moderatedBy)
	return args.Error(0)
}

func (m *MockRepository) RecordBroadcastAudit(ctx context.Context, params repository.BroadcastAuditParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func (m *MockRepository) GetAuditByKey(ctx context.Context, key string) (*models.PublishAudit, error) {
	args := m.Called(ctx, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PublishAudit), args.Error(1)
}

func (m *MockRepository) ListAudits(ctx context.Context, eventID uuid.UUID, limit int) ([]models.PublishAudit, error) {
	args := m.Called(ctx, eventID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.PublishAudit), args.Error(1)
}

func (m *MockRepository) SearchTags(ctx context.Context, query string, limit int) ([]string, error) {
	args := m.Called(ctx, query, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]string), args.Error(1)
}

func TestNormaliseTags(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{
			name:     "normalize with duplicates and whitespace",
			input:    []string{" HR ", "hr", "Culture", "  "},
			expected: []string{"hr", "culture"},
		},
		{
			name:     "empty input",
			input:    []string{},
			expected: []string{},
		},
		{
			name:     "only whitespace",
			input:    []string{"  ", "   ", ""},
			expected: []string{},
		},
		{
			name:     "mixed case and duplicates",
			input:    []string{"TECH", "tech", "Tech", "DEVELOPMENT", "development"},
			expected: []string{"tech", "development"},
		},
		{
			name:     "single tag",
			input:    []string{"  HR  "},
			expected: []string{"hr"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normaliseTags(tt.input)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestStripHTML(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple HTML",
			input:    "<p>Hello <strong>World</strong></p>",
			expected: "Hello World",
		},
		{
			name:     "nested HTML",
			input:    "<div><p>Test <em>content</em></p></div>",
			expected: "Test content",
		},
		{
			name:     "plain text",
			input:    "Plain text without tags",
			expected: "Plain text without tags",
		},
		{
			name:     "empty HTML",
			input:    "<p></p>",
			expected: "",
		},
		{
			name:     "with attributes",
			input:    `<p class="test">Content</p>`,
			expected: "Content",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := stripHTML(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEventService_CreateEvent(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	service := NewEventService(mockRepo)

	t.Run("successful creation", func(t *testing.T) {
		req := CreateEventRequest{
			Title:   "Test Event",
			Summary: "This is a test event summary",
			Body:    "<p>Test body</p>",
			Channel: "email",
			Tags:    []string{"test", "event"},
		}

		expectedEvent := &models.Event{
			ID:      uuid.New(),
			Title:   req.Title,
			Summary: req.Summary,
			Status:  models.StatusPending,
			Channel: "EMAIL",
		}

		mockRepo.On("CreateEvent", ctx, mock.AnythingOfType("repository.CreateEventParams")).Return(expectedEvent, nil)

		event, err := service.CreateEvent(ctx, req, 1)

		require.NoError(t, err)
		assert.Equal(t, expectedEvent.ID, event.ID)
		assert.Equal(t, "EMAIL", event.Channel)
		mockRepo.AssertExpectations(t)
	})

	t.Run("validation error - short title", func(t *testing.T) {
		req := CreateEventRequest{
			Title:   "Abc",
			Summary: "This is a test event summary",
			Body:    "<p>Test body</p>",
			Channel: "email",
		}

		event, err := service.CreateEvent(ctx, req, 1)

		assert.Error(t, err)
		assert.Nil(t, event)
		mockRepo.AssertNotCalled(t, "CreateEvent")
	})

	t.Run("validation error - short summary", func(t *testing.T) {
		req := CreateEventRequest{
			Title:   "Test Event Title",
			Summary: "Short",
			Body:    "<p>Test body</p>",
			Channel: "email",
		}

		event, err := service.CreateEvent(ctx, req, 1)

		assert.Error(t, err)
		assert.Nil(t, event)
		mockRepo.AssertNotCalled(t, "CreateEvent")
	})

	t.Run("default tag when empty", func(t *testing.T) {
		req := CreateEventRequest{
			Title:   "Test Event",
			Summary: "This is a test event summary",
			Body:    "<p>Test body</p>",
			Channel: "email",
			Tags:    []string{},
		}

		expectedEvent := &models.Event{
			ID:      uuid.New(),
			Title:   req.Title,
			Summary: req.Summary,
			Status:  models.StatusPending,
		}

		mockRepo.On("CreateEvent", ctx, mock.MatchedBy(func(params repository.CreateEventParams) bool {
			return len(params.Tags) == 1 && params.Tags[0] == "general"
		})).Return(expectedEvent, nil)

		event, err := service.CreateEvent(ctx, req, 1)

		require.NoError(t, err)
		assert.NotNil(t, event)
		mockRepo.AssertExpectations(t)
	})

	t.Run("HTML sanitization", func(t *testing.T) {
		req := CreateEventRequest{
			Title:   "Test Event",
			Summary: "This is a test event summary",
			Body:    "<script>alert('xss')</script><p>Safe content</p>",
			Channel: "email",
		}

		expectedEvent := &models.Event{
			ID:      uuid.New(),
			Title:   req.Title,
			Summary: req.Summary,
		}

		mockRepo.On("CreateEvent", ctx, mock.MatchedBy(func(params repository.CreateEventParams) bool {
			// Check that script tags are removed from sanitized HTML
			return params.Sanitized != "" && params.PlainText == "Safe content"
		})).Return(expectedEvent, nil)

		event, err := service.CreateEvent(ctx, req, 1)

		require.NoError(t, err)
		assert.NotNil(t, event)
		mockRepo.AssertExpectations(t)
	})
}

func TestEventService_GetEvent(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	service := NewEventService(mockRepo)

	t.Run("successful retrieval", func(t *testing.T) {
		eventID := uuid.New()
		expectedEvent := &models.Event{
			ID:    eventID,
			Title: "Test Event",
		}
		expectedBody := &models.EventBody{
			EventID: eventID,
			HTML:    "<p>Test</p>",
		}

		mockRepo.On("GetEvent", ctx, eventID).Return(expectedEvent, expectedBody, nil)

		event, body, err := service.GetEvent(ctx, eventID)

		require.NoError(t, err)
		assert.Equal(t, expectedEvent, event)
		assert.Equal(t, expectedBody, body)
		mockRepo.AssertExpectations(t)
	})

	t.Run("event not found", func(t *testing.T) {
		eventID := uuid.New()

		mockRepo.On("GetEvent", ctx, eventID).Return(nil, nil, repository.ErrNoRows)

		event, body, err := service.GetEvent(ctx, eventID)

		assert.Error(t, err)
		assert.Equal(t, ErrNotFound, err)
		assert.Nil(t, event)
		assert.Nil(t, body)
		mockRepo.AssertExpectations(t)
	})
}

func TestEventService_UpdateEvent(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	service := NewEventService(mockRepo)

	t.Run("successful update", func(t *testing.T) {
		eventID := uuid.New()
		req := UpdateEventRequest{
			Title:   "Updated Event",
			Summary: "Updated summary for the event",
			Body:    "<p>Updated body</p>",
			Channel: "push",
			Tags:    []string{"updated"},
		}

		expectedEvent := &models.Event{
			ID:      eventID,
			Title:   req.Title,
			Summary: req.Summary,
			Channel: "PUSH",
		}

		mockRepo.On("UpdateEvent", ctx, mock.AnythingOfType("repository.UpdateEventParams")).Return(expectedEvent, nil)

		event, err := service.UpdateEvent(ctx, eventID, req)

		require.NoError(t, err)
		assert.Equal(t, expectedEvent.ID, event.ID)
		assert.Equal(t, "PUSH", event.Channel)
		mockRepo.AssertExpectations(t)
	})

	t.Run("validation error", func(t *testing.T) {
		eventID := uuid.New()
		req := UpdateEventRequest{
			Title:   "Abc",
			Summary: "Updated summary",
			Body:    "<p>Body</p>",
			Channel: "push",
		}

		event, err := service.UpdateEvent(ctx, eventID, req)

		assert.Error(t, err)
		assert.Nil(t, event)
		mockRepo.AssertNotCalled(t, "UpdateEvent")
	})
}

func TestEventService_Moderate(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	service := NewEventService(mockRepo)

	t.Run("approve event", func(t *testing.T) {
		eventID := uuid.New()
		moderatorID := int64(100)

		mockRepo.On("UpdateStatus", ctx, eventID, models.StatusApproved, &moderatorID).Return(nil)
		mockRepo.On("RecordBroadcastAudit", ctx, mock.AnythingOfType("repository.BroadcastAuditParams")).Return(nil)

		err := service.Moderate(ctx, eventID, "APPROVE", "Looks good", moderatorID)

		require.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("reject event", func(t *testing.T) {
		eventID := uuid.New()
		moderatorID := int64(100)

		mockRepo.On("UpdateStatus", ctx, eventID, models.StatusRejected, &moderatorID).Return(nil)
		mockRepo.On("RecordBroadcastAudit", ctx, mock.AnythingOfType("repository.BroadcastAuditParams")).Return(nil)

		err := service.Moderate(ctx, eventID, "REJECT", "Inappropriate content", moderatorID)

		require.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("invalid action", func(t *testing.T) {
		eventID := uuid.New()
		moderatorID := int64(100)

		err := service.Moderate(ctx, eventID, "INVALID", "Notes", moderatorID)

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidAction, err)
		mockRepo.AssertNotCalled(t, "UpdateStatus")
	})

	t.Run("case insensitive action", func(t *testing.T) {
		eventID := uuid.New()
		moderatorID := int64(100)

		mockRepo.On("UpdateStatus", ctx, eventID, models.StatusApproved, &moderatorID).Return(nil)
		mockRepo.On("RecordBroadcastAudit", ctx, mock.AnythingOfType("repository.BroadcastAuditParams")).Return(nil)

		err := service.Moderate(ctx, eventID, "approve", "Notes", moderatorID)

		require.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})
}

func TestEventService_TagSuggestions(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	service := NewEventService(mockRepo)

	t.Run("successful tag search", func(t *testing.T) {
		query := "hr"
		expectedTags := []string{"hr", "hr-policies", "hr-announcements"}

		mockRepo.On("SearchTags", ctx, query, 5).Return(expectedTags, nil)

		tags, err := service.TagSuggestions(ctx, query, 5)

		require.NoError(t, err)
		assert.Equal(t, expectedTags, tags)
		mockRepo.AssertExpectations(t)
	})

	t.Run("limit normalization - too high", func(t *testing.T) {
		query := "test"
		expectedTags := []string{"test"}

		mockRepo.On("SearchTags", ctx, query, 5).Return(expectedTags, nil)

		tags, err := service.TagSuggestions(ctx, query, 20)

		require.NoError(t, err)
		assert.Equal(t, expectedTags, tags)
		mockRepo.AssertExpectations(t)
	})

	t.Run("limit normalization - zero", func(t *testing.T) {
		query := "test"
		expectedTags := []string{"test"}

		mockRepo.On("SearchTags", ctx, query, 5).Return(expectedTags, nil)

		tags, err := service.TagSuggestions(ctx, query, 0)

		require.NoError(t, err)
		assert.Equal(t, expectedTags, tags)
		mockRepo.AssertExpectations(t)
	})
}

func TestEventService_ListAudits(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	service := NewEventService(mockRepo)

	t.Run("successful list", func(t *testing.T) {
		eventID := uuid.New()
		expectedAudits := []models.PublishAudit{
			{ID: 1, EventID: eventID, Status: "SENT"},
			{ID: 2, EventID: eventID, Status: "FAILED"},
		}

		mockRepo.On("ListAudits", ctx, eventID, 10).Return(expectedAudits, nil)

		audits, err := service.ListAudits(ctx, eventID, 10)

		require.NoError(t, err)
		assert.Equal(t, expectedAudits, audits)
		mockRepo.AssertExpectations(t)
	})

	t.Run("limit normalization - too high", func(t *testing.T) {
		eventID := uuid.New()
		expectedAudits := []models.PublishAudit{}

		mockRepo.On("ListAudits", ctx, eventID, 10).Return(expectedAudits, nil)

		audits, err := service.ListAudits(ctx, eventID, 25)

		require.NoError(t, err)
		assert.Equal(t, expectedAudits, audits)
		mockRepo.AssertExpectations(t)
	})

	t.Run("limit normalization - zero", func(t *testing.T) {
		eventID := uuid.New()
		expectedAudits := []models.PublishAudit{}

		mockRepo.On("ListAudits", ctx, eventID, 10).Return(expectedAudits, nil)

		audits, err := service.ListAudits(ctx, eventID, 0)

		require.NoError(t, err)
		assert.Equal(t, expectedAudits, audits)
		mockRepo.AssertExpectations(t)
	})
}

func TestEventService_ListEvents(t *testing.T) {
	ctx := context.Background()
	mockRepo := new(MockRepository)
	service := NewEventService(mockRepo)

	t.Run("successful list with default filter", func(t *testing.T) {
		filter := models.ListFilter{
			Page: 1,
			Size: 20,
		}
		expectedPage := models.EventPage{
			Items: []models.Event{
				{ID: uuid.New(), Title: "Event 1"},
				{ID: uuid.New(), Title: "Event 2"},
			},
			Page:    1,
			Size:    20,
			Total:   2,
			HasNext: false,
		}

		mockRepo.On("ListEvents", ctx, filter).Return(expectedPage, nil)

		page, err := service.ListEvents(ctx, filter)

		require.NoError(t, err)
		assert.Equal(t, expectedPage, page)
		assert.Len(t, page.Items, 2)
		mockRepo.AssertExpectations(t)
	})

	t.Run("list with status filter", func(t *testing.T) {
		filter := models.ListFilter{
			Page:   1,
			Size:   10,
			Status: []models.EventStatus{models.StatusPending, models.StatusApproved},
		}
		expectedPage := models.EventPage{
			Items: []models.Event{
				{ID: uuid.New(), Title: "Pending Event", Status: models.StatusPending},
			},
			Page:    1,
			Size:    10,
			Total:   1,
			HasNext: false,
		}

		mockRepo.On("ListEvents", ctx, filter).Return(expectedPage, nil)

		page, err := service.ListEvents(ctx, filter)

		require.NoError(t, err)
		assert.Len(t, page.Items, 1)
		assert.Equal(t, models.StatusPending, page.Items[0].Status)
		mockRepo.AssertExpectations(t)
	})

	t.Run("list with channel filter", func(t *testing.T) {
		filter := models.ListFilter{
			Page:    1,
			Size:    10,
			Channel: "EMAIL",
		}
		expectedPage := models.EventPage{
			Items: []models.Event{
				{ID: uuid.New(), Title: "Email Event", Channel: "EMAIL"},
			},
			Page:    1,
			Size:    10,
			Total:   1,
			HasNext: false,
		}

		mockRepo.On("ListEvents", ctx, filter).Return(expectedPage, nil)

		page, err := service.ListEvents(ctx, filter)

		require.NoError(t, err)
		assert.Len(t, page.Items, 1)
		assert.Equal(t, "EMAIL", page.Items[0].Channel)
		mockRepo.AssertExpectations(t)
	})

	t.Run("list with tags filter", func(t *testing.T) {
		filter := models.ListFilter{
			Page: 1,
			Size: 10,
			Tags: []string{"hr", "announcement"},
		}
		expectedPage := models.EventPage{
			Items: []models.Event{
				{ID: uuid.New(), Title: "HR Event", Tags: []string{"hr", "announcement"}},
			},
			Page:    1,
			Size:    10,
			Total:   1,
			HasNext: false,
		}

		mockRepo.On("ListEvents", ctx, filter).Return(expectedPage, nil)

		page, err := service.ListEvents(ctx, filter)

		require.NoError(t, err)
		assert.Len(t, page.Items, 1)
		assert.Contains(t, page.Items[0].Tags, "hr")
		mockRepo.AssertExpectations(t)
	})

	t.Run("list with search term", func(t *testing.T) {
		filter := models.ListFilter{
			Page:       1,
			Size:       10,
			SearchTerm: "meeting",
		}
		expectedPage := models.EventPage{
			Items: []models.Event{
				{ID: uuid.New(), Title: "Team Meeting", Summary: "Monthly team meeting"},
			},
			Page:    1,
			Size:    10,
			Total:   1,
			HasNext: false,
		}

		mockRepo.On("ListEvents", ctx, filter).Return(expectedPage, nil)

		page, err := service.ListEvents(ctx, filter)

		require.NoError(t, err)
		assert.Len(t, page.Items, 1)
		assert.Contains(t, page.Items[0].Title, "Meeting")
		mockRepo.AssertExpectations(t)
	})

	t.Run("pagination with has next", func(t *testing.T) {
		filter := models.ListFilter{
			Page: 1,
			Size: 10,
		}
		expectedPage := models.EventPage{
			Items: make([]models.Event, 10),
			Page:    1,
			Size:    10,
			Total:   25,
			HasNext: true,
		}

		mockRepo.On("ListEvents", ctx, filter).Return(expectedPage, nil)

		page, err := service.ListEvents(ctx, filter)

		require.NoError(t, err)
		assert.True(t, page.HasNext)
		assert.Equal(t, int64(25), page.Total)
		mockRepo.AssertExpectations(t)
	})

	t.Run("repository error handling", func(t *testing.T) {
		mockRepo := new(MockRepository)
		service := NewEventService(mockRepo)
		
		filter := models.ListFilter{
			Page: 1,
			Size: 20,
		}
		emptyPage := models.EventPage{}

		mockRepo.On("ListEvents", ctx, filter).Return(emptyPage, assert.AnError)

		page, err := service.ListEvents(ctx, filter)

		assert.Error(t, err)
		assert.Equal(t, emptyPage, page)
		assert.Empty(t, page.Items)
		mockRepo.AssertExpectations(t)
	})

	t.Run("empty results", func(t *testing.T) {
		mockRepo := new(MockRepository)
		service := NewEventService(mockRepo)
		
		filter := models.ListFilter{
			Page: 1,
			Size: 20,
		}
		expectedPage := models.EventPage{
			Items:  []models.Event{},
			Page:    1,
			Size:    20,
			Total:   0,
			HasNext: false,
		}

		mockRepo.On("ListEvents", ctx, filter).Return(expectedPage, nil)

		page, err := service.ListEvents(ctx, filter)

		require.NoError(t, err)
		assert.Empty(t, page.Items)
		assert.Equal(t, int64(0), page.Total)
		assert.False(t, page.HasNext)
		mockRepo.AssertExpectations(t)
	})
}

func TestEventService_sanitizeHTML(t *testing.T) {
	service := NewEventService(nil)

	t.Run("sanitize script tags", func(t *testing.T) {
		input := "<script>alert('xss')</script><p>Safe</p>"
		result := service.sanitizeHTML(input)

		assert.NotContains(t, result, "<script>")
		assert.Contains(t, result, "Safe")
	})

	t.Run("empty HTML becomes paragraph", func(t *testing.T) {
		input := ""
		result := service.sanitizeHTML(input)

		assert.Equal(t, "<p></p>", result)
	})

	t.Run("whitespace only becomes paragraph", func(t *testing.T) {
		input := "   "
		result := service.sanitizeHTML(input)

		assert.Equal(t, "<p></p>", result)
	})

	t.Run("valid HTML preserved", func(t *testing.T) {
		input := "<p>Valid <strong>content</strong></p>"
		result := service.sanitizeHTML(input)

		assert.Contains(t, result, "Valid")
		assert.Contains(t, result, "content")
	})
}

