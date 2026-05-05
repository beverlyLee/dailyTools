<template>
  <div class="inventory-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>库存管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="addInventory">入库</el-button>
            <el-button @click="transferInventory">调拨</el-button>
            <el-button @click="checkInventory">盘点</el-button>
          </div>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="库存列表" name="list">
          <el-table :data="inventoryList" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="barcode" label="条码" width="150" />
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="stock" label="库存数量" width="120">
              <template #default="scope">
                <span :class="scope.row.stock < 10 ? 'low-stock' : ''">
                  {{ scope.row.stock }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="costPrice" label="成本价" width="100" />
            <el-table-column prop="salePrice" label="售价" width="100" />
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button type="primary" size="small" @click="editItem(scope.row)">编辑</el-button>
                <el-button size="small" @click="viewHistory(scope.row)">历史</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="库存调拨" name="transfer">
          <el-form :model="transferForm" label-width="100px" style="max-width: 600px;">
            <el-form-item label="调出门店">
              <el-select v-model="transferForm.fromStore" placeholder="请选择调出门店">
                <el-option label="本店" value="current" />
                <el-option label="门店A" value="storeA" />
                <el-option label="门店B" value="storeB" />
              </el-select>
            </el-form-item>
            <el-form-item label="调入门店">
              <el-select v-model="transferForm.toStore" placeholder="请选择调入门店">
                <el-option label="本店" value="current" />
                <el-option label="门店A" value="storeA" />
                <el-option label="门店B" value="storeB" />
              </el-select>
            </el-form-item>
            <el-form-item label="商品">
              <el-select v-model="transferForm.productId" placeholder="请选择商品">
                <el-option v-for="item in inventoryList" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="调拨数量">
              <el-input-number v-model="transferForm.quantity" :min="1" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="transferForm.remark" type="textarea" placeholder="请输入备注" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitTransfer">提交调拨</el-button>
              <el-button @click="resetTransferForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="库存盘点" name="check">
          <el-form :model="checkForm" label-width="100px" style="max-width: 600px;">
            <el-form-item label="盘点日期">
              <el-date-picker
                v-model="checkForm.date"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="盘点类型">
              <el-radio-group v-model="checkForm.type">
                <el-radio value="full">全盘</el-radio>
                <el-radio value="partial">抽盘</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="checkForm.remark" type="textarea" placeholder="请输入备注" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="startCheck">开始盘点</el-button>
              <el-button @click="viewCheckHistory">查看历史</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('list')

const inventoryList = ref([
  {
    id: 1,
    barcode: '6901234567890',
    name: '可口可乐 330ml',
    category: '饮料',
    stock: 120,
    unit: '瓶',
    costPrice: 2.5,
    salePrice: 3.5
  },
  {
    id: 2,
    barcode: '6901234567891',
    name: '康师傅红烧牛肉面',
    category: '方便食品',
    stock: 85,
    unit: '袋',
    costPrice: 3.0,
    salePrice: 4.5
  },
  {
    id: 3,
    barcode: '6901234567892',
    name: '农夫山泉 550ml',
    category: '饮料',
    stock: 5,
    unit: '瓶',
    costPrice: 1.2,
    salePrice: 2.0
  },
  {
    id: 4,
    barcode: '6901234567893',
    name: '奥利奥原味饼干',
    category: '休闲食品',
    stock: 45,
    unit: '盒',
    costPrice: 5.5,
    salePrice: 8.9
  }
])

const transferForm = ref({
  fromStore: '',
  toStore: '',
  productId: '',
  quantity: 1,
  remark: ''
})

const checkForm = ref({
  date: '',
  type: 'full',
  remark: ''
})

const addInventory = () => {
  ElMessage.info('入库功能开发中...')
}

const transferInventory = () => {
  activeTab.value = 'transfer'
}

const checkInventory = () => {
  activeTab.value = 'check'
}

const editItem = (row) => {
  ElMessage.info(`编辑商品：${row.name}`)
}

const viewHistory = (row) => {
  ElMessage.info(`查看商品历史：${row.name}`)
}

const submitTransfer = () => {
  ElMessage.success('调拨申请已提交')
  resetTransferForm()
}

const resetTransferForm = () => {
  transferForm.value = {
    fromStore: '',
    toStore: '',
    productId: '',
    quantity: 1,
    remark: ''
  }
}

const startCheck = () => {
  ElMessage.success('盘点开始')
}

const viewCheckHistory = () => {
  ElMessage.info('查看盘点历史功能开发中...')
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.low-stock {
  color: #f56c6c;
  font-weight: bold;
}
</style>
