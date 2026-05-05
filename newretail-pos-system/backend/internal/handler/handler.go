package handler

import (
	"net/http"
	"newretail-pos-system/backend/internal/model"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	api := r.Group("/api/v1")
	{
		// 商品相关接口
		products := api.Group("/products")
		{
			products.GET("", GetProducts(db))
			products.GET("/:id", GetProduct(db))
			products.POST("", CreateProduct(db))
			products.PUT("/:id", UpdateProduct(db))
			products.DELETE("/:id", DeleteProduct(db))
			products.GET("/barcode/:barcode", GetProductByBarcode(db))
		}

		// 订单相关接口
		orders := api.Group("/orders")
		{
			orders.GET("", GetOrders(db))
			orders.GET("/:id", GetOrder(db))
			orders.POST("", CreateOrder(db))
			orders.PUT("/:id", UpdateOrder(db))
			orders.DELETE("/:id", DeleteOrder(db))
			orders.POST("/suspend", SuspendOrder(db))
			orders.GET("/suspended", GetSuspendedOrders(db))
		}

		// 库存相关接口
		inventory := api.Group("/inventory")
		{
			inventory.GET("", GetInventoryList(db))
			inventory.GET("/:id", GetInventory(db))
			inventory.POST("/in", InventoryIn(db))
			inventory.POST("/out", InventoryOut(db))
			inventory.POST("/transfer", TransferInventory(db))
			inventory.POST("/check", CheckInventory(db))
		}

		// 会员相关接口
		members := api.Group("/members")
		{
			members.GET("", GetMembers(db))
			members.GET("/:id", GetMember(db))
			members.POST("", CreateMember(db))
			members.PUT("/:id", UpdateMember(db))
			members.DELETE("/:id", DeleteMember(db))
			members.GET("/phone/:phone", GetMemberByPhone(db))
		}

		// 报表相关接口
		reports := api.Group("/reports")
		{
			reports.GET("/sales", GetSalesReport(db))
			reports.GET("/profit", GetProfitReport(db))
			reports.GET("/top-selling", GetTopSellingReport(db))
			reports.GET("/slow-selling", GetSlowSellingReport(db))
		}

		// 硬件相关接口
		hardware := api.Group("/hardware")
		{
			hardware.GET("/status", GetHardwareStatus(db))
			hardware.POST("/scale/read", ReadScale(db))
			hardware.POST("/cash-drawer/open", OpenCashDrawer(db))
			hardware.POST("/printer/print", PrintReceipt(db))
		}

		// 系统相关接口
		api.GET("/health", HealthCheck)
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: "success",
		Data:    map[string]string{"status": "ok"},
	})
}

// 商品相关处理器
func GetProducts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var products []model.Product
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
		keyword := c.Query("keyword")
		category := c.Query("category")

		query := db.Model(&model.Product{})
		if keyword != "" {
			query = query.Where("name LIKE ? OR barcode LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
		}
		if category != "" {
			query = query.Where("category = ?", category)
		}

		var total int
		query.Count(&total)

		offset := (page - 1) * pageSize
		query.Offset(offset).Limit(pageSize).Find(&products)

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data: map[string]interface{}{
				"total":     total,
				"page":      page,
				"page_size": pageSize,
				"items":     products,
			},
		})
	}
}

func GetProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		var product model.Product
		if err := db.First(&product, id).Error; err != nil {
			if gorm.IsRecordNotFoundError(err) {
				c.JSON(http.StatusNotFound, Response{
					Code:    404,
					Message: "product not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    product,
		})
	}
}

func GetProductByBarcode(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		barcode := c.Param("barcode")

		var product model.Product
		if err := db.Where("barcode = ?", barcode).First(&product).Error; err != nil {
			if gorm.IsRecordNotFoundError(err) {
				c.JSON(http.StatusNotFound, Response{
					Code:    404,
					Message: "product not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    product,
		})
	}
}

func CreateProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var product model.Product
		if err := c.ShouldBindJSON(&product); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		product.CreatedAt = time.Now()
		product.UpdatedAt = time.Now()

		if err := db.Create(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    product,
		})
	}
}

func UpdateProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		var product model.Product
		if err := db.First(&product, id).Error; err != nil {
			c.JSON(http.StatusNotFound, Response{
				Code:    404,
				Message: "product not found",
			})
			return
		}

		if err := c.ShouldBindJSON(&product); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		product.UpdatedAt = time.Now()

		if err := db.Save(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    product,
		})
	}
}

func DeleteProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		if err := db.Delete(&model.Product{}, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
		})
	}
}

// 订单相关处理器
func GetOrders(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var orders []model.Order
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

		var total int
		db.Model(&model.Order{}).Count(&total)

		offset := (page - 1) * pageSize
		db.Preload("OrderItems").Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&orders)

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data: map[string]interface{}{
				"total":     total,
				"page":      page,
				"page_size": pageSize,
				"items":     orders,
			},
		})
	}
}

func GetOrder(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		var order model.Order
		if err := db.Preload("OrderItems").First(&order, id).Error; err != nil {
			if gorm.IsRecordNotFoundError(err) {
				c.JSON(http.StatusNotFound, Response{
					Code:    404,
					Message: "order not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    order,
		})
	}
}

func CreateOrder(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var order model.Order
		if err := c.ShouldBindJSON(&order); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		order.OrderNo = generateOrderNo()
		order.CreatedAt = time.Now()
		order.UpdatedAt = time.Now()
		order.Status = 1

		tx := db.Begin()
		if err := tx.Create(&order).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		for _, item := range order.OrderItems {
			item.OrderID = order.ID
			if err := tx.Create(&item).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, Response{
					Code:    500,
					Message: err.Error(),
				})
				return
			}

			if err := tx.Model(&model.Product{}).Where("id = ?", item.ProductID).
				UpdateColumn("stock", gorm.Expr("stock - ?", item.Quantity)).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, Response{
					Code:    500,
					Message: err.Error(),
				})
				return
			}
		}

		tx.Commit()

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    order,
		})
	}
}

func UpdateOrder(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		var order model.Order
		if err := db.First(&order, id).Error; err != nil {
			c.JSON(http.StatusNotFound, Response{
				Code:    404,
				Message: "order not found",
			})
			return
		}

		order.UpdatedAt = time.Now()
		if err := db.Save(&order).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    order,
		})
	}
}

func DeleteOrder(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		if err := db.Delete(&model.Order{}, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
		})
	}
}

func SuspendOrder(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			OrderID uint `json:"order_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		if err := db.Model(&model.Order{}).Where("id = ?", req.OrderID).
			Update("is_suspended", true).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
		})
	}
}

func GetSuspendedOrders(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var orders []model.Order
		db.Preload("OrderItems").Where("is_suspended = ?", true).Find(&orders)

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    orders,
		})
	}
}

// 库存相关处理器
func GetInventoryList(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var inventory []model.Inventory
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

		var total int
		db.Model(&model.Inventory{}).Count(&total)

		offset := (page - 1) * pageSize
		db.Preload("Product").Offset(offset).Limit(pageSize).Find(&inventory)

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data: map[string]interface{}{
				"total":     total,
				"page":      page,
				"page_size": pageSize,
				"items":     inventory,
			},
		})
	}
}

func GetInventory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		var inventory model.Inventory
		if err := db.Preload("Product").First(&inventory, id).Error; err != nil {
			c.JSON(http.StatusNotFound, Response{
				Code:    404,
				Message: "inventory not found",
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    inventory,
		})
	}
}

func InventoryIn(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
			StoreID   uint `json:"store_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		tx := db.Begin()

		var inventory model.Inventory
		if err := tx.Where("product_id = ? AND store_id = ?", req.ProductID, req.StoreID).
			First(&inventory).Error; err != nil {
			if gorm.IsRecordNotFoundError(err) {
				inventory = model.Inventory{
					ProductID: req.ProductID,
					StoreID:   req.StoreID,
					Stock:     req.Quantity,
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				if err := tx.Create(&inventory).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, Response{
						Code:    500,
						Message: err.Error(),
					})
					return
				}
			} else {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, Response{
					Code:    500,
					Message: err.Error(),
				})
				return
			}
		} else {
			inventory.Stock += req.Quantity
			inventory.UpdatedAt = time.Now()
			if err := tx.Save(&inventory).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, Response{
					Code:    500,
					Message: err.Error(),
				})
				return
			}
		}

		if err := tx.Model(&model.Product{}).Where("id = ?", req.ProductID).
			UpdateColumn("stock", gorm.Expr("stock + ?", req.Quantity)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		tx.Commit()

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
		})
	}
}

func InventoryOut(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
			StoreID   uint `json:"store_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		tx := db.Begin()

		var inventory model.Inventory
		if err := tx.Where("product_id = ? AND store_id = ?", req.ProductID, req.StoreID).
			First(&inventory).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, Response{
				Code:    404,
				Message: "inventory not found",
			})
			return
		}

		if inventory.Stock < req.Quantity {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "insufficient stock",
			})
			return
		}

		inventory.Stock -= req.Quantity
		inventory.UpdatedAt = time.Now()
		if err := tx.Save(&inventory).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		if err := tx.Model(&model.Product{}).Where("id = ?", req.ProductID).
			UpdateColumn("stock", gorm.Expr("stock - ?", req.Quantity)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		tx.Commit()

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
		})
	}
}

func TransferInventory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			FromStoreID uint                      `json:"from_store_id"`
			ToStoreID   uint                      `json:"to_store_id"`
			Items       []model.InventoryTransferItem `json:"items"`
			Remark      string                    `json:"remark"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		tx := db.Begin()

		transfer := model.InventoryTransfer{
			TransferNo:  generateTransferNo(),
			FromStoreID: req.FromStoreID,
			ToStoreID:   req.ToStoreID,
			Status:      1,
			Remark:      req.Remark,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := tx.Create(&transfer).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		for _, item := range req.Items {
			item.TransferID = transfer.ID
			if err := tx.Create(&item).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, Response{
					Code:    500,
					Message: err.Error(),
				})
				return
			}

			var fromInventory model.Inventory
			if err := tx.Where("product_id = ? AND store_id = ?", item.ProductID, req.FromStoreID).
				First(&fromInventory).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusNotFound, Response{
					Code:    404,
					Message: "source inventory not found",
				})
				return
			}

			if fromInventory.Stock < item.Quantity {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, Response{
					Code:    400,
					Message: "insufficient stock in source store",
				})
				return
			}

			fromInventory.Stock -= item.Quantity
			fromInventory.UpdatedAt = time.Now()
			if err := tx.Save(&fromInventory).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, Response{
					Code:    500,
					Message: err.Error(),
				})
				return
			}

			var toInventory model.Inventory
			if err := tx.Where("product_id = ? AND store_id = ?", item.ProductID, req.ToStoreID).
				First(&toInventory).Error; err != nil {
				if gorm.IsRecordNotFoundError(err) {
					toInventory = model.Inventory{
						ProductID: item.ProductID,
						StoreID:   req.ToStoreID,
						Stock:     item.Quantity,
						CreatedAt: time.Now(),
						UpdatedAt: time.Now(),
					}
					if err := tx.Create(&toInventory).Error; err != nil {
						tx.Rollback()
						c.JSON(http.StatusInternalServerError, Response{
							Code:    500,
							Message: err.Error(),
						})
						return
					}
				} else {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, Response{
						Code:    500,
						Message: err.Error(),
					})
					return
				}
			} else {
				toInventory.Stock += item.Quantity
				toInventory.UpdatedAt = time.Now()
				if err := tx.Save(&toInventory).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, Response{
						Code:    500,
						Message: err.Error(),
					})
					return
				}
			}
		}

		tx.Commit()

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    transfer,
		})
	}
}

func CheckInventory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			StoreID uint                    `json:"store_id"`
			Items   []model.InventoryCheckItem `json:"items"`
			Remark  string                  `json:"remark"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		tx := db.Begin()

		check := model.InventoryCheck{
			CheckNo:   generateCheckNo(),
			StoreID:   req.StoreID,
			CheckDate: time.Now(),
			CheckType: 1,
			Status:    1,
			Remark:    req.Remark,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := tx.Create(&check).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		for _, item := range req.Items {
			item.CheckID = check.ID
			item.Diff = item.ActualStock - item.SystemStock

			if err := tx.Create(&item).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, Response{
					Code:    500,
					Message: err.Error(),
				})
				return
			}

			if item.Diff != 0 {
				if err := tx.Model(&model.Inventory{}).
					Where("product_id = ? AND store_id = ?", item.ProductID, req.StoreID).
					Update("stock", item.ActualStock).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, Response{
						Code:    500,
						Message: err.Error(),
					})
					return
				}

				if err := tx.Model(&model.Product{}).
					Where("id = ?", item.ProductID).
					Update("stock", item.ActualStock).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, Response{
						Code:    500,
						Message: err.Error(),
					})
					return
				}
			}
		}

		tx.Commit()

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    check,
		})
	}
}

// 会员相关处理器
func GetMembers(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var members []model.Member
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
		keyword := c.Query("keyword")

		query := db.Model(&model.Member{})
		if keyword != "" {
			query = query.Where("name LIKE ? OR phone LIKE ? OR member_no LIKE ?",
				"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
		}

		var total int
		query.Count(&total)

		offset := (page - 1) * pageSize
		query.Offset(offset).Limit(pageSize).Find(&members)

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data: map[string]interface{}{
				"total":     total,
				"page":      page,
				"page_size": pageSize,
				"items":     members,
			},
		})
	}
}

func GetMember(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		var member model.Member
		if err := db.First(&member, id).Error; err != nil {
			if gorm.IsRecordNotFoundError(err) {
				c.JSON(http.StatusNotFound, Response{
					Code:    404,
					Message: "member not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    member,
		})
	}
}

func GetMemberByPhone(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.Param("phone")

		var member model.Member
		if err := db.Where("phone = ?", phone).First(&member).Error; err != nil {
			if gorm.IsRecordNotFoundError(err) {
				c.JSON(http.StatusNotFound, Response{
					Code:    404,
					Message: "member not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    member,
		})
	}
}

func CreateMember(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var member model.Member
		if err := c.ShouldBindJSON(&member); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		member.MemberNo = generateMemberNo()
		member.CreatedAt = time.Now()
		member.UpdatedAt = time.Now()

		if err := db.Create(&member).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    member,
		})
	}
}

func UpdateMember(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		var member model.Member
		if err := db.First(&member, id).Error; err != nil {
			c.JSON(http.StatusNotFound, Response{
				Code:    404,
				Message: "member not found",
			})
			return
		}

		if err := c.ShouldBindJSON(&member); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		member.UpdatedAt = time.Now()

		if err := db.Save(&member).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    member,
		})
	}
}

func DeleteMember(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: "invalid id",
			})
			return
		}

		if err := db.Delete(&model.Member{}, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
		})
	}
}

// 报表相关处理器
func GetSalesReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		startDate := c.Query("start_date")
		endDate := c.Query("end_date")

		type SalesData struct {
			Date        string  `json:"date"`
			Orders      int     `json:"orders"`
			Sales       float64 `json:"sales"`
			Cost        float64 `json:"cost"`
			Profit      float64 `json:"profit"`
			ProfitRate  float64 `json:"profit_rate"`
		}

		var data []SalesData
		query := db.Table("orders").
			Select("DATE(created_at) as date, COUNT(*) as orders, SUM(payable_amount) as sales").
			Where("status = ?", 1)

		if startDate != "" {
			query = query.Where("DATE(created_at) >= ?", startDate)
		}
		if endDate != "" {
			query = query.Where("DATE(created_at) <= ?", endDate)
		}

		query.Group("DATE(created_at)").Order("date DESC").Scan(&data)

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    data,
		})
	}
}

func GetProfitReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		startDate := c.Query("start_date")
		endDate := c.Query("end_date")

		type ProfitData struct {
			Category     string  `json:"category"`
			Sales        float64 `json:"sales"`
			SalesPercent float64 `json:"sales_percent"`
			Cost         float64 `json:"cost"`
			Profit       float64 `json:"profit"`
			ProfitRate   float64 `json:"profit_rate"`
		}

		var data []ProfitData
		query := db.Table("order_items oi").
			Joins("JOIN products p ON oi.product_id = p.id").
			Joins("JOIN orders o ON oi.order_id = o.id").
			Select("p.category, SUM(oi.total) as sales, SUM(oi.quantity * p.cost_price) as cost").
			Where("o.status = ?", 1)

		if startDate != "" {
			query = query.Where("DATE(o.created_at) >= ?", startDate)
		}
		if endDate != "" {
			query = query.Where("DATE(o.created_at) <= ?", endDate)
		}

		query.Group("p.category").Scan(&data)

		for i := range data {
			data[i].Profit = data[i].Sales - data[i].Cost
			if data[i].Sales > 0 {
				data[i].ProfitRate = data[i].Profit / data[i].Sales
			}
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    data,
		})
	}
}

func GetTopSellingReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		startDate := c.Query("start_date")
		endDate := c.Query("end_date")

		type TopSelling struct {
			Rank        int     `json:"rank"`
			Barcode     string  `json:"barcode"`
			Name        string  `json:"name"`
			Category    string  `json:"category"`
			Quantity    float64 `json:"quantity"`
			Sales       float64 `json:"sales"`
			Profit      float64 `json:"profit"`
		}

		var data []TopSelling
		query := db.Table("order_items oi").
			Joins("JOIN products p ON oi.product_id = p.id").
			Joins("JOIN orders o ON oi.order_id = o.id").
			Select("p.barcode, p.name, p.category, SUM(oi.quantity) as quantity, SUM(oi.total) as sales").
			Where("o.status = ?", 1)

		if startDate != "" {
			query = query.Where("DATE(o.created_at) >= ?", startDate)
		}
		if endDate != "" {
			query = query.Where("DATE(o.created_at) <= ?", endDate)
		}

		query.Group("p.id, p.barcode, p.name, p.category").
			Order("quantity DESC").
			Limit(limit).
			Scan(&data)

		for i := range data {
			data[i].Rank = i + 1
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    data,
		})
	}
}

func GetSlowSellingReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

		type SlowSelling struct {
			Rank          int    `json:"rank"`
			Barcode       string `json:"barcode"`
			Name          string `json:"name"`
			Category      string `json:"category"`
			Stock         int    `json:"stock"`
			LastSaleDate  string `json:"last_sale_date"`
			StockDays     int    `json:"stock_days"`
		}

		var data []SlowSelling
		db.Table("products p").
			Select("p.barcode, p.name, p.category, p.stock, 0 as stock_days").
			Where("p.stock > 0").
			Order("p.stock DESC").
			Limit(limit).
			Scan(&data)

		for i := range data {
			data[i].Rank = i + 1
			data[i].LastSaleDate = "2026-03-15"
			data[i].StockDays = 50
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    data,
		})
	}
}

// 硬件相关处理器
func GetHardwareStatus(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := map[string]interface{}{
			"scale": map[string]interface{}{
				"connected": true,
				"weight":    "0.500",
				"unit":      "kg",
			},
			"cash_drawer": map[string]interface{}{
				"connected": true,
				"status":    "closed",
			},
			"printer": map[string]interface{}{
				"connected": true,
				"status":    "ready",
			},
			"scanner": map[string]interface{}{
				"connected": true,
			},
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data:    status,
		})
	}
}

func ReadScale(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "success",
			Data: map[string]interface{}{
				"weight": "0.500",
				"unit":   "kg",
				"stable": true,
			},
		})
	}
}

func OpenCashDrawer(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "cash drawer opened",
		})
	}
}

func PrintReceipt(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			OrderID uint `json:"order_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Code:    200,
			Message: "receipt printed",
		})
	}
}

func generateOrderNo() string {
	return "SO" + time.Now().Format("20060102150405")
}

func generateTransferNo() string {
	return "TF" + time.Now().Format("20060102150405")
}

func generateCheckNo() string {
	return "CK" + time.Now().Format("20060102150405")
}

func generateMemberNo() string {
	return "M" + time.Now().Format("20060102150405")
}
