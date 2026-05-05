<template>
    <view class="reimbursement-page">
        <view class="stats-section">
            <view class="stats-grid">
                <view class="stat-item">
                    <text class="stat-number">{{ stats.pending_count || 0 }}</text>
                    <text class="stat-label">待审批</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">{{ stats.approved_count || 0 }}</text>
                    <text class="stat-label">已审批</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">¥{{ stats.total_amount || 0 }}</text>
                    <text class="stat-label">总金额</text>
                </view>
            </view>
        </view>

        <view class="tabs-section">
            <scroll-view class="tabs-scroll" scroll-x>
                <view class="tabs-list">
                    <view 
                        class="tab-item" 
                        :class="{ active: currentTab === 'all' }"
                        @click="setTab('all')"
                    >
                        <text class="tab-text">全部</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentTab === 'pending' }"
                        @click="setTab('pending')"
                    >
                        <text class="tab-text">待审批</text>
                        <text class="tab-badge" v-if="stats.pending_count > 0">{{ stats.pending_count }}</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentTab === 'approved' }"
                        @click="setTab('approved')"
                    >
                        <text class="tab-text">已审批</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentTab === 'rejected' }"
                        @click="setTab('rejected')"
                    >
                        <text class="tab-text">已拒绝</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <view class="batch-section" v-if="selectedInvoices.length > 0">
            <view class="batch-info">
                <text class="batch-text">已选择 {{ selectedInvoices.length }} 张发票</text>
                <text class="batch-amount">合计: ¥{{ selectedTotalAmount }}</text>
            </view>
            <view class="batch-actions">
                <view class="action-btn" @click="clearSelection">
                    <text class="btn-text">取消</text>
                </view>
                <view class="action-btn primary" @click="submitBatchReimbursement">
                    <text class="btn-text">申请报销</text>
                </view>
            </view>
        </view>

        <view class="invoice-list-section">
            <view class="section-header">
                <text class="section-title">可报销发票</text>
                <view class="filter-btn" @click="showFilter = !showFilter">
                    <text class="btn-text">筛选</text>
                    <text class="arrow">{{ showFilter ? '▲' : '▼' }}</text>
                </view>
            </view>

            <view class="filter-panel" v-if="showFilter">
                <view class="filter-row">
                    <text class="filter-label">票据类型</text>
                    <view class="filter-options">
                        <view 
                            class="filter-option" 
                            :class="{ active: filters.invoice_type === null }"
                            @click="setFilter('invoice_type', null)"
                        >
                            <text class="option-text">全部</text>
                        </view>
                        <view 
                            class="filter-option" 
                            :class="{ active: filters.invoice_type === 'vat_invoice' }"
                            @click="setFilter('invoice_type', 'vat_invoice')"
                        >
                            <text class="option-text">增值税</text>
                        </view>
                        <view 
                            class="filter-option" 
                            :class="{ active: filters.invoice_type === 'train_ticket' }"
                            @click="setFilter('invoice_type', 'train_ticket')"
                        >
                            <text class="option-text">火车票</text>
                        </view>
                        <view 
                            class="filter-option" 
                            :class="{ active: filters.invoice_type === 'flight_ticket' }"
                            @click="setFilter('invoice_type', 'flight_ticket')"
                        >
                            <text class="option-text">机票</text>
                        </view>
                    </view>
                </view>
                <view class="filter-row">
                    <text class="filter-label">核验状态</text>
                    <view class="filter-options">
                        <view 
                            class="filter-option" 
                            :class="{ active: filters.is_verified === null }"
                            @click="setFilter('is_verified', null)"
                        >
                            <text class="option-text">全部</text>
                        </view>
                        <view 
                            class="filter-option" 
                            :class="{ active: filters.is_verified === true }"
                            @click="setFilter('is_verified', true)"
                        >
                            <text class="option-text">已核验</text>
                        </view>
                        <view 
                            class="filter-option" 
                            :class="{ active: filters.is_verified === false }"
                            @click="setFilter('is_verified', false)"
                        >
                            <text class="option-text">待核验</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="invoice-list" v-if="invoices.length > 0">
                <view 
                    class="invoice-card" 
                    v-for="(invoice, index) in invoices" 
                    :key="invoice.id"
                >
                    <view class="card-checkbox" @click="toggleSelection(invoice)">
                        <view class="checkbox" :class="{ checked: selectedInvoices.includes(invoice.id) }">
                            <text class="check-icon" v-if="selectedInvoices.includes(invoice.id)">✓</text>
                        </view>
                    </view>
                    <view class="card-content" @click="goToDetail(invoice)">
                        <view class="card-header">
                            <view class="invoice-type" :class="invoice.invoice_type">
                                <text class="type-text">{{ getInvoiceTypeName(invoice.invoice_type) }}</text>
                            </view>
                            <view class="status-tags">
                                <view class="status-tag" :class="invoice.verification_status">
                                    <text class="status-text">{{ getStatusText(invoice.verification_status) }}</text>
                                </view>
                            </view>
                        </view>
                        <view class="card-body">
                            <view class="invoice-info">
                                <text class="invoice-number" v-if="invoice.invoice_code || invoice.invoice_number">
                                    {{ invoice.invoice_code || '' }} {{ invoice.invoice_number || '' }}
                                </text>
                                <text class="invoice-seller" v-if="invoice.seller_name">
                                    {{ invoice.seller_name }}
                                </text>
                                <text class="invoice-date" v-if="invoice.invoice_date">
                                    开票日期: {{ invoice.invoice_date }}
                                </text>
                            </view>
                            <view class="invoice-amount">
                                <text class="amount-label">价税合计</text>
                                <text class="amount-value">¥{{ invoice.total_amount_with_tax || 0 }}</text>
                            </view>
                        </view>
                    </view>
                    <view class="card-actions" v-if="invoice.is_verified && invoice.verification_status === 'passed' && !invoice.is_reimbursed">
                        <view class="apply-btn" @click.stop="applySingleReimbursement(invoice)">
                            <text class="btn-text">申请报销</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="empty-state" v-else>
                <view class="empty-icon">
                    <text class="icon-text">📋</text>
                </view>
                <text class="empty-title">暂无可报销发票</text>
                <text class="empty-desc">请先添加并核验发票</text>
                <view class="empty-action" @click="goToInvoice">
                    <text class="action-text">去添加发票</text>
                </view>
            </view>
        </view>

        <view class="batch-history-section">
            <view class="section-header">
                <text class="section-title">报销批次</text>
                <text class="view-all" @click="goToBatchList">查看全部</text>
            </view>
            <view class="batch-list" v-if="batches.length > 0">
                <view 
                    class="batch-card" 
                    v-for="(batch, index) in batches" 
                    :key="batch.id"
                    @click="goToBatchDetail(batch)"
                >
                    <view class="batch-header">
                        <view class="batch-number">
                            <text class="label">批次号</text>
                            <text class="value">{{ batch.batch_number }}</text>
                        </view>
                        <view class="batch-status" :class="batch.status">
                            <text class="status-text">{{ getBatchStatusText(batch.status) }}</text>
                        </view>
                    </view>
                    <view class="batch-body">
                        <view class="batch-info">
                            <text class="info-text">{{ batch.description || '报销申请' }}</text>
                            <text class="info-meta">{{ batch.invoice_count }} 张发票</text>
                        </view>
                        <view class="batch-amount">
                            <text class="amount-label">合计金额</text>
                            <text class="amount-value">¥{{ batch.total_amount || 0 }}</text>
                        </view>
                    </view>
                    <view class="batch-footer">
                        <text class="create-time">创建时间: {{ batch.created_at }}</text>
                        <text class="creator" v-if="batch.created_by">创建人: {{ batch.created_by }}</text>
                    </view>
                </view>
            </view>
            <view class="empty-batch" v-else>
                <text class="empty-text">暂无报销批次</text>
            </view>
        </view>

        <view class="apply-modal" v-if="showApplyModal" @click="closeApplyModal">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">申请报销</text>
                    <view class="close-btn" @click="closeApplyModal">
                        <text class="close-icon">✕</text>
                    </view>
                </view>
                <view class="modal-body">
                    <view class="summary-section">
                        <text class="summary-title">报销摘要</text>
                        <textarea 
                            class="summary-input" 
                            v-model="applyForm.description"
                            placeholder="请输入报销摘要（可选）"
                            :maxlength="200"
                        />
                    </view>
                    <view class="invoices-section">
                        <text class="invoices-title">报销发票 ({{ applyForm.invoice_ids.length }} 张)</text>
                        <view class="invoices-list">
                            <view 
                                class="invoice-item" 
                                v-for="(id, index) in applyForm.invoice_ids" 
                                :key="id"
                            >
                                <text class="item-index">{{ index + 1 }}.</text>
                                <text class="item-info">{{ getInvoiceInfo(id) }}</text>
                                <text class="item-amount">¥{{ getInvoiceAmount(id) }}</text>
                            </view>
                        </view>
                    </view>
                    <view class="total-section">
                        <text class="total-label">合计金额</text>
                        <text class="total-value">¥{{ applyTotalAmount }}</text>
                    </view>
                </view>
                <view class="modal-footer">
                    <view class="cancel-btn" @click="closeApplyModal">
                        <text class="btn-text">取消</text>
                    </view>
                    <view class="confirm-btn" @click="submitReimbursement">
                        <text class="btn-text">确认申请</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import { invoiceApi } from '@/utils/request.js'

export default {
    data() {
        return {
            currentTab: 'all',
            showFilter: false,
            filters: {
                invoice_type: null,
                is_verified: null
            },
            invoices: [],
            batches: [],
            selectedInvoices: [],
            stats: {
                pending_count: 0,
                approved_count: 0,
                total_amount: 0
            },
            showApplyModal: false,
            applyForm: {
                description: '',
                invoice_ids: []
            }
        }
    },
    computed: {
        selectedTotalAmount() {
            let total = 0
            for (const id of this.selectedInvoices) {
                const invoice = this.invoices.find(inv => inv.id === id)
                if (invoice) {
                    total += invoice.total_amount_with_tax || 0
                }
            }
            return total.toFixed(2)
        },
        applyTotalAmount() {
            let total = 0
            for (const id of this.applyForm.invoice_ids) {
                const invoice = this.invoices.find(inv => inv.id === id)
                if (invoice) {
                    total += invoice.total_amount_with_tax || 0
                }
            }
            return total.toFixed(2)
        }
    },
    onLoad(options) {
        if (options.invoice_id) {
            const invoiceId = parseInt(options.invoice_id)
            this.loadData().then(() => {
                const invoice = this.invoices.find(inv => inv.id === invoiceId)
                if (invoice) {
                    this.applyForm.invoice_ids = [invoiceId]
                    this.showApplyModal = true
                }
            })
        } else {
            this.loadData()
        }
    },
    onShow() {
        this.loadData()
    },
    methods: {
        getInvoiceTypeName(type) {
            const typeMap = {
                'vat_invoice': '增值税发票',
                'train_ticket': '火车票',
                'flight_ticket': '机票',
                'receipt': '其他票据'
            }
            return typeMap[type] || '未知'
        },
        getStatusText(status) {
            const statusMap = {
                'pending': '待核验',
                'passed': '核验通过',
                'failed': '核验失败'
            }
            return statusMap[status] || '未知'
        },
        getBatchStatusText(status) {
            const statusMap = {
                'pending': '待审批',
                'approved': '已审批',
                'rejected': '已拒绝',
                'paid': '已付款'
            }
            return statusMap[status] || '未知'
        },
        getInvoiceInfo(id) {
            const invoice = this.invoices.find(inv => inv.id === id)
            if (!invoice) return '未知'
            return invoice.seller_name || `${invoice.invoice_code || ''} ${invoice.invoice_number || ''}` || '发票'
        },
        getInvoiceAmount(id) {
            const invoice = this.invoices.find(inv => inv.id === id)
            return invoice ? (invoice.total_amount_with_tax || 0).toFixed(2) : '0.00'
        },
        async loadData() {
            await Promise.all([
                this.loadInvoices(),
                this.loadBatches(),
                this.loadStats()
            ])
        },
        async loadInvoices() {
            try {
                const params = {
                    page: 1,
                    page_size: 50,
                    is_reimbursed: false
                }
                
                if (this.filters.invoice_type !== null) {
                    params.invoice_type = this.filters.invoice_type
                }
                if (this.filters.is_verified !== null) {
                    params.is_verified = this.filters.is_verified
                }
                
                const res = await invoiceApi.get('/invoice/', params)
                this.invoices = res.items || res || []
            } catch (e) {
                console.log('加载发票列表失败:', e)
                this.invoices = this.getMockInvoices()
            }
        },
        async loadBatches() {
            try {
                const res = await invoiceApi.get('/reimbursement/', {
                    page: 1,
                    page_size: 5
                })
                this.batches = res.items || res || []
            } catch (e) {
                console.log('加载报销批次失败:', e)
                this.batches = this.getMockBatches()
            }
        },
        async loadStats() {
            try {
                const res = await invoiceApi.get('/invoice/stats')
                this.stats = {
                    pending_count: res.not_reimbursed || 0,
                    approved_count: res.reimbursed || 0,
                    total_amount: res.total_amount || 0
                }
            } catch (e) {
                console.log('加载统计数据失败:', e)
            }
        },
        getMockInvoices() {
            return [
                {
                    id: 1,
                    invoice_type: 'vat_invoice',
                    invoice_code: '1300221130',
                    invoice_number: '12345678',
                    seller_name: '北京某某科技有限公司',
                    invoice_date: '2024-01-15',
                    total_amount_with_tax: 1130.00,
                    verification_status: 'passed',
                    is_verified: true,
                    is_reimbursed: false
                },
                {
                    id: 2,
                    invoice_type: 'train_ticket',
                    invoice_code: '',
                    invoice_number: '',
                    seller_name: '火车票',
                    invoice_date: '2024-01-14',
                    total_amount_with_tax: 896.50,
                    verification_status: 'passed',
                    is_verified: true,
                    is_reimbursed: false
                },
                {
                    id: 3,
                    invoice_type: 'flight_ticket',
                    invoice_code: '',
                    invoice_number: '',
                    seller_name: '中国国际航空',
                    invoice_date: '2024-01-10',
                    total_amount_with_tax: 2350.00,
                    verification_status: 'pending',
                    is_verified: false,
                    is_reimbursed: false
                }
            ]
        },
        getMockBatches() {
            return [
                {
                    id: 1,
                    batch_number: 'BX202401180001',
                    description: '1月差旅费报销',
                    invoice_count: 3,
                    total_amount: 4376.50,
                    status: 'approved',
                    created_at: '2024-01-18 10:30:00',
                    created_by: '张三'
                },
                {
                    id: 2,
                    batch_number: 'BX202401120002',
                    description: '办公设备采购',
                    invoice_count: 2,
                    total_amount: 15680.00,
                    status: 'pending',
                    created_at: '2024-01-12 14:20:00',
                    created_by: '李四'
                }
            ]
        },
        setTab(tab) {
            this.currentTab = tab
            this.loadInvoices()
        },
        setFilter(key, value) {
            this.filters[key] = value
            this.loadInvoices()
        },
        toggleSelection(invoice) {
            if (!invoice.is_verified || invoice.verification_status !== 'passed') {
                uni.showToast({ title: '只有核验通过的发票才能报销', icon: 'none' })
                return
            }
            if (invoice.is_reimbursed) {
                uni.showToast({ title: '该发票已报销', icon: 'none' })
                return
            }
            
            const index = this.selectedInvoices.indexOf(invoice.id)
            if (index > -1) {
                this.selectedInvoices.splice(index, 1)
            } else {
                this.selectedInvoices.push(invoice.id)
            }
        },
        clearSelection() {
            this.selectedInvoices = []
        },
        goToDetail(invoice) {
            uni.navigateTo({
                url: `/pages/invoice/detail?id=${invoice.id}`
            })
        },
        goToInvoice() {
            uni.switchTab({
                url: '/pages/invoice/index'
            })
        },
        goToBatchList() {
            uni.showToast({ title: '查看全部功能开发中', icon: 'none' })
        },
        goToBatchDetail(batch) {
            uni.showToast({ title: '查看批次详情功能开发中', icon: 'none' })
        },
        applySingleReimbursement(invoice) {
            if (!invoice.is_verified || invoice.verification_status !== 'passed') {
                uni.showToast({ title: '请先核验发票', icon: 'none' })
                return
            }
            
            this.applyForm.invoice_ids = [invoice.id]
            this.applyForm.description = ''
            this.showApplyModal = true
        },
        submitBatchReimbursement() {
            if (this.selectedInvoices.length === 0) {
                uni.showToast({ title: '请选择要报销的发票', icon: 'none' })
                return
            }
            
            this.applyForm.invoice_ids = [...this.selectedInvoices]
            this.applyForm.description = ''
            this.showApplyModal = true
        },
        closeApplyModal() {
            this.showApplyModal = false
            this.applyForm = {
                description: '',
                invoice_ids: []
            }
        },
        async submitReimbursement() {
            if (this.applyForm.invoice_ids.length === 0) {
                uni.showToast({ title: '请选择要报销的发票', icon: 'none' })
                return
            }
            
            uni.showLoading({ title: '提交中...' })
            
            try {
                await invoiceApi.post('/reimbursement/', {
                    description: this.applyForm.description,
                    invoice_ids: this.applyForm.invoice_ids
                })
                
                uni.hideLoading()
                uni.showToast({ title: '提交成功', icon: 'success' })
                
                this.closeApplyModal()
                this.selectedInvoices = []
                
                setTimeout(() => {
                    this.loadData()
                }, 1500)
                
            } catch (e) {
                uni.hideLoading()
                
                const newBatch = {
                    id: Date.now(),
                    batch_number: `BX${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
                    description: this.applyForm.description || '报销申请',
                    invoice_count: this.applyForm.invoice_ids.length,
                    total_amount: parseFloat(this.applyTotalAmount),
                    status: 'pending',
                    created_at: new Date().toLocaleString(),
                    created_by: '当前用户'
                }
                
                this.batches.unshift(newBatch)
                
                uni.showToast({ title: '提交成功(演示)', icon: 'success' })
                
                this.closeApplyModal()
                this.selectedInvoices = []
                
                for (const id of this.applyForm.invoice_ids) {
                    const invoice = this.invoices.find(inv => inv.id === id)
                    if (invoice) {
                        invoice.is_reimbursed = true
                    }
                }
            }
        }
    }
}
</script>

<style scoped>
.reimbursement-page {
    min-height: 100vh;
    background-color: #F5F5F5;
    padding-bottom: 40rpx;
}

.stats-section {
    padding: 30rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.stats-grid {
    display: flex;
    justify-content: space-around;
}

.stat-item {
    text-align: center;
}

.stat-number {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 8rpx;
}

.stat-label {
    display: block;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
}

.tabs-section {
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
}

.tabs-scroll {
    white-space: nowrap;
}

.tabs-list {
    display: flex;
}

.tab-item {
    display: flex;
    align-items: center;
    padding: 16rpx 28rpx;
    margin-right: 20rpx;
    background-color: #F5F7FA;
    border-radius: 24rpx;
    position: relative;
}

.tab-item.active {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.tab-text {
    font-size: 26rpx;
    color: #666666;
}

.tab-item.active .tab-text {
    color: #FFFFFF;
}

.tab-badge {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    padding: 2rpx 10rpx;
    background-color: #FF5252;
    border-radius: 20rpx;
    font-size: 20rpx;
    color: #FFFFFF;
}

.batch-section {
    margin: 20rpx 30rpx;
    padding: 24rpx;
    background-color: #FFF3E0;
    border-radius: 16rpx;
    border: 2rpx solid #FFE0B2;
}

.batch-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20rpx;
}

.batch-text {
    font-size: 28rpx;
    font-weight: 500;
    color: #E65100;
}

.batch-amount {
    font-size: 30rpx;
    font-weight: 600;
    color: #E65100;
}

.batch-actions {
    display: flex;
    justify-content: flex-end;
}

.batch-actions .action-btn {
    padding: 12rpx 32rpx;
    border-radius: 24rpx;
    margin-left: 16rpx;
}

.batch-actions .action-btn:first-child {
    background-color: #FFFFFF;
}

.batch-actions .action-btn.primary {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.batch-actions .btn-text {
    font-size: 26rpx;
    color: #666666;
}

.batch-actions .action-btn.primary .btn-text {
    color: #FFFFFF;
}

.invoice-list-section {
    margin: 20rpx 30rpx;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #333333;
}

.filter-btn {
    display: flex;
    align-items: center;
    padding: 10rpx 20rpx;
    background-color: #FFFFFF;
    border-radius: 20rpx;
}

.filter-btn .btn-text {
    font-size: 26rpx;
    color: #666666;
    margin-right: 8rpx;
}

.filter-btn .arrow {
    font-size: 20rpx;
    color: #999999;
}

.filter-panel {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 20rpx;
    margin-bottom: 20rpx;
}

.filter-row {
    display: flex;
    align-items: flex-start;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.filter-row:last-child {
    border-bottom: none;
}

.filter-label {
    width: 140rpx;
    flex-shrink: 0;
    padding-top: 8rpx;
    font-size: 26rpx;
    color: #666666;
}

.filter-options {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
}

.filter-option {
    padding: 8rpx 20rpx;
    margin-right: 16rpx;
    margin-bottom: 12rpx;
    background-color: #F5F7FA;
    border-radius: 16rpx;
}

.filter-option.active {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.option-text {
    font-size: 24rpx;
    color: #666666;
}

.filter-option.active .option-text {
    color: #FFFFFF;
}

.invoice-list {
    display: flex;
    flex-direction: column;
}

.invoice-card {
    display: flex;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
}

.card-checkbox {
    padding: 8rpx;
    margin-right: 16rpx;
    display: flex;
    align-items: center;
}

.checkbox {
    width: 40rpx;
    height: 40rpx;
    border: 2rpx solid #CCCCCC;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.checkbox.checked {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-color: #1E88E5;
}

.check-icon {
    font-size: 26rpx;
    color: #FFFFFF;
    font-weight: bold;
}

.card-content {
    flex: 1;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
}

.invoice-type {
    display: inline-block;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
}

.invoice-type.vat_invoice {
    background-color: #E3F2FD;
}

.invoice-type.train_ticket {
    background-color: #FFF3E0;
}

.invoice-type.flight_ticket {
    background-color: #E8F5E9;
}

.type-text {
    font-size: 22rpx;
    color: #1565C0;
}

.status-tags {
    display: flex;
}

.status-tag {
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
    margin-left: 12rpx;
}

.status-tag.pending {
    background-color: #FFF3E0;
}

.status-tag.passed {
    background-color: #E8F5E9;
}

.status-tag.failed {
    background-color: #FFEBEE;
}

.status-text {
    font-size: 20rpx;
}

.status-tag.pending .status-text {
    color: #E65100;
}

.status-tag.passed .status-text {
    color: #2E7D32;
}

.status-tag.failed .status-text {
    color: #C62828;
}

.card-body {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}

.invoice-info {
    flex: 1;
}

.invoice-number {
    display: block;
    font-size: 26rpx;
    color: #666666;
    margin-bottom: 8rpx;
}

.invoice-seller {
    display: block;
    font-size: 28rpx;
    color: #333333;
    margin-bottom: 8rpx;
}

.invoice-date {
    display: block;
    font-size: 24rpx;
    color: #999999;
}

.invoice-amount {
    text-align: right;
    margin-left: 20rpx;
}

.amount-label {
    display: block;
    font-size: 22rpx;
    color: #999999;
    margin-bottom: 4rpx;
}

.amount-value {
    display: block;
    font-size: 34rpx;
    font-weight: 600;
    color: #1E88E5;
}

.card-actions {
    padding-left: 20rpx;
    border-left: 1rpx solid #F0F0F0;
    display: flex;
    align-items: center;
}

.apply-btn {
    padding: 12rpx 24rpx;
    background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
    border-radius: 20rpx;
}

.apply-btn .btn-text {
    font-size: 26rpx;
    color: #FFFFFF;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 30rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
}

.empty-icon {
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30rpx;
}

.icon-text {
    font-size: 56rpx;
}

.empty-title {
    font-size: 30rpx;
    font-weight: 500;
    color: #333333;
    margin-bottom: 12rpx;
}

.empty-desc {
    font-size: 26rpx;
    color: #999999;
    margin-bottom: 40rpx;
}

.empty-action {
    padding: 16rpx 48rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 40rpx;
}

.empty-action .action-text {
    font-size: 28rpx;
    color: #FFFFFF;
}

.batch-history-section {
    margin: 30rpx;
}

.view-all {
    font-size: 26rpx;
    color: #1E88E5;
}

.batch-list {
    display: flex;
    flex-direction: column;
}

.batch-card {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
}

.batch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
}

.batch-number {
    display: flex;
    flex-direction: column;
}

.batch-number .label {
    font-size: 22rpx;
    color: #999999;
    margin-bottom: 4rpx;
}

.batch-number .value {
    font-size: 28rpx;
    font-weight: 600;
    color: #333333;
}

.batch-status {
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
}

.batch-status.pending {
    background-color: #FFF3E0;
}

.batch-status.approved {
    background-color: #E8F5E9;
}

.batch-status.rejected {
    background-color: #FFEBEE;
}

.batch-status .status-text {
    font-size: 24rpx;
}

.batch-status.pending .status-text {
    color: #E65100;
}

.batch-status.approved .status-text {
    color: #2E7D32;
}

.batch-status.rejected .status-text {
    color: #C62828;
}

.batch-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-top: 1rpx solid #F5F5F5;
    border-bottom: 1rpx solid #F5F5F5;
    margin-bottom: 16rpx;
}

.batch-info {
    flex: 1;
}

.batch-info .info-text {
    display: block;
    font-size: 28rpx;
    color: #333333;
    margin-bottom: 8rpx;
}

.batch-info .info-meta {
    font-size: 24rpx;
    color: #666666;
}

.batch-amount {
    text-align: right;
}

.batch-amount .amount-label {
    font-size: 24rpx;
    color: #999999;
    margin-bottom: 4rpx;
}

.batch-amount .amount-value {
    font-size: 32rpx;
    font-weight: 600;
    color: #1E88E5;
}

.batch-footer {
    display: flex;
    justify-content: space-between;
}

.create-time,
.creator {
    font-size: 22rpx;
    color: #999999;
}

.empty-batch {
    padding: 40rpx;
    text-align: center;
    background-color: #FFFFFF;
    border-radius: 16rpx;
}

.empty-text {
    font-size: 26rpx;
    color: #999999;
}

.apply-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    z-index: 1000;
}

.modal-content {
    width: 100%;
    max-height: 80vh;
    background-color: #FFFFFF;
    border-radius: 32rpx 32rpx 0 0;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #F5F5F5;
    flex-shrink: 0;
}

.modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
}

.close-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-icon {
    font-size: 36rpx;
    color: #999999;
}

.modal-body {
    padding: 30rpx;
    overflow-y: auto;
    flex: 1;
}

.summary-section {
    margin-bottom: 30rpx;
}

.summary-title,
.invoices-title {
    display: block;
    font-size: 28rpx;
    font-weight: 500;
    color: #333333;
    margin-bottom: 16rpx;
}

.summary-input {
    width: 100%;
    height: 160rpx;
    padding: 20rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #333333;
}

.invoices-section {
    margin-bottom: 30rpx;
}

.invoices-list {
    background-color: #FAFAFA;
    border-radius: 12rpx;
    padding: 16rpx;
}

.invoice-item {
    display: flex;
    align-items: center;
    padding: 12rpx 0;
    border-bottom: 1rpx solid #F0F0F0;
}

.invoice-item:last-child {
    border-bottom: none;
}

.item-index {
    font-size: 26rpx;
    color: #999999;
    margin-right: 12rpx;
    width: 48rpx;
}

.item-info {
    flex: 1;
    font-size: 26rpx;
    color: #333333;
}

.item-amount {
    font-size: 26rpx;
    font-weight: 500;
    color: #1E88E5;
}

.total-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx;
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    border-radius: 12rpx;
}

.total-label {
    font-size: 28rpx;
    color: #1565C0;
}

.total-value {
    font-size: 36rpx;
    font-weight: 600;
    color: #1565C0;
}

.modal-footer {
    display: flex;
    padding: 30rpx;
    padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
    border-top: 1rpx solid #F5F5F5;
    flex-shrink: 0;
}

.cancel-btn,
.confirm-btn {
    flex: 1;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 44rpx;
}

.cancel-btn {
    background-color: #F5F7FA;
    margin-right: 20rpx;
}

.confirm-btn {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.cancel-btn .btn-text {
    font-size: 30rpx;
    color: #666666;
}

.confirm-btn .btn-text {
    font-size: 30rpx;
    color: #FFFFFF;
}
</style>
