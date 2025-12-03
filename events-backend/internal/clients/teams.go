package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
)

// TeamsWebhookSender sends messages to Microsoft Teams via webhook
type TeamsWebhookSender struct {
	webhookURL string
	httpClient *http.Client
}

// NewTeamsWebhookSender creates a new Teams webhook sender
func NewTeamsWebhookSender(webhookURL string) (*TeamsWebhookSender, error) {
	if webhookURL == "" {
		return nil, fmt.Errorf("Teams webhook URL is required")
	}
	return &TeamsWebhookSender{
		webhookURL: webhookURL,
		httpClient: &http.Client{},
	}, nil
}

// TeamsMessage represents a Teams webhook message
type TeamsMessage struct {
	Type       string `json:"@type"`
	Context    string `json:"@context"`
	Text       string `json:"text,omitempty"`
	Title      string `json:"title,omitempty"`
	Summary    string `json:"summary,omitempty"`
	ThemeColor string `json:"themeColor,omitempty"`
}

// SendTeamsMessage sends a message to Teams channel
func (t *TeamsWebhookSender) SendTeamsMessage(ctx context.Context, title, summary, text string) error {
	message := TeamsMessage{
		Type:    "MessageCard",
		Context: "https://schema.org/extensions",
		Title:   title,
		Summary: summary,
		Text:    text,
		ThemeColor: "0078D4", // Microsoft blue
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal Teams message: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.webhookURL, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	slog.InfoContext(ctx, "teams.webhook.send", "title", title)

	resp, err := t.httpClient.Do(req)
	if err != nil {
		slog.ErrorContext(ctx, "teams.webhook.failed", "err", err)
		return fmt.Errorf("failed to send Teams message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		slog.ErrorContext(ctx, "teams.webhook.bad_status", "status", resp.StatusCode)
		return fmt.Errorf("Teams webhook returned status %d", resp.StatusCode)
	}

	slog.InfoContext(ctx, "teams.webhook.success", "status", resp.StatusCode)
	return nil
}

