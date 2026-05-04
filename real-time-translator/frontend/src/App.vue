<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { ref } from 'vue'

const appName = ref('实时翻译助手')

onLaunch(() => {
    console.log('App Launch')
    uni.getSystemInfo({
        success: (res) => {
            console.log('设备信息:', res)
        }
    })
})

onShow(() => {
    console.log('App Show')
})

onHide(() => {
    console.log('App Hide')
})
</script>

<style>
/*每个页面公共css */
page {
    background-color: #F5F5F5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 28rpx;
    color: #333333;
}

/* 容器样式 */
.container {
    padding: 20rpx;
    min-height: 100vh;
}

/* 卡片样式 */
.card {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* 按钮样式 */
.btn-primary {
    background-color: #409EFF;
    color: #FFFFFF;
    border-radius: 8rpx;
    padding: 20rpx 40rpx;
    text-align: center;
    font-size: 30rpx;
}

.btn-primary:active {
    background-color: #3A8EE6;
}

.btn-secondary {
    background-color: #E6E6E6;
    color: #333333;
    border-radius: 8rpx;
    padding: 20rpx 40rpx;
    text-align: center;
    font-size: 30rpx;
}

/* 文本样式 */
.text-primary {
    color: #409EFF;
}

.text-secondary {
    color: #909399;
}

.text-success {
    color: #67C23A;
}

.text-warning {
    color: #E6A23C;
}

.text-danger {
    color: #F56C6C;
}

/* 布局工具 */
.flex {
    display: flex;
}

.flex-column {
    flex-direction: column;
}

.flex-center {
    justify-content: center;
    align-items: center;
}

.flex-between {
    justify-content: space-between;
}

.flex-around {
    justify-content: space-around;
}

.flex-1 {
    flex: 1;
}

.text-center {
    text-align: center;
}

.text-left {
    text-align: left;
}

.text-right {
    text-align: right;
}

/* 间距 */
.mt-10 { margin-top: 10rpx; }
.mt-20 { margin-top: 20rpx; }
.mt-30 { margin-top: 30rpx; }
.mb-10 { margin-bottom: 10rpx; }
.mb-20 { margin-bottom: 20rpx; }
.mb-30 { margin-bottom: 30rpx; }
.ml-10 { margin-left: 10rpx; }
.ml-20 { margin-left: 20rpx; }
.mr-10 { margin-right: 10rpx; }
.mr-20 { margin-right: 20rpx; }
.p-10 { padding: 10rpx; }
.p-20 { padding: 20rpx; }
.p-30 { padding: 30rpx; }
</style>
