<script>
  import { authApi } from '../lib/api'

  let loading = false
  let error = null
  let spotifyConfigured = true

  async function checkStatus() {
    try {
      const result = await authApi.checkAuth()
      spotifyConfigured = result.spotify_configured
    } catch (e) {
      console.error('Failed to check auth status:', e)
    }
  }

  checkStatus()

  function handleLogin() {
    loading = true
    error = null
    window.location.href = authApi.getLoginUrl()
  }
</script>

<div class="card" style="text-align: center; padding: 60px 40px;">
  <h1 style="font-size: 48px; margin-bottom: 20px;">🎵</h1>
  <h2 style="font-size: 32px; margin-bottom: 16px;">Music Taste Evolution</h2>
  <p style="font-size: 18px; color: var(--text-secondary); margin-bottom: 40px; max-width: 500px; margin-left: auto; margin-right: auto;">
    Discover how your music taste evolves over time. Connect with Spotify to analyze your listening history and track changes in your audio preferences.
  </p>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if !spotifyConfigured}
    <div class="error">
      <strong>Spotify API not configured</strong><br>
      Please set <code>SPOTIFY_CLIENT_ID</code> and <code>SPOTIFY_CLIENT_SECRET</code> in the backend <code>.env</code> file.
    </div>
  {/if}

  <button 
    class="btn-primary" 
    style="font-size: 18px; padding: 16px 48px; margin-top: 20px;"
    on:click={handleLogin}
    disabled={loading || !spotifyConfigured}
  >
    {#if loading}
      <span class="spinner" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 10px;"></span>
      Connecting...
    {:else}
      Connect with Spotify
    {/if}
  </button>

  <div style="margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--bg-lighter);">
    <h3 style="margin-bottom: 20px;">What you'll get:</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; text-align: left;">
      <div>
        <h4 style="margin-bottom: 8px;">📊 Audio Feature Analysis</h4>
        <p style="font-size: 14px; color: var(--text-secondary);">Track energy, danceability, valence, and more over time</p>
      </div>
      <div>
        <h4 style="margin-bottom: 8px;">📈 Evolution Trends</h4>
        <p style="font-size: 14px; color: var(--text-secondary);">See how your taste changes month by month</p>
      </div>
      <div>
        <h4 style="margin-bottom: 8px;">🎯 Genre Insights</h4>
        <p style="font-size: 14px; color: var(--text-secondary);">Discover your most listened genres and artists</p>
      </div>
    </div>
  </div>
</div>
