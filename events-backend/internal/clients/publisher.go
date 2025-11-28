package clients

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"
)

// BroadcastMessage is the payload placed on SQS/SNS for fan-out workers.
type BroadcastMessage struct {
	EventID        string            `json:"eventId"`
	Channels       []string          `json:"channels"`
	IdempotencyKey string            `json:"idempotencyKey"`
	RequestedBy    int64             `json:"requestedBy"`
	RequestedAt    time.Time         `json:"requestedAt"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

// Queue abstracts SQS/SNS producer.
type Queue interface {
	Enqueue(ctx context.Context, message BroadcastMessage) error
}

// LoggerQueue is a no-op queue used for local/dev.
type LoggerQueue struct{}

func (LoggerQueue) Enqueue(ctx context.Context, message BroadcastMessage) error {
	payload, _ := json.Marshal(message)
	slog.InfoContext(ctx, "queue.enqueue", "payload", string(payload))
	return nil
}

