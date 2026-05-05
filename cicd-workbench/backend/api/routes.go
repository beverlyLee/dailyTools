package api

import (
	"net/http"

	"cicd-workbench/pkg/artifacts"
	"cicd-workbench/pkg/notifications"
	"cicd-workbench/pkg/pipeline"

	"github.com/gin-gonic/gin"
)

type PipelineService interface {
	Validate(pipeline *pipeline.Pipeline) *pipeline.ValidationResult
}

type ArtifactsService interface {
	ListBuilds() ([]artifacts.Build, error)
	GetBuild(buildID string) (*artifacts.Build, error)
	GetBuildLogs(buildID string) (string, error)
	DeleteBuild(buildID string) error
	DownloadArtifact(buildID, artifactID string) ([]byte, error)
}

type NotificationsService interface {
	SaveSlackConfig(config notifications.SlackConfig) error
	SaveEmailConfig(config notifications.EmailConfig) error
	TestSlackConnection() error
	TestEmailConnection() error
}

func RegisterRoutes(r *gin.Engine, pipelineSvc PipelineService, artifactsSvc ArtifactsService, notificationsSvc NotificationsService) {
	api := r.Group("/api/v1")
	{
		// 流水线相关路由
		pipelineGroup := api.Group("/pipeline")
		{
			pipelineGroup.POST("/validate", validatePipelineHandler(pipelineSvc))
		}

		// 构建产物相关路由
		buildsGroup := api.Group("/builds")
		{
			buildsGroup.GET("", listBuildsHandler(artifactsSvc))
			buildsGroup.GET("/:id", getBuildHandler(artifactsSvc))
			buildsGroup.GET("/:id/logs", getBuildLogsHandler(artifactsSvc))
			buildsGroup.DELETE("/:id", deleteBuildHandler(artifactsSvc))
			buildsGroup.GET("/:id/artifacts/:artifactId/download", downloadArtifactHandler(artifactsSvc))
		}

		// 通知配置相关路由
		notificationsGroup := api.Group("/notifications")
		{
			notificationsGroup.POST("/slack", saveSlackConfigHandler(notificationsSvc))
			notificationsGroup.POST("/email", saveEmailConfigHandler(notificationsSvc))
			notificationsGroup.POST("/slack/test", testSlackConnectionHandler(notificationsSvc))
			notificationsGroup.POST("/email/test", testEmailConnectionHandler(notificationsSvc))
		}
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "CI/CD Workbench API",
		})
	})
}

func validatePipelineHandler(svc PipelineService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var pipeline pipeline.Pipeline
		if err := c.ShouldBindJSON(&pipeline); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的请求体: " + err.Error(),
			})
			return
		}

		result := svc.Validate(&pipeline)
		c.JSON(http.StatusOK, result)
	}
}

func listBuildsHandler(svc ArtifactsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		builds, err := svc.ListBuilds()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "获取构建列表失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data": builds,
		})
	}
}

func getBuildHandler(svc ArtifactsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		buildID := c.Param("id")
		build, err := svc.GetBuild(buildID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "构建记录不存在: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, build)
	}
}

func getBuildLogsHandler(svc ArtifactsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		buildID := c.Param("id")
		logs, err := svc.GetBuildLogs(buildID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "获取日志失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"logs": logs,
		})
	}
}

func deleteBuildHandler(svc ArtifactsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		buildID := c.Param("id")
		err := svc.DeleteBuild(buildID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "删除构建记录失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "构建记录已删除",
		})
	}
}

func downloadArtifactHandler(svc ArtifactsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		buildID := c.Param("id")
		artifactID := c.Param("artifactId")

		data, err := svc.DownloadArtifact(buildID, artifactID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "下载产物失败: " + err.Error(),
			})
			return
		}

		c.Data(http.StatusOK, "application/octet-stream", data)
	}
}

func saveSlackConfigHandler(svc NotificationsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var config notifications.SlackConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的配置: " + err.Error(),
			})
			return
		}

		if err := svc.SaveSlackConfig(config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "保存配置失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Slack 配置已保存",
		})
	}
}

func saveEmailConfigHandler(svc NotificationsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var config notifications.EmailConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的配置: " + err.Error(),
			})
			return
		}

		if err := svc.SaveEmailConfig(config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "保存配置失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "邮件配置已保存",
		})
	}
}

func testSlackConnectionHandler(svc NotificationsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := svc.TestSlackConnection(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Slack 连接测试失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Slack 连接测试成功",
		})
	}
}

func testEmailConnectionHandler(svc NotificationsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := svc.TestEmailConnection(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "邮件连接测试失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "邮件连接测试成功",
		})
	}
}
