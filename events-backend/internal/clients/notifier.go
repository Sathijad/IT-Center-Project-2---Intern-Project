package clients

import (
	"context"
	"log/slog"
)

// Notifier abstracts push/email/Teams providers.
type Notifier interface {
	Send(ctx context.Context, channel string, payload map[string]any) error
}

type LoggerNotifier struct{}

func (LoggerNotifier) Send(ctx context.Context, channel string, payload map[string]any) error {
	slog.InfoContext(ctx, "notify", "channel", channel, "payload", payload)
	return nil
}

