<script>
  import { Link } from 'svelte-routing'

  let isMenuOpen = false

  const navLinks = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/generate', label: '生成音乐', icon: '🎵' },
    { path: '/library', label: '我的作品', icon: '📁' }
  ]
</script>

<nav class="navbar">
  <div class="navbar-inner">
    <Link to="/" class="logo">
      <span class="logo-icon">🎵</span>
      <span class="logo-text">国潮音乐生成器</span>
    </Link>

    <button class="menu-toggle" on:click={() => isMenuOpen = !isMenuOpen}>
      {isMenuOpen ? '✕' : '☰'}
    </button>

    <div class="nav-links" class:open={isMenuOpen}>
      {#each navLinks as link}
        <Link
          to={link.path}
          class="nav-link"
          on:click={() => isMenuOpen = false}
          getProps={({ isPartiallyCurrent, isCurrent }) => {
            return {
              class: isCurrent || (isPartiallyCurrent && link.path !== '/') 
                ? 'nav-link active' 
                : 'nav-link'
            }
          }}
        >
          <span class="nav-icon">{link.icon}</span>
          <span>{link.label}</span>
        </Link>
      {/each}
    </div>
  </div>
</nav>

<style>
  .navbar {
    background: linear-gradient(135deg, #2c1810 0%, #4a2c20 100%);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .navbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    text-decoration: none;
  }

  .logo:hover {
    color: var(--secondary-light);
  }

  .logo-icon {
    font-size: 28px;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .menu-toggle {
    display: none;
    color: white;
    font-size: 24px;
    padding: 8px;
  }

  .nav-links {
    display: flex;
    gap: 8px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: var(--transition);
    font-weight: 500;
  }

  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .nav-link.active {
    background: rgba(212, 175, 55, 0.2);
    color: var(--secondary-light);
  }

  .nav-icon {
    font-size: 16px;
  }

  @media (max-width: 768px) {
    .menu-toggle {
      display: block;
    }

    .nav-links {
      position: absolute;
      top: 64px;
      left: 0;
      right: 0;
      background: var(--accent-color);
      flex-direction: column;
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .nav-links.open {
      max-height: 300px;
      padding: 16px;
    }

    .nav-link {
      padding: 12px 16px;
    }
  }
</style>
