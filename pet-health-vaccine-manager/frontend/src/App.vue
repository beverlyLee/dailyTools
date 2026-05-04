<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
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
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.container {
  padding: 20rpx;
}

.card {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.btn-primary {
  background-color: #4A90D9;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  padding: 20rpx 32rpx;
  font-size: 28rpx;
  font-weight: 500;
  transition: background-color 0.3s;
}

.btn-primary:active {
  background-color: #357abd;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 8rpx;
  padding: 20rpx 32rpx;
  font-size: 28rpx;
  font-weight: 500;
  transition: background-color 0.3s;
}

.btn-secondary:active {
  background-color: #e0e0e0;
}

.text-center {
  text-align: center;
}

.mt-20 {
  margin-top: 20rpx;
}

.mb-20 {
  margin-bottom: 20rpx;
}

.flex {
  display: flex;
}

.flex-column {
  flex-direction: column;
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
</style>
