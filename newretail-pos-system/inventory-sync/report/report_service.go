package report

import (
	"sort"
	"time"
)

type SalesReport struct {
	Date          string  `json:"date"`
	TotalOrders   int     `json:"total_orders"`
	TotalAmount   float64 `json:"total_amount"`
	TotalQuantity int     `json:"total_quantity"`
	AverageAmount float64 `json:"average_amount"`
}

type GrossProfitReport struct {
	Category        string  `json:"category"`
	CategoryName    string  `json:"category_name"`
	TotalSales      float64 `json:"total_sales"`
	TotalCost       float64 `json:"total_cost"`
	GrossProfit     float64 `json:"gross_profit"`
	GrossProfitRate float64 `json:"gross_profit_rate"`
	OrderCount      int     `json:"order_count"`
}

type BestSellerItem struct {
	ProductID     uint    `json:"product_id"`
	ProductBarcode string  `json:"product_barcode"`
	ProductName   string  `json:"product_name"`
	Category      string  `json:"category"`
	CategoryName  string  `json:"category_name"`
	SalesQuantity int     `json:"sales_quantity"`
	SalesAmount   float64 `json:"sales_amount"`
	GrossProfit   float64 `json:"gross_profit"`
	Rank          int     `json:"rank"`
}

type SlowSellerItem struct {
	ProductID     uint    `json:"product_id"`
	ProductBarcode string  `json:"product_barcode"`
	ProductName   string  `json:"product_name"`
	Category      string  `json:"category"`
	CategoryName  string  `json:"category_name"`
	CurrentStock  int     `json:"current_stock"`
	SalesQuantity int     `json:"sales_quantity"`
	SalesAmount   float64 `json:"sales_amount"`
	TurnoverDays  int     `json:"turnover_days"`
	Rank          int     `json:"rank"`
}

type InventoryReport struct {
	StoreID         uint    `json:"store_id"`
	StoreName       string  `json:"store_name"`
	TotalProducts   int     `json:"total_products"`
	TotalStock      int     `json:"total_stock"`
	TotalStockValue float64 `json:"total_stock_value"`
	LowStockCount   int     `json:"low_stock_count"`
	OverStockCount  int     `json:"over_stock_count"`
}

type OrderSummary struct {
	OrderNo       string    `json:"order_no"`
	StoreID       uint      `json:"store_id"`
	StoreName     string    `json:"store_name"`
	TotalAmount   float64   `json:"total_amount"`
	PaidAmount    float64   `json:"paid_amount"`
	Discount      float64   `json:"discount"`
	PaymentMethod string    `json:"payment_method"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	CashierID     uint      `json:"cashier_id"`
	CashierName   string    `json:"cashier_name"`
	Items         []OrderItemSummary `json:"items"`
}

type OrderItemSummary struct {
	ProductID     uint    `json:"product_id"`
	ProductBarcode string  `json:"product_barcode"`
	ProductName   string  `json:"product_name"`
	Category      string  `json:"category"`
	Quantity      int     `json:"quantity"`
	UnitPrice     float64 `json:"unit_price"`
	CostPrice     float64 `json:"cost_price"`
	Amount        float64 `json:"amount"`
}

type ReportService struct {
	orders     []*OrderSummary
	categories map[string]string
}

func NewReportService() *ReportService {
	return &ReportService{
		orders:     make([]*OrderSummary, 0),
		categories: make(map[string]string),
	}
}

func (rs *ReportService) AddOrder(order *OrderSummary) {
	rs.orders = append(rs.orders, order)
}

func (rs *ReportService) SetCategories(categories map[string]string) {
	rs.categories = categories
}

func (rs *ReportService) GetSalesReport(storeID uint, startDate, endDate time.Time) []*SalesReport {
	dailyData := make(map[string]*SalesReport)

	for _, order := range rs.orders {
		if storeID != 0 && order.StoreID != storeID {
			continue
		}
		if order.CreatedAt.Before(startDate) || order.CreatedAt.After(endDate) {
			continue
		}

		dateKey := order.CreatedAt.Format("2006-01-02")
		if _, exists := dailyData[dateKey]; !exists {
			dailyData[dateKey] = &SalesReport{
				Date: dateKey,
			}
		}

		dailyData[dateKey].TotalOrders++
		dailyData[dateKey].TotalAmount += order.TotalAmount
		for _, item := range order.Items {
			dailyData[dateKey].TotalQuantity += item.Quantity
		}
	}

	result := make([]*SalesReport, 0, len(dailyData))
	for _, data := range dailyData {
		if data.TotalOrders > 0 {
			data.AverageAmount = data.TotalAmount / float64(data.TotalOrders)
		}
		result = append(result, data)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Date < result[j].Date
	})

	return result
}

func (rs *ReportService) GetGrossProfitReport(storeID uint, startDate, endDate time.Time) []*GrossProfitReport {
	categoryData := make(map[string]*GrossProfitReport)

	for _, order := range rs.orders {
		if storeID != 0 && order.StoreID != storeID {
			continue
		}
		if order.CreatedAt.Before(startDate) || order.CreatedAt.After(endDate) {
			continue
		}

		for _, item := range order.Items {
			categoryKey := item.Category
			if categoryKey == "" {
				categoryKey = "uncategorized"
			}

			if _, exists := categoryData[categoryKey]; !exists {
				categoryData[categoryKey] = &GrossProfitReport{
					Category:     categoryKey,
					CategoryName: rs.getCategoryName(categoryKey),
				}
			}

			salesAmount := item.Amount
			costAmount := float64(item.Quantity) * item.CostPrice
			grossProfit := salesAmount - costAmount

			categoryData[categoryKey].TotalSales += salesAmount
			categoryData[categoryKey].TotalCost += costAmount
			categoryData[categoryKey].GrossProfit += grossProfit
			categoryData[categoryKey].OrderCount++
		}
	}

	result := make([]*GrossProfitReport, 0, len(categoryData))
	for _, data := range categoryData {
		if data.TotalSales > 0 {
			data.GrossProfitRate = (data.GrossProfit / data.TotalSales) * 100
		}
		result = append(result, data)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].GrossProfit > result[j].GrossProfit
	})

	return result
}

func (rs *ReportService) GetBestSellers(storeID uint, startDate, endDate time.Time, limit int) []*BestSellerItem {
	productData := make(map[uint]*BestSellerItem)

	for _, order := range rs.orders {
		if storeID != 0 && order.StoreID != storeID {
			continue
		}
		if order.CreatedAt.Before(startDate) || order.CreatedAt.After(endDate) {
			continue
		}

		for _, item := range order.Items {
			if _, exists := productData[item.ProductID]; !exists {
				productData[item.ProductID] = &BestSellerItem{
					ProductID:     item.ProductID,
					ProductBarcode: item.ProductBarcode,
					ProductName:   item.ProductName,
					Category:      item.Category,
					CategoryName:  rs.getCategoryName(item.Category),
				}
			}

			productData[item.ProductID].SalesQuantity += item.Quantity
			productData[item.ProductID].SalesAmount += item.Amount
			productData[item.ProductID].GrossProfit += item.Amount - float64(item.Quantity)*item.CostPrice
		}
	}

	result := make([]*BestSellerItem, 0, len(productData))
	for _, item := range productData {
		result = append(result, item)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].SalesQuantity > result[j].SalesQuantity
	})

	for i := range result {
		result[i].Rank = i + 1
	}

	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}

	return result
}

func (rs *ReportService) GetSlowSellers(storeID uint, startDate, endDate time.Time, limit int, inventoryData map[uint]int) []*SlowSellerItem {
	productData := make(map[uint]*SlowSellerItem)
	dateRangeDays := int(endDate.Sub(startDate).Hours() / 24)
	if dateRangeDays <= 0 {
		dateRangeDays = 1
	}

	for _, order := range rs.orders {
		if storeID != 0 && order.StoreID != storeID {
			continue
		}
		if order.CreatedAt.Before(startDate) || order.CreatedAt.After(endDate) {
			continue
		}

		for _, item := range order.Items {
			if _, exists := productData[item.ProductID]; !exists {
				productData[item.ProductID] = &SlowSellerItem{
					ProductID:     item.ProductID,
					ProductBarcode: item.ProductBarcode,
					ProductName:   item.ProductName,
					Category:      item.Category,
					CategoryName:  rs.getCategoryName(item.Category),
				}
			}

			productData[item.ProductID].SalesQuantity += item.Quantity
			productData[item.ProductID].SalesAmount += item.Amount
		}
	}

	for productID, inventory := range inventoryData {
		if _, exists := productData[productID]; !exists {
			productData[productID] = &SlowSellerItem{
				ProductID: productID,
			}
		}
		productData[productID].CurrentStock = inventory

		if productData[productID].SalesQuantity > 0 {
			avgDailySales := float64(productData[productID].SalesQuantity) / float64(dateRangeDays)
			if avgDailySales > 0 {
				productData[productID].TurnoverDays = int(float64(inventory) / avgDailySales)
			} else {
				productData[productID].TurnoverDays = 999
			}
		} else {
			productData[productID].TurnoverDays = 999
		}
	}

	result := make([]*SlowSellerItem, 0, len(productData))
	for _, item := range productData {
		if item.CurrentStock > 0 {
			result = append(result, item)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].TurnoverDays > result[j].TurnoverDays
	})

	for i := range result {
		result[i].Rank = i + 1
	}

	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}

	return result
}

func (rs *ReportService) GetOrderSummary(storeID uint, startDate, endDate time.Time, status string, paymentMethod string) []*OrderSummary {
	result := make([]*OrderSummary, 0)

	for _, order := range rs.orders {
		if storeID != 0 && order.StoreID != storeID {
			continue
		}
		if order.CreatedAt.Before(startDate) || order.CreatedAt.After(endDate) {
			continue
		}
		if status != "" && order.Status != status {
			continue
		}
		if paymentMethod != "" && order.PaymentMethod != paymentMethod {
			continue
		}

		result = append(result, order)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})

	return result
}

func (rs *ReportService) GetSalesStatistics(storeID uint, startDate, endDate time.Time) map[string]interface{} {
	var totalOrders int
	var totalAmount float64
	var totalQuantity int
	var totalDiscount float64
	var uniqueCashiers = make(map[uint]bool)

	for _, order := range rs.orders {
		if storeID != 0 && order.StoreID != storeID {
			continue
		}
		if order.CreatedAt.Before(startDate) || order.CreatedAt.After(endDate) {
			continue
		}

		totalOrders++
		totalAmount += order.TotalAmount
		totalDiscount += order.Discount
		uniqueCashiers[order.CashierID] = true

		for _, item := range order.Items {
			totalQuantity += item.Quantity
		}
	}

	days := int(endDate.Sub(startDate).Hours()/24) + 1
	var avgDailyOrders float64
	var avgDailyAmount float64
	if days > 0 {
		avgDailyOrders = float64(totalOrders) / float64(days)
		avgDailyAmount = totalAmount / float64(days)
	}

	var avgOrderAmount float64
	if totalOrders > 0 {
		avgOrderAmount = totalAmount / float64(totalOrders)
	}

	return map[string]interface{}{
		"total_orders":        totalOrders,
		"total_amount":        totalAmount,
		"total_quantity":      totalQuantity,
		"total_discount":      totalDiscount,
		"unique_cashiers":     len(uniqueCashiers),
		"days_in_period":      days,
		"avg_daily_orders":    avgDailyOrders,
		"avg_daily_amount":    avgDailyAmount,
		"avg_order_amount":    avgOrderAmount,
		"period_start":        startDate.Format("2006-01-02"),
		"period_end":          endDate.Format("2006-01-02"),
	}
}

func (rs *ReportService) getCategoryName(category string) string {
	if name, exists := rs.categories[category]; exists {
		return name
	}
	return category
}
