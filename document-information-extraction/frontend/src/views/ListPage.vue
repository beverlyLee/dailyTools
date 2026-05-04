<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; font-weight: 500;">票据列表</span>
          <div>
            <el-radio-group v-model="documentType" size="small" style="margin-right: 20px;">
              <el-radio-button label="invoice">增值税发票</el-radio-button>
              <el-radio-button label="train">火车票</el-radio-button>
              <el-radio-button label="air">机票</el-radio-button>
            </el-radio-group>
            <el-button type="primary" @click="refreshList" :icon="Refresh">
              刷新
            </el-button>
            <el-button type="success" @click="exportToExcel" :icon="Download" style="margin-left: 10px;">
              导出Excel
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table
        :data="invoiceList"
        style="width: 100%"
        v-loading="loading"
        stripe
      >
        <el-table-column type="index" label="序号" width="60" />
        
        <el-table-column
          prop="invoice_code"
          label="发票代码"
          width="140"
          v-if="documentType === 'invoice'"
        />
        
        <el-table-column
          prop="invoice_number"
          label="发票/票据号码"
          width="160"
        />
        
        <el-table-column
          prop="invoice_date"
          label="日期"
          width="160"
        >
          <template #default="scope">
            {{ formatDate(scope.row.invoice_date || scope.row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column
          prop="amount"
          label="金额"
          width="120"
        >
          <template #default="scope">
            <span style="color: #F56C6C; font-weight: 500;">
              ¥{{ scope.row.amount?.toFixed(2) || '0.00' }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="tax_amount"
          label="税额"
          width="100"
          v-if="documentType === 'invoice'"
        >
          <template #default="scope">
            <span style="color: #E6A23C;">
              ¥{{ scope.row.tax_amount?.toFixed(2) || '0.00' }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="total_amount"
          label="价税合计"
          width="120"
        >
          <template #default="scope">
            <span style="color: #67C23A; font-weight: 600;">
              ¥{{ (scope.row.total_amount || scope.row.amount)?.toFixed(2) || '0.00' }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="seller_name"
          label="销售方/车次/航班"
          min-width="150"
          show-overflow-tooltip
        />
        
        <el-table-column
          prop="buyer_name"
          label="购买方/乘客"
          min-width="150"
          show-overflow-tooltip
        />
        
        <el-table-column
          prop="verification_status"
          label="验真状态"
          width="100"
        >
          <template #default="scope">
            <el-tag :type="scope.row.is_verified ? 'success' : 'warning'" size="small">
              {{ scope.row.is_verified ? '已验真' : '未验真' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="is_reimbursed"
          label="报销状态"
          width="100"
        >
          <template #default="scope">
            <el-tag :type="scope.row.is_reimbursed ? 'success' : 'info'" size="small">
              {{ scope.row.is_reimbursed ? '已报销' : '未报销' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column
          prop="created_at"
          label="录入时间"
          width="180"
        >
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              link
              size="small"
              @click="markAsReimbursed(scope.row)"
              :disabled="scope.row.is_reimbursed"
            >
              标记报销
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div style="margin-top: 20px; text-align: right;">
        <el-pagination
          background
          :current-page="currentPage"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'
import { getInvoiceList, exportExcel, markReimbursed, deleteInvoice } from '../api'

const documentType = ref('invoice')
const invoiceList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fetchList = async () => {
  loading.value = true
  try {
    const skip = (currentPage.value - 1) * pageSize.value
    const result = await getInvoiceList(documentType.value, skip, pageSize.value)
    invoiceList.value = result
    total.value = result.length
  } catch (error) {
    ElMessage.error('获取列表失败: ' + (error.response?.data?.detail || error.message))
  } finally {
    loading.value = false
  }
}

const refreshList = () => {
  currentPage.value = 1
  fetchList()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchList()
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const markAsReimbursed = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要将该票据标记为已报销吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const result = await markReimbursed(row.id, documentType.value)
    if (result.success) {
      ElMessage.success('标记成功')
      fetchList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + (error.response?.data?.detail || error.message))
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除该票据吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    )
    
    const result = await deleteInvoice(row.id, documentType.value)
    if (result.success) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }
}

const exportToExcel = async () => {
  try {
    ElMessage.info('正在生成Excel文件...')
    
    const blob = await exportExcel(documentType.value)
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    
    let filename = '报销明细.xlsx'
    if (documentType.value === 'invoice') {
      filename = '增值税发票报销明细.xlsx'
    } else if (documentType.value === 'train') {
      filename = '火车票报销明细.xlsx'
    } else if (documentType.value === 'air') {
      filename = '机票报销明细.xlsx'
    }
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败: ' + (error.response?.data?.detail || error.message))
  }
}

watch(documentType, () => {
  currentPage.value = 1
  fetchList()
})

onMounted(() => {
  fetchList()
})
</script>
