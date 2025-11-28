package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"

	"github.com/it-center/events-backend/internal/clients"
	appconfig "github.com/it-center/events-backend/internal/config"
	"github.com/it-center/events-backend/internal/repository"
	"github.com/it-center/events-backend/internal/worker"
)

func main() {
	cfg := appconfig.Load()
	if cfg.SQSQueueURL == "" {
		log.Fatal("EVENTS_SQS_QUEUE_URL is required for worker")
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	repo, err := repository.New(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer repo.Close()

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.Region))
	if err != nil {
		log.Fatalf("aws config: %v", err)
	}
	client := sqs.NewFromConfig(awsCfg)
	notifier := clients.LoggerNotifier{}
	worker := worker.NewBroadcastWorker(client, cfg.SQSQueueURL, repo, notifier)

	log.Println("broadcast worker started")
	if err := worker.Run(ctx); err != nil {
		log.Fatalf("worker exit: %v", err)
	}
}

