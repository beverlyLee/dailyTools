<script>
  import { auth } from './stores/auth'
  import LoginPage from './components/LoginPage.svelte'
  import Dashboard from './components/Dashboard.svelte'
  import AuthCallback from './components/AuthCallback.svelte'

  let currentPage = 'dashboard'

  function handleHashChange() {
    const hash = window.location.hash.slice(1) || ''
    if (hash.includes('auth/callback')) {
      currentPage = 'callback'
    }
  }

  handleHashChange()
  window.addEventListener('hashchange', handleHashChange)
</script>

<header class="header">
  <div class="header-content">
    <h1>🎵 Music Taste Evolution</h1>
    {#if $auth.isAuthenticated}
      <div class="user-info">
        {#if $auth.user?.image_url}
          <img src={$auth.user.image_url} alt="Profile" />
        {/if}
        <span>{$auth.user?.display_name || $auth.user?.spotify_id}</span>
        <button class="btn-secondary" on:click={() => auth.logout()}>
          Logout
        </button>
      </div>
    {/if}
  </div>
</header>

<main class="container">
  {#if currentPage === 'callback'}
    <AuthCallback />
  {:else if $auth.isAuthenticated}
    <Dashboard />
  {:else}
    <LoginPage />
  {/if}
</main>
