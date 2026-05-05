<template>
    <view class="detail-page">
        <view class="loading-section" v-if="loading">
            <text class="loading-text">加载中...</text>
        </view>

        <view class="content-section" v-else>
            <view class="status-bar">
                <view class="status-item" :class="invoice.verification_status">
                    <text class="status-icon">{{ getStatusIcon(invoice.verification_status) }}</text>
                    <text class="status-text">{{ getStatusText(invoice.verification_status) }}</text>
                </view>
                <view class="status-item reimbursement" :class="{ reimbursed: invoice.is_reimbursed }">
                    <text class="status-icon">{{ invoice.is_reimbursed ? '✅' : '📋' }}</text>
                    <text class="status-text">{{ invoice.is_reimbursed ? '已报销' : '待报销' }}</text>
                </view>
            </view>

            <view class="invoice-type-badge">
                <text class="badge-text">{{ getInvoiceTypeName(invoice.invoice_type) }}</text>
            </view>

            <view class="info-card">
                <view class="card-header">
                    <text class="card-title">发票基本信息</text>
                </view>
                <view class="card-content">
                    <view class="info-row" v-if="invoice.invoice_code">
                        <text class="info-label">发票代码</text>
                        <text class="info-value">{{ invoice.invoice_code }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.invoice_number">
                        <text class="info-label">发票号码</text>
                        <text class="info-value">{{ invoice.invoice_number }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.invoice_date">
                        <text class="info-label">开票日期</text>
                        <text class="info-value">{{ invoice.invoice_date }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.check_code">
                        <text class="info-label">校验码</text>
                        <text class="info-value">{{ invoice.check_code }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.machine_number">
                        <text class="info-label">机器编号</text>
                        <text class="info-value">{{ invoice.machine_number }}</text>
                    </view>
                </view>
            </view>

            <view class="info-card amount-card">
                <view class="card-header">
                    <text class="card-title">金额信息</text>
                </view>
                <view class="card-content">
                    <view class="amount-row">
                        <view class="amount-item">
                            <text class="amount-label">金额</text>
                            <text class="amount-value">¥{{ invoice.total_amount || 0 }}</text>
                        </view>
                        <view class="amount-item">
                            <text class="amount-label">税额</text>
                            <text class="amount-value">¥{{ invoice.total_tax || 0 }}</text>
                        </view>
                    </view>
                    <view class="total-row">
                        <text class="total-label">价税合计</text>
                        <text class="total-value">¥{{ invoice.total_amount_with_tax || 0 }}</text>
                    </view>
                </view>
            </view>

            <view class="info-card" v-if="invoice.seller_name || invoice.seller_tax_id">
                <view class="card-header">
                    <text class="card-title">销售方信息</text>
                </view>
                <view class="card-content">
                    <view class="info-row" v-if="invoice.seller_name">
                        <text class="info-label">名称</text>
                        <text class="info-value">{{ invoice.seller_name }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.seller_tax_id">
                        <text class="info-label">纳税人识别号</text>
                        <text class="info-value">{{ invoice.seller_tax_id }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.seller_address">
                        <text class="info-label">地址电话</text>
                        <text class="info-value">{{ invoice.seller_address }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.seller_bank">
                        <text class="info-label">开户行及账号</text>
                        <text class="info-value">{{ invoice.seller_bank }}</text>
                    </view>
                </view>
            </view>

            <view class="info-card" v-if="invoice.buyer_name || invoice.buyer_tax_id">
                <view class="card-header">
                    <text class="card-title">购买方信息</text>
                </view>
                <view class="card-content">
                    <view class="info-row" v-if="invoice.buyer_name">
                        <text class="info-label">名称</text>
                        <text class="info-value">{{ invoice.buyer_name }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.buyer_tax_id">
                        <text class="info-label">纳税人识别号</text>
                        <text class="info-value">{{ invoice.buyer_tax_id }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.buyer_address">
                        <text class="info-label">地址电话</text>
                        <text class="info-value">{{ invoice.buyer_address }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.buyer_bank">
                        <text class="info-label">开户行及账号</text>
                        <text class="info-value">{{ invoice.buyer_bank }}</text>
                    </view>
                </view>
            </view>

            <view class="info-card" v-if="invoiceItems.length > 0">
                <view class="card-header">
                    <text class="card-title">商品明细</text>
                </view>
                <view class="table-wrapper">
                    <view class="table-header">
                        <view class="cell name">货物或应税劳务名称</view>
                        <view class="cell spec">规格型号</view>
                        <view class="cell qty">数量</view>
                        <view class="cell price">单价</view>
                        <view class="cell amount">金额</view>
                    </view>
                    <view class="table-body">
                        <view class="table-row" v-for="(item, index) in invoiceItems" :key="index">
                            <view class="cell name">{{ item.item_name }}</view>
                            <view class="cell spec">{{ item.specification || '-' }}</view>
                            <view class="cell qty">{{ item.quantity || '-' }}</view>
                            <view class="cell price">{{ item.unit_price ? '¥' + item.unit_price : '-' }}</view>
                            <view class="cell amount">{{ item.amount ? '¥' + item.amount : '-' }}</view>
                        </view>
                    </view>
                </view>
            </view>

            <view class="info-card" v-if="invoice.verification_message || verificationRecords.length > 0">
                <view class="card-header">
                    <text class="card-title">核验信息</text>
                    <view class="verify-btn" @click="doVerify" v-if="!invoice.is_verified">
                        <text class="btn-text">核验</text>
                    </view>
                </view>
                <view class="card-content">
                    <view class="verification-summary" v-if="invoice.verification_message">
                        <text class="summary-text">{{ invoice.verification_message }}</text>
                    </view>
                    <view class="verification-list" v-if="verificationRecords.length > 0">
                        <view 
                            class="verification-item" 
                            v-for="(record, index) in verificationRecords" 
                            :key="index"
                        >
                            <view class="item-icon" :class="record.is_passed ? 'passed' : 'failed'">
                                <text class="icon">{{ record.is_passed ? '✓' : '✕' }}</text>
                            </view>
                            <view class="item-content">
                                <text class="item-name">{{ record.check_name }}</text>
                                <text class="item-message" v-if="record.message">{{ record.message }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <view class="info-card" v-if="invoice.remarks || invoice.payee || invoice.drawer">
                <view class="card-header">
                    <text class="card-title">其他信息</text>
                </view>
                <view class="card-content">
                    <view class="info-row" v-if="invoice.remarks">
                        <text class="info-label">备注</text>
                        <text class="info-value">{{ invoice.remarks }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.payee">
                        <text class="info-label">收款人</text>
                        <text class="info-value">{{ invoice.payee }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.reviewer">
                        <text class="info-label">复核</text>
                        <text class="info-value">{{ invoice.reviewer }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.drawer">
                        <text class="info-label">开票人</text>
                        <text class="info-value">{{ invoice.drawer }}</text>
                    </view>
                    <view class="info-row">
                        <text class="info-label">发票章</text>
                        <text class="info-value">{{ invoice.seller_seal ? '已加盖' : '未检测到' }}</text>
                    </view>
                </view>
            </view>

            <view class="info-card" v-if="invoice.verified_at || invoice.reimbursed_at">
                <view class="card-header">
                    <text class="card-title">操作记录</text>
                </view>
                <view class="card-content">
                    <view class="info-row" v-if="invoice.verified_at">
                        <text class="info-label">核验时间</text>
                        <text class="info-value">{{ invoice.verified_at }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.reimbursed_at">
                        <text class="info-label">报销时间</text>
                        <text class="info-value">{{ invoice.reimbursed_at }}</text>
                    </view>
                    <view class="info-row" v-if="invoice.created_at">
                        <text class="info-label">录入时间</text>
                        <text class="info-value">{{ invoice.created_at }}</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="bottom-actions">
            <view class="action-btn" @click="exportInvoice">
                <text class="btn-icon">📥</text>
                <text class="btn-text">导出</text>
            </view>
            <view class="action-btn" @click="deleteInvoice" v-if="!invoice.is_reimbursed">
                <text class="btn-icon">🗑️</text>
                <text class="btn-text">删除</text>
            </view>
            <view class="action-btn primary" @click="goToVerify" v-if="invoice.is_verified && !invoice.is_reimbursed">
                <text class="btn-icon">💳</text>
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
            invoice: {},
            invoiceItems: [],
            verificationRecords: [],
            loading: true
        }
    },
    onLoad(options) {
        this.invoiceId = options.id ? parseInt(options.id) : null
        if (this.invoiceId) {
            this.loadInvoiceDetail()
        }
    },
    methods: {
        getInvoiceTypeName(type) {
            const typeMap = {
                'vat_invoice': '增值税专用发票',
                'train_ticket': '火车票',
                'flight_ticket': '航空运输电子客票行程单',
                'receipt': '其他票据'
            }
            return typeMap[type] || '未知类型'
        },
        getStatusIcon(status) {
            const iconMap = {
                'pending': '⏳',
                'passed': '✅',
                'failed': '❌',
                'warning': '⚠️'
            }
            return iconMap[status] || '❓'
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
        async loadInvoiceDetail() {
            this.loading = true
            
            try {
                const res = await invoiceApi.get(`/invoice/${this.invoiceId}`)
                this.invoice = res || {}
                
                this.invoiceItems = res.items || []
                this.verificationRecords = res.verification_records || []
                
            } catch (e) {
                console.log('加载发票详情失败:', e)
                this.invoice = this.getMockInvoice()
                this.invoiceItems = this.getMockInvoiceItems()
                this.verificationRecords = this.getMockVerificationRecords()
            } finally {
                this.loading = false
            }
        },
        getMockInvoice() {
            return {
                id: 1,
                invoice_type: 'vat_invoice',
                invoice_code: '1300221130',
                invoice_number: '12345678',
                invoice_date: '2024-01-15',
                check_code: '1234 5678 9012 3456',
                machine_number: '499123456789',
                
                seller_name: '北京某某科技有限公司',
                seller_tax_id: '91110100MA00ABCD12',
                seller_address: '北京市朝阳区某某路123号 010-12345678',
                seller_bank: '中国工商银行北京朝阳支行 0200000012345678',
                
                buyer_name: '某某(上海)贸易有限公司',
                buyer_tax_id: '91310100MA12ABCD34',
                buyer_address: '上海市浦东新区某某路456号 021-87654321',
                buyer_bank: '中国建设银行上海浦东支行 3100000087654321',
                
                total_amount: 1000.00,
                total_tax: 130.00,
                total_amount_with_tax: 1130.00,
                
                remarks: '技术服务费',
                payee: '张三',
                reviewer: '李四',
                drawer: '王五',
                seller_seal: true,
                
                is_verified: true,
                verification_status: 'passed',
                verification_message: '核验完成: 通过6/6项',
                verified_at: '2024-01-16 10:30:00',
                
                is_reimbursed: false,
                reimbursed_at: null,
                
                created_at: '2024-01-15 14:20:00'
            }
        },
        getMockInvoiceItems() {
            return [
                {
                    item_number: 1,
                    item_name: '技术服务费',
                    specification: '',
                    unit: '项',
                    quantity: 1,
                    unit_price: 1000.00,
                    amount: 1000.00,
                    tax_rate: '13%',
                    tax_amount: 130.00
                }
            ]
        },
        getMockVerificationRecords() {
            return [
                {
                    check_name: '发票代码格式校验',
                    check_type: 'format',
                    is_passed: true,
                    message: '发票代码格式正确'
                },
                {
                    check_name: '发票号码格式校验',
                    check_type: 'format',
                    is_passed: true,
                    message: '发票号码格式正确'
                },
                {
                    check_name: '开票日期有效性校验',
                    check_type: 'date',
                    is_passed: true,
                    message: '开票日期有效，未超过360天'
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
                    message: '检测到发票专用章，信息匹配'
                }
            ]
        },
        async doVerify() {
            if (!this.invoiceId) return
            
            uni.showLoading({ title: '核验中...' })
            
            try {
                const res = await invoiceApi.post(`/invoice/${this.invoiceId}/verify`)
                uni.hideLoading()
                
                this.invoice.is_verified = true
                this.invoice.verification_status = res.overall_status
                this.invoice.verification_message = res.message
                this.invoice.verified_at = new Date().toLocaleString()
                this.verificationRecords = res.checks || []
                
                uni.showToast({ title: res.message, icon: 'success' })
            } catch (e) {
                uni.hideLoading()
                uni.showToast({ title: '核验功能演示', icon: 'none' })
            }
        },
        exportInvoice() {
            uni.showToast({ title: '导出功能演示', icon: 'none' })
        },
        async deleteInvoice() {
            uni.showModal({
                title: '确认删除',
                content: '确定要删除这张发票吗？',
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            await invoiceApi.delete(`/invoice/${this.invoiceId}`)
                            uni.showToast({ title: '删除成功', icon: 'success' })
                            setTimeout(() => {
                                uni.navigateBack()
                            }, 1500)
                        } catch (e) {
                            uni.showToast({ title: '删除功能演示', icon: 'none' })
                            setTimeout(() => {
                                uni.navigateBack()
                            }, 1500)
                        }
                    }
                }
            })
        },
        goToVerify() {
            uni.navigateTo({
                url: `/pages/reimbursement/index?invoice_id=${this.invoiceId}`
            })
        }
    }
}
</script>

<style scoped>
.detail-page {
    min-height: 100vh;
    background-color: #F5F5F5;
    padding-bottom: 120rpx;
}

.loading-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80rpx;
}

.loading-text {
    font-size: 28rpx;
    color: #999999;
}

.content-section {
    padding: 20rpx 30rpx;
}

.status-bar {
    display: flex;
    justify-content: space-around;
    padding: 24rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
}

.status-item {
    display: flex;
    align-items: center;
    flex-direction: column;
}

.status-item.pending {
    opacity: 0.8;
}

.status-item.passed .status-icon {
    filter: none;
}

.status-item.failed .status-icon {
    filter: none;
}

.status-item.reimbursement.reimbursed {
    opacity: 1;
}

.status-icon {
    font-size: 48rpx;
    margin-bottom: 8rpx;
}

.status-text {
    font-size: 24rpx;
    color: #666666;
}

.invoice-type-badge {
    display: inline-block;
    padding: 12rpx 32rpx;
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    border-radius: 24rpx;
    margin-bottom: 20rpx;
}

.badge-text {
    font-size: 28rpx;
    color: #1565C0;
    font-weight: 500;
}

.info-card {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 30rpx;
    background: linear-gradient(135deg, #F5F7FA 0%, #ECEFF1 100%);
}

.card-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #333333;
}

.verify-btn {
    padding: 8rpx 24rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 20rpx;
}

.verify-btn .btn-text {
    font-size: 26rpx;
    color: #FFFFFF;
}

.card-content {
    padding: 20rpx 30rpx;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
    font-size: 28rpx;
    color: #666666;
    width: 180rpx;
    flex-shrink: 0;
}

.info-value {
    font-size: 28rpx;
    color: #333333;
    flex: 1;
    text-align: right;
    line-height: 1.5;
}

.amount-card {
    border-left: 8rpx solid #1E88E5;
}

.amount-row {
    display: flex;
    justify-content: space-around;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.amount-item {
    text-align: center;
}

.amount-label {
    display: block;
    font-size: 24rpx;
    color: #999999;
    margin-bottom: 8rpx;
}

.amount-value {
    display: block;
    font-size: 36rpx;
    font-weight: 500;
    color: #1E88E5;
}

.total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0 8rpx;
}

.total-label {
    font-size: 28rpx;
    color: #666666;
}

.total-value {
    font-size: 40rpx;
    font-weight: 600;
    color: #1565C0;
}

.table-wrapper {
    overflow-x: auto;
}

.table-header {
    display: flex;
    background-color: #F5F7FA;
    border-bottom: 1rpx solid #E0E0E0;
}

.table-body {
    display: flex;
    flex-direction: column;
}

.table-row {
    display: flex;
    border-bottom: 1rpx solid #F5F5F5;
}

.table-row:last-child {
    border-bottom: none;
}

.cell {
    padding: 16rpx 12rpx;
    font-size: 24rpx;
    text-align: center;
    flex-shrink: 0;
}

.cell.name {
    width: 240rpx;
    text-align: left;
}

.cell.spec {
    width: 120rpx;
}

.cell.qty {
    width: 80rpx;
}

.cell.price {
    width: 120rpx;
}

.cell.amount {
    width: 120rpx;
    font-weight: 500;
}

.table-header .cell {
    font-weight: 600;
    color: #666666;
}

.verification-summary {
    padding: 20rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
    margin-bottom: 20rpx;
}

.summary-text {
    font-size: 28rpx;
    color: #333333;
}

.verification-list {
    margin-top: 10rpx;
}

.verification-item {
    display: flex;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.verification-item:last-child {
    border-bottom: none;
}

.item-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.item-icon.passed {
    background-color: #E8F5E9;
}

.item-icon.failed {
    background-color: #FFEBEE;
}

.item-icon .icon {
    font-size: 28rpx;
    font-weight: bold;
}

.item-icon.passed .icon {
    color: #2E7D32;
}

.item-icon.failed .icon {
    color: #C62828;
}

.item-content {
    flex: 1;
}

.item-name {
    display: block;
    font-size: 28rpx;
    color: #333333;
    margin-bottom: 4rpx;
}

.item-message {
    display: block;
    font-size: 24rpx;
    color: #999999;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12rpx;
    margin: 0 8rpx;
    border-radius: 12rpx;
}

.bottom-actions .action-btn.primary {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.bottom-actions .btn-icon {
    font-size: 36rpx;
    margin-bottom: 4rpx;
}

.bottom-actions .btn-text {
    font-size: 22rpx;
    color: #666666;
}

.bottom-actions .action-btn.primary .btn-text {
    color: #FFFFFF;
}
</style>
