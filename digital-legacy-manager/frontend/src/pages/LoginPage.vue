<template>
  <q-page class="row items-center justify-evenly">
    <div class="flex items-center justify-center">
      <q-card class="q-pa-md" style="width: 400px">
        <q-card-section class="text-center">
          <h3 class="text-h4 text-primary">Digital Legacy Manager</h3>
          <p class="text-grey-6">Secure Your Digital Future</p>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <q-form @submit="handleLogin" class="q-gutter-md">
            <q-input
              v-model="username"
              label="Username"
              outlined
              required
            />

            <q-input
              v-model="password"
              label="Password"
              type="password"
              outlined
              required
            />

            <q-btn
              type="submit"
              label="Login"
              color="primary"
              :loading="loading"
              class="full-width"
            />
          </q-form>

          <div class="text-center q-mt-md">
            <span class="text-grey-6">Don't have an account? </span>
            <router-link to="/register" class="text-primary">Register</router-link>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    return
  }

  loading.value = true
  
  try {
    const result = await authStore.login(username.value, password.value)
    
    if (result.success) {
      Notify.create({
        type: 'positive',
        message: 'Login successful!'
      })
      router.push('/dashboard')
    } else {
      Notify.create({
        type: 'negative',
        message: result.error || 'Login failed'
      })
    }
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Login failed'
    })
  } finally {
    loading.value = false
  }
}
</script>
