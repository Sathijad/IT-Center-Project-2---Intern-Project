package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/it-center/events-backend/internal/clients"
	"github.com/it-center/events-backend/internal/models"
	"github.com/it-center/events-backend/internal/repository"
)

// MockQueue is a mock implementation of clients.Queue
type MockQueue struct {
	mock.Mock
}

func (m *MockQueue) Enqueue(ctx context.Context, message clients.BroadcastMessage) error {
	args := m.Called(ctx, message)
	return args.Error(0)
}

// MockBroadcastRepository extends MockRepository for broadcast-specific methods
type MockBroadcastRepository struct {
	MockRepository
}

func (m *MockBroadcastRepository) GetAuditByKey(ctx context.Context, key string) (*models.PublishAudit, error) {
	args := m.Called(ctx, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PublishAudit), args.Error(1)
}

func (m *MockBroadcastRepository) RecordBroadcastAudit(ctx context.Context, params repository.BroadcastAuditParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func (m *MockBroadcastRepository) MarkBroadcast(ctx context.Context, id uuid.UUID, ts time.Time) error {
	args := m.Called(ctx, id, ts)
	return args.Error(0)
}

func TestBroadcastService_Broadcast(t *testing.T) {
	ctx := context.Background()

	t.Run("successful broadcast with channels", func(t *testing.T) {
		mockRepo := new(MockBroadcastRepository)
		mockQueue := new(MockQueue)
		cfg := BroadcastConfig{
			EnablePush:  true,
			EnableEmail: true,
			EnableTeams: true,
		}
		service := NewBroadcastService(mockRepo, mockQueue, cfg)

		eventID := uuid.New()
		channels := []string{"PUSH", "EMAIL"}
		idempotencyKey := uuid.NewString()
		requester := int64(1)

		// First check for existing audit (should not exist)
		mockRepo.On("GetAuditByKey", ctx, idempotencyKey).Return(nil, errors.New("not found"))

		// Enqueue message
		mockQueue.On("Enqueue", ctx, mock.MatchedBy(func(msg clients.BroadcastMessage) bool {
			return msg.EventID == eventID.String() &&
				len(msg.Channels) == 2 &&
				msg.IdempotencyKey == idempotencyKey
		})).Return(nil)

		// Record audit
		mockRepo.On("RecordBroadcastAudit", ctx, mock.AnythingOfType("repository.BroadcastAuditParams")).Return(nil)

		// Mark broadcast
		mockRepo.On("MarkBroadcast", ctx, eventID, mock.AnythingOfType("time.Time")).Return(nil)

		// Get audit by key
		expectedAudit := &models.PublishAudit{
			ID:             1,
			EventID:        eventID,
			IdempotencyKey: idempotencyKey,
			Status:         "QUEUED",
		}
		mockRepo.On("GetAuditByKey", ctx, idempotencyKey).Return(expectedAudit, nil)

		audit, err := service.Broadcast(ctx, eventID, channels, idempotencyKey, requester)

		require.NoError(t, err)
		assert.Equal(t, expectedAudit, audit)
		mockRepo.AssertExpectations(t)
		mockQueue.AssertExpectations(t)
	})

	t.Run("idempotency conflict", func(t *testing.T) {
		mockRepo := new(MockBroadcastRepository)
		mockQueue := new(MockQueue)
		cfg := BroadcastConfig{EnablePush: true}
		service := NewBroadcastService(mockRepo, mockQueue, cfg)

		eventID := uuid.New()
		idempotencyKey := uuid.NewString()
		existingAudit := &models.PublishAudit{
			ID:             1,
			EventID:        eventID,
			IdempotencyKey: idempotencyKey,
		}

		mockRepo.On("GetAuditByKey", ctx, idempotencyKey).Return(existingAudit, nil)

		audit, err := service.Broadcast(ctx, eventID, []string{"PUSH"}, idempotencyKey, 1)

		assert.Error(t, err)
		assert.Equal(t, ErrIdempotentConflict, err)
		assert.Equal(t, existingAudit, audit)
		mockQueue.AssertNotCalled(t, "Enqueue")
	})

	t.Run("auto-generate idempotency key", func(t *testing.T) {
		mockRepo := new(MockBroadcastRepository)
		mockQueue := new(MockQueue)
		cfg := BroadcastConfig{EnablePush: true}
		service := NewBroadcastService(mockRepo, mockQueue, cfg)

		eventID := uuid.New()

		// First call should not find existing audit
		mockRepo.On("GetAuditByKey", ctx, mock.AnythingOfType("string")).Return(nil, errors.New("not found")).Once()

		mockQueue.On("Enqueue", ctx, mock.MatchedBy(func(msg clients.BroadcastMessage) bool {
			return msg.IdempotencyKey != ""
		})).Return(nil)

		mockRepo.On("RecordBroadcastAudit", ctx, mock.AnythingOfType("repository.BroadcastAuditParams")).Return(nil)
		mockRepo.On("MarkBroadcast", ctx, eventID, mock.AnythingOfType("time.Time")).Return(nil)

		expectedAudit := &models.PublishAudit{ID: 1, EventID: eventID}
		mockRepo.On("GetAuditByKey", ctx, mock.AnythingOfType("string")).Return(expectedAudit, nil).Once()

		audit, err := service.Broadcast(ctx, eventID, []string{"PUSH"}, "", 1)

		require.NoError(t, err)
		assert.NotNil(t, audit)
		mockQueue.AssertExpectations(t)
	})

	t.Run("use default channels when none provided", func(t *testing.T) {
		mockRepo := new(MockBroadcastRepository)
		mockQueue := new(MockQueue)
		cfg := BroadcastConfig{
			EnablePush:  true,
			EnableEmail: true,
		}
		service := NewBroadcastService(mockRepo, mockQueue, cfg)

		eventID := uuid.New()

		mockRepo.On("GetAuditByKey", ctx, mock.AnythingOfType("string")).Return(nil, errors.New("not found"))

		mockQueue.On("Enqueue", ctx, mock.MatchedBy(func(msg clients.BroadcastMessage) bool {
			return len(msg.Channels) == 2 &&
				contains(msg.Channels, "PUSH") &&
				contains(msg.Channels, "EMAIL")
		})).Return(nil)

		mockRepo.On("RecordBroadcastAudit", ctx, mock.AnythingOfType("repository.BroadcastAuditParams")).Return(nil)
		mockRepo.On("MarkBroadcast", ctx, eventID, mock.AnythingOfType("time.Time")).Return(nil)

		expectedAudit := &models.PublishAudit{ID: 1, EventID: eventID}
		mockRepo.On("GetAuditByKey", ctx, mock.AnythingOfType("string")).Return(expectedAudit, nil)

		audit, err := service.Broadcast(ctx, eventID, []string{}, "", 1)

		require.NoError(t, err)
		assert.NotNil(t, audit)
		mockQueue.AssertExpectations(t)
	})

	t.Run("no channels enabled error", func(t *testing.T) {
		mockRepo := new(MockBroadcastRepository)
		mockQueue := new(MockQueue)
		cfg := BroadcastConfig{
			EnablePush:  false,
			EnableEmail: false,
			EnableTeams: false,
		}
		service := NewBroadcastService(mockRepo, mockQueue, cfg)

		eventID := uuid.New()

		mockRepo.On("GetAuditByKey", ctx, mock.AnythingOfType("string")).Return(nil, errors.New("not found"))

		audit, err := service.Broadcast(ctx, eventID, []string{}, "", 1)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "no channels enabled")
		assert.Nil(t, audit)
		mockQueue.AssertNotCalled(t, "Enqueue")
	})

	t.Run("queue enqueue error", func(t *testing.T) {
		mockRepo := new(MockBroadcastRepository)
		mockQueue := new(MockQueue)
		cfg := BroadcastConfig{EnablePush: true}
		service := NewBroadcastService(mockRepo, mockQueue, cfg)

		eventID := uuid.New()

		mockRepo.On("GetAuditByKey", ctx, mock.AnythingOfType("string")).Return(nil, errors.New("not found"))
		mockQueue.On("Enqueue", ctx, mock.AnythingOfType("clients.BroadcastMessage")).Return(errors.New("queue error"))

		audit, err := service.Broadcast(ctx, eventID, []string{"PUSH"}, "", 1)

		assert.Error(t, err)
		assert.Nil(t, audit)
	})
}

func TestBroadcastService_filterChannels(t *testing.T) {
	tests := []struct {
		name     string
		cfg      BroadcastConfig
		input    []string
		expected []string
	}{
		{
			name:     "all channels enabled",
			cfg:      BroadcastConfig{EnablePush: true, EnableEmail: true, EnableTeams: true},
			input:    []string{"PUSH", "EMAIL", "TEAMS"},
			expected: []string{"PUSH", "EMAIL", "TEAMS"},
		},
		{
			name:     "only push enabled",
			cfg:      BroadcastConfig{EnablePush: true, EnableEmail: false, EnableTeams: false},
			input:    []string{"PUSH", "EMAIL", "TEAMS"},
			expected: []string{"PUSH"},
		},
		{
			name:     "case insensitive",
			cfg:      BroadcastConfig{EnablePush: true, EnableEmail: true},
			input:    []string{"push", "email", "invalid"},
			expected: []string{"PUSH", "EMAIL"},
		},
		{
			name:     "empty input",
			cfg:      BroadcastConfig{EnablePush: true},
			input:    []string{},
			expected: nil,
		},
		{
			name:     "no channels enabled",
			cfg:      BroadcastConfig{EnablePush: false, EnableEmail: false},
			input:    []string{"PUSH", "EMAIL"},
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewBroadcastService(nil, nil, tt.cfg)
			result := service.filterChannels(tt.input)

			if tt.expected == nil {
				assert.Nil(t, result)
			} else {
				assert.ElementsMatch(t, tt.expected, result)
			}
		})
	}
}

func TestBroadcastService_defaultChannels(t *testing.T) {
	tests := []struct {
		name     string
		cfg      BroadcastConfig
		expected []string
	}{
		{
			name:     "all enabled",
			cfg:      BroadcastConfig{EnablePush: true, EnableEmail: true, EnableTeams: true},
			expected: []string{"PUSH", "EMAIL", "TEAMS"},
		},
		{
			name:     "only push",
			cfg:      BroadcastConfig{EnablePush: true, EnableEmail: false, EnableTeams: false},
			expected: []string{"PUSH"},
		},
		{
			name:     "only email",
			cfg:      BroadcastConfig{EnablePush: false, EnableEmail: true, EnableTeams: false},
			expected: []string{"EMAIL"},
		},
		{
			name:     "none enabled",
			cfg:      BroadcastConfig{EnablePush: false, EnableEmail: false, EnableTeams: false},
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewBroadcastService(nil, nil, tt.cfg)
			result := service.defaultChannels()

			assert.ElementsMatch(t, tt.expected, result)
		})
	}
}

// Helper function to check if slice contains string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

