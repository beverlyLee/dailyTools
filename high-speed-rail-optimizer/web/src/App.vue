<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">高铁票价优化器</h1>
              <p class="text-sm text-gray-500">智能查询，最优选择</p>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full" :class="dataSourceBadgeClass">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium">{{ currentDataSourceName }}</span>
            </div>
            
            <el-select v-model="selectedDataSource" size="default" class="w-40" @change="handleDataSourceChange" placeholder="选择数据源">
              <el-option label="混合模式" value="hybrid" />
              <el-option label="12306实时" value="real" />
              <el-option label="模拟数据" value="mock" />
            </el-select>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-4">
          <Suspense>
            <template #default>
              <QueryForm />
            </template>
            <template #fallback>
              <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div class="animate-pulse space-y-4">
                  <div class="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div class="h-12 bg-gray-200 rounded"></div>
                  <div class="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div class="h-12 bg-gray-200 rounded"></div>
                  <div class="h-12 bg-blue-200 rounded w-full mt-4"></div>
                </div>
              </div>
            </template>
          </Suspense>
        </div>

        <div class="lg:col-span-8">
          <div v-if="loading" class="bg-white rounded-xl shadow-sm p-12 border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
            <el-icon class="is-loading text-5xl text-blue-500 mb-4">
              <Loading />
            </el-icon>
            <p class="text-gray-600 font-medium">正在查询车次信息...</p>
            <p class="text-sm text-gray-400 mt-2">数据源：{{ currentDataSourceName }}</p>
          </div>

          <template v-else>
            <div v-if="trains.length > 0" class="space-y-6">
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <h3 class="text-lg font-semibold text-gray-900">查询结果</h3>
                    <el-tag type="info" size="small" class="ml-2">{{ trains.length }} 个车次</el-tag>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-gray-500">
                    <span>当前数据源：</span>
                    <span class="font-medium text-gray-700">{{ currentDataSourceName }}</span>
                  </div>
                </div>

                <div class="divide-y divide-gray-100">
                  <div v-for="train in trains" :key="train.trainCode" class="p-5 hover:bg-gray-50 transition-colors cursor-pointer" @click="showTrainDetail(train)">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center gap-8">
                        <div class="text-center">
                          <div class="text-2xl font-bold text-gray-900">{{ train.departureTime }}</div>
                          <div class="text-sm text-gray-500 mt-1">{{ train.fromStationName || train.fromStation }}</div>
                        </div>
                        
                        <div class="flex flex-col items-center">
                          <div class="text-xs text-gray-400 mb-1">{{ train.durationDisplay }}</div>
                          <div class="flex items-center">
                            <div class="w-20 h-0.5 bg-gray-300"></div>
                            <svg class="w-4 h-4 text-gray-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <div class="w-20 h-0.5 bg-gray-300"></div>
                          </div>
                          <el-tag size="small" type="primary" class="mt-2">{{ train.trainCode }}</el-tag>
                        </div>

                        <div class="text-center">
                          <div class="text-2xl font-bold text-gray-900">{{ train.arrivalTime }}</div>
                          <div class="text-sm text-gray-500 mt-1">{{ train.toStationName || train.toStation }}</div>
                        </div>
                      </div>

                      <div class="flex items-center gap-4">
                        <div class="text-right">
                          <div class="flex items-baseline gap-1">
                            <span class="text-2xl font-bold text-orange-600">¥{{ getLowestPrice(train) }}</span>
                            <span class="text-sm text-gray-500">起</span>
                          </div>
                          <div class="text-xs text-gray-400 mt-1">二等座</div>
                        </div>
                        <el-button type="primary" size="default">查看详情</el-button>
                      </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div class="flex items-center gap-6">
                        <div v-for="price in train.prices" :key="price.seatType" class="flex items-center gap-2">
                          <span class="text-sm text-gray-500">{{ price.seatName }}:</span>
                          <span class="text-sm font-semibold text-gray-700">¥{{ price.price }}</span>
                        </div>
                      </div>
                      <el-tag :type="getDataSourceTagType(train.dataSource)" size="small" effect="light">
                        {{ getDataSourceLabel(train.dataSource) }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>

              <Suspense>
                <template #default>
                  <PriceChart />
                </template>
                <template #fallback>
                  <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div class="animate-pulse space-y-4">
                      <div class="h-5 bg-gray-200 rounded w-1/4"></div>
                      <div class="h-[320px] bg-gray-100 rounded"></div>
                    </div>
                  </div>
                </template>
              </Suspense>
            </div>

            <div v-else class="bg-white rounded-xl shadow-sm p-12 border border-gray-100 flex flex-col items-center justify-center text-center min-h-[300px]">
              <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">暂无查询结果</h3>
              <p class="text-gray-600">请选择出发站、到达站和日期后进行查询</p>
            </div>
          </template>
        </div>
      </div>
    </main>

    <el-dialog v-model="detailDialogVisible" title="车次详情" width="600px">
      <div v-if="selectedTrain" class="space-y-6">
        <div class="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-900">{{ selectedTrain.departureTime }}</div>
            <div class="text-sm text-gray-600 mt-1">{{ selectedTrain.fromStationName || selectedTrain.fromStation }}</div>
          </div>
          <div class="flex flex-col items-center">
            <el-tag type="primary" size="large" class="mb-2">{{ selectedTrain.trainCode }}</el-tag>
            <div class="text-sm text-gray-600">{{ selectedTrain.durationDisplay }}</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-900">{{ selectedTrain.arrivalTime }}</div>
            <div class="text-sm text-gray-600 mt-1">{{ selectedTrain.toStationName || selectedTrain.toStation }}</div>
          </div>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            票价信息
          </h4>
          <div class="grid grid-cols-3 gap-4">
            <div v-for="price in selectedTrain.prices" :key="price.seatType" class="p-4 bg-gray-50 rounded-xl text-center hover:bg-gray-100 transition-colors">
              <div class="text-sm text-gray-600 mb-1">{{ price.seatName }}</div>
              <div class="text-xl font-bold text-gray-900">¥{{ price.price }}</div>
            </div>
          </div>
        </div>

        <div v-if="selectedTrain.stops && selectedTrain.stops.length > 0">
          <h4 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            经停站点（{{ selectedTrain.stops.length }}站）
          </h4>
          <div class="space-y-2">
            <div v-for="(stop, index) in selectedTrain.stops" :key="index" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {{ index + 1 }}
                </span>
                <span class="font-medium text-gray-900">{{ stop.stationName || stop.stationCode }}</span>
              </div>
              <div class="text-sm text-gray-600">
                <span v-if="stop.arrivalTime">{{ stop.arrivalTime }}</span>
                <span v-if="stop.arrivalTime && stop.departureTime"> / </span>
                <span v-if="stop.departureTime">{{ stop.departureTime }}</span>
                <span v-if="stop.stayMinutes && stop.stayMinutes > 0" class="ml-2 text-xs text-gray-400">(停留 {{ stop.stayMinutes }}分)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-gray-200">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">数据来源：</span>
            <el-tag :type="getDataSourceTagType(selectedTrain.dataSource)" size="small">
              {{ getDataSourceLabel(selectedTrain.dataSource) }}
            </el-tag>
          </div>
          <span class="text-sm text-gray-500">日期：{{ selectedTrain.date }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, computed, onMounted } from 'vue'
import { useTrainStore } from '@/stores/train'
import { Loading } from '@element-plus/icons-vue'
import type { Train } from '@/types'

const QueryForm = defineAsyncComponent(() => import('@/components/QueryForm.vue'))
const PriceChart = defineAsyncComponent(() => import('@/components/PriceChart.vue'))

const store = useTrainStore()
const detailDialogVisible = ref(false)
const selectedTrain = ref<Train | null>(null)
const selectedDataSource = ref('hybrid')

const trains = computed(() => store.trains)
const loading = computed(() => store.loading)
const currentDataSourceName = computed(() => store.currentDataSourceName)

const dataSourceBadgeClass = computed(() => {
  const ds = store.currentDataSource
  if (ds === 'real') {
    return 'bg-emerald-100 text-emerald-700'
  } else if (ds === 'mock') {
    return 'bg-amber-100 text-amber-700'
  } else {
    return 'bg-blue-100 text-blue-700'
  }
})

function handleDataSourceChange(value: string) {
  store.switchDataSource(value)
}

function getLowestPrice(train: Train): number {
  if (!train.prices || train.prices.length === 0) return 0
  return Math.min(...train.prices.map(p => p.price))
}

function getDataSourceLabel(dataSource?: string): string {
  return store.getDataSourceName(dataSource)
}

function getDataSourceTagType(dataSource?: string): 'success' | 'primary' | 'warning' | 'info' {
  const types: Record<string, 'success' | 'primary' | 'warning' | 'info'> = {
    'real': 'success',
    '12306': 'success',
    'mock': 'warning',
    'hybrid': 'primary'
  }
  return types[dataSource || 'hybrid'] || 'info'
}

function showTrainDetail(train: Train) {
  selectedTrain.value = train
  detailDialogVisible.value = true
}

onMounted(() => {
  selectedDataSource.value = store.queryParams.dataSource || 'hybrid'
})
</script>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
