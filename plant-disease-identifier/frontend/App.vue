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
/* 全局样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background-color: #F8F8F8;
  font-size: 28rpx;
  color: #333333;
}

/* 通用容器 */
.container {
  padding: 30rpx;
}

/* 卡片样式 */
.card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* 按钮样式 */
.btn-primary {
  background-color: #2B9939;
  color: #FFFFFF;
  border-radius: 12rpx;
  padding: 24rpx 0;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
}

.btn-primary:active {
  background-color: #238030;
}

.btn-outline {
  background-color: #FFFFFF;
  color: #2B9939;
  border: 2rpx solid #2B9939;
  border-radius: 12rpx;
  padding: 22rpx 0;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
}

/* 标签样式 */
.tag {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  margin-right: 12rpx;
  margin-bottom: 12rpx;
}

.tag-success {
  background-color: #E8F5E9;
  color: #2B9939;
}

.tag-warning {
  background-color: #FFF3E0;
  color: #EF6C00;
}

.tag-danger {
  background-color: #FFEBEE;
  color: #C62828;
}

.tag-info {
  background-color: #E3F2FD;
  color: #1565C0;
}

/* 文本样式 */
.text-primary {
  color: #2B9939;
}

.text-danger {
  color: #C62828;
}

.text-success {
  color: #2B9939;
}

.text-warning {
  color: #EF6C00;
}

.text-secondary {
  color: #666666;
}

.text-muted {
  color: #999999;
}

/* 分隔线 */
.divider {
  height: 1rpx;
  background-color: #EEEEEE;
  margin: 20rpx 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-state-icon {
  font-size: 120rpx;
  color: #DDDDDD;
  margin-bottom: 20rpx;
}

.empty-state-text {
  color: #999999;
  font-size: 28rpx;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

/* 列表样式 */
.list-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid #F0F0F0;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item-content {
  flex: 1;
}

.list-item-arrow {
  color: #CCCCCC;
  font-size: 32rpx;
}
</style>
