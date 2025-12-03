package clients

import (
	"context"
	"fmt"
	"log/slog"
)

// FCMPushSender sends push notifications via Firebase Cloud Messaging
// TODO: Implement actual FCM integration
type FCMPushSender struct {
	serverKey string
}

// NewFCMPushSender creates a new FCM push sender
func NewFCMPushSender(serverKey string) (*FCMPushSender, error) {
	if serverKey == "" {
		return nil, fmt.Errorf("FCM server key is required")
	}
	return &FCMPushSender{
		serverKey: serverKey,
	}, nil
}

// SendPushNotification sends a push notification to device tokens
func (f *FCMPushSender) SendPushNotification(ctx context.Context, title, body string, deviceTokens []string) error {
	if len(deviceTokens) == 0 {
		return fmt.Errorf("no device tokens provided")
	}

	// TODO: Implement actual FCM HTTP v1 API call
	// For now, just log
	slog.InfoContext(ctx, "fcm.push", "title", title, "body", body, "tokens", len(deviceTokens))
	slog.WarnContext(ctx, "fcm.push.not_implemented", "message", "FCM push notifications not yet implemented")
	
	return nil
}

