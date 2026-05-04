<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          @click="leftDrawerOpen = !leftDrawerOpen"
          class="q-mr-sm"
        />
        <q-toolbar-title>
          <q-icon name="vpn_key" class="q-mr-sm" />
          Digital Legacy Manager
        </q-toolbar-title>
        <q-space />
        <q-btn
          flat
          round
          icon="logout"
          @click="handleLogout"
          title="Logout"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      content-class="bg-grey-1"
    >
      <q-list>
        <q-item-label
          header
          class="text-grey-8 text-caption uppercase"
        >
          Menu
        </q-item-label>

        <q-item
          clickable
          v-ripple
          :to="{ path: '/dashboard' }"
          :active="isActive('/dashboard')"
        >
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          :to="{ path: '/assets' }"
          :active="isActive('/assets')"
        >
          <q-item-section avatar>
            <q-icon name="folder" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Assets</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          :to="{ path: '/dead-mans-switch' }"
          :active="isActive('/dead-mans-switch')"
        >
          <q-item-section avatar>
            <q-icon name="alarm_add" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dead Man's Switch</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Dialog, Notify } from 'quasar'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const leftDrawerOpen = ref(true)

function isActive(path) {
  return route.path.startsWith(path)
}

function handleLogout() {
  Dialog.create({
    title: 'Confirm Logout',
    message: 'Are you sure you want to logout?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await authStore.logout()
    Notify.create({
      type: 'info',
      message: 'Logged out successfully'
    })
    router.push('/login')
  })
}
</script>
