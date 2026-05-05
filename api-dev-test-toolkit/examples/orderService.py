"""
订单处理模块 - 处理订单相关的业务逻辑

该模块提供了创建、查询、更新和删除订单的功能。
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class OrderStatus(Enum):
    """订单状态枚举"""
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class OrderError(Exception):
    """订单相关错误"""
    pass


class ValidationError(OrderError):
    """验证错误"""
    pass


class NotFoundError(OrderError):
    """未找到错误"""
    pass


class StateTransitionError(OrderError):
    """状态转换错误"""
    pass


def create_order(
    user_id: str,
    items: List[Dict[str, Any]],
    shipping_address: Dict[str, str],
    payment_method: str = "credit_card",
    coupon_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    创建新订单

    Args:
        user_id: 用户唯一标识符
        items: 商品列表，每个商品包含 product_id, quantity, price
        shipping_address: 收货地址，包含 street, city, zip_code, country
        payment_method: 支付方式，可选值: credit_card, paypal, bank_transfer
        coupon_code: 优惠券代码 (可选)

    Returns:
        创建的订单对象，包含订单 ID 和所有订单信息

    Raises:
        ValidationError: 当参数验证失败时抛出
        OrderError: 当订单创建失败时抛出

    Example:
        >>> items = [
        ...     {"product_id": "prod_001", "quantity": 2, "price": 29.99},
        ...     {"product_id": "prod_002", "quantity": 1, "price": 59.99}
        ... ]
        >>> address = {
        ...     "street": "123 Main St",
        ...     "city": "Beijing",
        ...     "zip_code": "100000",
        ...     "country": "CN"
        ... }
        >>> order = create_order("user_001", items, address)
        >>> print(order["id"])
    """
    if not user_id or not isinstance(user_id, str):
        raise ValidationError("用户 ID 必须是非空字符串")
    
    if not items or not isinstance(items, list) or len(items) == 0:
        raise ValidationError("订单必须至少包含一个商品")
    
    for i, item in enumerate(items):
        if not item.get("product_id"):
            raise ValidationError(f"商品 {i} 缺少 product_id")
        if not item.get("quantity") or item["quantity"] < 1:
            raise ValidationError(f"商品 {i} 的数量必须大于 0")
        if not item.get("price") or item["price"] < 0:
            raise ValidationError(f"商品 {i} 的价格无效")
    
    required_address_fields = ["street", "city", "zip_code", "country"]
    for field in required_address_fields:
        if field not in shipping_address or not shipping_address[field]:
            raise ValidationError(f"收货地址缺少必填字段: {field}")
    
    valid_payment_methods = ["credit_card", "paypal", "bank_transfer"]
    if payment_method not in valid_payment_methods:
        raise ValidationError(f"无效的支付方式，可选值: {', '.join(valid_payment_methods)}")
    
    total_amount = sum(item["quantity"] * item["price"] for item in items)
    
    if coupon_code:
        discount = calculate_discount(coupon_code, total_amount)
        total_amount -= discount
    
    order = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "items": items,
        "shipping_address": shipping_address,
        "payment_method": payment_method,
        "coupon_code": coupon_code,
        "status": OrderStatus.PENDING.value,
        "total_amount": round(total_amount, 2),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    save_order(order)
    
    return order


def get_order(order_id: str) -> Optional[Dict[str, Any]]:
    """
    根据订单 ID 获取订单信息

    Args:
        order_id: 订单唯一标识符

    Returns:
        订单对象，如果不存在则返回 None

    Example:
        >>> order = get_order("123e4567-e89b-12d3-a456-426614174000")
        >>> if order:
        ...     print(order["status"])
    """
    if not order_id:
        return None
    
    return find_order_by_id(order_id)


def update_order_status(
    order_id: str,
    new_status: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    更新订单状态

    Args:
        order_id: 订单 ID
        new_status: 新状态，必须是 OrderStatus 枚举值之一
        metadata: 附加元数据 (可选)

    Returns:
        更新后的订单对象

    Raises:
        NotFoundError: 当订单不存在时抛出
        ValidationError: 当状态无效时抛出
        StateTransitionError: 当状态转换不合法时抛出

    Example:
        >>> updated_order = update_order_status(
        ...     "order_001",
        ...     "paid",
        ...     {"payment_id": "pay_123"}
        ... )
    """
    order = find_order_by_id(order_id)
    if not order:
        raise NotFoundError(f"订单不存在: {order_id}")
    
    try:
        OrderStatus(new_status)
    except ValueError:
        valid_statuses = [s.value for s in OrderStatus]
        raise ValidationError(f"无效的状态，可选值: {', '.join(valid_statuses)}")
    
    valid_transitions = {
        OrderStatus.PENDING.value: [OrderStatus.PAID.value, OrderStatus.CANCELLED.value],
        OrderStatus.PAID.value: [OrderStatus.SHIPPED.value, OrderStatus.CANCELLED.value],
        OrderStatus.SHIPPED.value: [OrderStatus.DELIVERED.value],
        OrderStatus.DELIVERED.value: [],
        OrderStatus.CANCELLED.value: []
    }
    
    current_status = order["status"]
    if new_status not in valid_transitions.get(current_status, []):
        raise StateTransitionError(
            f"无法将订单从 {current_status} 转换为 {new_status}"
        )
    
    order["status"] = new_status
    order["updated_at"] = datetime.now().isoformat()
    
    if metadata:
        order["metadata"] = {**order.get("metadata", {}), **metadata}
    
    save_order(order)
    
    return order


def cancel_order(order_id: str, reason: str) -> Dict[str, Any]:
    """
    取消订单

    Args:
        order_id: 订单 ID
        reason: 取消原因

    Returns:
        取消后的订单对象

    Raises:
        NotFoundError: 当订单不存在时抛出
        StateTransitionError: 当订单无法取消时抛出
        ValidationError: 当取消原因无效时抛出
    """
    if not reason or len(reason.strip()) < 5:
        raise ValidationError("取消原因至少需要 5 个字符")
    
    return update_order_status(
        order_id,
        OrderStatus.CANCELLED.value,
        {"cancel_reason": reason, "cancelled_at": datetime.now().isoformat()}
    )


def list_orders(
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 10
) -> Dict[str, Any]:
    """
    列出订单

    Args:
        user_id: 用户 ID 过滤 (可选)
        status: 状态过滤 (可选)
        page: 页码，默认为 1
        limit: 每页数量，默认为 10，最大为 100

    Returns:
        包含订单列表和分页信息的字典
        - orders: 订单列表
        - total: 总订单数
        - page: 当前页码
        - limit: 每页数量
        - total_pages: 总页数

    Raises:
        ValidationError: 当参数无效时抛出
    """
    if page < 1:
        raise ValidationError("页码必须大于 0")
    
    if limit < 1 or limit > 100:
        raise ValidationError("每页数量必须在 1-100 之间")
    
    if status:
        try:
            OrderStatus(status)
        except ValueError:
            valid_statuses = [s.value for s in OrderStatus]
            raise ValidationError(f"无效的状态，可选值: {', '.join(valid_statuses)}")
    
    offset = (page - 1) * limit
    
    orders, total = find_orders_with_pagination(
        user_id=user_id,
        status=status,
        offset=offset,
        limit=limit
    )
    
    total_pages = (total + limit - 1) // limit
    
    return {
        "orders": orders,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


def calculate_discount(coupon_code: str, total_amount: float) -> float:
    """
    计算优惠券折扣

    Args:
        coupon_code: 优惠券代码
        total_amount: 订单总金额

    Returns:
        折扣金额
    """
    coupons = {
        "SAVE10": 0.1,
        "SAVE20": 0.2,
        "SAVE50": 0.5
    }
    
    discount_rate = coupons.get(coupon_code.upper(), 0)
    return total_amount * discount_rate


def find_order_by_id(order_id: str) -> Optional[Dict[str, Any]]:
    """根据 ID 查找订单 (模拟数据库操作)"""
    return None


def save_order(order: Dict[str, Any]) -> None:
    """保存订单 (模拟数据库操作)"""
    pass


def find_orders_with_pagination(
    user_id: Optional[str],
    status: Optional[str],
    offset: int,
    limit: int
) -> tuple:
    """分页查询订单 (模拟数据库操作)"""
    return [], 0
