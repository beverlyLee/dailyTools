<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <div class="row items-center">
        <q-btn
          flat
          icon="arrow_back"
          label="Back"
          to="/assets"
          class="q-mr-md"
        />
        <h2 class="text-h4 q-mb-none">{{ asset?.title || 'Asset' }}</h2>
        <q-space />
        <div class="q-gutter-sm">
          <q-btn
            flat
            label="Edit"
            icon="edit"
            color="primary"
            :to="`/assets/${assetId.value}/edit`"
          />
          <q-btn
            flat
            label="Delete"
            icon="delete"
            color="negative"
            @click="confirmDelete"
          />
        </div>
      </div>

      <div v-if="loading" class="row justify-center items-center q-py-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <div v-else-if="asset" class="row q-col-gutter-md">
        <div class="col-12 col-md-8">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-caption text-grey-6 q-mb-sm">
                <q-chip :color="getAssetTypeColor(asset.type)" text-color="white" size="sm">
                  {{ getAssetTypeName(asset.type) }}
                </q-chip>
              </div>
              <h3 class="text-h5">{{ asset.title }}</h3>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <div v-if="asset.type === 'login'" class="q-gutter-md">
                <q-field label="Username" borderless>
                  <template v-slot:default>
                    <div class="flex items-center">
                      <span class="q-mr-sm">{{ asset.data.username || 'N/A' }}</span>
                      <q-btn
                        flat
                        dense
                        round
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.username)"
                        title="Copy"
                      />
                    </div>
                  </template>
                </q-field>
                <q-field label="Password" borderless>
                  <template v-slot:default>
                    <div class="flex items-center">
                      <q-password
                        v-model="asset.data.password"
                        readonly
                        input-class="no-border"
                      />
                      <q-btn
                        flat
                        dense
                        round
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.password)"
                        title="Copy"
                        class="q-ml-sm"
                      />
                    </div>
                  </template>
                </q-field>
                <q-field label="Website URL" borderless>
                  <template v-slot:default>
                    <a :href="asset.data.url" target="_blank" v-if="asset.data.url">
                      {{ asset.data.url }}
                    </a>
                    <span v-else class="text-grey-5">N/A</span>
                  </template>
                </q-field>
              </div>

              <div v-if="asset.type === 'bank'" class="q-gutter-md">
                <q-field label="Bank Name" borderless>
                  <template v-slot:default>{{ asset.data.bankName || 'N/A' }}</template>
                </q-field>
                <q-field label="Account Number" borderless>
                  <template v-slot:default>
                    <div class="flex items-center">
                      <span class="q-mr-sm">{{ asset.data.accountNumber || 'N/A' }}</span>
                      <q-btn
                        flat
                        dense
                        round
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.accountNumber)"
                        title="Copy"
                      />
                    </div>
                  </template>
                </q-field>
                <q-field label="Routing Number" borderless>
                  <template v-slot:default>
                    <div class="flex items-center">
                      <span class="q-mr-sm">{{ asset.data.routingNumber || 'N/A' }}</span>
                      <q-btn
                        flat
                        dense
                        round
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.routingNumber)"
                        title="Copy"
                      />
                    </div>
                  </template>
                </q-field>
                <q-field label="PIN / Password" borderless>
                  <template v-slot:default>
                    <div class="flex items-center">
                      <q-password
                        v-model="asset.data.pin"
                        readonly
                        input-class="no-border"
                      />
                      <q-btn
                        flat
                        dense
                        round
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.pin)"
                        title="Copy"
                        class="q-ml-sm"
                      />
                    </div>
                  </template>
                </q-field>
              </div>

              <div v-if="asset.type === 'crypto'" class="q-gutter-md">
                <q-field label="Wallet Name" borderless>
                  <template v-slot:default>{{ asset.data.walletName || 'N/A' }}</template>
                </q-field>
                <q-field label="Wallet Address" borderless>
                  <template v-slot:default>
                    <div class="flex items-center break-all">
                      <span class="q-mr-sm">{{ asset.data.address || 'N/A' }}</span>
                      <q-btn
                        flat
                        dense
                        round
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.address)"
                        title="Copy"
                      />
                    </div>
                  </template>
                </q-field>
                <q-field label="Recovery Phrase" borderless>
                  <template v-slot:default>
                    <div v-if="asset.data.mnemonic">
                      <pre class="bg-grey-1 q-pa-sm text-wrap">{{ asset.data.mnemonic }}</pre>
                      <q-btn
                        flat
                        size="sm"
                        label="Copy"
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.mnemonic)"
                        class="q-mt-sm"
                      />
                    </div>
                    <span v-else class="text-grey-5">N/A</span>
                  </template>
                </q-field>
                <q-field label="Private Key" borderless>
                  <template v-slot:default>
                    <div v-if="asset.data.privateKey">
                      <pre class="bg-grey-1 q-pa-sm text-wrap">{{ asset.data.privateKey }}</pre>
                      <q-btn
                        flat
                        size="sm"
                        label="Copy"
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.privateKey)"
                        class="q-mt-sm"
                      />
                    </div>
                    <span v-else class="text-grey-5">N/A</span>
                  </template>
                </q-field>
              </div>

              <div v-if="asset.type === 'private-key'" class="q-gutter-md">
                <q-field label="Key Name" borderless>
                  <template v-slot:default>{{ asset.data.keyName || 'N/A' }}</template>
                </q-field>
                <q-field label="Key Type" borderless>
                  <template v-slot:default>{{ asset.data.keyType || 'N/A' }}</template>
                </q-field>
                <q-field label="Private Key" borderless>
                  <template v-slot:default>
                    <div v-if="asset.data.privateKey">
                      <pre class="bg-grey-1 q-pa-sm text-wrap">{{ asset.data.privateKey }}</pre>
                      <q-btn
                        flat
                        size="sm"
                        label="Copy"
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.privateKey)"
                        class="q-mt-sm"
                      />
                    </div>
                    <span v-else class="text-grey-5">N/A</span>
                  </template>
                </q-field>
              </div>

              <div v-if="asset.type === 'other'" class="q-gutter-md">
                <q-field label="Content" borderless>
                  <template v-slot:default>
                    <div v-if="asset.data.content">
                      <pre class="bg-grey-1 q-pa-sm text-wrap">{{ asset.data.content }}</pre>
                      <q-btn
                        flat
                        size="sm"
                        label="Copy"
                        icon="content_copy"
                        @click="copyToClipboard(asset.data.content)"
                        class="q-mt-sm"
                      />
                    </div>
                    <span v-else class="text-grey-5">N/A</span>
                  </template>
                </q-field>
              </div>

              <q-field v-if="asset.data.notes" label="Notes" borderless class="q-mt-md">
                <template v-slot:default>
                  <p class="text-grey-7">{{ asset.data.notes }}</p>
                </template>
              </q-field>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card flat bordered>
            <q-card-section>
              <h3 class="text-h6">Asset Info</h3>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="q-gutter-md text-caption">
                <div class="row justify-between">
                  <span class="text-grey-6">Created</span>
                  <span>{{ formatDate(asset.createdAt) }}</span>
                </div>
                <div class="row justify-between">
                  <span class="text-grey-6">Last Updated</span>
                  <span>{{ formatDate(asset.updatedAt) }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mt-md bg-warning-1">
            <q-card-section>
              <div class="text-caption text-warning">
                <q-icon name="security" class="q-mr-sm" />
                This asset data is encrypted using XChaCha20-Poly1305
                and only decrypted when accessed.
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'boot/axios'
import { Notify, Dialog } from 'quasar'

const route = useRoute()
const router = useRouter()

const assetId = computed(() => route.params.id)
const asset = ref(null)
const loading = ref(true)

const assetTypes = {
  'login': { name: 'Login Credentials', color: 'primary' },
  'bank': { name: 'Bank Account', color: 'positive' },
  'crypto': { name: 'Crypto Wallet', color: 'warning' },
  'private-key': { name: 'Private Key', color: 'secondary' },
  'other': { name: 'Other', color: 'grey' }
}

function getAssetTypeName(type) {
  return assetTypes[type]?.name || 'Other'
}

function getAssetTypeColor(type) {
  return assetTypes[type]?.color || 'grey'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

async function copyToClipboard(text) {
  if (!text) return
  
  try {
    await navigator.clipboard.writeText(text)
    Notify.create({
      type: 'positive',
      message: 'Copied to clipboard',
      position: 'top'
    })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Failed to copy'
    })
  }
}

async function loadAsset() {
  loading.value = true
  try {
    const response = await api.get(`/assets/${assetId.value}`)
    asset.value = response.data
  } catch (error) {
    console.error('Failed to load asset:', error)
    Notify.create({
      type: 'negative',
      message: 'Failed to load asset'
    })
    router.push('/assets')
  } finally {
    loading.value = false
  }
}

function confirmDelete() {
  Dialog.create({
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this asset? This action cannot be undone.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/assets/${assetId.value}`)
      Notify.create({
        type: 'positive',
        message: 'Asset deleted successfully'
      })
      router.push('/assets')
    } catch (error) {
      Notify.create({
        type: 'negative',
        message: 'Failed to delete asset'
      })
    }
  })
}

onMounted(() => {
  loadAsset()
})
</script>
