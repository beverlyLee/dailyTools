<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <h2 class="text-h4">Dead Man's Switch</h2>
      <p class="text-grey-6">
        Configure your Dead Man's Switch to protect your digital legacy. 
        This feature ensures your assets can be accessed if you are unable to.
      </p>

      <div v-if="loading" class="row justify-center items-center q-py-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <div v-else class="row q-col-gutter-md">
        <div class="col-12 col-md-8">
          <q-card flat bordered>
            <q-card-section>
              <div class="row items-center justify-between">
                <div>
                  <h3 class="text-h5 q-mb-none">Enable Dead Man's Switch</h3>
                  <p class="text-caption text-grey-6 q-mt-sm">
                    When enabled, the switch will monitor your activity and trigger if no heartbeat is received.
                  </p>
                </div>
                <q-toggle
                  v-model="config.isEnabled"
                  color="primary"
                  size="md"
                />
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <h3 class="text-h6 q-mb-md">Configuration</h3>
              
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="config.heartbeatIntervalDays"
                    label="Heartbeat Interval"
                    :options="intervalOptions"
                    outlined
                    emit-value
                    map-options
                    :disable="!config.isEnabled"
                    hint="How often you need to confirm your activity"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="config.coolOffPeriodDays"
                    label="Cool-Off Period"
                    :options="coolOffOptions"
                    outlined
                    emit-value
                    map-options
                    :disable="!config.isEnabled"
                    hint="Waiting period after heartbeat fails before triggering"
                  />
                </div>
              </div>

              <div class="q-mt-md">
                <q-btn
                  color="primary"
                  label="Save Configuration"
                  :loading="saving"
                  @click="saveConfig"
                />
              </div>
            </q-card-section>

            <q-separator v-if="config.isEnabled" />

            <q-card-section v-if="config.isEnabled">
              <h3 class="text-h6 q-mb-md">Status</h3>
              
              <div class="q-gutter-md">
                <q-card flat class="bg-grey-1">
                  <q-card-section>
                    <div class="row items-center justify-between">
                      <div>
                        <div class="text-caption text-grey-6">Last Heartbeat</div>
                        <div class="text-h6">{{ formatDate(config.lastHeartbeat) }}</div>
                      </div>
                      <q-btn
                        color="primary"
                        label="Record Heartbeat"
                        icon="alarm_add"
                        @click="recordHeartbeat"
                        :loading="recordingHeartbeat"
                      />
                    </div>
                  </q-card-section>
                </q-card>

                <q-card 
                  flat 
                  :class="statusCardClass"
                >
                  <q-card-section>
                    <div class="row items-center">
                      <q-icon 
                        :name="statusIcon" 
                        :color="statusColor" 
                        size="32px"
                        class="q-mr-md"
                      />
                      <div>
                        <div class="text-h6">{{ statusText }}</div>
                        <div class="text-caption" v-if="statusDetails">{{ statusDetails }}</div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>

                <q-card flat bordered>
                  <q-card-section>
                    <h4 class="text-subtitle1 q-mb-sm">How it works</h4>
                    <ol class="text-body2 text-grey-7 q-ma-none q-pl-md">
                      <li class="q-py-xs">You must record a heartbeat at least every {{ config.heartbeatIntervalDays }} days</li>
                      <li class="q-py-xs">If no heartbeat is received after the interval, the switch enters cool-off period</li>
                      <li class="q-py-xs">During the {{ config.coolOffPeriodDays }} day cool-off, you can still cancel the trigger</li>
                      <li class="q-py-xs">After cool-off expires, the switch is triggered and your assets become accessible</li>
                    </ol>
                  </q-card-section>
                </q-card>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card flat bordered>
            <q-card-section>
              <h3 class="text-h6">About Dead Man's Switch</h3>
            </q-card-section>
            <q-separator />
            <q-card-section class="text-caption text-grey-7">
              <p class="q-mb-md">
                A Dead Man's Switch is a security mechanism that activates when the user 
                becomes inactive or unable to access their account.
              </p>
              <p class="q-mb-md">
                <strong>Heartbeat:</strong> Regularly confirm you are still active by 
                clicking "Record Heartbeat" or simply logging in.
              </p>
              <p class="q-mb-md">
                <strong>Cool-off Period:</strong> After missing your heartbeat interval, 
                there is a waiting period before the switch triggers. This prevents 
                accidental triggers from temporary inactivity.
              </p>
              <p>
                <strong>Security:</strong> All configuration is stored securely and 
                heartbeat timestamps are protected against tampering.
              </p>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { Notify } from 'quasar'

const loading = ref(true)
const saving = ref(false)
const recordingHeartbeat = ref(false)

const config = reactive({
  isEnabled: false,
  heartbeatIntervalDays: 30,
  coolOffPeriodDays: 7,
  lastHeartbeat: null,
  triggerDate: null,
  isTriggered: false
})

const intervalOptions = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 }
]

const coolOffOptions = [
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 }
]

const statusIcon = computed(() => {
  if (config.isTriggered) return 'warning'
  if (config.triggerDate) return 'alarm'
  if (config.isEnabled) return 'check_circle'
  return 'not_interested'
})

const statusColor = computed(() => {
  if (config.isTriggered) return 'negative'
  if (config.triggerDate) return 'warning'
  if (config.isEnabled) return 'positive'
  return 'grey'
})

const statusText = computed(() => {
  if (!config.isEnabled) return 'Dead Man\'s Switch is disabled'
  if (config.isTriggered) return 'Switch has been triggered!'
  if (config.triggerDate) return 'Switch in cool-off period'
  return 'Switch active and monitoring'
})

const statusDetails = computed(() => {
  if (config.isTriggered) return 'Your digital legacy is now accessible'
  if (config.triggerDate) return `Cool-off started: ${formatDate(config.triggerDate)}`
  if (config.isEnabled) {
    const lastHeartbeat = config.lastHeartbeat ? new Date(config.lastHeartbeat) : new Date()
    const nextDeadline = new Date(lastHeartbeat)
    nextDeadline.setDate(nextDeadline.getDate() + config.heartbeatIntervalDays)
    return `Next heartbeat due by: ${formatDate(nextDeadline.toISOString())}`
  }
  return null
})

const statusCardClass = computed(() => {
  if (config.isTriggered) return 'bg-negative-1'
  if (config.triggerDate) return 'bg-warning-1'
  if (config.isEnabled) return 'bg-positive-1'
  return 'bg-grey-1'
})

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

async function loadConfig() {
  loading.value = true
  try {
    const response = await api.get('/dead-mans-switch')
    Object.assign(config, {
      isEnabled: response.data.isEnabled,
      heartbeatIntervalDays: response.data.heartbeatIntervalDays,
      coolOffPeriodDays: response.data.coolOffPeriodDays,
      lastHeartbeat: response.data.lastHeartbeat,
      triggerDate: response.data.triggerDate,
      isTriggered: response.data.isTriggered
    })
  } catch (error) {
    console.error('Failed to load Dead Man\'s Switch config:', error)
    Notify.create({
      type: 'negative',
      message: 'Failed to load configuration'
    })
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await api.put('/dead-mans-switch', {
      isEnabled: config.isEnabled,
      heartbeatIntervalDays: config.heartbeatIntervalDays,
      coolOffPeriodDays: config.coolOffPeriodDays
    })
    Notify.create({
      type: 'positive',
      message: 'Configuration saved successfully'
    })
  } catch (error) {
    console.error('Failed to save config:', error)
    Notify.create({
      type: 'negative',
      message: 'Failed to save configuration'
    })
  } finally {
    saving.value = false
  }
}

async function recordHeartbeat() {
  recordingHeartbeat.value = true
  try {
    await api.post('/heartbeat')
    config.lastHeartbeat = new Date().toISOString()
    config.triggerDate = null
    config.isTriggered = false
    Notify.create({
      type: 'positive',
      message: 'Heartbeat recorded successfully'
    })
  } catch (error) {
    console.error('Failed to record heartbeat:', error)
    Notify.create({
      type: 'negative',
      message: 'Failed to record heartbeat'
    })
  } finally {
    recordingHeartbeat.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
