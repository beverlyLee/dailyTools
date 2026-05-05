package middleware

import (
	"log"
	"time"
	"github.com/gin-gonic/gin"
)

func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()

		log.Printf(
			"[GIN] %s %s | Status: %d | Latency: %v | IP: %s",
			method,
			path,
			statusCode,
			latency,
			c.ClientIP(),
		)

		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				log.Printf("Error: %v", err)
			}
		}
	}
}
