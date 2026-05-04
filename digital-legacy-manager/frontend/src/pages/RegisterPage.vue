<template>
  <q-page class="row items-center justify-evenly">
    <div class="flex items-center justify-center">
      <q-card class="q-pa-md" style="width: 400px">
        <q-card-section class="text-center">
          <h3 class="text-h4 text-primary">Create Account</h3>
          <p class="text-grey-6">Secure Your Digital Legacy</p>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <q-form @submit="handleRegister" class="q-gutter-md">
            <q-input
              v-model="username"
              label="Username"
              outlined
              required
              :rules="[minLengthRule]"
            />

            <q-input
              v-model="password"
              label="Password"
              type="password"
              outlined
              required
              :rules="[passwordRule]"
            />

            <q-input
              v-model="confirmPassword"
              label="Confirm Password"
              type="password"
              outlined
              required
              :rules="[matchPasswordRule]"
            />

            <q-card flat bordered class="bg-grey-1 q-pa-sm">
              <div class="text-caption text-grey-6">
                <strong>Password Requirements:</strong>
                <ul class="q-ma-none q-pa-none q-ml-md">
                  <li>Minimum 8 characters</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include numbers</li>
                </ul>
              </div>
            </q-card>

            <q-btn
              type="submit"
              label="Register"
              color="primary"
              :loading="loading"
              class="full-width"
            />
          </q-form>

          <div class="text-center q-mt-md">
            <span class="text-grey-6">Already have an account? </span>
            <router-link to="/login" class="text-primary">Login</router-link>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const minLengthRule = (val) => val.length >= 3 || 'Username must be at least 3 characters'

const passwordRule = (val) => {
  if (val.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(val)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(val)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(val)) return 'Password must contain a number'
  return true
}

const matchPasswordRule = (val) => val === password.value || 'Passwords must match'

async function handleRegister() {
  if (!username.value || !password.value || password.value !== confirmPassword.value) {
    return
  }

  loading.value = true
  
  try {
    const result = await authStore.register(username.value, password.value)
    
    if (result.success) {
      Notify.create({
        type: 'positive',
        message: 'Account created! Please login.'
      })
      router.push('/login')
    } else {
      Notify.create({
        type: 'negative',
        message: result.error || 'Registration failed'
      })
    }
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: 'Registration failed'
    })
  } finally {
    loading.value = false
  }
}
</script>
