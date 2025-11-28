package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/it-center/events-backend/internal/auth"
	"github.com/it-center/events-backend/internal/repository"
)

const userKey = "events_user"

var ErrForbidden = errors.New("forbidden")

// User represents the authenticated principal.
type User struct {
	ID    int64
	Sub   string
	Email string
	Roles map[string]bool
}

// RequestLogger adds basic timing + correlation id logs.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start)
		status := c.Writer.Status()
		c.Writer.Header().Set("X-Response-Time", duration.String())
		if status >= 500 {
			c.Error(errors.New("request failed")).SetType(gin.ErrorTypePrivate)
		}
	}
}

// Correlation injects/propagates correlation id header.
func Correlation(header string) gin.HandlerFunc {
	if header == "" {
		header = "x-correlation-id"
	}
	return func(c *gin.Context) {
		correlationID := c.GetHeader(header)
		if correlationID == "" {
			correlationID = c.GetHeader("X-Amzn-Trace-Id")
		}
		if correlationID == "" {
			correlationID = strings.ReplaceAll(time.Now().Format("20060102150405.000000"), ".", "")
		}
		c.Set("correlation_id", correlationID)
		c.Writer.Header().Set(header, correlationID)
		c.Next()
	}
}

// Auth validates the Authorization header and loads RBAC roles.
func Auth(verifier *auth.Verifier, repo *repository.Repository) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearer(c.GetHeader("Authorization"))
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "missing token"})
			return
		}
		claims, err := verifier.Verify(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid token"})
			return
		}
		userID, roles, err := repo.GetUserBySub(c.Request.Context(), claims.Subject)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "user not provisioned"})
			return
		}
		roleMap := make(map[string]bool, len(roles))
		for _, role := range roles {
			roleMap[strings.ToUpper(role)] = true
		}
		c.Set(userKey, &User{
			ID:    userID,
			Sub:   claims.Subject,
			Email: claims.Email,
			Roles: roleMap,
		})
		c.Next()
	}
}

func RequireRoles(roles ...string) gin.HandlerFunc {
	required := make([]string, len(roles))
	for i, role := range roles {
		required[i] = strings.ToUpper(role)
	}
	return func(c *gin.Context) {
		user := GetUser(c)
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "unauthenticated"})
			return
		}
		if len(required) == 0 {
			c.Next()
			return
		}
		for _, role := range required {
			if user.Roles[role] {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "forbidden"})
	}
}

func GetUser(c *gin.Context) *User {
	raw, ok := c.Get(userKey)
	if !ok {
		return nil
	}
	user, _ := raw.(*User)
	return user
}

func extractBearer(header string) string {
	if header == "" {
		return ""
	}
	if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
		return ""
	}
	return strings.TrimSpace(header[7:])
}

// WithUser attaches user info to outgoing context for background jobs.
func WithUser(ctx context.Context, user *User) context.Context {
	if user == nil {
		return ctx
	}
	return context.WithValue(ctx, userKey, user)
}

func UserFromContext(ctx context.Context) *User {
	raw := ctx.Value(userKey)
	if raw == nil {
		return nil
	}
	user, _ := raw.(*User)
	return user
}

