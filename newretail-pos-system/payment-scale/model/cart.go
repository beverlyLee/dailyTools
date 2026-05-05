package model

import (
	"time"
)

type CartItem struct {
	ID          uint       `json:"id"`
	ProductID   uint       `json:"product_id"`
	Barcode     string     `json:"barcode"`
	Name        string     `json:"name"`
	Price       float64    `json:"price"`
	MemberPrice float64    `json:"member_price"`
	Quantity    float64    `json:"quantity"`
	Unit        string     `json:"unit"`
	IsWeighted  bool       `json:"is_weighted"`
	IsMemberPrice bool     `json:"is_member_price"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Cart struct {
	Items       []*CartItem `json:"items"`
	MemberID    *uint       `json:"member_id"`
	MemberNo    string      `json:"member_no"`
	MemberName  string      `json:"member_name"`
	MemberLevel int         `json:"member_level"`
	MemberDiscount float64  `json:"member_discount"`
	CreatedAt   time.Time   `json:"created_at"`
}

type SuspendedOrder struct {
	ID          uint       `json:"id"`
	OrderNo     string     `json:"order_no"`
	Cart        *Cart      `json:"cart"`
	TotalAmount float64    `json:"total_amount"`
	Discount    float64    `json:"discount"`
	CashierID   uint       `json:"cashier_id"`
	CashierName string     `json:"cashier_name"`
	CreatedAt   time.Time  `json:"created_at"`
	IsActive    bool       `json:"is_active"`
}

type Promotion struct {
	ID           uint       `json:"id"`
	Name         string     `json:"name"`
	Type         string     `json:"type"`
	ProductID    *uint      `json:"product_id"`
	Category     string     `json:"category"`
	MinQuantity  float64    `json:"min_quantity"`
	DiscountRate float64    `json:"discount_rate"`
	DiscountAmount float64  `json:"discount_amount"`
	StartDate    time.Time  `json:"start_date"`
	EndDate      time.Time  `json:"end_date"`
	IsActive     bool       `json:"is_active"`
	Priority     int        `json:"priority"`
}

type PriceInfo struct {
	ProductID     uint    `json:"product_id"`
	Barcode       string  `json:"barcode"`
	Name          string  `json:"name"`
	OriginalPrice float64 `json:"original_price"`
	CurrentPrice  float64 `json:"current_price"`
	MemberPrice   float64 `json:"member_price"`
	IsMemberPrice bool    `json:"is_member_price"`
	IsPromotion   bool    `json:"is_promotion"`
	PromotionName string  `json:"promotion_name"`
}

func NewCart() *Cart {
	return &Cart{
		Items:     make([]*CartItem, 0),
		CreatedAt: time.Now(),
	}
}

func (c *Cart) AddItem(item *CartItem) {
	for _, existingItem := range c.Items {
		if existingItem.ProductID == item.ProductID && !existingItem.IsWeighted {
			existingItem.Quantity += item.Quantity
			existingItem.IsMemberPrice = item.IsMemberPrice
			return
		}
	}
	c.Items = append(c.Items, item)
}

func (c *Cart) RemoveItem(productID uint) {
	for i, item := range c.Items {
		if item.ProductID == productID {
			c.Items = append(c.Items[:i], c.Items[i+1:]...)
			return
		}
	}
}

func (c *Cart) UpdateQuantity(productID uint, quantity float64) {
	for _, item := range c.Items {
		if item.ProductID == productID {
			item.Quantity = quantity
			return
		}
	}
}

func (c *Cart) Clear() {
	c.Items = make([]*CartItem, 0)
	c.MemberID = nil
	c.MemberNo = ""
	c.MemberName = ""
	c.MemberLevel = 0
	c.MemberDiscount = 0
}

func (c *Cart) GetTotalAmount() float64 {
	var total float64
	for _, item := range c.Items {
		price := item.Price
		if c.IsMember() && item.MemberPrice > 0 {
			price = item.MemberPrice
		}
		total += price * item.Quantity
	}
	return total
}

func (c *Cart) GetTotalQuantity() float64 {
	var total float64
	for _, item := range c.Items {
		total += item.Quantity
	}
	return total
}

func (c *Cart) GetItemCount() int {
	return len(c.Items)
}

func (c *Cart) IsMember() bool {
	return c.MemberID != nil
}

func (c *Cart) SetMember(memberID uint, memberNo, memberName string, memberLevel int, memberDiscount float64) {
	c.MemberID = &memberID
	c.MemberNo = memberNo
	c.MemberName = memberName
	c.MemberLevel = memberLevel
	c.MemberDiscount = memberDiscount

	for _, item := range c.Items {
		if item.MemberPrice > 0 {
			item.IsMemberPrice = true
		}
	}
}

func (c *Cart) ClearMember() {
	c.MemberID = nil
	c.MemberNo = ""
	c.MemberName = ""
	c.MemberLevel = 0
	c.MemberDiscount = 0

	for _, item := range c.Items {
		item.IsMemberPrice = false
	}
}

func (c *Cart) GetMemberDiscountAmount() float64 {
	if !c.IsMember() {
		return 0
	}

	var discount float64
	for _, item := range c.Items {
		if item.MemberPrice > 0 && item.MemberPrice < item.Price {
			discount += (item.Price - item.MemberPrice) * item.Quantity
		}
	}

	if c.MemberDiscount > 0 {
		discount += c.GetTotalAmount() * (1 - c.MemberDiscount)
	}

	return discount
}

func (c *Cart) CalculatePromotionDiscount(promotions []*Promotion) float64 {
	var discount float64

	for _, item := range c.Items {
		for _, promo := range promotions {
			if !promo.IsActive {
				continue
			}

			if promo.ProductID != nil && *promo.ProductID != item.ProductID {
				continue
			}

			if promo.Category != "" {
				if !c.IsCategoryMatch(item, promo.Category) {
					continue
				}
			}

			if time.Now().Before(promo.StartDate) || time.Now().After(promo.EndDate) {
				continue
			}

			if item.Quantity >= promo.MinQuantity {
				switch promo.Type {
				case "discount_rate":
					itemDiscount := (item.Price * item.Quantity) * (1 - promo.DiscountRate)
					discount += itemDiscount
				case "discount_amount":
					discount += promo.DiscountAmount
				case "buy_x_get_y":
					freeCount := int(item.Quantity) / (int(promo.MinQuantity) + 1)
					discount += item.Price * float64(freeCount)
				}
			}
		}
	}

	return discount
}

func (c *Cart) IsCategoryMatch(item *CartItem, category string) bool {
	return true
}

func NewSuspendedOrder(cart *Cart, cashierID uint, cashierName string) *SuspendedOrder {
	return &SuspendedOrder{
		OrderNo:     generateSuspendedOrderNo(),
		Cart:        cart,
		TotalAmount: cart.GetTotalAmount(),
		Discount:    cart.GetMemberDiscountAmount(),
		CashierID:   cashierID,
		CashierName: cashierName,
		CreatedAt:   time.Now(),
		IsActive:    true,
	}
}

func generateSuspendedOrderNo() string {
	return "SD" + time.Now().Format("20060102150405")
}
