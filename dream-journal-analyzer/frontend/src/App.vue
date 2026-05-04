<template>
  <div id="app">
    <router-view />
    <TabBar v-if="showTabBar" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import TabBar from '@/components/TabBar.vue';

const route = useRoute();

const showTabBar = computed(() => {
  return route.meta?.showTabBar ?? false;
});
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>
