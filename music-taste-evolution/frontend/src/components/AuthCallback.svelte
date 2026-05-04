<script>
  import { onMount } from 'svelte'
  import { auth } from '../stores/auth'
  import { authApi } from '../lib/api'

  let loading = true
  let error = null

  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      if (token) {
        const user = await authApi.getMe()
        auth.login(token, user)
        
        window.location.hash = ''
        window.location.search = ''
        window.location.href = window.location.pathname
      } else {
        error = 'No authentication token received'
        loading = false
      }
    } catch (e) {
      error = e.message || 'Authentication failed'
      loading = false
      console.error('Auth callback error:', e)
    }
  })
</script>

<div class="card" style="text-align: center; padding: 60px 40px;">
  {#if loading}
    <div class="spinner" style="width: 60px; height: 60px; margin: 0 auto 20px;"></div>
    <h2>Authenticating...</h2>
    <p style="color: var(--text-secondary);">Please wait while we complete the authentication process.</p>
  {:else if error}
    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
    <h2>Authentication Failed</h2>
    <div class="error" style="margin-top: 20px;">{error}</div>
    <p style="margin-top: 20px; color: var(--text-secondary);">
      <a href="/">Return to login page</a>
    </p>
  {/if}
</div>
