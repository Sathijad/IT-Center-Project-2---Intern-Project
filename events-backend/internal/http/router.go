package httpserver

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/it-center/events-backend/internal/auth"
	"github.com/it-center/events-backend/internal/config"
	"github.com/it-center/events-backend/internal/middleware"
	"github.com/it-center/events-backend/internal/models"
	"github.com/it-center/events-backend/internal/repository"
	"github.com/it-center/events-backend/internal/service"
)

func NewRouter(cfg config.Config, repo *repository.Repository, events *service.EventService, broadcast *service.BroadcastService, verifier *auth.Verifier) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.RequestLogger())
	router.Use(middleware.Correlation(cfg.CorrelationHeaderKey))
	router.Use(middleware.CORS(cfg.AllowedOrigins))

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	secured := router.Group("/")
	secured.Use(middleware.Auth(verifier, repo))

	api := secured.Group("/api/v1")
	{
		api.GET("/events", func(c *gin.Context) {
			filter := parseListFilter(c, cfg)
			page, err := events.ListEvents(c.Request.Context(), filter)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			etag := computeListETag(page)
			if match := c.GetHeader("If-None-Match"); match != "" && match == etag {
				c.Status(http.StatusNotModified)
				return
			}
			c.Header("ETag", etag)
			c.JSON(http.StatusOK, page)
		})

		api.GET("/events/:id", func(c *gin.Context) {
			id, err := uuid.Parse(c.Param("id"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
				return
			}
			event, body, err := events.GetEvent(c.Request.Context(), id)
			if err != nil {
				status := http.StatusInternalServerError
				if err == service.ErrNotFound {
					status = http.StatusNotFound
				}
				c.JSON(status, gin.H{"message": err.Error()})
				return
			}
			if match := c.GetHeader("If-None-Match"); match != "" && match == event.ETag {
				c.Status(http.StatusNotModified)
				return
			}
			resp := gin.H{"event": event}
			if body != nil {
				resp["body"] = body
			}
			c.Header("ETag", event.ETag)
			c.JSON(http.StatusOK, resp)
		})

		admin := api.Group("/")
		admin.Use(middleware.RequireRoles("ADMIN"))

		admin.POST("/events", func(c *gin.Context) {
			var req service.CreateEventRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			user := middleware.GetUser(c)
			event, err := events.CreateEvent(c.Request.Context(), req, user.ID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, event)
		})

		admin.PATCH("/events/:id", func(c *gin.Context) {
			var req service.UpdateEventRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			id, err := uuid.Parse(c.Param("id"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
				return
			}
			event, err := events.UpdateEvent(c.Request.Context(), id, req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			c.JSON(http.StatusOK, event)
		})

		admin.POST("/events/:id/moderate", func(c *gin.Context) {
			id, err := uuid.Parse(c.Param("id"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
				return
			}
			var action struct {
				Action string `json:"action"`
				Notes  string `json:"notes"`
			}
			if err := c.ShouldBindJSON(&action); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			user := middleware.GetUser(c)
			if err := events.Moderate(c.Request.Context(), id, action.Action, action.Notes, user.ID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			c.Status(http.StatusAccepted)
		})

		admin.POST("/events/:id/broadcast", func(c *gin.Context) {
			id, err := uuid.Parse(c.Param("id"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
				return
			}
			var req struct {
				IdempotencyKey string   `json:"idempotencyKey"`
				Channels       []string `json:"channels"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			user := middleware.GetUser(c)
			audit, err := broadcast.Broadcast(c.Request.Context(), id, req.Channels, req.IdempotencyKey, user.ID)
			if err != nil && err != service.ErrIdempotentConflict {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			c.JSON(http.StatusAccepted, gin.H{"audit": audit})
		})

		admin.POST("/events/tag-suggest", func(c *gin.Context) {
			var req struct {
				Query string `json:"query"`
				Limit int    `json:"limit"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
				return
			}
			tags, err := events.TagSuggestions(c.Request.Context(), req.Query, req.Limit)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"tags": tags})
		})

		api.GET("/tags", func(c *gin.Context) {
			query := c.Query("query")
			tags, err := events.TagSuggestions(c.Request.Context(), query, 10)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"tags": tags})
		})

		admin.GET("/events/:id/audit", func(c *gin.Context) {
			id, err := uuid.Parse(c.Param("id"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
				return
			}
			limit := parseInt(c.Query("limit"), 20)
			audits, err := events.ListAudits(c.Request.Context(), id, limit)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"audits": audits})
		})
	}

	return router
}

func parseListFilter(c *gin.Context, cfg config.Config) models.ListFilter {
	page := parseInt(c.Query("page"), 1)
	size := parseInt(c.Query("size"), cfg.PageSize)
	if size > cfg.MaxPageSize {
		size = cfg.MaxPageSize
	}
	filter := models.ListFilter{
		Page:       page,
		Size:       size,
		Channel:    strings.ToUpper(c.Query("channel")),
		SearchTerm: c.Query("search"),
	}
	if since := c.Query("since"); since != "" {
		if ts, err := time.Parse(time.RFC3339, since); err == nil {
			filter.Since = &ts
		}
	}
	if tags := c.QueryArray("tags"); len(tags) > 0 {
		filter.Tags = tags
	}
	if statuses := c.QueryArray("status"); len(statuses) > 0 {
		filter.Status = make([]models.EventStatus, len(statuses))
		for i, status := range statuses {
			filter.Status[i] = models.EventStatus(strings.ToUpper(status))
		}
	}
	filter.Normalise(cfg.MaxPageSize, cfg.PageSize)
	return filter
}

func parseInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	if n, err := strconv.Atoi(raw); err == nil {
		return n
	}
	return fallback
}

func computeListETag(page models.EventPage) string {
	if len(page.Items) == 0 {
		return "W/\"empty\""
	}
	first := page.Items[0].ETag
	last := page.Items[len(page.Items)-1].ETag
	return fmt.Sprintf("W/\"%s:%s:%d\"", first, last, page.Total)
}

