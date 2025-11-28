package clients

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

// SQSQueue publishes broadcast messages to an AWS SQS queue.
type SQSQueue struct {
	client   *sqs.Client
	queueURL string
}

func NewSQSQueue(ctx context.Context, queueURL, region string) (*SQSQueue, error) {
	if queueURL == "" {
		return nil, fmt.Errorf("missing queue url")
	}
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, err
	}
	return &SQSQueue{
		client:   sqs.NewFromConfig(cfg),
		queueURL: queueURL,
	}, nil
}

func (q *SQSQueue) Enqueue(ctx context.Context, message BroadcastMessage) error {
	payload, err := json.Marshal(message)
	if err != nil {
		return err
	}
	_, err = q.client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    &q.queueURL,
		MessageBody: awsString(string(payload)),
	})
	return err
}

func awsString(v string) *string {
	return &v
}

