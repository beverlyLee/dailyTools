<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <div class="row items-center">
        <h2 class="text-h4 q-mb-none flex">Assets</h2>
        <q-space />
        <q-btn
          color="primary"
          label="Add Asset"
          icon="add"
          to="/assets/new"
        />
      </div>

      <div class="row q-mt-md">
        <div class="col-12 col-md-4">
          <q-input
            v-model="searchQuery"
            label="Search assets..."
            outlined
            dense
            prefix="search"
          />
        </div>
        <div class="col-12 col-md-4">
          <q-select
            v-model="filterType"
            :options="filterOptions"
            label="Filter by type"
            outlined
            dense
            clearable
          />
        </div>
      </div>

      <div v-if="loading" class="row justify-center items-center q-py-lg">
        <q-spinner size="40px" color="primary" />
      </div>

      <div v-else-if="filteredAssets.length === 0" class="text-center q-py-xl">
        <q-icon name="folder" size="64px" color="grey-4" />
        <div class="text-h6 text-grey-6 q-mt-md">
          {{ assets.length === 0 ? 'No assets yet' : 'No assets match your filters' }}
        </div>
        <div v-if="assets.length === 0" class="text-caption text-grey-5 q-mt-sm">
          Create your first asset to start managing your digital legacy
        </div>
      </div>

      <div v-else class="row q-col-gutter-md q-row-gutter-md">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="col-12 col-sm-6 col-md-4 col-lg-3"
        >
          <q-card flat bordered class="full-height">
            <q-card-section>
              <div class="row items-start">
                <q-icon :name="getAssetIcon(asset.type)" color="primary" size="24px" />
                <div class="col q-ml-sm">
                  <div class="text-body1 font-medium">{{ asset.title }}</div>
                  <q-chip size="xs" color="grey-3" text-color="dark" class="q-mt-sm">
                    {{ getAssetTypeName(asset.type) }}
                  </q-chip>
                </div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="text-caption text-grey-6">
              Created: {{ formatDate(asset.createdAt) }}
            </q-card-section>
            <q-card-actions align="right">
              <q-btn
                flat
                label="View"
                color="primary"
                size="sm"
                :to="`/assets/${asset.id}`"
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'

const assets = ref([])
const loading = ref(false)
const searchQuery = ref('')
const filterType = ref(null)

const assetTypes = {
  'login': { name: 'Login Credentials', icon: 'lock' },
  'bank': { name: 'Bank Account', icon: 'account_balance' },
  'crypto': { name: 'Crypto Wallet', icon: 'monetization_on' },
  'private-key': { name: 'Private Key', icon: 'vpn_key' },
  'other': { name: 'Other', icon: 'folder' }
}

const filterOptions = computed(() => 
  Object.entries(assetTypes).map(([value, { name }]) => ({ label: name, value }))
)

const filteredAssets = computed(() => {
  let result = assets.value
  
  if (filterType.value) {
    result = result.filter(a => a.type === filterType.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.type.toLowerCase().includes(query)
    )
  }
  
  return result
})

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

async function loadAssets() {
  loading.value = true
  try {
    const response = await api.get('/assets')
    assets.value = response.data
  } catch (error) {
    console.error('Failed to load assets:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAssets()
})
</script>
