package api

import (
	"net/http"

	"lowcode-app-builder/pkg/page"
	"lowcode-app-builder/pkg/schema"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PageService interface {
	CreatePage(page *page.Page) error
	GetPage(id string) (*page.Page, error)
	UpdatePage(id string, page *page.Page) error
	DeletePage(id string) error
	ListPages() ([]page.Page, error)
	GenerateCode(id string, framework string) (*page.GeneratedCode, error)
}

type SchemaService interface {
	CreateSchema(schema *schema.Schema) error
	GetSchema(id string) (*schema.Schema, error)
	UpdateSchema(id string, schema *schema.Schema) error
	DeleteSchema(id string) error
	ListSchemas() ([]schema.Schema, error)
	GenerateCRUD(id string) (*schema.CRUDResult, error)
}

func RegisterRoutes(r *gin.Engine, pageSvc PageService, schemaSvc SchemaService) {
	api := r.Group("/api/v1")
	{
		pagesGroup := api.Group("/pages")
		{
			pagesGroup.POST("", createPageHandler(pageSvc))
			pagesGroup.GET("", listPagesHandler(pageSvc))
			pagesGroup.GET("/:id", getPageHandler(pageSvc))
			pagesGroup.PUT("/:id", updatePageHandler(pageSvc))
			pagesGroup.DELETE("/:id", deletePageHandler(pageSvc))
			pagesGroup.POST("/:id/generate", generateCodeHandler(pageSvc))
		}

		schemasGroup := api.Group("/schemas")
		{
			schemasGroup.POST("", createSchemaHandler(schemaSvc))
			schemasGroup.GET("", listSchemasHandler(schemaSvc))
			schemasGroup.GET("/:id", getSchemaHandler(schemaSvc))
			schemasGroup.PUT("/:id", updateSchemaHandler(schemaSvc))
			schemasGroup.DELETE("/:id", deleteSchemaHandler(schemaSvc))
			schemasGroup.POST("/:id/generate", generateCRUDHandler(schemaSvc))
		}
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "LowCode App Builder API",
		})
	})
}

func createPageHandler(svc PageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var p page.Page
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的请求体: " + err.Error(),
			})
			return
		}

		if p.ID == "" {
			p.ID = uuid.New().String()
		}

		if err := svc.CreatePage(&p); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "创建页面失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusCreated, p)
	}
}

func listPagesHandler(svc PageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		pages, err := svc.ListPages()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "获取页面列表失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data": pages,
		})
	}
}

func getPageHandler(svc PageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		p, err := svc.GetPage(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "页面不存在: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, p)
	}
}

func updatePageHandler(svc PageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var p page.Page
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的请求体: " + err.Error(),
			})
			return
		}

		if err := svc.UpdatePage(id, &p); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "更新页面失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, p)
	}
}

func deletePageHandler(svc PageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := svc.DeletePage(id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "删除页面失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "页面已删除",
		})
	}
}

func generateCodeHandler(svc PageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		framework := c.DefaultQuery("framework", "vue")

		code, err := svc.GenerateCode(id, framework)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "生成代码失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, code)
	}
}

func createSchemaHandler(svc SchemaService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var s schema.Schema
		if err := c.ShouldBindJSON(&s); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的请求体: " + err.Error(),
			})
			return
		}

		if s.ID == "" {
			s.ID = uuid.New().String()
		}

		if err := svc.CreateSchema(&s); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "创建数据模型失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusCreated, s)
	}
}

func listSchemasHandler(svc SchemaService) gin.HandlerFunc {
	return func(c *gin.Context) {
		schemas, err := svc.ListSchemas()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "获取数据模型列表失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data": schemas,
		})
	}
}

func getSchemaHandler(svc SchemaService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		s, err := svc.GetSchema(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "数据模型不存在: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, s)
	}
}

func updateSchemaHandler(svc SchemaService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var s schema.Schema
		if err := c.ShouldBindJSON(&s); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的请求体: " + err.Error(),
			})
			return
		}

		if err := svc.UpdateSchema(id, &s); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "更新数据模型失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, s)
	}
}

func deleteSchemaHandler(svc SchemaService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := svc.DeleteSchema(id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "删除数据模型失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "数据模型已删除",
		})
	}
}

func generateCRUDHandler(svc SchemaService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		result, err := svc.GenerateCRUD(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "生成CRUD失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}
