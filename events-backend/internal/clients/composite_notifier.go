package clients

import (
	"context"
	"fmt"
	"html"
	"log/slog"
	"strings"

	"github.com/google/uuid"
)

// CompositeNotifier routes notifications to the appropriate sender based on channel
type CompositeNotifier struct {
	emailSender *SESEmailSender
	pushSender  *FCMPushSender
	teamsSender *TeamsWebhookSender
	repo        EventRepository
	enableEmail bool
	enablePush  bool
	enableTeams bool
}

// EventRepository interface for getting event data
type EventRepository interface {
	GetEvent(ctx context.Context, eventID uuid.UUID) (title, summary, bodyHTML, bodyText string, err error)
	GetAllUserEmails(ctx context.Context) ([]string, error)
}

// NewCompositeNotifier creates a composite notifier that routes to appropriate senders
func NewCompositeNotifier(
	emailSender *SESEmailSender,
	pushSender *FCMPushSender,
	teamsSender *TeamsWebhookSender,
	repo EventRepository,
	enableEmail, enablePush, enableTeams bool,
) *CompositeNotifier {
	return &CompositeNotifier{
		emailSender: emailSender,
		pushSender:  pushSender,
		teamsSender: teamsSender,
		repo:        repo,
		enableEmail: enableEmail,
		enablePush:  enablePush,
		enableTeams: enableTeams,
	}
}

// Send implements the Notifier interface
func (c *CompositeNotifier) Send(ctx context.Context, channel string, payload map[string]any) error {
	eventIDStr, ok := payload["eventId"].(string)
	if !ok {
		return fmt.Errorf("eventId not found in payload")
	}

	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		return fmt.Errorf("invalid event ID: %w", err)
	}

	// Get event data from repository
	title, summary, bodyHTML, bodyText, err := c.repo.GetEvent(ctx, eventID)
	if err != nil {
		return fmt.Errorf("failed to get event data: %w", err)
	}

	channel = strings.ToUpper(channel)

	switch channel {
	case "EMAIL":
		if !c.enableEmail {
			slog.WarnContext(ctx, "notifier.email.disabled", "event_id", eventIDStr)
			return nil
		}
		if c.emailSender == nil {
			return fmt.Errorf("email sender not configured")
		}

		// Get all user emails from database
		recipients, err := c.repo.GetAllUserEmails(ctx)
		if err != nil {
			return fmt.Errorf("failed to get user emails: %w", err)
		}

		// Build email subject and body
		subject := fmt.Sprintf("Announcement: %s", title)
		emailBody := buildEmailHTML(title, summary, bodyHTML)

		return c.emailSender.SendEventEmail(ctx, subject, emailBody, bodyText, recipients)

	case "PUSH":
		if !c.enablePush {
			slog.WarnContext(ctx, "notifier.push.disabled", "event_id", eventIDStr)
			return nil
		}
		if c.pushSender == nil {
			return fmt.Errorf("push sender not configured")
		}

		// TODO: Get device tokens from database
		deviceTokens := []string{} // Placeholder
		return c.pushSender.SendPushNotification(ctx, title, summary, deviceTokens)

	case "TEAMS":
		if !c.enableTeams {
			slog.WarnContext(ctx, "notifier.teams.disabled", "event_id", eventIDStr)
			return nil
		}
		if c.teamsSender == nil {
			return fmt.Errorf("teams sender not configured")
		}

		return c.teamsSender.SendTeamsMessage(ctx, title, summary, bodyText)

	default:
		return fmt.Errorf("unknown channel: %s", channel)
	}
}

// buildEmailHTML creates an HTML email template
func buildEmailHTML(title, summary, bodyHTML string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #0078D4; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
		.content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
		.title { font-size: 24px; margin: 0 0 10px 0; }
		.summary { font-size: 16px; margin: 10px 0; color: #666; }
		.body { margin-top: 20px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1 class="title">%s</h1>
			<p class="summary">%s</p>
		</div>
		<div class="content">
			<div class="body">
				%s
			</div>
		</div>
	</div>
</body>
</html>
`, escapeHTML(title), escapeHTML(summary), bodyHTML)
}

func escapeHTML(s string) string {
	return html.EscapeString(s)
}

