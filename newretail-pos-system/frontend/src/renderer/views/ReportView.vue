<template>
  <div class="report-view">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>报表统计</span>
              <div class="header-actions">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                />
                <el-button type="primary" @click="queryReport">查询</el-button>
                <el-button @click="exportReport">导出</el-button>
              </div>
            </div>
          </template>
          
          <el-tabs v-model="activeTab">
            <el-tab-pane label="销售报表" name="sales">
              <el-row :gutter="20" style="margin-bottom: 20px;">
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-icon sales">
                      <el-icon><Money /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">¥{{ salesSummary.totalSales.toFixed(2) }}</div>
                      <div class="stat-label">总销售额</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-icon orders">
                      <el-icon><Document /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">{{ salesSummary.totalOrders }}</div>
                      <div class="stat-label">总订单数</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-icon profit">
                      <el-icon><TrendCharts /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">¥{{ salesSummary.totalProfit.toFixed(2) }}</div>
                      <div class="stat-label">总毛利</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-icon avg">
                      <el-icon><DataAnalysis /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">¥{{ salesSummary.avgOrderValue.toFixed(2) }}</div>
                      <div class="stat-label">客单价</div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
              
              <el-table :data="salesData" style="width: 100%">
                <el-table-column prop="date" label="日期" width="120" />
                <el-table-column prop="orders" label="订单数" width="100" />
                <el-table-column prop="sales" label="销售额" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.sales.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="cost" label="成本" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.cost.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="profit" label="毛利" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.profit.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="profitRate" label="毛利率" width="100">
                  <template #default="scope">
                    {{ (scope.row.profitRate * 100).toFixed(1) }}%
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            
            <el-tab-pane label="畅滞销排行" name="ranking">
              <el-tabs type="border-card">
                <el-tab-pane label="畅销商品TOP10">
                  <el-table :data="topSelling" style="width: 100%">
                    <el-table-column prop="rank" label="排名" width="80">
                      <template #default="scope">
                        <el-tag :type="scope.row.rank <= 3 ? 'danger' : 'info'">
                          {{ scope.row.rank }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="barcode" label="条码" width="150" />
                    <el-table-column prop="name" label="商品名称" />
                    <el-table-column prop="category" label="分类" width="100" />
                    <el-table-column prop="quantity" label="销量" width="100" />
                    <el-table-column prop="sales" label="销售额" width="120">
                      <template #default="scope">
                        ¥{{ scope.row.sales.toFixed(2) }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="profit" label="毛利" width="120">
                      <template #default="scope">
                        ¥{{ scope.row.profit.toFixed(2) }}
                      </template>
                    </el-table-column>
                  </el-table>
                </el-tab-pane>
                
                <el-tab-pane label="滞销商品TOP10">
                  <el-table :data="slowSelling" style="width: 100%">
                    <el-table-column prop="rank" label="排名" width="80">
                      <template #default="scope">
                        <el-tag :type="scope.row.rank <= 3 ? 'warning' : 'info'">
                          {{ scope.row.rank }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="barcode" label="条码" width="150" />
                    <el-table-column prop="name" label="商品名称" />
                    <el-table-column prop="category" label="分类" width="100" />
                    <el-table-column prop="stock" label="库存" width="100" />
                    <el-table-column prop="lastSaleDate" label="最后销售日期" width="120" />
                    <el-table-column prop="stockDays" label="库存天数" width="100" />
                  </el-table>
                </el-tab-pane>
              </el-tabs>
            </el-tab-pane>
            
            <el-tab-pane label="毛利报表" name="profit">
              <el-table :data="profitData" style="width: 100%">
                <el-table-column prop="category" label="分类" />
                <el-table-column prop="sales" label="销售额" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.sales.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="salesPercent" label="销售额占比" width="120">
                  <template #default="scope">
                    {{ (scope.row.salesPercent * 100).toFixed(1) }}%
                  </template>
                </el-table-column>
                <el-table-column prop="cost" label="成本" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.cost.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="profit" label="毛利" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.profit.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="profitRate" label="毛利率" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.profitRate >= 0.3 ? 'success' : 'warning'">
                      {{ (scope.row.profitRate * 100).toFixed(1) }}%
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Money, Document, TrendCharts, DataAnalysis } from '@element-plus/icons-vue'

const activeTab = ref('sales')
const dateRange = ref([])

const salesSummary = ref({
  totalSales: 125680.50,
  totalOrders: 3256,
  totalProfit: 37680.25,
  avgOrderValue: 38.60
})

const salesData = ref([
  { date: '2026-04-28', orders: 156, sales: 5680.50, cost: 3850.25, profit: 1830.25, profitRate: 0.322 },
  { date: '2026-04-29', orders: 168, sales: 6240.80, cost: 4120.50, profit: 2120.30, profitRate: 0.340 },
  { date: '2026-04-30', orders: 205, sales: 7890.20, cost: 5210.80, profit: 2679.40, profitRate: 0.340 },
  { date: '2026-05-01', orders: 286, sales: 12560.40, cost: 8350.60, profit: 4209.80, profitRate: 0.335 },
  { date: '2026-05-02', orders: 265, sales: 11280.60, cost: 7520.40, profit: 3760.20, profitRate: 0.333 }
])

const topSelling = ref([
  { rank: 1, barcode: '6901234567890', name: '可口可乐 330ml', category: '饮料', quantity: 1256, sales: 4396.00, profit: 1256.00 },
  { rank: 2, barcode: '6901234567892', name: '农夫山泉 550ml', category: '饮料', quantity: 1080, sales: 2160.00, profit: 864.00 },
  { rank: 3, barcode: '6901234567891', name: '康师傅红烧牛肉面', category: '方便食品', quantity: 856, sales: 3852.00, profit: 1284.00 },
  { rank: 4, barcode: '6901234567893', name: '奥利奥原味饼干', category: '休闲食品', quantity: 650, sales: 5785.00, profit: 2210.00 },
  { rank: 5, barcode: '6901234567894', name: '乐事薯片原味', category: '休闲食品', quantity: 580, sales: 4640.00, profit: 1856.00 }
])

const slowSelling = ref([
  { rank: 1, barcode: '6901234567899', name: '某进口饼干礼盒', category: '休闲食品', stock: 50, lastSaleDate: '2026-03-15', stockDays: 50 },
  { rank: 2, barcode: '6901234567898', name: '某高端饮料', category: '饮料', stock: 35, lastSaleDate: '2026-03-20', stockDays: 45 },
  { rank: 3, barcode: '6901234567897', name: '某特殊口味方便面', category: '方便食品', stock: 28, lastSaleDate: '2026-03-25', stockDays: 40 }
])

const profitData = ref([
  { category: '饮料', sales: 45680.50, salesPercent: 0.364, cost: 30250.25, profit: 15430.25, profitRate: 0.338 },
  { category: '方便食品', sales: 28560.80, salesPercent: 0.227, cost: 18950.50, profit: 9610.30, profitRate: 0.336 },
  { category: '休闲食品', sales: 32560.40, salesPercent: 0.259, cost: 21250.60, profit: 11309.80, profitRate: 0.347 },
  { category: '日用品', sales: 18878.80, salesPercent: 0.150, cost: 12560.40, profit: 6318.40, profitRate: 0.335 }
])

const queryReport = () => {
  ElMessage.success('报表查询成功')
}

const exportReport = () => {
  ElMessage.success('报表导出成功')
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

.stat-card {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stat-icon.sales {
  background-color: #409eff;
}

.stat-icon.orders {
  background-color: #67c23a;
}

.stat-icon.profit {
  background-color: #e6a23c;
}

.stat-icon.avg {
  background-color: #909399;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}
</style>
