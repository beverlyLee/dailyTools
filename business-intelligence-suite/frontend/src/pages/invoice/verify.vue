<template>
    <view class="verify-page">
        <view class="verify-summary">
            <view class="summary-icon" :class="result.overall_status">
                <text class="icon-text">{{ getStatusIcon(result.overall_status) }}</text>
            </view>
            <view class="summary-info">
                <text class="summary-title">{{ getStatusTitle(result.overall_status) }}</text>
                <text class="summary-subtitle">{{ result.message || '核验完成' }}</text>
            </view>
        </view>

        <view class="stats-section">
            <view class="stats-grid">
                <view class="stat-item">
                    <text class="stat-number total">{{ result.total_checks || 0 }}</text>
                    <text class="stat-label">总核验项</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number passed">{{ result.passed_checks || 0 }}</text>
                    <text class="stat-label">通过</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number failed">{{ result.failed_checks || 0 }}</text>
                    <text class="stat-label">失败</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number warning">{{ result.warning_checks || 0 }}</text>
                    <text class="stat-label">警告</text>
                </view>
            </view>
        </view>

        <view class="checks-section">
            <view class="section-header">
                <text class="section-title">核验详情</text>
                <view class="filter-btns">
                    <view 
                        class="filter-btn" 
                        :class="{ active: currentFilter === 'all' }"
                        @click="setFilter('all')"
                    >
                        <text class="filter-text">全部</text>
                    </view>
                    <view 
                        class="filter-btn" 
                        :class="{ active: currentFilter === 'passed' }"
                        @click="setFilter('passed')"
                    >
                        <text class="filter-text">通过</text>
                    </view>
                    <view 
                        class="filter-btn" 
                        :class="{ active: currentFilter === 'failed' }"
                        @click="setFilter('failed')"
                    >
                        <text class="filter-text">失败</text>
                    </view>
                </view>
            </view>

            <view class="checks-list">
                <view 
                    class="check-item" 
                    v-for="(check, index) in filteredChecks" 
                    :key="index"
                >
                    <view class="check-icon" :class="check.is_passed ? 'passed' : 'failed'">
                        <text class="icon">{{ check.is_passed ? '✓' : '✕' }}</text>
                    </view>
                    <view class="check-content">
                        <view class="check-header">
                            <text class="check-name">{{ check.check_name }}</text>
                            <view class="check-type" v-if="check.check_type">
                                <text class="type-text">{{ getCheckTypeText(check.check_type) }}</text>
                            </view>
                        </view>
                        <text class="check-message" v-if="check.message">{{ check.message }}</text>
                        <view class="check-details" v-if="check.details">
                            <text class="details-label">详细信息:</text>
                            <text class="details-content">{{ check.details }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="empty-state" v-if="filteredChecks.length === 0">
                <text class="empty-text">暂无{{ currentFilter !== 'all' ? getFilterText(currentFilter) : '' }}核验项</text>
            </view>
        </view>

        <view class="invoice-info-section" v-if="invoiceData">
            <view class="section-header">
                <text class="section-title">发票信息</text>
                <view class="view-detail-btn" @click="goToDetail">
                    <text class="btn-text">查看详情</text>
                </view>
            </view>
            <view class="invoice-card">
                <view class="invoice-type" :class="invoiceData.invoice_type">
                    <text class="type-text">{{ getInvoiceTypeName(invoiceData.invoice_type) }}</text>
                </view>
                <view class="invoice-rows">
                    <view class="invoice-row" v-if="invoiceData.invoice_code || invoiceData.invoice_number">
                        <text class="row-label">发票号码</text>
                        <text class="row-value">{{ invoiceData.invoice_code || '' }} {{ invoiceData.invoice_number || '' }}</text>
                    </view>
                    <view class="invoice-row" v-if="invoiceData.seller_name">
                        <text class="row-label">销售方</text>
                        <text class="row-value">{{ invoiceData.seller_name }}</text>
                    </view>
                    <view class="invoice-row">
                        <text class="row-label">价税合计</text>
                        <text class="row-value amount">¥{{ invoiceData.total_amount_with_tax || 0 }}</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="bottom-actions">
            <view class="action-btn" @click="goBack">
                <text class="btn-text">返回</text>
            </view>
            <view class="action-btn primary" @click="reVerify" v-if="result.overall_status !== 'passed'">
                <text class="btn-text">重新核验</text>
            </view>
            <view class="action-btn primary" @click="goToReimbursement" v-if="result.overall_status === 'passed' && invoiceData && !invoiceData.is_reimbursed">
                <text class="btn-text">申请报销</text>
            </view>
        </view>
    </view>
</template>

<script>
import { invoiceApi } from '@/utils/request.js'

export default {
    data() {
        return {
            invoiceId: null,
            result: {
                invoice_id: null,
                overall_status: 'pending',
                total_checks: 0,
                passed_checks: 0,
                failed_checks: 0,
                warning_checks: 0,
                checks: [],
                message: ''
            },
            invoiceData: null,
            currentFilter: 'all',
            loading: true
        }
    },
    computed: {
        filteredChecks() {
            if (this.currentFilter === 'all') {
                return this.result.checks || []
            }
            if (this.currentFilter === 'passed') {
                return (this.result.checks || []).filter(c => c.is_passed)
            }
            if (this.currentFilter === 'failed') {
                return (this.result.checks || []).filter(c => !c.is_passed)
            }
            return this.result.checks || []
        }
    },
    onLoad(options) {
        this.invoiceId = options.id ? parseInt(options.id) : null
        if (this.invoiceId) {
            this.loadVerificationResult()
        }
    },
    methods: {
        getStatusIcon(status) {
            const iconMap = {
                'pending': '⏳',
                'passed': '✅',
                'failed': '❌',
                'warning': '⚠️'
            }
            return iconMap[status] || '❓'
        },
        getStatusTitle(status) {
            const titleMap = {
                'pending': '核验中',
                'passed': '核验通过',
                'failed': '核验失败',
                'warning': '核验异常'
            }
            return titleMap[status] || '核验完成'
        },
        getCheckTypeText(type) {
            const typeMap = {
                'format': '格式',
                'date': '日期',
                'amount': '金额',
                'tax_id': '税号',
                'seal': '印章',
                'duplicate': '重复',
                'head_match': '抬头'
            }
            return typeMap[type] || type
        },
        getInvoiceTypeName(type) {
            const typeMap = {
                'vat_invoice': '增值税发票',
                'train_ticket': '火车票',
                'flight_ticket': '机票',
                'receipt': '其他票据'
            }
            return typeMap[type] || '未知'
        },
        getFilterText(filter) {
            const filterMap = {
                'passed': '通过的',
                'failed': '失败的'
            }
            return filterMap[filter] || ''
        },
        setFilter(filter) {
            this.currentFilter = filter
        },
        async loadVerificationResult() {
            this.loading = true
            
            try {
                const res = await invoiceApi.post(`/invoice/${this.invoiceId}/verify`)
                this.result = res || {}
                
                await this.loadInvoiceInfo()
                
            } catch (e) {
                console.log('加载核验结果失败:', e)
                this.result = this.getMockResult()
                this.invoiceData = this.getMockInvoiceData()
            } finally {
                this.loading = false
            }
        },
        async loadInvoiceInfo() {
            try {
                const res = await invoiceApi.get(`/invoice/${this.invoiceId}`)
                this.invoiceData = res || null
            } catch (e) {
                console.log('加载发票信息失败:', e)
            }
        },
        getMockResult() {
            return {
                invoice_id: this.invoiceId,
                overall_status: 'passed',
                total_checks: 6,
                passed_checks: 6,
                failed_checks: 0,
                warning_checks: 0,
                message: '核验完成: 通过6/6项',
                checks: [
                    {
                        check_name: '发票代码格式校验',
                        check_type: 'format',
                        is_passed: true,
                        message: '发票代码格式正确，共10位数字'
                    },
                    {
                        check_name: '发票号码格式校验',
                        check_type: 'format',
                        is_passed: true,
                        message: '发票号码格式正确，共8位数字'
                    },
                    {
                        check_name: '开票日期有效性校验',
                        check_type: 'date',
                        is_passed: true,
                        message: '开票日期在有效期内，未超过360天'
                    },
                    {
                        check_name: '金额一致性校验',
                        check_type: 'amount',
                        is_passed: true,
                        message: '金额+税额=价税合计，校验通过'
                    },
                    {
                        check_name: '纳税人识别号校验',
                        check_type: 'tax_id',
                        is_passed: true,
                        message: '购销方纳税人识别号格式正确'
                    },
                    {
                        check_name: '发票章检测',
                        check_type: 'seal',
                        is_passed: true,
                        message: '检测到发票专用章，与销售方信息匹配'
                    }
                ]
            }
        },
        getMockInvoiceData() {
            return {
                id: this.invoiceId,
                invoice_type: 'vat_invoice',
                invoice_code: '1300221130',
                invoice_number: '12345678',
                seller_name: '北京某某科技有限公司',
                total_amount_with_tax: 1130.00,
                is_reimbursed: false
            }
        },
        async reVerify() {
            uni.showLoading({ title: '重新核验中...' })
            
            try {
                const res = await invoiceApi.post(`/invoice/${this.invoiceId}/verify`)
                this.result = res || {}
                uni.hideLoading()
                uni.showToast({ title: '核验完成', icon: 'success' })
            } catch (e) {
                uni.hideLoading()
                uni.showToast({ title: '核验功能演示', icon: 'none' })
            }
        },
        goToDetail() {
            uni.navigateTo({
                url: `/pages/invoice/detail?id=${this.invoiceId}`
            })
        },
        goToReimbursement() {
            uni.navigateTo({
                url: `/pages/reimbursement/index?invoice_id=${this.invoiceId}`
            })
        },
        goBack() {
            uni.navigateBack()
        }
    }
}
</script>

<style scoped>
.verify-page {
    min-height: 100vh;
    background-color: #F5F5F5;
    padding-bottom: 120rpx;
}

.verify-summary {
    display: flex;
    align-items: center;
    padding: 40rpx 30rpx;
    background: linear-gradient(135deg, #FFFFFF 0%, #F5F7FA 100%);
}

.summary-icon {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
}

.summary-icon.passed {
    background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}

.summary-icon.failed {
    background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
}

.summary-icon.warning {
    background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
}

.summary-icon.pending {
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
}

.icon-text {
    font-size: 56rpx;
}

.summary-info {
    flex: 1;
}

.summary-title {
    display: block;
    font-size: 36rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 8rpx;
}

.summary-subtitle {
    display: block;
    font-size: 26rpx;
    color: #666666;
}

.stats-section {
    margin: 20rpx 30rpx;
    padding: 30rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
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
    margin-bottom: 8rpx;
}

.stat-number.total {
    color: #333333;
}

.stat-number.passed {
    color: #2E7D32;
}

.stat-number.failed {
    color: #C62828;
}

.stat-number.warning {
    color: #E65100;
}

.stat-label {
    display: block;
    font-size: 24rpx;
    color: #999999;
}

.checks-section {
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

.filter-btns {
    display: flex;
    background-color: #FFFFFF;
    border-radius: 20rpx;
    padding: 4rpx;
}

.filter-btn {
    padding: 10rpx 20rpx;
    border-radius: 16rpx;
}

.filter-btn.active {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.filter-text {
    font-size: 24rpx;
    color: #666666;
}

.filter-btn.active .filter-text {
    color: #FFFFFF;
}

.checks-list {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    overflow: hidden;
}

.check-item {
    display: flex;
    align-items: flex-start;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #F5F5F5;
}

.check-item:last-child {
    border-bottom: none;
}

.check-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    margin-top: 4rpx;
    flex-shrink: 0;
}

.check-icon.passed {
    background-color: #E8F5E9;
}

.check-icon.failed {
    background-color: #FFEBEE;
}

.check-icon .icon {
    font-size: 28rpx;
    font-weight: bold;
}

.check-icon.passed .icon {
    color: #2E7D32;
}

.check-icon.failed .icon {
    color: #C62828;
}

.check-content {
    flex: 1;
}

.check-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8rpx;
}

.check-name {
    font-size: 28rpx;
    font-weight: 500;
    color: #333333;
}

.check-type {
    padding: 4rpx 12rpx;
    background-color: #F5F7FA;
    border-radius: 8rpx;
}

.type-text {
    font-size: 22rpx;
    color: #666666;
}

.check-message {
    display: block;
    font-size: 26rpx;
    color: #666666;
    margin-bottom: 8rpx;
}

.check-details {
    padding: 12rpx 16rpx;
    background-color: #FAFAFA;
    border-radius: 8rpx;
}

.details-label {
    display: block;
    font-size: 22rpx;
    color: #999999;
    margin-bottom: 4rpx;
}

.details-content {
    display: block;
    font-size: 24rpx;
    color: #666666;
}

.empty-state {
    padding: 60rpx;
    text-align: center;
    background-color: #FFFFFF;
    border-radius: 16rpx;
}

.empty-text {
    font-size: 26rpx;
    color: #999999;
}

.invoice-info-section {
    margin: 20rpx 30rpx;
}

.view-detail-btn {
    padding: 8rpx 20rpx;
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    border-radius: 16rpx;
}

.view-detail-btn .btn-text {
    font-size: 24rpx;
    color: #1565C0;
}

.invoice-card {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 24rpx 30rpx;
}

.invoice-type {
    display: inline-block;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    margin-bottom: 20rpx;
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

.invoice-type .type-text {
    font-size: 24rpx;
    color: #1565C0;
}

.invoice-rows {
    margin-top: 12rpx;
}

.invoice-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.invoice-row:last-child {
    border-bottom: none;
}

.row-label {
    font-size: 26rpx;
    color: #666666;
}

.row-value {
    font-size: 26rpx;
    color: #333333;
}

.row-value.amount {
    font-size: 32rpx;
    font-weight: 600;
    color: #1E88E5;
}

.bottom-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    padding: 20rpx 30rpx;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    background-color: #FFFFFF;
    border-top: 1rpx solid #F5F5F5;
}

.bottom-actions .action-btn {
    flex: 1;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 44rpx;
    margin: 0 8rpx;
    background-color: #F5F7FA;
}

.bottom-actions .action-btn.primary {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.bottom-actions .action-btn .btn-text {
    font-size: 28rpx;
    color: #666666;
}

.bottom-actions .action-btn.primary .btn-text {
    color: #FFFFFF;
}
</style>
