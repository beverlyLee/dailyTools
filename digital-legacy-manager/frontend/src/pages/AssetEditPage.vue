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
        <h2 class="text-h4 q-mb-none">{{ isEdit ? 'Edit Asset' : 'New Asset' }}</h2>
      </div>

      <q-card flat bordered class="q-mt-md" style="max-width: 600px">
        <q-card-section>
          <q-form @submit="handleSave" class="q-gutter-md">
            <q-input
              v-model="asset.title"
              label="Title"
              outlined
              required
            />

            <q-select
              v-model="asset.type"
              label="Asset Type"
              :options="typeOptions"
              outlined
              emit-value
              map-options
              required
            />

            <q-separator class="q-my-md" />

            <template v-if="asset.type === 'login'">
              <h3 class="text-h6">Login Credentials</h3>
              <q-input
                v-model="assetData.username"
                label="Username"
                outlined
              />
              <q-input
                v-model="assetData.password"
                label="Password"
                type="password"
                outlined
                hint="This field will be encrypted before storage"
              />
              <q-input
                v-model="assetData.url"
                label="Website URL"
                outlined
              />
              <q-input
                v-model="assetData.notes"
                label="Notes"
                type="textarea"
                outlined
                rows="3"
              />
            </template>

            <template v-if="asset.type === 'bank'">
              <h3 class="text-h6">Bank Account</h3>
              <q-input
                v-model="assetData.bankName"
                label="Bank Name"
                outlined
              />
              <q-input
                v-model="assetData.accountNumber"
                label="Account Number"
                outlined
              />
              <q-input
                v-model="assetData.routingNumber"
                label="Routing Number"
                outlined
              />
              <q-input
                v-model="assetData.pin"
                label="PIN / Password"
                type="password"
                outlined
                hint="This field will be encrypted before storage"
              />
              <q-input
                v-model="assetData.notes"
                label="Notes"
                type="textarea"
                outlined
                rows="3"
              />
            </template>

            <template v-if="asset.type === 'crypto'">
              <h3 class="text-h6">Crypto Wallet</h3>
              <q-input
                v-model="assetData.walletName"
                label="Wallet Name"
                outlined
              />
              <q-input
                v-model="assetData.address"
                label="Wallet Address"
                outlined
              />
              <q-input
                v-model="assetData.mnemonic"
                label="Recovery Phrase / Mnemonic"
                type="textarea"
                outlined
                rows="4"
                hint="This field will be encrypted before storage"
              />
              <q-input
                v-model="assetData.privateKey"
                label="Private Key"
                type="textarea"
                outlined
                rows="2"
                hint="This field will be encrypted before storage"
              />
              <q-input
                v-model="assetData.notes"
                label="Notes"
                type="textarea"
                outlined
                rows="3"
              />
            </template>

            <template v-if="asset.type === 'private-key'">
              <h3 class="text-h6">Private Key</h3>
              <q-input
                v-model="assetData.keyName"
                label="Key Name"
                outlined
              />
              <q-select
                v-model="assetData.keyType"
                label="Key Type"
                :options="['SSH', 'GPG', 'API Key', 'Other']"
                outlined
              />
              <q-input
                v-model="assetData.privateKey"
                label="Private Key"
                type="textarea"
                outlined
                rows="6"
                hint="This field will be encrypted before storage"
              />
              <q-input
                v-model="assetData.passphrase"
                label="Passphrase"
                type="password"
                outlined
                hint="This field will be encrypted before storage"
              />
              <q-input
                v-model="assetData.notes"
                label="Notes"
                type="textarea"
                outlined
                rows="3"
              />
            </template>

            <template v-if="asset.type === 'other'">
              <h3 class="text-h6">Other Asset</h3>
              <q-input
                v-model="assetData.content"
                label="Content"
                type="textarea"
                outlined
                rows="8"
                hint="This field will be encrypted before storage"
              />
              <q-input
                v-model="assetData.notes"
                label="Notes"
                type="textarea"
                outlined
                rows="3"
              />
            </template>

            <q-card flat bordered class="bg-warning-1 q-pa-sm">
              <div class="text-caption text-warning">
                <q-icon name="warning" class="q-mr-sm" />
                All sensitive fields are encrypted using XChaCha20-Poly1305
                before being sent to the server.
              </div>
            </q-card>

            <div class="row justify-end q-mt-md">
              <q-btn
                flat
                label="Cancel"
                to="/assets"
                class="q-mr-md"
              />
              <q-btn
                type="submit"
                :label="isEdit ? 'Save Changes' : 'Create Asset'"
                color="primary"
                :loading="saving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'boot/axios'
import { Notify } from 'quasar'

const route = useRoute()
const router = useRouter()

const assetId = computed(() => route.params.id)
const isEdit = computed(() => !!assetId.value)

const asset = reactive({
  title: '',
  type: 'login'
})

const assetData = reactive({})
const saving = ref(false)

const typeOptions = [
  { label: 'Login Credentials', value: 'login' },
  { label: 'Bank Account', value: 'bank' },
  { label: 'Crypto Wallet', value: 'crypto' },
  { label: 'Private Key', value: 'private-key' },
  { label: 'Other', value: 'other' }
]

async function loadAsset() {
  if (!isEdit.value) return
  
  try {
    const response = await api.get(`/assets/${assetId.value}`)
    asset.title = response.data.title
    asset.type = response.data.type
    Object.assign(assetData, response.data.data)
  } catch (error) {
    console.error('Failed to load asset:', error)
    Notify.create({
      type: 'negative',
      message: 'Failed to load asset'
    })
    router.push('/assets')
  }
}

async function handleSave() {
  if (!asset.title || !asset.type) return

  saving.value = true

  try {
    if (isEdit.value) {
      await api.put(`/assets/${assetId.value}`, {
        title: asset.title,
        data: assetData
      })
      Notify.create({
        type: 'positive',
        message: 'Asset updated successfully'
      })
    } else {
      await api.post('/assets', {
        type: asset.type,
        title: asset.title,
        data: assetData
      })
      Notify.create({
        type: 'positive',
        message: 'Asset created successfully'
      })
    }
    router.push('/assets')
  } catch (error) {
    console.error('Failed to save asset:', error)
    Notify.create({
      type: 'negative',
      message: 'Failed to save asset'
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadAsset()
})
</script>
