package main

import (
	"context"
	"log"
	"os"
	"os/signal"

	appconfig "github.com/it-center/events-backend/internal/config"
	"github.com/it-center/events-backend/internal/clients"
	"github.com/it-center/events-backend/internal/repository"
	"github.com/it-center/events-backend/internal/service"
	"github.com/it-center/events-backend/internal/worker"
)

func main() {
	cfg := appconfig.Load()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	repo, err := repository.New(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer repo.Close()

	queue := clients.LoggerQueue{}
	broadcastSvc := service.NewBroadcastService(repo, queue, service.BroadcastConfig{
		EnablePush:  cfg.EnablePush,
		EnableEmail: cfg.EnableEmail,
		EnableTeams: cfg.EnableTeams,
	})

	scheduler := worker.NewSchedulerWorker(repo, broadcastSvc, cfg.WorkerInterval)
	log.Println("scheduler worker started")
	if err := scheduler.Run(ctx); err != nil {
		log.Fatalf("scheduler worker exit: %v", err)
	}
}

