<template>
    <view class="list-page">
        <view class="search-section">
            <view class="search-bar">
                <view class="search-input">
                    <text class="search-icon">🔍</text>
                    <input 
                        class="input-field" 
                        v-model="searchKeyword" 
                        placeholder="搜索发票代码、号码、公司名称"
                        @confirm="doSearch"
                    />
                </view>
                <view class="search-btn" @click="doSearch">
                    <text class="btn-text">搜索</text>
                </view>
            </view>
        </view>

        <view class="filter-section">
            <view class="filter-row">
                <view class="filter-label">
                    <text class="label-text">票据类型</text>
                </view>
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
                <view class="filter-label">
                    <text class="label-text">核验状态</text>
                </view>
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
            <view class="filter-row">
                <view class="filter-label">
                    <text class="label-text">报销状态</text>
                </view>
                <view class="filter-options">
                    <view 
                        class="filter-option" 
                        :class="{ active: filters.is_reimbursed === null }"
                        @click="setFilter('is_reimbursed', null)"
                    >
                        <text class="option-text">全部</text>
                    </view>
                    <view 
                        class="filter-option" 
                        :class="{ active: filters.is_reimbursed === true }"
                        @click="setFilter('is_reimbursed', true)"
                    >
                        <text class="option-text">已报销</text>
                    </view>
                    <view 
                        class="filter-option" 
                        :class="{ active: filters.is_reimbursed === false }"
                        @click="setFilter('is_reimbursed', false)"
                    >
                        <text class="option-text">待报销</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="stats-section">
            <view class="stats-grid">
                <view class="stat-item">
                    <text class="stat-number">{{ stats.total || 0 }}</text>
                    <text class="stat-label">发票总数</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">{{ stats.verified || 0 }}</text>
                    <text class="stat-label">已核验</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">{{ stats.reimbursed || 0 }}</text>
                    <text class="stat-label">已报销</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">¥{{ stats.total_amount || 0 }}</text>
                    <text class="stat-label">总金额</text>
                </view>
            </view>
        </view>

        <view class="action-bar">
            <view class="action-left">
                <view class="select-all-btn" @click="toggleSelectAll">
                    <view class="checkbox" :class="{ checked: isAllSelected }">
                        <text class="check-icon" v-if="isAllSelected">✓</text>
                    </view>
                    <text class="btn-text">全选</text>
                </view>
                <text class="selected-count" v-if="selectedIds.length > 0">
                    已选 {{ selectedIds.length }} 项
                </text>
            </view>
            <view class="action-right">
                <view class="action-btn" @click="exportSelected" v-if="selectedIds.length > 0">
                    <text class="btn-text">导出选中</text>
                </view>
                <view class="action-btn primary" @click="exportAll">
                    <text class="btn-text">导出全部</text>
                </view>
            </view>
        </view>

        <view class="invoice-list" v-if="invoices.length > 0">
            <view 
                class="invoice-card" 
                v-for="(invoice, index) in invoices" 
                :key="invoice.id"
                @click="goToDetail(invoice)"
            >
                <view class="card-checkbox" @click.stop="toggleSelection(invoice.id)">
                    <view class="checkbox" :class="{ checked: selectedIds.includes(invoice.id) }">
                        <text class="check-icon" v-if="selectedIds.includes(invoice.id)">✓</text>
                    </view>
                </view>
                <view class="card-content">
                    <view class="card-header">
                        <view class="invoice-type" :class="invoice.invoice_type">
                            <text class="type-text">{{ getInvoiceTypeName(invoice.invoice_type) }}</text>
                        </view>
                        <view class="status-tags">
                            <view class="status-tag" :class="invoice.verification_status">
                                <text class="status-text">{{ getStatusText(invoice.verification_status) }}</text>
                            </view>
                            <view class="status-tag reimbursement" :class="{ reimbursed: invoice.is_reimbursed }" v-if="invoice.is_reimbursed">
                                <text class="status-text">已报销</text>
                            </view>
                        </view>
                    </view>
                    <view class="card-body">
                        <view class="invoice-info">
                            <view class="info-row" v-if="invoice.invoice_code || invoice.invoice_number">
                                <text class="info-label">发票号码</text>
                                <text class="info-value">{{ invoice.invoice_code || '' }} {{ invoice.invoice_number || '' }}</text>
                            </view>
                            <view class="info-row" v-if="invoice.seller_name">
                                <text class="info-label">销售方</text>
                                <text class="info-value">{{ invoice.seller_name }}</text>
                            </view>
                            <view class="info-row" v-if="invoice.invoice_date">
                                <text class="info-label">开票日期</text>
                                <text class="info-value">{{ invoice.invoice_date }}</text>
                            </view>
                        </view>
                        <view class="invoice-amount">
                            <text class="amount-label">价税合计</text>
                            <text class="amount-value">¥{{ invoice.total_amount_with_tax || 0 }}</text>
                        </view>
                    </view>
                </view>
                <view class="card-arrow">
                    <text class="arrow-icon">›</text>
                </view>
            </view>
        </view>

        <view class="empty-state" v-else-if="!loading">
            <view class="empty-icon">
                <text class="icon-text">📄</text>
            </view>
            <text class="empty-title">暂无发票记录</text>
            <text class="empty-desc">点击下方按钮开始识别发票</text>
            <view class="empty-action" @click="goToUpload">
                <text class="action-text">识别发票</text>
            </view>
        </view>

        <view class="loading-state" v-else>
            <text class="loading-text">加载中...</text>
        </view>

        <view class="load-more" v-if="invoices.length > 0 && hasMore">
            <text class="load-text">{{ isLoadingMore ? '加载中...' : '上拉加载更多' }}</text>
        </view>

        <view class="no-more" v-if="invoices.length > 0 && !hasMore && invoices.length >= pageSize">
            <text class="no-more-text">没有更多数据了</text>
        </view>
    </view>
</template>

<script>
import { invoiceApi } from '@/utils/request.js'

export default {
    data() {
        return {
            searchKeyword: '',
            filters: {
                invoice_type: null,
                is_verified: null,
                is_reimbursed: null
            },
            invoices: [],
            stats: {
                total: 0,
                verified: 0,
                reimbursed: 0,
                total_amount: 0
            },
            loading: true,
            isLoadingMore: false,
            page: 1,
            pageSize: 20,
            hasMore: true,
            selectedIds: [],
            isAllSelected: false
        }
    },
    onLoad() {
        this.loadData()
    },
    onShow() {
        this.loadData()
    },
    onPullDownRefresh() {
        this.page = 1
        this.hasMore = true
        this.selectedIds = []
        this.isAllSelected = false
        this.loadData().then(() => {
            uni.stopPullDownRefresh()
        })
    },
    onReachBottom() {
        if (this.hasMore && !this.isLoadingMore) {
            this.page++
            this.loadInvoices(true)
        }
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
                'failed': '核验失败',
                'warning': '存在异常'
            }
            return statusMap[status] || '未知'
        },
        setFilter(key, value) {
            this.filters[key] = value
            this.page = 1
            this.hasMore = true
            this.invoices = []
            this.selectedIds = []
            this.isAllSelected = false
            this.loadInvoices()
        },
        doSearch() {
            this.page = 1
            this.hasMore = true
            this.invoices = []
            this.selectedIds = []
            this.isAllSelected = false
            this.loadInvoices()
        },
        async loadData() {
            this.loading = true
            await Promise.all([
                this.loadStats(),
                this.loadInvoices()
            ])
            this.loading = false
        },
        async loadStats() {
            try {
                const res = await invoiceApi.get('/invoice/stats')
                this.stats = {
                    total: res.total_invoices || 0,
                    verified: res.verified || 0,
                    reimbursed: res.reimbursed || 0,
                    total_amount: res.total_amount || 0
                }
            } catch (e) {
                console.log('加载统计数据失败:', e)
            }
        },
        async loadInvoices(append = false) {
            if (append) {
                this.isLoadingMore = true
            }
            
            try {
                const params = {
                    page: this.page,
                    page_size: this.pageSize
                }
                
                if (this.searchKeyword) {
                    params.keyword = this.searchKeyword
                }
                
                if (this.filters.invoice_type !== null) {
                    params.invoice_type = this.filters.invoice_type
                }
                
                if (this.filters.is_verified !== null) {
                    params.is_verified = this.filters.is_verified
                }
                
                if (this.filters.is_reimbursed !== null) {
                    params.is_reimbursed = this.filters.is_reimbursed
                }
                
                const res = await invoiceApi.get('/invoice/', params)
                
                const items = res.items || res || []
                this.hasMore = items.length >= this.pageSize
                
                if (append) {
                    this.invoices = [...this.invoices, ...items]
                } else {
                    this.invoices = items
                }
            } catch (e) {
                console.log('加载发票列表失败:', e)
                if (!append) {
                    this.invoices = this.getMockInvoices()
                }
            } finally {
                this.isLoadingMore = false
            }
        },
        getMockInvoices() {
            return [
                {
                    id: 1,
                    invoice_type: 'vat_invoice',
                    invoice_code: '1300221130',
                    invoice_number: '12345678',
                    seller_name: '阿里巴巴云计算有限公司',
                    invoice_date: '2024-01-18',
                    total_amount_with_tax: 5680.00,
                    verification_status: 'passed',
                    is_verified: true,
                    is_reimbursed: true
                },
                {
                    id: 2,
                    invoice_type: 'train_ticket',
                    invoice_code: '',
                    invoice_number: '',
                    seller_name: '火车票',
                    invoice_date: '2024-01-15',
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
                },
                {
                    id: 4,
                    invoice_type: 'vat_invoice',
                    invoice_code: '3100221130',
                    invoice_number: '87654321',
                    seller_name: '腾讯科技(深圳)有限公司',
                    invoice_date: '2024-01-08',
                    total_amount_with_tax: 12500.00,
                    verification_status: 'failed',
                    is_verified: true,
                    is_reimbursed: false
                },
                {
                    id: 5,
                    invoice_type: 'vat_invoice',
                    invoice_code: '1100221130',
                    invoice_number: '11223344',
                    seller_name: '百度在线网络技术(北京)有限公司',
                    invoice_date: '2024-01-05',
                    total_amount_with_tax: 3800.00,
                    verification_status: 'passed',
                    is_verified: true,
                    is_reimbursed: true
                }
            ]
        },
        toggleSelection(id) {
            const index = this.selectedIds.indexOf(id)
            if (index > -1) {
                this.selectedIds.splice(index, 1)
            } else {
                this.selectedIds.push(id)
            }
            
            this.isAllSelected = this.selectedIds.length === this.invoices.length && this.invoices.length > 0
        },
        toggleSelectAll() {
            if (this.isAllSelected) {
                this.selectedIds = []
                this.isAllSelected = false
            } else {
                this.selectedIds = this.invoices.map(inv => inv.id)
                this.isAllSelected = true
            }
        },
        goToDetail(invoice) {
            uni.navigateTo({
                url: `/pages/invoice/detail?id=${invoice.id}`
            })
        },
        goToUpload() {
            uni.switchTab({
                url: '/pages/invoice/index'
            })
        },
        async exportSelected() {
            if (this.selectedIds.length === 0) {
                uni.showToast({ title: '请先选择要导出的发票', icon: 'none' })
                return
            }
            
            uni.showLoading({ title: '导出中...' })
            
            try {
                await invoiceApi.post('/invoice/export', this.selectedIds, {
                    params: { include_items: true }
                })
                uni.hideLoading()
                uni.showToast({ title: '导出成功', icon: 'success' })
            } catch (e) {
                uni.hideLoading()
                uni.showToast({ title: '导出功能演示', icon: 'none' })
            }
        },
        async exportAll() {
            uni.showLoading({ title: '导出中...' })
            
            try {
                const params = {}
                if (this.filters.invoice_type !== null) {
                    params.invoice_type = this.filters.invoice_type
                }
                if (this.filters.is_verified !== null) {
                    params.is_verified = this.filters.is_verified
                }
                if (this.filters.is_reimbursed !== null) {
                    params.is_reimbursed = this.filters.is_reimbursed
                }
                if (this.searchKeyword) {
                    params.keyword = this.searchKeyword
                }
                
                await invoiceApi.post('/invoice/export-all', {}, { params })
                uni.hideLoading()
                uni.showToast({ title: '导出成功', icon: 'success' })
            } catch (e) {
                uni.hideLoading()
                uni.showToast({ title: '导出功能演示', icon: 'none' })
            }
        }
    }
}
</script>

<style scoped>
.list-page {
    min-height: 100vh;
    background-color: #F5F5F5;
}

.search-section {
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
}

.search-bar {
    display: flex;
    align-items: center;
}

.search-input {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background-color: #F5F7FA;
    border-radius: 40rpx;
    margin-right: 20rpx;
}

.search-icon {
    font-size: 28rpx;
    margin-right: 12rpx;
}

.input-field {
    flex: 1;
    font-size: 28rpx;
    color: #333333;
}

.search-btn {
    padding: 16rpx 32rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 40rpx;
}

.search-btn .btn-text {
    font-size: 28rpx;
    color: #FFFFFF;
}

.filter-section {
    margin-top: 20rpx;
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
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
    padding-top: 4rpx;
}

.label-text {
    font-size: 28rpx;
    color: #666666;
}

.filter-options {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
}

.filter-option {
    padding: 8rpx 24rpx;
    margin-right: 16rpx;
    margin-bottom: 12rpx;
    background-color: #F5F7FA;
    border-radius: 20rpx;
}

.filter-option.active {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.option-text {
    font-size: 26rpx;
    color: #666666;
}

.filter-option.active .option-text {
    color: #FFFFFF;
}

.stats-section {
    margin: 20rpx 30rpx;
    padding: 30rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
}

.stats-grid {
    display: flex;
    justify-content: space-between;
}

.stat-item {
    text-align: center;
    flex: 1;
}

.stat-number {
    display: block;
    font-size: 36rpx;
    font-weight: 600;
    color: #1E88E5;
    margin-bottom: 8rpx;
}

.stat-label {
    display: block;
    font-size: 24rpx;
    color: #999999;
}

.action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
    margin-bottom: 20rpx;
}

.action-left {
    display: flex;
    align-items: center;
}

.select-all-btn {
    display: flex;
    align-items: center;
}

.checkbox {
    width: 36rpx;
    height: 36rpx;
    border: 2rpx solid #CCCCCC;
    border-radius: 8rpx;
    margin-right: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.checkbox.checked {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-color: #1E88E5;
}

.check-icon {
    font-size: 24rpx;
    color: #FFFFFF;
    font-weight: bold;
}

.select-all-btn .btn-text {
    font-size: 28rpx;
    color: #333333;
}

.selected-count {
    font-size: 26rpx;
    color: #1E88E5;
    margin-left: 20rpx;
}

.action-right {
    display: flex;
}

.action-bar .action-btn {
    padding: 12rpx 24rpx;
    border-radius: 20rpx;
    margin-left: 16rpx;
}

.action-bar .action-btn.primary {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.action-bar .action-btn .btn-text {
    font-size: 26rpx;
    color: #666666;
}

.action-bar .action-btn.primary .btn-text {
    color: #FFFFFF;
}

.invoice-list {
    padding: 0 30rpx;
}

.invoice-card {
    display: flex;
    align-items: center;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    padding: 24rpx;
}

.card-checkbox {
    padding: 8rpx;
    margin-right: 16rpx;
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
}

.invoice-type.vat_invoice .type-text {
    color: #1565C0;
}

.invoice-type.train_ticket .type-text {
    color: #E65100;
}

.invoice-type.flight_ticket .type-text {
    color: #2E7D32;
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

.status-tag.reimbursement.reimbursed {
    background-color: #F3E5F5;
}

.status-tag .status-text {
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

.status-tag.reimbursement.reimbursed .status-text {
    color: #6A1B9A;
}

.card-body {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}

.invoice-info {
    flex: 1;
}

.info-row {
    display: flex;
    margin-bottom: 8rpx;
}

.info-row:last-child {
    margin-bottom: 0;
}

.info-label {
    font-size: 24rpx;
    color: #999999;
    margin-right: 12rpx;
    flex-shrink: 0;
}

.info-value {
    font-size: 26rpx;
    color: #333333;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    font-size: 36rpx;
    font-weight: 600;
    color: #1E88E5;
}

.card-arrow {
    padding-left: 16rpx;
}

.arrow-icon {
    font-size: 40rpx;
    color: #CCCCCC;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120rpx 30rpx;
}

.empty-icon {
    width: 160rpx;
    height: 160rpx;
    background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;
}

.icon-text {
    font-size: 72rpx;
}

.empty-title {
    font-size: 32rpx;
    font-weight: 500;
    color: #333333;
    margin-bottom: 16rpx;
}

.empty-desc {
    font-size: 26rpx;
    color: #999999;
    margin-bottom: 40rpx;
}

.empty-action {
    padding: 20rpx 60rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 40rpx;
}

.empty-action .action-text {
    font-size: 30rpx;
    color: #FFFFFF;
}

.loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80rpx;
}

.loading-text {
    font-size: 28rpx;
    color: #999999;
}

.load-more {
    padding: 30rpx;
    text-align: center;
}

.load-text {
    font-size: 26rpx;
    color: #999999;
}

.no-more {
    padding: 30rpx;
    text-align: center;
}

.no-more-text {
    font-size: 24rpx;
    color: #CCCCCC;
}
</style>
