package service

import (
	"errors"
	"fmt"
	"newretail-pos-system/payment-scale/model"
	"sync"
	"time"
)

type PaymentMethod string

const (
	PaymentMethodCash    PaymentMethod = "cash"
	PaymentMethodWechat  PaymentMethod = "wechat"
	PaymentMethodAlipay  PaymentMethod = "alipay"
	PaymentMethodMember  PaymentMethod = "member"
	PaymentMethodMixed   PaymentMethod = "mixed"
)

type PaymentStatus string

const (
	PaymentStatusPending    PaymentStatus = "pending"
	PaymentStatusProcessing PaymentStatus = "processing"
	PaymentStatusSuccess    PaymentStatus = "success"
	PaymentStatusFailed     PaymentStatus = "failed"
	PaymentStatusRefunded   PaymentStatus = "refunded"
)

type Payment struct {
	ID             uint          `json:"id"`
	OrderID        uint          `json:"order_id"`
	OrderNo        string        `json:"order_no"`
	PaymentMethod  PaymentMethod `json:"payment_method"`
	TotalAmount    float64       `json:"total_amount"`
	Discount       float64       `json:"discount"`
	PayableAmount  float64       `json:"payable_amount"`
	PaidAmount     float64       `json:"paid_amount"`
	Change         float64       `json:"change"`
	Status         PaymentStatus `json:"status"`
	TransactionNo  string        `json:"transaction_no"`
	CashierID      uint          `json:"cashier_id"`
	CashierName    string        `json:"cashier_name"`
	CreatedAt      time.Time     `json:"created_at"`
	CompletedAt    *time.Time    `json:"completed_at"`
	MemberID       *uint         `json:"member_id"`
	MemberNo       string        `json:"member_no"`
}

type WechatPaymentConfig struct {
	AppID     string
	MchID     string
	APIKey    string
	NotifyURL string
}

type AlipayPaymentConfig struct {
	AppID         string
	MchID         string
	PrivateKey    string
	PublicKey     string
	NotifyURL     string
}

type PaymentService struct {
	wechatConfig  *WechatPaymentConfig
	alipayConfig  *AlipayPaymentConfig
	suspendedOrders map[string]*model.SuspendedOrder
	mu            sync.RWMutex
}

func NewPaymentService() *PaymentService {
	return &PaymentService{
		suspendedOrders: make(map[string]*model.SuspendedOrder),
	}
}

func (ps *PaymentService) SetWechatConfig(config *WechatPaymentConfig) {
	ps.wechatConfig = config
}

func (ps *PaymentService) SetAlipayConfig(config *AlipayPaymentConfig) {
	ps.alipayConfig = config
}

func (ps *PaymentService) ProcessPayment(
	cart *model.Cart,
	paymentMethod PaymentMethod,
	paidAmount float64,
	cashierID uint,
	cashierName string,
) (*Payment, error) {

	totalAmount := cart.GetTotalAmount()
	memberDiscount := cart.GetMemberDiscountAmount()
	payableAmount := totalAmount - memberDiscount

	if payableAmount < 0 {
		payableAmount = 0
	}

	payment := &Payment{
		OrderNo:       generateOrderNo(),
		PaymentMethod: paymentMethod,
		TotalAmount:   totalAmount,
		Discount:      memberDiscount,
		PayableAmount: payableAmount,
		Status:        PaymentStatusPending,
		CashierID:     cashierID,
		CashierName:   cashierName,
		CreatedAt:     time.Now(),
	}

	if cart.IsMember() {
		payment.MemberID = cart.MemberID
		payment.MemberNo = cart.MemberNo
	}

	switch paymentMethod {
	case PaymentMethodCash:
		return ps.processCashPayment(payment, paidAmount)
	case PaymentMethodWechat:
		return ps.processWechatPayment(payment)
	case PaymentMethodAlipay:
		return ps.processAlipayPayment(payment)
	case PaymentMethodMember:
		return ps.processMemberPayment(payment, cart)
	default:
		return nil, errors.New("unsupported payment method")
	}
}

func (ps *PaymentService) processCashPayment(payment *Payment, paidAmount float64) (*Payment, error) {
	if paidAmount < payment.PayableAmount {
		return nil, errors.New("insufficient payment amount")
	}

	payment.PaidAmount = paidAmount
	payment.Change = paidAmount - payment.PayableAmount
	payment.Status = PaymentStatusSuccess

	now := time.Now()
	payment.CompletedAt = &now

	return payment, nil
}

func (ps *PaymentService) processWechatPayment(payment *Payment) (*Payment, error) {
	if ps.wechatConfig == nil {
		return nil, errors.New("wechat payment not configured")
	}

	payment.Status = PaymentStatusProcessing

	// 这里应该调用微信支付API创建订单
	// 模拟支付处理
	transactionNo := fmt.Sprintf("WX%s", time.Now().Format("20060102150405"))
	payment.TransactionNo = transactionNo

	// 模拟支付成功
	now := time.Now()
	payment.PaidAmount = payment.PayableAmount
	payment.Status = PaymentStatusSuccess
	payment.CompletedAt = &now

	return payment, nil
}

func (ps *PaymentService) processAlipayPayment(payment *Payment) (*Payment, error) {
	if ps.alipayConfig == nil {
		return nil, errors.New("alipay payment not configured")
	}

	payment.Status = PaymentStatusProcessing

	// 这里应该调用支付宝API创建订单
	// 模拟支付处理
	transactionNo := fmt.Sprintf("AL%s", time.Now().Format("20060102150405"))
	payment.TransactionNo = transactionNo

	// 模拟支付成功
	now := time.Now()
	payment.PaidAmount = payment.PayableAmount
	payment.Status = PaymentStatusSuccess
	payment.CompletedAt = &now

	return payment, nil
}

func (ps *PaymentService) processMemberPayment(payment *Payment, cart *model.Cart) (*Payment, error) {
	if !cart.IsMember() {
		return nil, errors.New("member not logged in")
	}

	// 这里应该检查会员余额
	// 模拟余额充足
	now := time.Now()
	payment.PaidAmount = payment.PayableAmount
	payment.Status = PaymentStatusSuccess
	payment.CompletedAt = &now

	return payment, nil
}

func (ps *PaymentService) SuspendOrder(cart *model.Cart, cashierID uint, cashierName string) (*model.SuspendedOrder, error) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	suspendedOrder := model.NewSuspendedOrder(cart, cashierID, cashierName)
	ps.suspendedOrders[suspendedOrder.OrderNo] = suspendedOrder

	return suspendedOrder, nil
}

func (ps *PaymentService) GetSuspendedOrders() []*model.SuspendedOrder {
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	orders := make([]*model.SuspendedOrder, 0)
	for _, order := range ps.suspendedOrders {
		if order.IsActive {
			orders = append(orders, order)
		}
	}

	return orders
}

func (ps *PaymentService) ResumeOrder(orderNo string) (*model.SuspendedOrder, error) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	order, exists := ps.suspendedOrders[orderNo]
	if !exists {
		return nil, errors.New("suspended order not found")
	}

	if !order.IsActive {
		return nil, errors.New("suspended order is no longer active")
	}

	// 从挂单列表中移除
	delete(ps.suspendedOrders, orderNo)

	return order, nil
}

func (ps *PaymentService) CancelSuspendedOrder(orderNo string) error {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	order, exists := ps.suspendedOrders[orderNo]
	if !exists {
		return errors.New("suspended order not found")
	}

	order.IsActive = false
	return nil
}

func (ps *PaymentService) RefundPayment(paymentID uint, reason string) error {
	// 这里应该实现退款逻辑
	// 包括调用支付网关API、更新订单状态等
	return nil
}

func (ps *PaymentService) CalculatePrice(
	productID uint,
	originalPrice float64,
	memberPrice float64,
	isMember bool,
	promotions []*model.Promotion,
) *model.PriceInfo {

	priceInfo := &model.PriceInfo{
		ProductID:     productID,
		OriginalPrice: originalPrice,
		CurrentPrice:  originalPrice,
		MemberPrice:   memberPrice,
		IsMemberPrice: false,
		IsPromotion:   false,
	}

	// 检查会员价
	if isMember && memberPrice > 0 && memberPrice < originalPrice {
		priceInfo.CurrentPrice = memberPrice
		priceInfo.IsMemberPrice = true
	}

	// 检查促销
	for _, promo := range promotions {
		if !promo.IsActive {
			continue
		}

		if promo.ProductID != nil && *promo.ProductID != productID {
			continue
		}

		if time.Now().Before(promo.StartDate) || time.Now().After(promo.EndDate) {
			continue
		}

		// 应用促销价格
		switch promo.Type {
		case "discount_rate":
			promoPrice := originalPrice * promo.DiscountRate
			if promoPrice < priceInfo.CurrentPrice {
				priceInfo.CurrentPrice = promoPrice
				priceInfo.IsPromotion = true
				priceInfo.PromotionName = promo.Name
			}
		case "discount_amount":
			promoPrice := originalPrice - promo.DiscountAmount
			if promoPrice > 0 && promoPrice < priceInfo.CurrentPrice {
				priceInfo.CurrentPrice = promoPrice
				priceInfo.IsPromotion = true
				priceInfo.PromotionName = promo.Name
			}
		}
	}

	return priceInfo
}

func (ps *PaymentService) CreatePaymentFromOrder(order *Payment) error {
	// 这里应该将支付信息保存到数据库
	return nil
}

func (ps *PaymentService) GetPaymentByID(paymentID uint) (*Payment, error) {
	// 这里应该从数据库查询支付信息
	return nil, errors.New("not implemented")
}

func (ps *PaymentService) GetPaymentByOrderNo(orderNo string) (*Payment, error) {
	// 这里应该从数据库查询支付信息
	return nil, errors.New("not implemented")
}

func generateOrderNo() string {
	return "SO" + time.Now().Format("20060102150405")
}
