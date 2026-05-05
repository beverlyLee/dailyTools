package middleware

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"time"
)

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		clientIP := c.ClientIP()

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()

		if errorMessage == "" {
			fmt.Printf("[%s] %s %s %d %s - %s\n",
				time.Now().Format("2006-01-02 15:04:05"),
				method,
				path,
				statusCode,
				latency,
				clientIP,
			)
		} else {
			fmt.Printf("[%s] %s %s %d %s - %s ERROR: %s\n",
				time.Now().Format("2006-01-02 15:04:05"),
				method,
				path,
				statusCode,
				latency,
				clientIP,
				errorMessage,
			)
		}
	}
}

func Recovery() gin.HandlerFunc {
	return gin.Recovery()
}
