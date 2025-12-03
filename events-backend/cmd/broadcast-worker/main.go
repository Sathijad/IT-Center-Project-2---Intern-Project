package main

import (
	"context"
	"log"
	"os"
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
	sqsClient := sqs.NewFromConfig(awsCfg)

	// Initialize notifiers based on configuration
	var emailSender *clients.SESEmailSender
	var pushSender *clients.FCMPushSender
	var teamsSender *clients.TeamsWebhookSender

	// Initialize SES email sender if enabled
	if cfg.EnableEmail {
		if cfg.SESSenderEmail == "" {
			log.Fatal("EVENTS_SES_SENDER_EMAIL is required when email is enabled")
		}
		emailSender, err = clients.NewSESEmailSender(ctx, cfg.Region, cfg.SESSenderEmail)
		if err != nil {
			log.Fatalf("failed to initialize SES sender: %v", err)
		}
		log.Printf("SES email sender initialized with sender: %s", cfg.SESSenderEmail)
	}

	// Initialize FCM push sender if enabled
	if cfg.EnablePush {
		fcmServerKey := os.Getenv("FCM_SERVER_KEY")
		if fcmServerKey != "" {
			pushSender, err = clients.NewFCMPushSender(fcmServerKey)
			if err != nil {
				log.Printf("warning: failed to initialize FCM sender: %v (continuing without push)", err)
			} else {
				log.Println("FCM push sender initialized")
			}
		} else {
			log.Println("warning: FCM_SERVER_KEY not set, push notifications disabled")
		}
	}

	// Initialize Teams webhook sender if enabled
	if cfg.EnableTeams {
		if cfg.TeamsWebhookURL == "" {
			log.Println("warning: EVENTS_TEAMS_WEBHOOK_URL not set, Teams notifications disabled")
		} else {
			teamsSender, err = clients.NewTeamsWebhookSender(cfg.TeamsWebhookURL)
			if err != nil {
				log.Printf("warning: failed to initialize Teams sender: %v (continuing without Teams)", err)
			} else {
				log.Println("Teams webhook sender initialized")
			}
		}
	}

	// Create repository adapter for notifier
	repoAdapter := clients.NewRepositoryAdapter(repo)

	// Create composite notifier
	notifier := clients.NewCompositeNotifier(
		emailSender,
		pushSender,
		teamsSender,
		repoAdapter,
		cfg.EnableEmail,
		cfg.EnablePush,
		cfg.EnableTeams,
	)

	broadcastWorker := worker.NewBroadcastWorker(sqsClient, cfg.SQSQueueURL, repo, notifier)

	log.Println("broadcast worker started")
	log.Printf("Configuration: Email=%v, Push=%v, Teams=%v", cfg.EnableEmail, cfg.EnablePush, cfg.EnableTeams)
	if err := broadcastWorker.Run(ctx); err != nil {
		log.Fatalf("worker exit: %v", err)
	}
}

