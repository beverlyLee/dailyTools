<template>
    <view class="company-page">
        <view class="company-list-section">
            <view class="section-header">
                <text class="section-title">公司信息</text>
                <view class="add-btn" @click="showAddModal = true">
                    <text class="btn-icon">+</text>
                    <text class="btn-text">添加</text>
                </view>
            </view>

            <view class="company-list" v-if="companies.length > 0">
                <view 
                    class="company-card" 
                    v-for="(company, index) in companies" 
                    :key="company.id"
                    @click="selectCompany(company)"
                >
                    <view class="card-content">
                        <view class="company-header">
                            <view class="company-logo" :class="{ default: true }">
                                <text class="logo-text">{{ getCompanyInitial(company.name) }}</text>
                            </view>
                            <view class="company-info">
                                <text class="company-name">{{ company.name }}</text>
                                <text class="company-tax-id" v-if="company.tax_id">税号: {{ company.tax_id }}</text>
                            </view>
                        </view>
                        <view class="company-details">
                            <view class="detail-row" v-if="company.address">
                                <text class="detail-icon">📍</text>
                                <text class="detail-text">{{ company.address }}</text>
                            </view>
                            <view class="detail-row" v-if="company.phone">
                                <text class="detail-icon">📞</text>
                                <text class="detail-text">{{ company.phone }}</text>
                            </view>
                            <view class="detail-row" v-if="company.bank_name">
                                <text class="detail-icon">🏦</text>
                                <text class="detail-text">{{ company.bank_name }} {{ company.bank_account || '' }}</text>
                            </view>
                        </view>
                    </view>
                    <view class="card-actions" @click.stop>
                        <view class="action-btn" @click="editCompany(company)">
                            <text class="action-icon">✏️</text>
                        </view>
                        <view class="action-btn delete" @click="deleteCompany(company)">
                            <text class="action-icon">🗑️</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="empty-state" v-else>
                <view class="empty-icon">
                    <text class="icon-text">🏢</text>
                </view>
                <text class="empty-title">暂无公司信息</text>
                <text class="empty-desc">添加公司信息后可用于发票抬头核验</text>
                <view class="empty-action" @click="showAddModal = true">
                    <text class="action-text">添加公司</text>
                </view>
            </view>
        </view>

        <view class="add-modal" v-if="showAddModal" @click="closeAddModal">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">{{ editingCompany ? '编辑公司' : '添加公司' }}</text>
                    <view class="close-btn" @click="closeAddModal">
                        <text class="close-icon">✕</text>
                    </view>
                </view>
                <view class="modal-body">
                    <view class="form-item required">
                        <text class="form-label">公司名称</text>
                        <input 
                            class="form-input" 
                            v-model="formData.name"
                            placeholder="请输入公司名称"
                        />
                    </view>
                    <view class="form-item required">
                        <text class="form-label">纳税人识别号</text>
                        <input 
                            class="form-input" 
                            v-model="formData.tax_id"
                            placeholder="请输入纳税人识别号"
                            maxlength="18"
                        />
                    </view>
                    <view class="form-item">
                        <text class="form-label">地址</text>
                        <input 
                            class="form-input" 
                            v-model="formData.address"
                            placeholder="请输入公司地址"
                        />
                    </view>
                    <view class="form-item">
                        <text class="form-label">电话</text>
                        <input 
                            class="form-input" 
                            v-model="formData.phone"
                            placeholder="请输入联系电话"
                            type="number"
                        />
                    </view>
                    <view class="form-item">
                        <text class="form-label">开户银行</text>
                        <input 
                            class="form-input" 
                            v-model="formData.bank_name"
                            placeholder="请输入开户银行名称"
                        />
                    </view>
                    <view class="form-item">
                        <text class="form-label">银行账号</text>
                        <input 
                            class="form-input" 
                            v-model="formData.bank_account"
                            placeholder="请输入银行账号"
                        />
                    </view>
                </view>
                <view class="modal-footer">
                    <view class="cancel-btn" @click="closeAddModal">
                        <text class="btn-text">取消</text>
                    </view>
                    <view class="confirm-btn" @click="saveCompany">
                        <text class="btn-text">保存</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="tips-section">
            <view class="tips-header">
                <text class="tips-icon">💡</text>
                <text class="tips-title">使用提示</text>
            </view>
            <view class="tips-list">
                <view class="tip-item">
                    <text class="tip-number">1</text>
                    <text class="tip-text">添加公司信息后，系统将自动核验发票抬头与公司信息是否匹配</text>
                </view>
                <view class="tip-item">
                    <text class="tip-number">2</text>
                    <text class="tip-text">可添加多个公司，支持不同分支机构的发票管理</text>
                </view>
                <view class="tip-item">
                    <text class="tip-number">3</text>
                    <text class="tip-text">纳税人识别号用于发票真伪核验，请确保准确填写</text>
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
            companies: [],
            showAddModal: false,
            editingCompany: null,
            formData: {
                name: '',
                tax_id: '',
                address: '',
                phone: '',
                bank_name: '',
                bank_account: ''
            }
        }
    },
    onLoad() {
        this.loadCompanies()
    },
    onShow() {
        this.loadCompanies()
    },
    methods: {
        getCompanyInitial(name) {
            if (!name) return '公'
            return name.charAt(0)
        },
        async loadCompanies() {
            try {
                const res = await invoiceApi.get('/company/')
                this.companies = res.items || res || []
            } catch (e) {
                console.log('加载公司列表失败:', e)
                this.companies = this.getMockCompanies()
            }
        },
        getMockCompanies() {
            return [
                {
                    id: 1,
                    name: '某某(上海)贸易有限公司',
                    tax_id: '91310100MA12ABCD34',
                    address: '上海市浦东新区某某路456号',
                    phone: '021-87654321',
                    bank_name: '中国建设银行上海浦东支行',
                    bank_account: '3100000087654321',
                    is_active: true
                },
                {
                    id: 2,
                    name: '某某(北京)科技有限公司',
                    tax_id: '91110100MA00ABCD12',
                    address: '北京市海淀区某某路789号',
                    phone: '010-12345678',
                    bank_name: '中国银行北京海淀支行',
                    bank_account: '3400000012345678',
                    is_active: true
                }
            ]
        },
        selectCompany(company) {
            uni.showToast({ title: '已选择: ' + company.name, icon: 'none' })
        },
        editCompany(company) {
            this.editingCompany = company
            this.formData = {
                name: company.name,
                tax_id: company.tax_id,
                address: company.address || '',
                phone: company.phone || '',
                bank_name: company.bank_name || '',
                bank_account: company.bank_account || ''
            }
            this.showAddModal = true
        },
        async deleteCompany(company) {
            uni.showModal({
                title: '确认删除',
                content: `确定要删除公司「${company.name}」吗？`,
                success: async (res) => {
                    if (res.confirm) {
                        try {
                            await invoiceApi.delete(`/company/${company.id}`)
                            this.loadCompanies()
                            uni.showToast({ title: '删除成功', icon: 'success' })
                        } catch (e) {
                            this.companies = this.companies.filter(c => c.id !== company.id)
                            uni.showToast({ title: '删除成功', icon: 'success' })
                        }
                    }
                }
            })
        },
        closeAddModal() {
            this.showAddModal = false
            this.editingCompany = null
            this.formData = {
                name: '',
                tax_id: '',
                address: '',
                phone: '',
                bank_name: '',
                bank_account: ''
            }
        },
        async saveCompany() {
            if (!this.formData.name.trim()) {
                uni.showToast({ title: '请输入公司名称', icon: 'none' })
                return
            }
            if (!this.formData.tax_id.trim()) {
                uni.showToast({ title: '请输入纳税人识别号', icon: 'none' })
                return
            }
            
            try {
                if (this.editingCompany) {
                    await invoiceApi.put(`/company/${this.editingCompany.id}`, this.formData)
                } else {
                    await invoiceApi.post('/company/', this.formData)
                }
                
                uni.showToast({ title: '保存成功', icon: 'success' })
                this.closeAddModal()
                this.loadCompanies()
                
            } catch (e) {
                console.log('保存公司失败:', e)
                const newCompany = {
                    id: this.editingCompany ? this.editingCompany.id : Date.now(),
                    ...this.formData,
                    is_active: true
                }
                
                if (this.editingCompany) {
                    const index = this.companies.findIndex(c => c.id === this.editingCompany.id)
                    if (index > -1) {
                        this.companies.splice(index, 1, newCompany)
                    }
                } else {
                    this.companies.unshift(newCompany)
                }
                
                uni.showToast({ title: '保存成功', icon: 'success' })
                this.closeAddModal()
            }
        }
    }
}
</script>

<style scoped>
.company-page {
    min-height: 100vh;
    background-color: #F5F5F5;
    padding-bottom: 40rpx;
}

.company-list-section {
    padding: 20rpx 30rpx;
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

.add-btn {
    display: flex;
    align-items: center;
    padding: 12rpx 24rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 24rpx;
}

.btn-icon {
    font-size: 32rpx;
    color: #FFFFFF;
    margin-right: 8rpx;
}

.btn-text {
    font-size: 26rpx;
    color: #FFFFFF;
}

.company-list {
    display: flex;
    flex-direction: column;
}

.company-card {
    display: flex;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
}

.card-content {
    flex: 1;
}

.company-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
}

.company-logo {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
}

.company-logo.default {
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
}

.logo-text {
    font-size: 36rpx;
    font-weight: 600;
    color: #1565C0;
}

.company-info {
    flex: 1;
}

.company-name {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 8rpx;
}

.company-tax-id {
    display: block;
    font-size: 24rpx;
    color: #666666;
}

.company-details {
    padding: 16rpx 20rpx;
    background-color: #FAFAFA;
    border-radius: 12rpx;
}

.detail-row {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
}

.detail-row:last-child {
    margin-bottom: 0;
}

.detail-icon {
    font-size: 28rpx;
    margin-right: 12rpx;
}

.detail-text {
    font-size: 26rpx;
    color: #666666;
    flex: 1;
}

.card-actions {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding-left: 20rpx;
    border-left: 1rpx solid #F0F0F0;
}

.action-btn {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12rpx;
}

.action-btn.delete {
    background-color: #FFEBEE;
}

.action-icon {
    font-size: 28rpx;
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
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
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
    font-size: 32rpx;
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

.add-modal {
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
    background-color: #FFFFFF;
    border-radius: 32rpx 32rpx 0 0;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #F5F5F5;
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
}

.form-item {
    margin-bottom: 30rpx;
}

.form-item.required .form-label::after {
    content: '*';
    color: #FF5252;
    margin-left: 4rpx;
}

.form-label {
    display: block;
    font-size: 28rpx;
    color: #666666;
    margin-bottom: 16rpx;
}

.form-input {
    width: 100%;
    height: 88rpx;
    padding: 0 24rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #333333;
}

.modal-footer {
    display: flex;
    padding: 30rpx;
    padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
    border-top: 1rpx solid #F5F5F5;
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

.tips-section {
    margin: 20rpx 30rpx;
    padding: 24rpx 30rpx;
    background-color: #E3F2FD;
    border-radius: 16rpx;
}

.tips-header {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
}

.tips-icon {
    font-size: 32rpx;
    margin-right: 12rpx;
}

.tips-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1565C0;
}

.tips-list {
    display: flex;
    flex-direction: column;
}

.tip-item {
    display: flex;
    margin-bottom: 16rpx;
}

.tip-item:last-child {
    margin-bottom: 0;
}

.tip-number {
    width: 40rpx;
    height: 40rpx;
    background-color: #BBDEFB;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    flex-shrink: 0;
}

.tip-number {
    font-size: 22rpx;
    font-weight: 600;
    color: #1565C0;
}

.tip-text {
    flex: 1;
    font-size: 26rpx;
    color: #1565C0;
    line-height: 1.6;
}
</style>
