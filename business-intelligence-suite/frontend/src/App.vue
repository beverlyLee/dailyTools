<script>
export default {
    onLaunch: function() {
        console.log('App Launch')
    },
    onShow: function() {
        console.log('App Show')
    },
    onHide: function() {
        console.log('App Hide')
    }
}
</script>

<style>
/* 每个页面公共css */
page {
    background-color: #F5F5F5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 28rpx;
    color: #333333;
}

/* 通用工具类 */
.flex {
    display: flex;
}

.flex-col {
    flex-direction: column;
}

.flex-row {
    flex-direction: row;
}

.justify-between {
    justify-content: space-between;
}

.justify-center {
    justify-content: center;
}

.align-center {
    align-items: center;
}

.flex-1 {
    flex: 1;
}

.p-20 {
    padding: 20rpx;
}

.p-30 {
    padding: 30rpx;
}

.mt-20 {
    margin-top: 20rpx;
}

.mt-30 {
    margin-top: 30rpx;
}

.mb-20 {
    margin-bottom: 20rpx;
}

.text-center {
    text-align: center;
}

.text-primary {
    color: #1E88E5;
}

.text-success {
    color: #4CAF50;
}

.text-warning {
    color: #FF9800;
}

.text-danger {
    color: #F44336;
}

.text-muted {
    color: #999999;
}

.bg-white {
    background-color: #FFFFFF;
}

.border-radius {
    border-radius: 16rpx;
}

.shadow {
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
}

.btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88rpx;
    border-radius: 44rpx;
    font-size: 32rpx;
    font-weight: 500;
}

.btn-primary {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    color: #FFFFFF;
}

.btn-success {
    background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
    color: #FFFFFF;
}

.btn-danger {
    background: linear-gradient(135deg, #F44336 0%, #C62828 100%);
    color: #FFFFFF;
}

.btn-outline {
    border: 2rpx solid #1E88E5;
    color: #1E88E5;
    background-color: transparent;
}

.btn-block {
    width: 100%;
}

.btn-small {
    height: 64rpx;
    font-size: 28rpx;
    border-radius: 32rpx;
}

.card {
    background-color: #FFFFFF;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #EEEEEE;
    margin-bottom: 20rpx;
}

.card-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
}

.card-content {
    font-size: 28rpx;
    color: #666666;
}

.divider {
    height: 1rpx;
    background-color: #EEEEEE;
    margin: 20rpx 0;
}

.tag {
    display: inline-flex;
    align-items: center;
    padding: 4rpx 16rpx;
    border-radius: 8rpx;
    font-size: 24rpx;
}

.tag-primary {
    background-color: #E3F2FD;
    color: #1565C0;
}

.tag-success {
    background-color: #E8F5E9;
    color: #2E7D32;
}

.tag-warning {
    background-color: #FFF3E0;
    color: #E65100;
}

.tag-danger {
    background-color: #FFEBEE;
    color: #C62828;
}

.tag-muted {
    background-color: #F5F5F5;
    color: #757575;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100rpx 0;
}

.empty-icon {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 30rpx;
    opacity: 0.5;
}

.empty-text {
    font-size: 28rpx;
    color: #999999;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40rpx 0;
}

.loading-text {
    font-size: 28rpx;
    color: #999999;
    margin-left: 16rpx;
}
</style>
