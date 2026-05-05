<template>
  <div class="cashier-view">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="shopping-cart">
          <template #header>
            <div class="card-header">
              <span>购物车</span>
              <el-button type="primary" size="small" @click="clearCart">清空</el-button>
            </div>
          </template>
          <el-table :data="cartItems" style="width: 100%">
            <el-table-column prop="barcode" label="条码" width="150" />
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="price" label="单价" width="100" />
            <el-table-column prop="quantity" label="数量" width="100">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.quantity"
                  :min="1"
                  size="small"
                  @change="updateQuantity(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="total" label="小计" width="120" />
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeItem(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="payment-info">
          <template #header>
            <div class="card-header">
              <span>收款信息</span>
            </div>
          </template>
          <div class="info-item">
            <span class="label">商品总数：</span>
            <span class="value">{{ totalItems }}</span>
          </div>
          <div class="info-item">
            <span class="label">商品金额：</span>
            <span class="value">¥{{ totalAmount.toFixed(2) }}</span>
          </div>
          <div class="info-item">
            <span class="label">会员折扣：</span>
            <span class="value">¥{{ discountAmount.toFixed(2) }}</span>
          </div>
          <div class="info-item">
            <span class="label">应付金额：</span>
            <span class="value total">¥{{ payableAmount.toFixed(2) }}</span>
          </div>
          <div class="info-item">
            <span class="label">会员卡号：</span>
            <el-input v-model="memberCard" placeholder="请输入或扫描会员卡号" size="small" style="width: 150px" />
          </div>
          <el-divider />
          <div class="payment-methods">
            <el-radio-group v-model="paymentMethod">
              <el-radio value="cash">现金</el-radio>
              <el-radio value="wechat">微信支付</el-radio>
              <el-radio value="alipay">支付宝</el-radio>
              <el-radio value="member">会员余额</el-radio>
            </el-radio-group>
          </div>
          <el-divider />
          <div class="action-buttons">
            <el-button type="primary" size="large" @click="checkout" :disabled="cartItems.length === 0">
              收款
            </el-button>
            <el-button size="large" @click="suspendOrder" :disabled="cartItems.length === 0">
              挂单
            </el-button>
            <el-button size="large" @click="resumeOrder">
              取单
            </el-button>
          </div>
        </el-card>
        
        <el-card class="hardware-status" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>硬件状态</span>
            </div>
          </template>
          <div class="status-item">
            <span>电子秤：</span>
            <el-tag :type="scaleStatus ? 'success' : 'danger'">
              {{ scaleStatus ? '已连接' : '未连接' }}
            </el-tag>
            <span v-if="scaleStatus" class="weight">当前重量：{{ currentWeight }}kg</span>
          </div>
          <div class="status-item">
            <span>钱箱：</span>
            <el-tag :type="cashDrawerStatus ? 'success' : 'danger'">
              {{ cashDrawerStatus ? '已连接' : '未连接' }}
            </el-tag>
          </div>
          <div class="status-item">
            <span>打印机：</span>
            <el-tag :type="printerStatus ? 'success' : 'danger'">
              {{ printerStatus ? '已连接' : '未连接' }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const cartItems = ref([
  {
    id: 1,
    barcode: '6901234567890',
    name: '可口可乐 330ml',
    price: 3.5,
    quantity: 2,
    total: 7.0
  },
  {
    id: 2,
    barcode: '6901234567891',
    name: '康师傅红烧牛肉面',
    price: 4.5,
    quantity: 1,
    total: 4.5
  }
])

const memberCard = ref('')
const paymentMethod = ref('cash')
const scaleStatus = ref(true)
const cashDrawerStatus = ref(true)
const printerStatus = ref(true)
const currentWeight = ref('0.500')

const totalItems = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

const totalAmount = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.total, 0)
})

const discountAmount = computed(() => {
  return 0
})

const payableAmount = computed(() => {
  return totalAmount.value - discountAmount.value
})

const clearCart = () => {
  ElMessageBox.confirm('确定要清空购物车吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    cartItems.value = []
    ElMessage.success('购物车已清空')
  }).catch(() => {})
}

const updateQuantity = (row) => {
  row.total = row.price * row.quantity
}

const removeItem = (row) => {
  const index = cartItems.value.indexOf(row)
  if (index > -1) {
    cartItems.value.splice(index, 1)
    ElMessage.success('商品已删除')
  }
}

const checkout = () => {
  ElMessageBox.confirm(`确认收款 ¥${payableAmount.value.toFixed(2)}？`, '确认收款', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => {
    ElMessage.success('收款成功')
    cartItems.value = []
  }).catch(() => {})
}

const suspendOrder = () => {
  ElMessage.success('挂单成功')
  cartItems.value = []
}

const resumeOrder = () => {
  ElMessage.info('取单功能开发中...')
}
</script>

<style scoped>
.cashier-view {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shopping-cart {
  height: 100%;
}

.payment-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 16px;
}

.info-item .label {
  color: #606266;
}

.info-item .value {
  font-weight: bold;
}

.info-item .total {
  font-size: 24px;
  color: #f56c6c;
}

.payment-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hardware-status .status-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.hardware-status .weight {
  margin-left: 10px;
  color: #409eff;
  font-weight: bold;
}
</style>
