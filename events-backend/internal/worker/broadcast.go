package worker

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/google/uuid"

	"github.com/it-center/events-backend/internal/clients"
	"github.com/it-center/events-backend/internal/repository"
)

type BroadcastWorker struct {
	client   *sqs.Client
	queueURL string
	repo     *repository.Repository
	notifier clients.Notifier
}

func NewBroadcastWorker(client *sqs.Client, queueURL string, repo *repository.Repository, notifier clients.Notifier) *BroadcastWorker {
	return &BroadcastWorker{
		client:   client,
		queueURL: queueURL,
		repo:     repo,
		notifier: notifier,
	}
}

func (w *BroadcastWorker) Run(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		out, err := w.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
			QueueUrl:            &w.queueURL,
			MaxNumberOfMessages: 5,
			WaitTimeSeconds:     10,
		})
		if err != nil {
			slog.Error("sqs.receive", "err", err)
			time.Sleep(5 * time.Second)
			continue
		}
		if len(out.Messages) == 0 {
			continue
		}
		for _, sqsMsg := range out.Messages {
			if err := w.handleMessage(ctx, sqsMsg); err != nil {
				slog.Error("broadcast.handle", "err", err)
				continue
			}
			_, _ = w.client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
				QueueUrl:      &w.queueURL,
				ReceiptHandle: sqsMsg.ReceiptHandle,
			})
		}
	}
}

func (w *BroadcastWorker) handleMessage(ctx context.Context, sqsMsg types.Message) error {
	var message clients.BroadcastMessage
	if err := json.Unmarshal([]byte(aws.ToString(sqsMsg.Body)), &message); err != nil {
		return err
	}
	eventID, err := uuid.Parse(message.EventID)
	if err != nil {
		return err
	}
	for _, channel := range message.Channels {
		status := "SENT"
		var errDetails *string
		if err := w.notifier.Send(ctx, channel, map[string]any{"eventId": message.EventID}); err != nil {
			status = "FAILED"
			msg := err.Error()
			errDetails = &msg
		}
		audit := repository.BroadcastAuditParams{
			EventID:        eventID,
			Channel:        channel,
			Status:         status,
			Message:        "Worker delivery",
			DeliveryCount:  1,
			ErrorDetails:   errDetails,
			IdempotencyKey: message.IdempotencyKey,
			RequestID:      uuid.Must(uuid.NewRandom()),
			Metadata:       map[string]any{"worker": "broadcast"},
		}
		if err := w.repo.RecordBroadcastAudit(ctx, audit); err != nil {
			return err
		}
		if errDetails == nil {
			if err := w.repo.MarkBroadcast(ctx, eventID, time.Now().UTC()); err != nil {
				return err
			}
		}
	}
	return nil
}

