package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"time"

	appconfig "github.com/it-center/events-backend/internal/config"
	"github.com/it-center/events-backend/internal/repository"
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

	tagWorker := worker.NewTagWorker(repo, cfg.WorkerInterval, 24*time.Hour)
	log.Println("tag worker started")
	if err := tagWorker.Run(ctx); err != nil {
		log.Fatalf("tag worker exit: %v", err)
	}
}

