package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultPort             = 8080
	defaultCacheTTLSeconds  = 30
	defaultPageSize         = 20
	defaultMaxPageSize      = 100
	defaultWorkerInterval   = 30 * time.Second
	defaultBroadcastTimeout = 15 * time.Second
)

// Config stores environment driven configuration shared across binaries.
type Config struct {
	Port                 int
	DBURL                string
	JWKSURL              string
	JWTIssuer            string
	Audience             string
	AllowedOrigins       []string
	SQSQueueURL          string
	SNSTopicARN          string
	SESEndpoint          string
	TeamsWebhookURL      string
	FeatureFlagPrefix    string
	CacheTTL             time.Duration
	PageSize             int
	MaxPageSize          int
	WorkerInterval       time.Duration
	BroadcastTimeout     time.Duration
	Region               string
	EnablePush           bool
	EnableEmail          bool
	EnableTeams          bool
	CorrelationHeaderKey string
}

// Load reads env vars and returns a populated Config. Missing required values cause panic.
func Load() Config {
	port := intFromEnv("EVENTS_PORT", defaultPort)
	dbURL := mustEnv("EVENTS_DB_URL")
	jwks := mustEnv("EVENTS_JWKS_URL")
	issuer := mustEnv("EVENTS_JWT_ISSUER")
	aud := os.Getenv("EVENTS_JWT_AUDIENCE")

	origins := splitAndClean(os.Getenv("EVENTS_ALLOWED_ORIGINS"))
	if len(origins) == 0 {
		origins = []string{"*"}
	}

	cfg := Config{
		Port:                 port,
		DBURL:                dbURL,
		JWKSURL:              jwks,
		JWTIssuer:            issuer,
		Audience:             aud,
		AllowedOrigins:       origins,
		SQSQueueURL:          os.Getenv("EVENTS_SQS_QUEUE_URL"),
		SNSTopicARN:          os.Getenv("EVENTS_SNS_TOPIC_ARN"),
		SESEndpoint:          os.Getenv("EVENTS_SES_ENDPOINT"),
		TeamsWebhookURL:      os.Getenv("EVENTS_TEAMS_WEBHOOK_URL"),
		FeatureFlagPrefix:    envOrDefault("EVENTS_FEATURE_FLAG_PREFIX", "events."),
		CacheTTL:             time.Duration(intFromEnv("EVENTS_CACHE_TTL_SECONDS", defaultCacheTTLSeconds)) * time.Second,
		PageSize:             intFromEnv("EVENTS_DEFAULT_PAGE_SIZE", defaultPageSize),
		MaxPageSize:          intFromEnv("EVENTS_MAX_PAGE_SIZE", defaultMaxPageSize),
		WorkerInterval:       durationFromEnv("EVENTS_WORKER_INTERVAL", defaultWorkerInterval),
		BroadcastTimeout:     durationFromEnv("EVENTS_BROADCAST_TIMEOUT", defaultBroadcastTimeout),
		Region:               envOrDefault("AWS_REGION", "ap-southeast-1"),
		EnablePush:           boolFromEnv("EVENTS_PUSH_ENABLED", true),
		EnableEmail:          boolFromEnv("EVENTS_EMAIL_ENABLED", true),
		EnableTeams:          boolFromEnv("EVENTS_TEAMS_ENABLED", true),
		CorrelationHeaderKey: envOrDefault("EVENTS_CORRELATION_HEADER", "x-correlation-id"),
	}

	return cfg
}

func mustEnv(key string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		panic(fmt.Sprintf("missing required env %s", key))
	}
	return value
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func intFromEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	i, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return i
}

func boolFromEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	b, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return b
}

func durationFromEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	if d, err := time.ParseDuration(value); err == nil {
		return d
	}
	if seconds, err := strconv.Atoi(value); err == nil {
		return time.Duration(seconds) * time.Second
	}
	return fallback
}

func splitAndClean(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		p := strings.TrimSpace(part)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

