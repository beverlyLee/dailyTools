<template>
  <div class="tab-bar">
    <div 
      v-for="item in tabList" 
      :key="item.path"
      :class="['tab-bar-item', { active: isActive(item.path) }]"
      @click="navigateTo(item.path)"
    >
      <span class="tab-bar-icon">{{ item.icon }}</span>
      <span class="tab-bar-text">{{ item.text }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const tabList = [
  {
    path: '/home',
    text: '首页',
    icon: '🏠'
  },
  {
    path: '/add',
    text: '记录',
    icon: '✏️'
  },
  {
    path: '/analysis',
    text: '分析',
    icon: '📊'
  }
];

const isActive = (path) => {
  return route.path === path;
};

const navigateTo = (path) => {
  if (route.path !== path) {
    router.push(path);
  }
};
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 56px;
  background-color: #fff;
  border-top: 1px solid #eee;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 1000;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
}

.tab-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tab-bar-item:active {
  transform: scale(0.95);
}

.tab-bar-icon {
  font-size: 22px;
  margin-bottom: 2px;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.tab-bar-text {
  font-size: 12px;
  color: #999;
  transition: all 0.2s ease;
}

.tab-bar-item.active .tab-bar-icon {
  opacity: 1;
  transform: scale(1.1);
}

.tab-bar-item.active .tab-bar-text {
  color: #667eea;
  font-weight: 500;
}
</style>
