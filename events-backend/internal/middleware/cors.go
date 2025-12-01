package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	allowedHeaders = "Authorization, Content-Type, Accept, X-Correlation-Id, X-Requested-With, If-None-Match, If-Match"
	allowedMethods = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
	exposedHeaders = "ETag, X-Response-Time, X-Correlation-Id"
	maxAgeSeconds  = "600"
)

// CORS adds the Access-Control-* headers that allow the admin web app to talk to the API.
func CORS(origins []string) gin.HandlerFunc {
	allowAll := false
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		o := strings.TrimSpace(origin)
		if o == "" {
			continue
		}
		if o == "*" {
			allowAll = true
			break
		}
		allowed[strings.ToLower(o)] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}

		headers := c.Writer.Header()
		allowedOrigin := ""
		if allowAll {
			allowedOrigin = "*"
		} else if _, ok := allowed[strings.ToLower(origin)]; ok {
			allowedOrigin = origin
			headers.Add("Vary", "Origin")
			headers.Set("Access-Control-Allow-Credentials", "true")
		}

		if allowedOrigin != "" {
			headers.Set("Access-Control-Allow-Origin", allowedOrigin)
			headers.Set("Access-Control-Allow-Headers", allowedHeaders)
			headers.Set("Access-Control-Allow-Methods", allowedMethods)
			headers.Set("Access-Control-Expose-Headers", exposedHeaders)
			headers.Set("Access-Control-Max-Age", maxAgeSeconds)
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

