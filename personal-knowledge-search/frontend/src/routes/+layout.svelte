<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: '📊' },
		{ href: '/search', label: 'Search', icon: '🔍' },
		{ href: '/graph', label: 'Knowledge Graph', icon: '🕸️' },
		{ href: '/cards', label: 'Spaced Repetition', icon: '🎴' }
	];
</script>

<div class="app-layout">
	<nav class="sidebar">
		<div class="sidebar-header">
			<h1 class="app-title">🧠 Second Brain</h1>
			<p class="app-subtitle">Personal Knowledge Search</p>
		</div>

		<ul class="nav-list">
			{#each navItems as item}
				<li class="nav-item">
					<a href={item.href} class="nav-link" class:active={$page.url.pathname === item.href}>
						<span class="nav-icon">{item.icon}</span>
						<span class="nav-label">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>

		<div class="sidebar-footer">
			<p class="text-sm text-muted">Chrome Extension Available</p>
		</div>
	</nav>

	<main class="main-content">
		<slot />
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 260px;
		background: var(--background);
		border-right: 1px solid var(--border);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		overflow-y: auto;
	}

	.sidebar-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.app-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.app-subtitle {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.nav-list {
		list-style: none;
		flex: 1;
	}

	.nav-item {
		margin-bottom: 0.25rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		color: var(--text-secondary);
		transition: all var(--transition);
		text-decoration: none;
	}

	.nav-link:hover {
		background: var(--surface);
		color: var(--text-primary);
	}

	.nav-link.active {
		background: rgba(99, 102, 241, 0.1);
		color: var(--primary-color);
		font-weight: 500;
	}

	.nav-icon {
		font-size: 1.125rem;
	}

	.nav-label {
		font-size: 0.875rem;
	}

	.sidebar-footer {
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
		margin-top: auto;
	}

	.main-content {
		flex: 1;
		margin-left: 260px;
		min-height: 100vh;
		overflow-x: hidden;
	}

	@media (max-width: 768px) {
		.sidebar {
			transform: translateX(-100%);
			z-index: 100;
			transition: transform var(--transition);
		}

		.main-content {
			margin-left: 0;
		}
	}
</style>
