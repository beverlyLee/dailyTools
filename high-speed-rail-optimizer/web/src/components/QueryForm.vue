<template>
  <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <h3 class="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
      <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      查询条件
    </h3>
    
    <el-form label-position="top" @submit.prevent class="space-y-4">
      <el-form-item label="出发站">
        <el-select v-model="form.from" placeholder="请选择出发站" clearable class="w-full" size="large">
          <el-option
            v-for="station in stationList"
            :key="station.code"
            :label="station.name"
            :value="station.code"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="到达站">
        <el-select v-model="form.to" placeholder="请选择到达站" clearable class="w-full" size="large">
          <el-option
            v-for="station in stationList"
            :key="station.code"
            :label="station.name"
            :value="station.code"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="出发日期">
        <el-date-picker
          v-model="form.date"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="w-full"
          size="large"
        />
      </el-form-item>

      <el-form-item label="车次类型">
        <el-checkbox-group v-model="form.trainTypes" class="flex flex-wrap gap-2">
          <el-checkbox label="G" border class="!mr-0">高铁</el-checkbox>
          <el-checkbox label="D" border class="!mr-0">动车</el-checkbox>
          <el-checkbox label="C" border class="!mr-0">城际</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="座位类型">
        <el-checkbox-group v-model="form.seatTypes" class="flex flex-wrap gap-2">
          <el-checkbox label="second" border class="!mr-0">二等座</el-checkbox>
          <el-checkbox label="first" border class="!mr-0">一等座</el-checkbox>
          <el-checkbox label="business" border class="!mr-0">商务座</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item class="mb-0">
        <el-button 
          type="primary" 
          size="large" 
          class="w-full" 
          @click="handleSearch" 
          :loading="loading"
        >
          <template v-if="!loading">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            查询车次
          </template>
          <template v-else>
            查询中...
          </template>
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTrainStore } from '@/stores/train'

const store = useTrainStore()

const form = ref({
  from: 'BJP',
  to: 'SHH',
  date: new Date().toISOString().split('T')[0],
  trainTypes: [] as string[],
  seatTypes: [] as string[]
})

const loading = computed(() => store.loading)
const stationList = computed(() => store.stationList)

function handleSearch() {
  store.setQueryParams({
    from: form.value.from,
    to: form.value.to,
    date: form.value.date,
    trainTypes: form.value.trainTypes,
    seatTypes: form.value.seatTypes
  })
  store.searchTrains(true)
}

onMounted(() => {
  form.value.from = store.queryParams.from
  form.value.to = store.queryParams.to
  form.value.date = store.queryParams.date
  form.value.trainTypes = store.queryParams.trainTypes || []
  form.value.seatTypes = store.queryParams.seatTypes || []
})
</script>
