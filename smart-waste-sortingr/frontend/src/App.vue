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
page {
  background-color: #F5F5F5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: #333333;
}

.container {
  padding: 30rpx;
}

.btn-primary {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: #FFFFFF;
  border-radius: 50rpx;
  padding: 24rpx 48rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-primary:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.text-primary {
  color: #4CAF50;
}

.text-secondary {
  color: #666666;
}

.text-muted {
  color: #999999;
}

.bg-recyclable {
  background-color: #2196F3;
}

.bg-kitchen {
  background-color: #4CAF50;
}

.bg-hazardous {
  background-color: #F44336;
}

.bg-other {
  background-color: #9E9E9E;
}

.color-recyclable {
  color: #2196F3;
}

.color-kitchen {
  color: #4CAF50;
}

.color-hazardous {
  color: #F44336;
}

.color-other {
  color: #9E9E9E;
}

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

.flex-1 {
  flex: 1;
}
</style>
