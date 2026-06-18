<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/api/client';
import { Ban, Search, Bell, BellOff, RefreshCw, Building2, AlertTriangle, Phone, MapPin, FileCheck, ChevronDown, ChevronUp } from 'lucide-vue-next';
import type { BlacklistedCompany } from '../../shared/types';

interface AggregatedBlacklistEntry {
  manufacturerId: string;
  name: string;
  licenseNumber?: string;
  address?: string;
  contact?: string;
  violations: {
    id: string;
    reason: string;
    dateAdded: string;
    status: string;
  }[];
  latestDate: string;
  isActive: boolean;
}

const rawCompanies = ref<BlacklistedCompany[]>([]);
const searchKeyword = ref('');
const isLoading = ref(false);
const subscribedIds = ref<Set<string>>(new Set());
const emailInput = ref('');
const phoneInput = ref('');
const showSubscribeForm = ref(false);
const selectedCompanies = ref<string[]>([]);
const subscribeMessage = ref('');
const expandedManufacturers = ref<Set<string>>(new Set());

const aggregatedCompanies = computed<AggregatedBlacklistEntry[]>(() => {
  const grouped = new Map<string, AggregatedBlacklistEntry>();
  
  for (const company of rawCompanies.value) {
    const mfrId = company.manufacturerId;
    if (!grouped.has(mfrId)) {
      grouped.set(mfrId, {
        manufacturerId: mfrId,
        name: company.name,
        licenseNumber: company.licenseNumber,
        address: company.address,
        contact: company.contact,
        violations: [],
        latestDate: company.dateAdded,
        isActive: company.status === 'active'
      });
    }
    
    const entry = grouped.get(mfrId)!;
    entry.violations.push({
      id: company.id,
      reason: company.reason,
      dateAdded: company.dateAdded,
      status: company.status
    });
    
    if (new Date(company.dateAdded) > new Date(entry.latestDate)) {
      entry.latestDate = company.dateAdded;
    }
    if (company.status === 'active') {
      entry.isActive = true;
    }
  }
  
  return Array.from(grouped.values()).sort((a, b) => 
    new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );
});

const companies = computed(() => aggregatedCompanies.value);

onMounted(() => {
  loadBlacklist();
});

async function loadBlacklist() {
  isLoading.value = true;
  try {
    if (searchKeyword.value.trim()) {
      rawCompanies.value = await api.searchBlacklist(searchKeyword.value.trim());
    } else {
      rawCompanies.value = await api.getBlacklist();
    }
  } catch (e) {
    console.error('Load blacklist error:', e);
  } finally {
    isLoading.value = false;
  }
}

async function handleSearch() {
  await loadBlacklist();
}

function toggleSelect(manufacturerId: string) {
  const index = selectedCompanies.value.indexOf(manufacturerId);
  if (index > -1) {
    selectedCompanies.value.splice(index, 1);
  } else {
    selectedCompanies.value.push(manufacturerId);
  }
}

function toggleExpand(manufacturerId: string) {
  if (expandedManufacturers.value.has(manufacturerId)) {
    expandedManufacturers.value.delete(manufacturerId);
  } else {
    expandedManufacturers.value.add(manufacturerId);
  }
}

function isExpanded(manufacturerId: string): boolean {
  return expandedManufacturers.value.has(manufacturerId);
}

async function handleSubscribe() {
  if (selectedCompanies.value.length === 0) {
    subscribeMessage.value = '请先选择要订阅的企业';
    return;
  }

  if (!emailInput.value && !phoneInput.value) {
    subscribeMessage.value = '请提供邮箱或手机号';
    return;
  }

  try {
    const result = await api.subscribe({
      email: emailInput.value || undefined,
      phone: phoneInput.value || undefined,
      manufacturerIds: selectedCompanies.value
    });

    subscribeMessage.value = result.message;
    
    if (result.success) {
      selectedCompanies.value.forEach(id => subscribedIds.value.add(id));
      showSubscribeForm.value = false;
      selectedCompanies.value = [];
      emailInput.value = '';
      phoneInput.value = '';
    }
  } catch (e) {
    subscribeMessage.value = '订阅失败，请稍后重试';
  }

  setTimeout(() => {
    subscribeMessage.value = '';
  }, 3000);
}

function isSubscribed(manufacturerId: string): boolean {
  return subscribedIds.value.has(manufacturerId);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
</script>

<template>
  <div class="space-y-4">
    <div class="bg-gradient-to-r from-gray-700 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
      <h2 class="text-lg font-bold mb-2">🚫 不合格企业黑名单</h2>
      <p class="text-gray-300 text-sm">查询因生产假劣种子被列入黑名单的企业信息</p>
    </div>

    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索企业名称、原因、许可证号..."
            class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-500 focus:outline-none transition-colors"
            @keyup.enter="handleSearch"
          />
        </div>
        <button
          @click="handleSearch"
          :disabled="isLoading"
          class="px-6 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw v-if="isLoading" class="w-5 h-5 animate-spin" />
          <Search v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <div v-if="selectedCompanies.length > 0" class="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-800 font-medium">已选择 {{ selectedCompanies.length }} 家企业</p>
          <p class="text-blue-600 text-sm">点击下方按钮订阅企业更新通知</p>
        </div>
        <button
          @click="showSubscribeForm = !showSubscribeForm"
          class="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Bell class="w-5 h-5" />
          订阅通知
        </button>
      </div>
    </div>

    <div v-if="showSubscribeForm" class="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-4 animate-fadeIn">
      <h4 class="font-bold text-gray-800 flex items-center gap-2">
        <Bell class="w-5 h-5 text-blue-500" />
        订阅设置
      </h4>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">邮箱（选填）</label>
        <input
          v-model="emailInput"
          type="email"
          placeholder="请输入邮箱"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">手机号（选填）</label>
        <input
          v-model="phoneInput"
          type="tel"
          placeholder="请输入手机号"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>
      <p class="text-xs text-gray-500">我们将在企业信息更新时通过您提供的联系方式通知您。</p>
      <button
        @click="handleSubscribe"
        class="w-full bg-blue-500 text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-600 transition-colors"
      >
        确认订阅
      </button>
    </div>

    <div v-if="subscribeMessage" class="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
      {{ subscribeMessage }}
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <RefreshCw class="w-12 h-12 mx-auto animate-spin text-gray-400" />
      <p class="text-gray-500 mt-4">加载中...</p>
    </div>

    <div v-else-if="companies.length === 0" class="text-center py-12 bg-white rounded-2xl border border-gray-100">
      <Ban class="w-16 h-16 mx-auto text-gray-300" />
      <p class="text-gray-500 mt-4">未找到相关企业</p>
      <p class="text-gray-400 text-sm mt-1">请尝试其他搜索关键词</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="company in companies"
        :key="company.manufacturerId"
        class="bg-white rounded-2xl shadow-lg border-l-4 transition-all duration-200 hover:shadow-xl overflow-hidden"
        :class="[
          selectedCompanies.includes(company.manufacturerId)
            ? 'border-blue-500 bg-blue-50'
            : 'border-red-500 hover:bg-gray-50'
        ]"
      >
        <div class="p-5">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <Building2 class="w-5 h-5 text-red-500" />
                <h3 class="text-lg font-bold text-gray-800">{{ company.name }}</h3>
                <span
                  v-if="company.violations.length > 1"
                  class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full"
                >
                  {{ company.violations.length }} 次违规
                </span>
                <span
                  v-if="isSubscribed(company.manufacturerId)"
                  class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                >
                  已订阅
                </span>
              </div>

              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2 text-gray-600">
                  <FileCheck class="w-4 h-4 text-gray-400" />
                  <span>许可证号：{{ company.licenseNumber || '未公示' }}</span>
                </div>
                <div class="flex items-start gap-2 text-gray-600">
                  <MapPin class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>地址：{{ company.address || '未公示' }}</span>
                </div>
                <div class="flex items-center gap-2 text-gray-600">
                  <Phone class="w-4 h-4 text-gray-400" />
                  <span>联系方式：{{ company.contact || '未公示' }}</span>
                </div>

                <div class="text-red-600 bg-red-50 rounded-lg p-3 mt-3">
                  <div class="flex items-start gap-2">
                    <AlertTriangle class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-1">
                        <p class="font-medium">最新违规记录</p>
                        <span class="text-xs text-gray-500">{{ formatDate(company.violations[0].dateAdded) }}</span>
                      </div>
                      <p class="text-red-700">{{ company.violations[0].reason }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="company.violations.length > 1" class="mt-2">
                  <button
                    @click="toggleExpand(company.manufacturerId)"
                    class="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600"
                  >
                    <span>查看全部 {{ company.violations.length }} 条违规记录</span>
                    <ChevronDown v-if="!isExpanded(company.manufacturerId)" class="w-4 h-4" />
                    <ChevronUp v-else class="w-4 h-4" />
                  </button>

                  <transition name="expand">
                    <div v-if="isExpanded(company.manufacturerId)" class="mt-3 space-y-2 pl-2">
                      <div
                        v-for="(violation, index) in company.violations.slice(1)"
                        :key="violation.id"
                        class="bg-amber-50 rounded-lg p-3 border-l-2 border-amber-400"
                      >
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-xs font-medium text-amber-700">第 {{ company.violations.length - index }} 次违规</span>
                          <span class="text-xs text-gray-500">{{ formatDate(violation.dateAdded) }}</span>
                        </div>
                        <p class="text-sm text-amber-800">{{ violation.reason }}</p>
                      </div>
                    </div>
                  </transition>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span class="text-gray-500 text-xs">最近列入日期：{{ formatDate(company.latestDate) }}</span>
                  <span
                    class="text-xs px-2 py-1 rounded-full"
                    :class="company.isActive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'"
                  >
                    {{ company.isActive ? '黑名单中' : '已移除' }}
                  </span>
                </div>
              </div>
            </div>

            <button
              @click="toggleSelect(company.manufacturerId)"
              class="ml-4 p-2 rounded-lg transition-colors flex-shrink-0"
              :class="[
                selectedCompanies.includes(company.manufacturerId)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              ]"
            >
              <Bell v-if="selectedCompanies.includes(company.manufacturerId)" class="w-5 h-5" />
              <BellOff v-else class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-amber-800 font-medium text-sm">温馨提示</p>
          <p class="text-amber-700 text-xs mt-1">请谨慎购买黑名单企业生产的种子。如发现黑名单企业仍在销售假劣种子，请及时向当地农业农村主管部门举报。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to {
  opacity: 1;
  max-height: 500px;
}

.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
