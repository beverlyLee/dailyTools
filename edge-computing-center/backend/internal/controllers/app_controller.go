package controllers

import (
	"net/http"
	"time"

	"edge-computing-center/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AppController struct {
	apps map[string]*models.App
}

func NewAppController() *AppController {
	ac := &AppController{
		apps: make(map[string]*models.App),
	}
	ac.initSampleData()
	return ac
}

func (ac *AppController) initSampleData() {
	sampleApps := []*models.App{
		{
			ID:          uuid.New().String(),
			Name:        "Web应用服务",
			Description: "企业级Web应用服务器",
			Image:       "nginx",
			Tag:         "latest",
			EnvVars: map[string]string{
				"ENV": "production",
			},
			Ports: []models.PortMapping{
				{
					ContainerPort: 80,
					HostPort:      8080,
					Protocol:      "tcp",
				},
				{
					ContainerPort: 443,
					HostPort:      8443,
					Protocol:      "tcp",
				},
			},
			Volumes: []models.VolumeMount{
				{
					ContainerPath: "/usr/share/nginx/html",
					HostPath:      "/data/nginx/html",
					ReadOnly:      false,
				},
			},
			Resources: models.ResourceLimits{
				CPU:    "1.0",
				Memory: "512M",
			},
			Status:    models.AppStatusActive,
			CreatedAt: time.Now().Add(-7 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "Redis缓存服务",
			Description: "高性能缓存服务",
			Image:       "redis",
			Tag:         "7-alpine",
			EnvVars: map[string]string{
				"REDIS_PASSWORD": "changeme",
			},
			Ports: []models.PortMapping{
				{
					ContainerPort: 6379,
					HostPort:      6379,
					Protocol:      "tcp",
				},
			},
			Volumes: []models.VolumeMount{
				{
					ContainerPath: "/data",
					HostPath:      "/data/redis",
					ReadOnly:      false,
				},
			},
			Resources: models.ResourceLimits{
				CPU:    "0.5",
				Memory: "256M",
			},
			Status:    models.AppStatusActive,
			CreatedAt: time.Now().Add(-14 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		{
			ID:          uuid.New().String(),
			Name:        "MySQL数据库服务",
			Description: "关系型数据库服务",
			Image:       "mysql",
			Tag:         "8.0",
			EnvVars: map[string]string{
				"MYSQL_ROOT_PASSWORD": "root123",
				"MYSQL_DATABASE":      "appdb",
			},
			Ports: []models.PortMapping{
				{
					ContainerPort: 3306,
					HostPort:      3306,
					Protocol:      "tcp",
				},
			},
			Volumes: []models.VolumeMount{
				{
					ContainerPath: "/var/lib/mysql",
					HostPath:      "/data/mysql",
					ReadOnly:      false,
				},
			},
			Resources: models.ResourceLimits{
				CPU:    "2.0",
				Memory: "2G",
			},
			Status:    models.AppStatusInactive,
			CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
	}

	for _, app := range sampleApps {
		ac.apps[app.ID] = app
	}
}

func (ac *AppController) GetAllApps(c *gin.Context) {
	var apps []*models.App
	for _, app := range ac.apps {
		apps = append(apps, app)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    apps,
	})
}

func (ac *AppController) GetAppByID(c *gin.Context) {
	id := c.Param("id")
	app, exists := ac.apps[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "应用未找到",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    app,
	})
}

func (ac *AppController) CreateApp(c *gin.Context) {
	var app models.App
	if err := c.ShouldBindJSON(&app); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求数据",
			"error":   err.Error(),
		})
		return
	}

	app.ID = uuid.New().String()
	app.CreatedAt = time.Now()
	app.UpdatedAt = time.Now()
	app.Status = models.AppStatusDraft

	ac.apps[app.ID] = &app

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    app,
		"message": "应用创建成功",
	})
}

func (ac *AppController) DeleteApp(c *gin.Context) {
	id := c.Param("id")
	_, exists := ac.apps[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "应用未找到",
		})
		return
	}

	delete(ac.apps, id)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "应用删除成功",
	})
}
