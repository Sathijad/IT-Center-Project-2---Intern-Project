package clients

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/it-center/events-backend/internal/repository"
)

// RepositoryAdapter adapts the repository.Repository to the EventRepository interface needed by CompositeNotifier
type RepositoryAdapter struct {
	repo *repository.Repository
}

// NewRepositoryAdapter creates a new repository adapter
func NewRepositoryAdapter(repo *repository.Repository) *RepositoryAdapter {
	return &RepositoryAdapter{repo: repo}
}

// GetEvent returns event data needed for notifications
func (a *RepositoryAdapter) GetEvent(ctx context.Context, eventID uuid.UUID) (title, summary, bodyHTML, bodyText string, err error) {
	event, body, err := a.repo.GetEvent(ctx, eventID)
	if err != nil {
		return "", "", "", "", fmt.Errorf("failed to get event: %w", err)
	}

	title = event.Title
	summary = event.Summary

	if body != nil {
		bodyHTML = body.HTML
		bodyText = body.PlainText
	} else {
		// Fallback if body doesn't exist
		bodyText = summary
		bodyHTML = fmt.Sprintf("<p>%s</p>", summary)
	}

	return title, summary, bodyHTML, bodyText, nil
}

// GetAllUserEmails gets all user emails from the database
func (a *RepositoryAdapter) GetAllUserEmails(ctx context.Context) ([]string, error) {
	return a.repo.GetAllUserEmails(ctx)
}

