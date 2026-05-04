<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <h2 class="text-h4 q-mb-md">Dashboard</h2>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-4">
          <q-card flat bordered class="full-height">
            <q-card-section>
              <div class="text-caption text-grey-6">Total Assets</div>
              <div class="text-h3 text-primary q-mt-sm">{{ totalAssets }}</div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card flat bordered class="full-height">
            <q-card-section>
              <div class="text-caption text-grey-6">Dead Man's Switch</div>
              <div class="text-h3 q-mt-sm">
                <q-badge
                  :color="dmsEnabled ? 'positive' : 'grey'"
                  :label="dmsEnabled ? 'Enabled' : 'Disabled'"
                />
              </div>
              <div v-if="dmsConfig" class="text-caption text-grey-6 q-mt-sm">
                Last heartbeat: {{ formatDate(dmsConfig.lastHeartbeat) }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card flat bordered class="full-height">
            <q-card-section>
              <div class="text-caption text-grey-6">Encryption Status</div>
              <div class="text-h3 q-mt-sm">
                <q-badge color="positive" label="Active" />
              </div>
              <div class="text-caption text-grey-6 q-mt-sm">
                All data encrypted with XChaCha20-Poly1305
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <h3 class="text-h6 q-mb-md">Recent Assets</h3>
              <div v-if="recentAssets.length === 0" class="text-grey-6 text-center q-py-md">
                No assets yet. Create your first asset!
              </div>
              <q-list v-else dense>
                <q-item
                  v-for="asset in recentAssets"
                  :key="asset.id"
                  clickable
                  :to="`/assets/${asset.id}`"
                >
                  <q-item-section avatar>
                    <q-icon :name="getAssetIcon(asset.type)" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ asset.title }}</q-item-label>
                    <q-item-label caption>{{ getAssetTypeName(asset.type) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-item-label caption>{{ formatDate(asset.createdAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn
                flat
                label="View All Assets"
                color="primary"
                to="/assets"
              />
            </q-card-actions>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <h3 class="text-h6 q-mb-md">Quick Actions</h3>
              <div class="q-gutter-md">
                <q-btn
                  class="full-width"
                  color="primary"
                  label="Add New Asset"
                  icon="add"
                  to="/assets/new"
                />
                <q-btn
                  class="full-width"
                  :color="dmsEnabled ? 'warning' : 'secondary'"
                  :label="dmsEnabled ? 'Record Heartbeat' : 'Setup Dead Man\\'s Switch'"
                  :icon="dmsEnabled ? 'alarm' : 'alarm_add'"
                  to="/dead-mans-switch"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'boot/axios'

const totalAssets = ref(0)
const recentAssets = ref([])
const dmsConfig = ref(null)
const dmsEnabled = ref(false)

const assetTypes = {
  'login': { name: 'Login Credentials', icon: 'lock' },
  'bank': { name: 'Bank Account', icon: 'account_balance' },
  'crypto': { name: 'Crypto Wallet', icon: 'monetization_on' },
  'private-key': { name: 'Private Key', icon: 'vpn_key' },
  'other': { name: 'Other', icon: 'folder' }
}

function getAssetIcon(type) {
  return assetTypes[type]?.icon || 'folder'
}

function getAssetTypeName(type) {
  return assetTypes[type]?.name || 'Other'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

async function loadDashboardData() {
  try {
    const [assetsRes, dmsRes] = await Promise.all([
      api.get('/assets'),
      api.get('/dead-mans-switch')
    ])

    recentAssets.value = assetsRes.data.slice(0, 5)
    totalAssets.value = assetsRes.data.length
    dmsConfig.value = dmsRes.data
    dmsEnabled.value = dmsRes.data.isEnabled
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>
