<template>
  <div class="setting-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="硬件设置" name="hardware">
          <el-form :model="hardwareForm" label-width="150px" style="max-width: 600px;">
            <el-divider content-position="left">扫码枪设置</el-divider>
            <el-form-item label="端口号">
              <el-select v-model="hardwareForm.scannerPort" placeholder="请选择端口">
                <el-option label="COM1" value="COM1" />
                <el-option label="COM2" value="COM2" />
                <el-option label="COM3" value="COM3" />
              </el-select>
            </el-form-item>
            <el-form-item label="波特率">
              <el-select v-model="hardwareForm.scannerBaudRate" placeholder="请选择波特率">
                <el-option label="9600" value="9600" />
                <el-option label="19200" value="19200" />
                <el-option label="38400" value="38400" />
                <el-option label="115200" value="115200" />
              </el-select>
            </el-form-item>
            
            <el-divider content-position="left">电子秤设置</el-divider>
            <el-form-item label="端口号">
              <el-select v-model="hardwareForm.scalePort" placeholder="请选择端口">
                <el-option label="COM1" value="COM1" />
                <el-option label="COM2" value="COM2" />
                <el-option label="COM3" value="COM3" />
              </el-select>
            </el-form-item>
            <el-form-item label="波特率">
              <el-select v-model="hardwareForm.scaleBaudRate" placeholder="请选择波特率">
                <el-option label="9600" value="9600" />
                <el-option label="19200" value="19200" />
                <el-option label="38400" value="38400" />
                <el-option label="115200" value="115200" />
              </el-select>
            </el-form-item>
            <el-form-item label="秤类型">
              <el-select v-model="hardwareForm.scaleType" placeholder="请选择秤类型">
                <el-option label="大华秤" value="dahua" />
                <el-option label="托利多秤" value="toledo" />
                <el-option label="寺冈秤" value="digi" />
              </el-select>
            </el-form-item>
            
            <el-divider content-position="left">钱箱设置</el-divider>
            <el-form-item label="连接方式">
              <el-radio-group v-model="hardwareForm.cashDrawerType">
                <el-radio value="printer">通过打印机</el-radio>
                <el-radio value="serial">串口连接</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="hardwareForm.cashDrawerType === 'serial'" label="端口号">
              <el-select v-model="hardwareForm.cashDrawerPort" placeholder="请选择端口">
                <el-option label="COM1" value="COM1" />
                <el-option label="COM2" value="COM2" />
                <el-option label="COM3" value="COM3" />
              </el-select>
            </el-form-item>
            
            <el-divider content-position="left">打印机设置</el-divider>
            <el-form-item label="打印机名称">
              <el-select v-model="hardwareForm.printerName" placeholder="请选择打印机">
                <el-option label="默认打印机" value="default" />
                <el-option label="POS-58" value="pos58" />
                <el-option label="POS-80" value="pos80" />
              </el-select>
            </el-form-item>
            <el-form-item label="打印纸宽度">
              <el-radio-group v-model="hardwareForm.paperWidth">
                <el-radio value="58">58mm</el-radio>
                <el-radio value="80">80mm</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveHardwareSetting">保存设置</el-button>
              <el-button @click="testConnection">测试连接</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="门店设置" name="store">
          <el-form :model="storeForm" label-width="150px" style="max-width: 600px;">
            <el-form-item label="门店名称">
              <el-input v-model="storeForm.name" placeholder="请输入门店名称" />
            </el-form-item>
            <el-form-item label="门店地址">
              <el-input v-model="storeForm.address" type="textarea" placeholder="请输入门店地址" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="storeForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="营业时间">
              <el-input v-model="storeForm.businessHours" placeholder="请输入营业时间" />
            </el-form-item>
            <el-form-item label="小票抬头">
              <el-input v-model="storeForm.receiptHeader" type="textarea" placeholder="请输入小票抬头" />
            </el-form-item>
            <el-form-item label="小票底部">
              <el-input v-model="storeForm.receiptFooter" type="textarea" placeholder="请输入小票底部信息" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveStoreSetting">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="支付设置" name="payment">
          <el-form :model="paymentForm" label-width="150px" style="max-width: 600px;">
            <el-divider content-position="left">微信支付</el-divider>
            <el-form-item label="AppID">
              <el-input v-model="paymentForm.wechatAppId" placeholder="请输入微信支付AppID" />
            </el-form-item>
            <el-form-item label="商户号">
              <el-input v-model="paymentForm.wechatMchId" placeholder="请输入微信支付商户号" />
            </el-form-item>
            <el-form-item label="API密钥">
              <el-input v-model="paymentForm.wechatApiKey" placeholder="请输入微信支付API密钥" show-password />
            </el-form-item>
            
            <el-divider content-position="left">支付宝</el-divider>
            <el-form-item label="AppID">
              <el-input v-model="paymentForm.alipayAppId" placeholder="请输入支付宝AppID" />
            </el-form-item>
            <el-form-item label="商户号">
              <el-input v-model="paymentForm.alipayMchId" placeholder="请输入支付宝商户号" />
            </el-form-item>
            <el-form-item label="应用私钥">
              <el-input v-model="paymentForm.alipayPrivateKey" type="textarea" placeholder="请输入支付宝应用私钥" show-password />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="savePaymentSetting">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="关于系统" name="about">
          <el-descriptions title="系统信息" border>
            <el-descriptions-item label="系统名称">新零售收银系统</el-descriptions-item>
            <el-descriptions-item label="版本号">1.0.0</el-descriptions-item>
            <el-descriptions-item label="发布日期">2026-05-01</el-descriptions-item>
            <el-descriptions-item label="开发商">
              <template #label>
                <span>开发商</span>
              </template>
              技术开发团队
            </el-descriptions-item>
            <el-descriptions-item label="技术支持">
              <template #label>
                <span>技术支持</span>
              </template>
              support@example.com
            </el-descriptions-item>
            <el-descriptions-item label="服务热线">
              <template #label>
                <span>服务热线</span>
              </template>
              400-123-4567
            </el-descriptions-item>
          </el-descriptions>
          
          <el-divider />
          
          <el-card>
            <template #header>
              <span>系统更新</span>
            </template>
            <div class="update-info">
              <p>当前版本：1.0.0</p>
              <p>最新版本：1.0.0</p>
              <el-button type="primary">检查更新</el-button>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('hardware')

const hardwareForm = ref({
  scannerPort: 'COM1',
  scannerBaudRate: '9600',
  scalePort: 'COM2',
  scaleBaudRate: '9600',
  scaleType: 'dahua',
  cashDrawerType: 'printer',
  cashDrawerPort: 'COM3',
  printerName: 'default',
  paperWidth: '58'
})

const storeForm = ref({
  name: '测试门店',
  address: '北京市朝阳区测试街道123号',
  phone: '010-12345678',
  businessHours: '08:00 - 22:00',
  receiptHeader: '欢迎光临测试门店\n品质保证 假一赔十',
  receiptFooter: '感谢您的惠顾，欢迎再次光临！\n客服热线：400-123-4567'
})

const paymentForm = ref({
  wechatAppId: '',
  wechatMchId: '',
  wechatApiKey: '',
  alipayAppId: '',
  alipayMchId: '',
  alipayPrivateKey: ''
})

const saveHardwareSetting = () => {
  ElMessage.success('硬件设置保存成功')
}

const testConnection = () => {
  ElMessage.info('正在测试硬件连接...')
  setTimeout(() => {
    ElMessage.success('硬件连接测试成功')
  }, 1500)
}

const saveStoreSetting = () => {
  ElMessage.success('门店设置保存成功')
}

const savePaymentSetting = () => {
  ElMessage.success('支付设置保存成功')
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.update-info p {
  margin: 0;
  color: #606266;
}
</style>
