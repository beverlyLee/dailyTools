<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';

	interface Stats {
		documents: { count: number };
		vectors: { count: number; dimension: number };
		cards: Record<string, number>;
	}

	let stats: Stats | null = null;
	let loading = true;

	onMount(async () => {
		try {
			stats = await api.getStats();
		} catch (error) {
			console.error('Failed to load stats:', error);
		} finally {
			loading = false;
		}
	});

	const statCards = [
		{
			label: 'Documents',
			icon: '📄',
			value: () => stats?.documents.count || 0,
			color: 'primary'
		},
		{
			label: 'Vector Embeddings',
			icon: '🔢',
			value: () => stats?.vectors.count || 0,
			color: 'success'
		},
		{
			label: 'Cards Due',
			icon: '🎴',
			value: () => (stats?.cards.new || 0) + (stats?.cards.learning || 0) + (stats?.cards.review || 0),
			color: 'warning'
		},
		{
			label: 'Graduated Cards',
			icon: '🏆',
			value: () => stats?.cards.graduated || 0,
			color: 'primary'
		}
	];
</script>

<div class="dashboard">
	<div class="page-header">
		<h1 class="page-title">Dashboard</h1>
		<p class="page-subtitle">Overview of your personal knowledge base</p>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
			{#each [1, 2, 3, 4] as i}
				<div class="card">
					<div class="card-body">
						<div class="skeleton" style="height: 24px; width: 100px; margin-bottom: 1rem;"></div>
						<div class="skeleton" style="height: 32px; width: 60px;"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
			{#each statCards as card}
				<div class="card stat-card">
					<div class="card-body">
						<div class="flex items-center justify-between mb-2">
							<span class="text-muted text-sm">{card.label}</span>
							<span class="stat-icon">{card.icon}</span>
						</div>
						<span class="stat-value">{card.value()}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Quick Actions</h2>
			</div>
			<div class="card-body">
				<div class="action-grid">
					<a href="/search" class="action-item">
						<span class="action-icon">🔍</span>
						<span class="action-label">Search Knowledge</span>
					</a>
					<a href="/graph" class="action-item">
						<span class="action-icon">🕸️</span>
						<span class="action-label">View Knowledge Graph</span>
					</a>
					<a href="/cards" class="action-item">
						<span class="action-icon">🎴</span>
						<span class="action-label">Review Cards</span>
					</a>
					<div class="action-item disabled">
						<span class="action-icon">📥</span>
						<span class="action-label">Install Extension</span>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Getting Started</h2>
			</div>
			<div class="card-body">
				<ol class="steps">
					<li class="step-item">
						<span class="step-number">1</span>
						<div class="step-content">
							<strong>Install the Chrome Extension</strong>
							<p class="text-sm text-muted">Capture web pages and screenshots directly from your browser</p>
						</div>
					</li>
					<li class="step-item">
						<span class="step-number">2</span>
						<div class="step-content">
							<strong>Save Interesting Content</strong>
							<p class="text-sm text-muted">Articles, notes, and bookmarks are automatically indexed</p>
						</div>
					</li>
					<li class="step-item">
						<span class="step-number">3</span>
						<div class="step-content">
							<strong>Search Semantically</strong>
							<p class="text-sm text-muted">Find content by meaning, not just keywords</p>
						</div>
					</li>
					<li class="step-item">
						<span class="step-number">4</span>
						<div class="step-content">
							<strong>Create Flashcards</strong>
							<p class="text-sm text-muted">Use spaced repetition to remember what you learn</p>
						</div>
					</li>
				</ol>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.page-subtitle {
		color: var(--text-secondary);
	}

	.stat-card {
		transition: transform var(--transition), box-shadow var(--transition);
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.stat-icon {
		font-size: 1.5rem;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.action-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.25rem;
		background: var(--surface);
		border-radius: var(--radius);
		text-decoration: none;
		transition: background var(--transition);
	}

	.action-item:hover {
		background: var(--border);
	}

	.action-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-icon {
		font-size: 1.75rem;
	}

	.action-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		text-align: center;
	}

	.steps {
		list-style: none;
	}

	.step-item {
		display: flex;
		gap: 1rem;
		padding: 0.75rem 0;
	}

	.step-item:not(:last-child) {
		border-bottom: 1px solid var(--border);
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		background: var(--primary-color);
		color: white;
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 9999px;
	}

	.step-content strong {
		display: block;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}
</style>
