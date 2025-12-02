FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/api ./cmd/api/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/broadcast-worker ./cmd/broadcast-worker/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/scheduler-worker ./cmd/scheduler-worker/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/tag-worker ./cmd/tag-worker/main.go

# Test stage
FROM golang:1.22-alpine AS test

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Run tests
RUN go test -v -coverprofile=coverage.out ./...

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

# Copy binaries from builder
COPY --from=builder /app/bin/api /usr/local/bin/api
COPY --from=builder /app/bin/broadcast-worker /usr/local/bin/broadcast-worker
COPY --from=builder /app/bin/scheduler-worker /usr/local/bin/scheduler-worker
COPY --from=builder /app/bin/tag-worker /usr/local/bin/tag-worker

EXPOSE 8085

CMD ["api"]


