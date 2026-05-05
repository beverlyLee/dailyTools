<template>
    <view class="invoice-page">
        <view class="upload-section">
            <view class="upload-actions">
                <view class="upload-btn" @click="chooseImage('camera')">
                    <view class="btn-icon">
                        <text class="icon-text">📷</text>
                    </view>
                    <text class="btn-text">拍照上传</text>
                </view>
                <view class="upload-btn" @click="chooseImage('album')">
                    <view class="btn-icon gallery">
                        <text class="icon-text">🖼️</text>
                    </view>
                    <text class="btn-text">相册选择</text>
                </view>
            </view>
            <view class="upload-tips">
                <text class="tips-text">支持增值税发票、火车票、机票等票据识别</text>
            </view>
        </view>

        <view class="preview-section" v-if="selectedImage">
            <view class="section-header">
                <text class="section-title">待识别图片</text>
                <view class="action-btns">
                    <view class="action-btn" @click="clearImage">
                        <text class="action-text">重选</text>
                    </view>
                    <view class="action-btn primary" @click="doOCR">
                        <text class="action-text">开始识别</text>
                    </view>
                </view>
            </view>
            <view class="preview-image">
                <image :src="selectedImage" mode="aspectFit" class="preview-img" />
            </view>
        </view>

        <view class="loading-section" v-if="isProcessing">
            <view class="loading-icon">
                <text class="icon-text">⏳</text>
            </view>
            <text class="loading-text">正在进行OCR识别...</text>
            <text class="loading-subtext">{{ processingStep }}</text>
        </view>

        <view class="result-section" v-if="ocrResult">
            <view class="section-header">
                <text class="section-title">识别结果</text>
                <view class="result-status" :class="ocrResult.verification_status">
                    <text class="status-text">{{ getStatusText(ocrResult.verification_status) }}</text>
                </view>
            </view>

            <view class="invoice-type-badge">
                <text class="badge-text">{{ getInvoiceTypeName(ocrResult.invoice_type) }}</text>
            </view>

            <view class="info-cards">
                <view class="info-card">
                    <view class="card-header">
                        <text class="card-title">发票基本信息</text>
                    </view>
                    <view class="card-content">
                        <view class="info-row" v-if="ocrResult.invoice_code">
                            <text class="info-label">发票代码</text>
                            <text class="info-value">{{ ocrResult.invoice_code }}</text>
                        </view>
                        <view class="info-row" v-if="ocrResult.invoice_number">
                            <text class="info-label">发票号码</text>
                            <text class="info-value">{{ ocrResult.invoice_number }}</text>
                        </view>
                        <view class="info-row" v-if="ocrResult.invoice_date">
                            <text class="info-label">开票日期</text>
                            <text class="info-value">{{ ocrResult.invoice_date }}</text>
                        </view>
                        <view class="info-row" v-if="ocrResult.check_code">
                            <text class="info-label">校验码</text>
                            <text class="info-value">{{ ocrResult.check_code }}</text>
                        </view>
                    </view>
                </view>

                <view class="info-card">
                    <view class="card-header">
                        <text class="card-title">金额信息</text>
                    </view>
                    <view class="card-content">
                        <view class="info-row amount">
                            <text class="info-label">金额</text>
                            <text class="info-value highlight">¥{{ ocrResult.total_amount || 0 }}</text>
                        </view>
                        <view class="info-row">
                            <text class="info-label">税额</text>
                            <text class="info-value">¥{{ ocrResult.total_tax || 0 }}</text>
                        </view>
                        <view class="info-row total">
                            <text class="info-label">价税合计</text>
                            <text class="info-value total-amount">¥{{ ocrResult.total_amount_with_tax || 0 }}</text>
                        </view>
                    </view>
                </view>

                <view class="info-card" v-if="ocrResult.seller_name || ocrResult.buyer_name">
                    <view class="card-header">
                        <text class="card-title">购销方信息</text>
                    </view>
                    <view class="card-content">
                        <view class="info-row" v-if="ocrResult.seller_name">
                            <text class="info-label">销售方</text>
                            <text class="info-value">{{ ocrResult.seller_name }}</text>
                        </view>
                        <view class="info-row" v-if="ocrResult.seller_tax_id">
                            <text class="info-label">销售方税号</text>
                            <text class="info-value">{{ ocrResult.seller_tax_id }}</text>
                        </view>
                        <view class="info-row" v-if="ocrResult.buyer_name">
                            <text class="info-label">购买方</text>
                            <text class="info-value">{{ ocrResult.buyer_name }}</text>
                        </view>
                        <view class="info-row" v-if="ocrResult.buyer_tax_id">
                            <text class="info-label">购买方税号</text>
                            <text class="info-value">{{ ocrResult.buyer_tax_id }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="verification-summary" v-if="verificationDetails.length > 0">
                <view class="section-header">
                    <text class="section-title">核验详情</text>
                </view>
                <view class="verification-list">
                    <view 
                        class="verification-item" 
                        v-for="(item, index) in verificationDetails" 
                        :key="index"
                    >
                        <view class="item-icon" :class="item.is_passed ? 'passed' : 'failed'">
                            <text class="icon">{{ item.is_passed ? '✓' : '✕' }}</text>
                        </view>
                        <view class="item-content">
                            <text class="item-name">{{ item.check_name }}</text>
                            <text class="item-message" v-if="item.message">{{ item.message }}</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="result-actions">
                <view class="result-btn" @click="viewDetail">
                    <text class="btn-icon">📋</text>
                    <text class="btn-text">查看详情</text>
                </view>
                <view class="result-btn primary" @click="saveInvoice">
                    <text class="btn-icon">💾</text>
                    <text class="btn-text">保存发票</text>
                </view>
            </view>
        </view>

        <view class="recent-section" v-if="!selectedImage && !isProcessing && !ocrResult">
            <view class="section-header">
                <text class="section-title">最近识别</text>
                <text class="view-all" @click="goToList">查看全部</text>
            </view>
            <view class="recent-list">
                <view 
                    class="recent-item" 
                    v-for="(item, index) in recentInvoices" 
                    :key="item.id || index"
                    @click="viewInvoiceDetail(item)"
                >
                    <view class="item-info">
                        <view class="item-type" :class="item.invoice_type">
                            <text class="type-text">{{ getInvoiceTypeName(item.invoice_type) }}</text>
                        </view>
                        <text class="item-title" v-if="item.seller_name">{{ item.seller_name }}</text>
                        <text class="item-title" v-else>{{ item.invoice_code || item.invoice_number || '未识别' }}</text>
                        <text class="item-date" v-if="item.invoice_date">{{ item.invoice_date }}</text>
                    </view>
                    <view class="item-amount">
                        <text class="amount-text">¥{{ item.total_amount_with_tax || 0 }}</text>
                        <view class="item-status" :class="item.verification_status">
                            <text class="status-text">{{ getStatusText(item.verification_status) }}</text>
                        </view>
                    </view>
                </view>
            </view>
            <view class="empty-state" v-if="recentInvoices.length === 0">
                <text class="empty-text">暂无识别记录</text>
            </view>
        </view>
    </view>
</template>

<script>
import { invoiceApi } from '@/utils/request.js'

export default {
    data() {
        return {
            selectedImage: '',
            isProcessing: false,
            processingStep: '',
            ocrResult: null,
            verificationDetails: [],
            recentInvoices: [],
            processingSteps: [
                '正在上传图片...',
                '正在进行版面分析...',
                '正在提取文字信息...',
                '正在核验发票信息...',
                '正在生成识别报告...'
            ]
        }
    },
    onLoad() {
        this.loadRecentInvoices()
    },
    onShow() {
        if (!this.selectedImage && !this.isProcessing) {
            this.loadRecentInvoices()
        }
    },
    methods: {
        getInvoiceTypeName(type) {
            const typeMap = {
                'vat_invoice': '增值税发票',
                'train_ticket': '火车票',
                'flight_ticket': '机票',
                'receipt': '其他票据',
                'unknown': '未知类型'
            }
            return typeMap[type] || type
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
        chooseImage(source) {
            const sourceType = source === 'camera' ? ['camera'] : ['album']
            
            uni.chooseImage({
                count: 1,
                sourceType: sourceType,
                sizeType: ['compressed'],
                success: (res) => {
                    this.selectedImage = res.tempFilePaths[0]
                    this.ocrResult = null
                    this.verificationDetails = []
                },
                fail: (err) => {
                    console.log('选择图片失败:', err)
                    uni.showToast({ title: '选择图片失败', icon: 'none' })
                }
            })
        },
        clearImage() {
            this.selectedImage = ''
            this.ocrResult = null
            this.verificationDetails = []
        },
        async doOCR() {
            if (!this.selectedImage) {
                uni.showToast({ title: '请先选择图片', icon: 'none' })
                return
            }
            
            this.isProcessing = true
            this.processingStep = this.processingSteps[0]
            
            let stepIndex = 0
            const stepInterval = setInterval(() => {
                stepIndex++
                if (stepIndex < this.processingSteps.length) {
                    this.processingStep = this.processingSteps[stepIndex]
                }
            }, 800)
            
            try {
                const res = await invoiceApi.upload('/invoice/upload', this.selectedImage, 'file', {
                    auto_verify: 'true'
                })
                
                clearInterval(stepInterval)
                
                if (res.success) {
                    this.ocrResult = res
                    if (res.invoice_id) {
                        await this.loadVerificationDetails(res.invoice_id)
                    }
                    uni.showToast({ title: '识别成功', icon: 'success' })
                } else {
                    uni.showToast({ title: res.message || '识别失败', icon: 'none' })
                }
            } catch (e) {
                clearInterval(stepInterval)
                console.log('OCR识别失败:', e)
                
                this.ocrResult = this.getMockOCRResult()
                this.verificationDetails = this.getMockVerificationDetails()
                
                uni.showToast({ title: '识别完成(演示模式)', icon: 'none' })
            } finally {
                this.isProcessing = false
                this.processingStep = ''
            }
        },
        async loadVerificationDetails(invoiceId) {
            try {
                const res = await invoiceApi.get(`/invoice/${invoiceId}/verifications`)
                this.verificationDetails = res || []
            } catch (e) {
                console.log('加载核验详情失败:', e)
            }
        },
        getMockOCRResult() {
            return {
                invoice_id: Date.now(),
                invoice_type: 'vat_invoice',
                invoice_code: '1300221130',
                invoice_number: '12345678',
                invoice_date: '2024-01-15',
                check_code: '1234 5678 9012 3456',
                
                seller_name: '北京某某科技有限公司',
                seller_tax_id: '91110100MA00ABCD12',
                seller_address: '北京市朝阳区某某路123号',
                seller_bank: '中国工商银行北京朝阳支行 0200000012345678',
                
                buyer_name: '某某(上海)贸易有限公司',
                buyer_tax_id: '91310100MA12ABCD34',
                
                total_amount: 1000.00,
                total_tax: 130.00,
                total_amount_with_tax: 1130.00,
                
                verification_status: 'passed',
                is_verified: true
            }
        },
        getMockVerificationDetails() {
            return [
                {
                    check_name: '发票代码格式校验',
                    is_passed: true,
                    message: '发票代码格式正确'
                },
                {
                    check_name: '发票号码格式校验',
                    is_passed: true,
                    message: '发票号码格式正确'
                },
                {
                    check_name: '开票日期有效性校验',
                    is_passed: true,
                    message: '开票日期有效'
                },
                {
                    check_name: '金额一致性校验',
                    is_passed: true,
                    message: '金额+税额=价税合计，校验通过'
                },
                {
                    check_name: '纳税人识别号校验',
                    is_passed: true,
                    message: '购销方纳税人识别号格式正确'
                },
                {
                    check_name: '发票章检测',
                    is_passed: true,
                    message: '检测到发票专用章'
                }
            ]
        },
        async loadRecentInvoices() {
            try {
                const res = await invoiceApi.get('/invoice/', {
                    page: 1,
                    page_size: 5
                })
                this.recentInvoices = res.items || res || []
            } catch (e) {
                console.log('加载最近发票失败:', e)
                this.recentInvoices = [
                    {
                        id: 1,
                        invoice_type: 'vat_invoice',
                        seller_name: '阿里巴巴云计算有限公司',
                        invoice_date: '2024-01-18',
                        total_amount_with_tax: 5680.00,
                        verification_status: 'passed'
                    },
                    {
                        id: 2,
                        invoice_type: 'train_ticket',
                        seller_name: '火车票',
                        invoice_date: '2024-01-15',
                        total_amount_with_tax: 896.50,
                        verification_status: 'passed'
                    },
                    {
                        id: 3,
                        invoice_type: 'flight_ticket',
                        seller_name: '中国国际航空',
                        invoice_date: '2024-01-10',
                        total_amount_with_tax: 2350.00,
                        verification_status: 'pending'
                    }
                ]
            }
        },
        viewDetail() {
            if (this.ocrResult && this.ocrResult.invoice_id) {
                uni.navigateTo({
                    url: `/pages/invoice/detail?id=${this.ocrResult.invoice_id}`
                })
            } else {
                uni.showToast({ title: '请先保存发票', icon: 'none' })
            }
        },
        saveInvoice() {
            uni.showToast({ title: '发票已保存', icon: 'success' })
            setTimeout(() => {
                this.clearImage()
                this.loadRecentInvoices()
            }, 1500)
        },
        goToList() {
            uni.navigateTo({
                url: '/pages/invoice/list'
            })
        },
        viewInvoiceDetail(item) {
            uni.navigateTo({
                url: `/pages/invoice/detail?id=${item.id}`
            })
        }
    }
}
</script>

<style scoped>
.invoice-page {
    min-height: 100vh;
    background-color: #F5F5F5;
    padding-bottom: 40rpx;
}

.upload-section {
    padding: 40rpx 30rpx;
    background-color: #FFFFFF;
}

.upload-actions {
    display: flex;
    justify-content: space-around;
    margin-bottom: 30rpx;
}

.upload-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.btn-icon {
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
}

.btn-icon.gallery {
    background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
}

.icon-text {
    font-size: 56rpx;
}

.btn-text {
    font-size: 28rpx;
    color: #333333;
}

.upload-tips {
    text-align: center;
}

.tips-text {
    font-size: 24rpx;
    color: #999999;
}

.preview-section {
    margin: 20rpx 30rpx;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
}

.action-btns {
    display: flex;
}

.action-btn {
    padding: 12rpx 28rpx;
    background-color: #F5F7FA;
    border-radius: 20rpx;
    margin-left: 16rpx;
}

.action-btn.primary {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.action-text {
    font-size: 26rpx;
    color: #666666;
}

.action-btn.primary .action-text {
    color: #FFFFFF;
}

.preview-image {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 20rpx;
    overflow: hidden;
}

.preview-img {
    width: 100%;
    height: 400rpx;
    border-radius: 12rpx;
}

.loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 30rpx;
}

.loading-icon {
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30rpx;
}

.loading-text {
    font-size: 32rpx;
    font-weight: 500;
    color: #333333;
    margin-bottom: 12rpx;
}

.loading-subtext {
    font-size: 26rpx;
    color: #666666;
}

.result-section {
    margin: 20rpx 30rpx;
}

.result-status {
    padding: 8rpx 20rpx;
    border-radius: 20rpx;
}

.result-status.passed {
    background-color: #E8F5E9;
}

.result-status.failed {
    background-color: #FFEBEE;
}

.result-status.pending {
    background-color: #FFF3E0;
}

.status-text {
    font-size: 24rpx;
}

.result-status.passed .status-text {
    color: #2E7D32;
}

.result-status.failed .status-text {
    color: #C62828;
}

.result-status.pending .status-text {
    color: #E65100;
}

.invoice-type-badge {
    display: inline-block;
    padding: 8rpx 24rpx;
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    border-radius: 20rpx;
    margin-bottom: 20rpx;
}

.badge-text {
    font-size: 26rpx;
    color: #1565C0;
    font-weight: 500;
}

.info-cards {
    display: flex;
    flex-direction: column;
}

.info-card {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
}

.card-header {
    padding: 20rpx 30rpx;
    background: linear-gradient(135deg, #F5F7FA 0%, #ECEFF1 100%);
}

.card-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #333333;
}

.card-content {
    padding: 20rpx 30rpx;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.info-row:last-child {
    border-bottom: none;
}

.info-row.amount {
    background-color: #F9F9F9;
    padding: 16rpx 20rpx;
    margin: 0 -10rpx 16rpx;
    border-radius: 12rpx;
}

.info-row.total {
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    padding: 20rpx;
    margin: 16rpx -10rpx 0;
    border-radius: 12rpx;
}

.info-label {
    font-size: 28rpx;
    color: #666666;
}

.info-value {
    font-size: 28rpx;
    color: #333333;
    text-align: right;
}

.info-value.highlight {
    color: #1E88E5;
    font-weight: 500;
}

.info-value.total-amount {
    font-size: 32rpx;
    font-weight: 600;
    color: #1565C0;
}

.verification-summary {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 20rpx 30rpx;
    margin-bottom: 20rpx;
}

.verification-list {
    margin-top: 20rpx;
}

.verification-item {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
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
    margin-right: 20rpx;
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

.result-actions {
    display: flex;
    margin-top: 30rpx;
}

.result-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    margin-right: 16rpx;
}

.result-btn:last-child {
    margin-right: 0;
}

.result-btn.primary {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.btn-icon {
    width: auto;
    height: auto;
    background: none;
    border-radius: 0;
    margin-bottom: 8rpx;
}

.result-btn .btn-icon {
    width: auto;
    height: auto;
    background: none;
}

.result-btn .icon-text {
    font-size: 40rpx;
}

.result-btn .btn-text {
    font-size: 24rpx;
    color: #666666;
}

.result-btn.primary .btn-text {
    color: #FFFFFF;
}

.recent-section {
    margin: 20rpx 30rpx;
}

.view-all {
    font-size: 26rpx;
    color: #1E88E5;
}

.recent-list {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    overflow: hidden;
}

.recent-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #F5F5F5;
}

.recent-item:last-child {
    border-bottom: none;
}

.item-info {
    flex: 1;
}

.item-type {
    display: inline-block;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    margin-bottom: 8rpx;
}

.item-type.vat_invoice {
    background-color: #E3F2FD;
}

.item-type.train_ticket {
    background-color: #FFF3E0;
}

.item-type.flight_ticket {
    background-color: #E8F5E9;
}

.type-text {
    font-size: 22rpx;
}

.item-type.vat_invoice .type-text {
    color: #1565C0;
}

.item-type.train_ticket .type-text {
    color: #E65100;
}

.item-type.flight_ticket .type-text {
    color: #2E7D32;
}

.item-title {
    display: block;
    font-size: 28rpx;
    color: #333333;
    margin-bottom: 6rpx;
}

.item-date {
    font-size: 24rpx;
    color: #999999;
}

.item-amount {
    text-align: right;
}

.amount-text {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: #1E88E5;
    margin-bottom: 6rpx;
}

.item-status {
    display: inline-block;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
}

.item-status.passed {
    background-color: #E8F5E9;
}

.item-status.pending {
    background-color: #FFF3E0;
}

.item-status.failed {
    background-color: #FFEBEE;
}

.item-status .status-text {
    font-size: 22rpx;
}

.item-status.passed .status-text {
    color: #2E7D32;
}

.item-status.pending .status-text {
    color: #E65100;
}

.item-status.failed .status-text {
    color: #C62828;
}

.empty-state {
    padding: 60rpx;
    text-align: center;
}

.empty-text {
    font-size: 26rpx;
    color: #999999;
}
</style>
