<template>
  <div class="result-list bg-white rounded-xl shadow-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">
        查询结果
        <span class="text-sm font-normal text-gray-500 ml-2">共 {{ trains.length }} 个车次</span>
      </h2>
      <div class="text-sm text-gray-500">
        当前排序: <span class="text-blue-600 font-medium">{{ sortLabel }}</span>
      </div>
    </div>

    <div v-if="trains.length > 0" class="space-y-4">
      <div
        v-for="(train, index) in trains"
        :key="train.trainCode"
        class="train-card border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        :class="index === 0 ? 'bg-green-50 border-green-200' : ''"
        @click="showDetail(train)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6 flex-1">
            <div class="text-center min-w-[80px]">
              <div class="text-lg font-bold text-blue-600">{{ train.trainCode }}</div>
              <div class="text-xs text-gray-500">{{ getTrainTypeName(train.trainType) }}</div>
              <el-tag v-if="index === 0" type="success" size="small" class="mt-1">推荐</el-tag>
            </div>

            <div class="flex items-center gap-4 flex-1">
              <div class="text-center">
                <div class="text-xl font-bold">{{ train.departureTime }}</div>
                <div class="text-sm text-gray-500">{{ train.fromStationName || train.fromStation }}</div>
              </div>

              <div class="flex-1 px-4">
                <div class="flex items-center justify-center gap-2 text-gray-400">
                  <span class="text-sm">{{ train.durationDisplay }}</span>
                </div>
                <div class="h-1 bg-gray-200 rounded mt-2 relative">
                  <div class="absolute left-0 top-0 w-2 h-2 bg-gray-400 rounded-full -mt-0.5"></div>
                  <div class="absolute right-0 top-0 w-2 h-2 bg-gray-400 rounded-full -mt-0.5"></div>
                </div>
              </div>

              <div class="text-center">
                <div class="text-xl font-bold">{{ train.arrivalTime }}</div>
                <div class="text-sm text-gray-500">{{ train.toStationName || train.toStation }}</div>
              </div>
            </div>

            <div class="flex gap-4 flex-wrap">
              <div
                v-for="price in train.prices"
                :key="price.seatType"
                class="text-center min-w-[80px]"
              >
                <div class="text-lg font-bold text-orange-600">¥{{ price.price }}</div>
                <div class="text-xs text-gray-500">{{ price.seatName }}</div>
              </div>
            </div>
          </div>

          <div class="ml-4">
            <el-button type="primary" size="small">
              查看详情
              <el-icon class="ml-1"><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无数据" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTrainStore } from '@/stores/train'
import type { TrainDetail } from '@/types'
import { ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const store = useTrainStore()

const trains = computed(() => store.trains)

const sortLabel = computed(() => {
  const labels: Record<string, string> = {
    time: '时间优先',
    price: '价格优先',
    balanced: '综合平衡'
  }
  return labels[store.queryParams.sortBy] || '未知'
})

const trainTypeMap: Record<string, string> = {
  G: '高铁',
  D: '动车',
  C: '城际',
  Z: '直达',
  T: '特快',
  K: '快速'
}

function getTrainTypeName(type: string): string {
  return trainTypeMap[type] || type
}

function showDetail(train: TrainDetail) {
  ElMessage.info(`查看 ${train.trainCode} 详情功能开发中...`)
}
</script>

<style scoped>
.train-card:hover {
  transform: translateY(-2px);
}
</style>
