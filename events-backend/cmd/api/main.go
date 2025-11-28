package main

import (
	"context"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/it-center/events-backend/internal/auth"
	"github.com/it-center/events-backend/internal/clients"
	"github.com/it-center/events-backend/internal/config"
	httpserver "github.com/it-center/events-backend/internal/http"
	"github.com/it-center/events-backend/internal/repository"
	"github.com/it-center/events-backend/internal/service"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	repo, err := repository.New(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("failed to connect db: %v", err)
	}
	defer repo.Close()

	var queue clients.Queue
	if cfg.SQSQueueURL != "" {
		if q, err := clients.NewSQSQueue(ctx, cfg.SQSQueueURL, cfg.Region); err == nil {
			queue = q
		} else {
			log.Printf("warn: sqs queue unavailable, falling back to logger queue: %v", err)
		}
	}
	if queue == nil {
		queue = clients.LoggerQueue{}
	}

	eventSvc := service.NewEventService(repo)
	broadcastSvc := service.NewBroadcastService(repo, queue, service.BroadcastConfig{
		EnablePush:  cfg.EnablePush,
		EnableEmail: cfg.EnableEmail,
		EnableTeams: cfg.EnableTeams,
	})
	verifier := auth.NewVerifier(cfg.JWKSURL, cfg.JWTIssuer, cfg.Audience)
	router := httpserver.NewRouter(cfg, repo, eventSvc, broadcastSvc, verifier)
	gin.SetMode(gin.ReleaseMode)
	addr := fmt.Sprintf(":%d", cfg.Port)
	if err := router.Run(addr); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}

