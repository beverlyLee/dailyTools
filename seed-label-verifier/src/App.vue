<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { Scan, FileCheck, AlertTriangle, Ban } from 'lucide-vue-next';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const navItems = [
  { path: '/', name: '扫码核验', icon: Scan },
  { path: '/label-check', name: '标签审查', icon: FileCheck },
  { path: '/report', name: '举报取证', icon: AlertTriangle },
  { path: '/blacklist', name: '黑名单', icon: Ban }
];

const activePath = computed(() => route.path);

function navigate(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 pb-20">
    <div class="max-w-lg mx-auto bg-white min-h-screen shadow-xl relative">
      <header class="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 shadow-lg">
        <h1 class="text-xl font-bold text-center">🌱 种子标签合规验证</h1>
        <p class="text-green-100 text-center text-sm mt-1">守护农业生产安全</p>
      </header>

      <main class="p-4">
        <router-view />
      </main>

      <nav class="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 shadow-lg">
        <div class="flex justify-around items-center h-16">
          <button
            v-for="item in navItems"
            :key="item.path"
            @click="navigate(item.path)"
            class="flex flex-col items-center justify-center w-full h-full transition-all duration-200"
            :class="[
              activePath === item.path
                ? 'text-green-600 bg-green-50'
                : 'text-gray-500 hover:text-green-500 hover:bg-gray-50'
            ]"
          >
            <component
              :is="item.icon"
              class="w-5 h-5 mb-1 transition-transform duration-200"
              :class="{ 'scale-110': activePath === item.path }"
            />
            <span class="text-xs font-medium">{{ item.name }}</span>
          </button>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
button {
  touch-action: manipulation;
}
</style>
