package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/it-center/events-backend/internal/models"
)

var ErrNoRows = pgx.ErrNoRows

// Repository centralises Postgres access for events.
type Repository struct {
	pool *pgxpool.Pool
}

// New initialises a pgx pool.
func New(ctx context.Context, dbURL string) (*Repository, error) {
	cfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, fmt.Errorf("parse db url: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect db: %w", err)
	}
	return &Repository{pool: pool}, nil
}

func (r *Repository) Close() {
	r.pool.Close()
}

// WithTx executes fn inside a transaction.
func (r *Repository) WithTx(ctx context.Context, fn func(pgx.Tx) error) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()
	if err := fn(tx); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	tx = nil
	return nil
}

type CreateEventParams struct {
	Title        string
	Summary      string
	Status       models.EventStatus
	Channel      string
	Tags         []string
	Attachments  []models.Attachment
	RsvpRequired bool
	ScheduledFor *time.Time
	ExpiresAt    *time.Time
	BodyHTML     string
	Sanitized    string
	PlainText    string
	CreatedBy    int64
}

type UpdateEventParams struct {
	ID           uuid.UUID
	Title        string
	Summary      string
	Channel      string
	Tags         []string
	Attachments  []models.Attachment
	RsvpRequired bool
	ScheduledFor *time.Time
	ExpiresAt    *time.Time
	BodyHTML     string
	Sanitized    string
	PlainText    string
}

type BroadcastAuditParams struct {
	EventID        uuid.UUID
	Channel        string
	Status         string
	Message        string
	DeliveryCount  int
	ErrorDetails   *string
	IdempotencyKey string
	RequestID      uuid.UUID
	Metadata       any
}

func (r *Repository) ListEvents(ctx context.Context, filter models.ListFilter) (models.EventPage, error) {
	args := []any{}
	clauses := []string{"1=1"}

	if filter.Since != nil {
		args = append(args, *filter.Since)
		clauses = append(clauses, fmt.Sprintf("updated_at >= $%d", len(args)))
	}
	if len(filter.Status) > 0 {
		statuses := make([]string, len(filter.Status))
		for i, st := range filter.Status {
			statuses[i] = string(st)
		}
		args = append(args, statuses)
		clauses = append(clauses, fmt.Sprintf("status = ANY($%d)", len(args)))
	}
	if filter.Channel != "" {
		args = append(args, filter.Channel)
		clauses = append(clauses, fmt.Sprintf("channel = $%d", len(args)))
	}
	if len(filter.Tags) > 0 {
		args = append(args, filter.Tags)
		clauses = append(clauses, fmt.Sprintf("tags @> $%d", len(args)))
	}
	if filter.SearchTerm != "" {
		args = append(args, "%"+strings.ToLower(filter.SearchTerm)+"%")
		clauses = append(clauses, fmt.Sprintf("(LOWER(title) LIKE $%d OR LOWER(summary) LIKE $%d)", len(args), len(args)))
	}

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM events WHERE %s", strings.Join(clauses, " AND "))
	var total int64
	if err := r.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return models.EventPage{}, err
	}

	args = append(args, filter.Size, (filter.Page-1)*filter.Size)
	listSQL := fmt.Sprintf(`
SELECT event_id, title, summary, status, channel, tags, attachments, rsvp_required,
       scheduled_for, published_at, expires_at, created_by, moderated_by, moderated_at,
       broadcast_at, created_at, updated_at, etag
FROM events
WHERE %s
ORDER BY created_at DESC
LIMIT $%d OFFSET $%d`, strings.Join(clauses, " AND "), len(args)-1, len(args))

	rows, err := r.pool.Query(ctx, listSQL, args...)
	if err != nil {
		return models.EventPage{}, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		event, err := scanEvent(rows)
		if err != nil {
			return models.EventPage{}, err
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return models.EventPage{}, err
	}

	return models.EventPage{
		Items:   events,
		Page:    filter.Page,
		Size:    filter.Size,
		Total:   total,
		HasNext: int64(filter.Page*filter.Size) < total,
	}, nil
}

func (r *Repository) GetEvent(ctx context.Context, id uuid.UUID) (*models.Event, *models.EventBody, error) {
	const selectEvent = `
SELECT event_id, title, summary, status, channel, tags, attachments, rsvp_required,
       scheduled_for, published_at, expires_at, created_by, moderated_by, moderated_at,
       broadcast_at, created_at, updated_at, etag
FROM events WHERE event_id = $1`
	eventRow := r.pool.QueryRow(ctx, selectEvent, id)
	event, err := scanEvent(eventRow)
	if err != nil {
		return nil, nil, err
	}

	const selectBody = `
SELECT body_id, event_id, raw_html, sanitized_html, plain_text, created_at, updated_at
FROM announcement_bodies WHERE event_id = $1`
	bodyRow := r.pool.QueryRow(ctx, selectBody, id)
	var body models.EventBody
	if err := bodyRow.Scan(&body.ID, &body.EventID, &body.HTML, &body.Sanitized, &body.PlainText, &body.CreatedAt, &body.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &event, nil, nil
		}
		return nil, nil, err
	}
	return &event, &body, nil
}

func (r *Repository) CreateEvent(ctx context.Context, params CreateEventParams) (*models.Event, error) {
	var created models.Event
	err := r.WithTx(ctx, func(tx pgx.Tx) error {
		attachments, err := json.Marshal(params.Attachments)
		if err != nil {
		 return err
		}
		const insertEvent = `
INSERT INTO events (title, summary, status, channel, tags, attachments, rsvp_required,
                    scheduled_for, expires_at, created_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
RETURNING event_id, title, summary, status, channel, tags, attachments, rsvp_required,
          scheduled_for, published_at, expires_at, created_by, moderated_by, moderated_at,
          broadcast_at, created_at, updated_at, etag`
		row := tx.QueryRow(ctx, insertEvent,
			params.Title,
			params.Summary,
			params.Status,
			params.Channel,
			params.Tags,
			attachments,
			params.RsvpRequired,
			params.ScheduledFor,
			params.ExpiresAt,
			params.CreatedBy,
		)
		event, err := scanEvent(row)
		if err != nil {
			return err
		}
		created = event

		if err := upsertBody(ctx, tx, event.ID, params.BodyHTML, params.Sanitized, params.PlainText); err != nil {
			return err
		}
		if err := replaceTags(ctx, tx, event.ID, params.Tags); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *Repository) UpdateEvent(ctx context.Context, params UpdateEventParams) (*models.Event, error) {
	var updated models.Event
	err := r.WithTx(ctx, func(tx pgx.Tx) error {
		attachments, err := json.Marshal(params.Attachments)
		if err != nil {
			return err
		}
		const updateEvent = `
UPDATE events
SET title = $2,
    summary = $3,
    channel = $4,
    tags = $5,
    attachments = $6,
    rsvp_required = $7,
    scheduled_for = $8,
    expires_at = $9,
    etag = md5(random()::text),
    updated_at = NOW()
WHERE event_id = $1
RETURNING event_id, title, summary, status, channel, tags, attachments, rsvp_required,
          scheduled_for, published_at, expires_at, created_by, moderated_by, moderated_at,
          broadcast_at, created_at, updated_at, etag`
		row := tx.QueryRow(ctx, updateEvent,
			params.ID,
			params.Title,
			params.Summary,
			params.Channel,
			params.Tags,
			attachments,
			params.RsvpRequired,
			params.ScheduledFor,
			params.ExpiresAt,
		)
		event, err := scanEvent(row)
		if err != nil {
			return err
		}
		updated = event

		if err := upsertBody(ctx, tx, params.ID, params.BodyHTML, params.Sanitized, params.PlainText); err != nil {
			return err
		}
		if err := replaceTags(ctx, tx, params.ID, params.Tags); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.EventStatus, moderatedBy *int64) error {
	const query = `
UPDATE events
SET status = $2,
    moderated_by = COALESCE($3, moderated_by),
    moderated_at = CASE WHEN $3 IS NULL THEN moderated_at ELSE NOW() END,
    etag = md5(random()::text),
    updated_at = NOW()
WHERE event_id = $1`
	_, err := r.pool.Exec(ctx, query, id, status, moderatedBy)
	return err
}

func (r *Repository) MarkBroadcast(ctx context.Context, id uuid.UUID, ts time.Time) error {
	const query = `
UPDATE events
SET broadcast_at = $2,
    published_at = COALESCE(published_at, $2),
    status = CASE WHEN status <> 'ARCHIVED' THEN 'PUBLISHED' ELSE status END,
    etag = md5(random()::text),
    updated_at = NOW()
WHERE event_id = $1`
	_, err := r.pool.Exec(ctx, query, id, ts)
	return err
}

func (r *Repository) RecordBroadcastAudit(ctx context.Context, params BroadcastAuditParams) error {
	const insertAudit = `
INSERT INTO publish_audit (event_id, channel, status, message, delivery_count, error_details,
                           idempotency_key, request_id, metadata)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`
	meta, _ := json.Marshal(params.Metadata)
	_, err := r.pool.Exec(ctx, insertAudit,
		params.EventID,
		params.Channel,
		params.Status,
		params.Message,
		params.DeliveryCount,
		params.ErrorDetails,
		params.IdempotencyKey,
		params.RequestID,
		meta,
	)
	return err
}

func (r *Repository) GetAuditByKey(ctx context.Context, key string) (*models.PublishAudit, error) {
	const query = `
SELECT audit_id, event_id, channel, status, message, delivery_count, error_details,
       request_id, idempotency_key, metadata, created_at
FROM publish_audit WHERE idempotency_key = $1 LIMIT 1`
	row := r.pool.QueryRow(ctx, query, key)
	var audit models.PublishAudit
	var metadata []byte
	if err := row.Scan(&audit.ID, &audit.EventID, &audit.Channel, &audit.Status, &audit.Message,
		&audit.DeliveryCount, &audit.ErrorDetails, &audit.RequestID, &audit.IdempotencyKey, &metadata, &audit.CreatedAt); err != nil {
		return nil, err
	}
	_ = json.Unmarshal(metadata, &audit.Metadata)
	return &audit, nil
}

func (r *Repository) ListAudits(ctx context.Context, eventID uuid.UUID, limit int) ([]models.PublishAudit, error) {
	const query = `
SELECT audit_id, event_id, channel, status, message, delivery_count, error_details,
       request_id, idempotency_key, metadata, created_at
FROM publish_audit
WHERE event_id = $1
ORDER BY created_at DESC
LIMIT $2`
	rows, err := r.pool.Query(ctx, query, eventID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var audits []models.PublishAudit
	for rows.Next() {
		var audit models.PublishAudit
		var metadata []byte
		if err := rows.Scan(&audit.ID, &audit.EventID, &audit.Channel, &audit.Status, &audit.Message,
			&audit.DeliveryCount, &audit.ErrorDetails, &audit.RequestID, &audit.IdempotencyKey, &metadata, &audit.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(metadata, &audit.Metadata)
		audits = append(audits, audit)
	}
	return audits, rows.Err()
}

func (r *Repository) SearchTags(ctx context.Context, query string, limit int) ([]string, error) {
	const sql = `
SELECT tag FROM tag_library
WHERE ($1 = '' OR tag ILIKE $2)
ORDER BY usage_count DESC
LIMIT $3`
	rows, err := r.pool.Query(ctx, sql, query, "%"+query+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

func (r *Repository) IncrementTagUsage(ctx context.Context, tags []string) error {
	const query = `
INSERT INTO tag_library (tag, usage_count)
VALUES ($1, 1)
ON CONFLICT (tag) DO UPDATE SET usage_count = tag_library.usage_count + 1`
	if len(tags) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for _, tag := range tags {
		batch.Queue(query, tag)
	}
	results := r.pool.SendBatch(ctx, batch)
	defer results.Close()
	for range tags {
		if _, err := results.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) GetFeatureFlags(ctx context.Context, keys []string) (map[string]bool, error) {
	if len(keys) == 0 {
		return map[string]bool{}, nil
	}
	rows, err := r.pool.Query(ctx, "SELECT flag_key, flag_value FROM feature_flags WHERE flag_key = ANY($1)", keys)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	flags := make(map[string]bool, len(keys))
	for rows.Next() {
		var key string
		var value bool
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		flags[key] = value
	}
	return flags, rows.Err()
}

func (r *Repository) TrendingTags(ctx context.Context, since time.Time, limit int) ([]string, error) {
	const query = `
SELECT tag
FROM event_tags
WHERE created_at >= $1
GROUP BY tag
ORDER BY COUNT(*) DESC
LIMIT $2`
	rows, err := r.pool.Query(ctx, query, since, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

func (r *Repository) ScheduledEventsDue(ctx context.Context, limit int) ([]models.Event, error) {
	if limit <= 0 {
		limit = 20
	}
	const query = `
SELECT event_id, title, summary, status, channel, tags, attachments, rsvp_required,
       scheduled_for, published_at, expires_at, created_by, moderated_by, moderated_at,
       broadcast_at, created_at, updated_at, etag
FROM events
WHERE status = 'SCHEDULED'
  AND scheduled_for IS NOT NULL
  AND scheduled_for <= NOW()
ORDER BY scheduled_for ASC
LIMIT $1`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var events []models.Event
	for rows.Next() {
		ev, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, ev)
	}
	return events, rows.Err()
}

// GetUserBySub resolves a Cognito subject to the local user id + roles.
// GetAllUserEmails returns all user email addresses from the database
func (r *Repository) GetAllUserEmails(ctx context.Context) ([]string, error) {
	const query = `
		SELECT email 
		FROM app_users 
		WHERE email IS NOT NULL AND email != ''
		ORDER BY email
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query user emails: %w", err)
	}
	defer rows.Close()

	var emails []string
	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err != nil {
			continue // Skip invalid rows
		}
		emails = append(emails, email)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading user emails: %w", err)
	}

	return emails, nil
}

func (r *Repository) GetUserBySub(ctx context.Context, sub string) (int64, []string, error) {
	const query = `
SELECT au.id,
       COALESCE(array_remove(array_agg(DISTINCT rl.name), NULL), '{}') as roles
FROM app_users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN roles rl ON rl.id = ur.role_id
WHERE au.cognito_sub = $1
GROUP BY au.id`
	row := r.pool.QueryRow(ctx, query, sub)
	var id int64
	var roles []string
	if err := row.Scan(&id, &roles); err != nil {
		return 0, nil, err
	}
	return id, roles, nil
}

func upsertBody(ctx context.Context, tx pgx.Tx, eventID uuid.UUID, html, sanitized, plain string) error {
	const query = `
INSERT INTO announcement_bodies (event_id, raw_html, sanitized_html, plain_text)
VALUES ($1,$2,$3,$4)
ON CONFLICT (event_id) DO UPDATE
SET raw_html = EXCLUDED.raw_html,
    sanitized_html = EXCLUDED.sanitized_html,
    plain_text = EXCLUDED.plain_text,
    updated_at = NOW()`
	_, err := tx.Exec(ctx, query, eventID, html, sanitized, plain)
	return err
}

func replaceTags(ctx context.Context, tx pgx.Tx, eventID uuid.UUID, tags []string) error {
	if _, err := tx.Exec(ctx, "DELETE FROM event_tags WHERE event_id = $1", eventID); err != nil {
		return err
	}
	if len(tags) == 0 {
		return nil
	}
	for _, tag := range tags {
		if _, err := tx.Exec(ctx, "INSERT INTO event_tags (event_id, tag) VALUES ($1,$2)", eventID, tag); err != nil {
			return err
		}
	}
	return nil
}

func scanEvent(row pgx.Row) (models.Event, error) {
	var event models.Event
	var attachments []byte
	if err := row.Scan(
		&event.ID,
		&event.Title,
		&event.Summary,
		&event.Status,
		&event.Channel,
		&event.Tags,
		&attachments,
		&event.RsvpRequired,
		&event.ScheduledFor,
		&event.PublishedAt,
		&event.ExpiresAt,
		&event.CreatedBy,
		&event.ModeratedBy,
		&event.ModeratedAt,
		&event.BroadcastAt,
		&event.CreatedAt,
		&event.UpdatedAt,
		&event.ETag,
	); err != nil {
		return event, err
	}
	if len(attachments) > 0 {
		_ = json.Unmarshal(attachments, &event.Attachments)
	}
	return event, nil
}

