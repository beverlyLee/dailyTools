<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { api } from '$lib/api/client';

	type SearchMode = 'text' | 'semantic';

	interface SearchResultItem {
		document: {
			id: string;
			title: string;
			content: string;
			url?: string;
			document_type: string;
			tags: string[];
			created_at: string;
			screenshot_path?: string;
		};
		score: number;
		highlight?: string;
	}

	let query = '';
	let searchMode: SearchMode = 'text';
	let results: SearchResultItem[] = [];
	let loading = false;
	let hasSearched = false;
	let searchTime = 0;
	let totalResults = 0;

	$: if ($page.url.searchParams.get('q')) {
		query = $page.url.searchParams.get('q') || '';
		if (query) {
			handleSearch();
		}
	}

	async function handleSearch() {
		if (!query.trim()) return;

		loading = true;
		hasSearched = true;

		try {
			const response = searchMode === 'text'
				? await api.searchText(query, 20)
				: await api.searchSemantic(query, 20);

			results = response.results as SearchResultItem[];
			totalResults = response.total_results;
			searchTime = response.search_time_ms;
		} catch (error) {
			console.error('Search failed:', error);
			results = [];
		} finally {
			loading = false;
		}
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getDocumentTypeIcon(type: string): string {
		const icons: Record<string, string> = {
			web_page: '🌐',
			note: '📝',
			article: '📰',
			bookmark: '🔖'
		};
		return icons[type] || '📄';
	}
</script>

<div class="search-page">
	<div class="search-header">
		<h1 class="page-title">Search</h1>
		<p class="page-subtitle">Find content in your knowledge base</p>
	</div>

	<div class="search-container">
		<div class="search-bar card">
			<div class="search-input-wrapper">
				<input
					type="text"
					bind:value={query}
					placeholder="Search your knowledge base..."
					class="search-input"
					on:keydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
				<button class="btn btn-primary search-btn" on:click={handleSearch} disabled={loading}>
					{loading ? 'Searching...' : '🔍 Search'}
				</button>
			</div>

			<div class="search-mode-tabs">
				<button
					class="mode-tab"
					class:active={searchMode === 'text'}
					on:click={() => {
						searchMode = 'text';
						if (query) handleSearch();
					}}
				>
					📝 Text Search
				</button>
				<button
					class="mode-tab"
					class:active={searchMode === 'semantic'}
					on:click={() => {
						searchMode = 'semantic';
						if (query) handleSearch();
					}}
				>
					🧠 Semantic Search
				</button>
			</div>
		</div>

		{#if hasSearched}
			<div class="search-results">
				{#if loading}
					<div class="empty-state">
						<div class="empty-state-icon">⏳</div>
						<p>Searching...</p>
					</div>
				{:else if results.length === 0}
					<div class="empty-state">
						<div class="empty-state-icon">🔍</div>
						<h3>No results found</h3>
						<p class="text-muted">Try different keywords or check your spelling</p>
					</div>
				{:else}
					<div class="results-header">
						<p class="results-count">
							Found <strong>{totalResults}</strong> results in <strong>{searchTime.toFixed(2)}ms</strong>
						</p>
					</div>

					<div class="results-list">
						{#each results as result}
							<article class="result-item card">
								<div class="result-header">
									<div class="result-icon">{getDocumentTypeIcon(result.document.document_type)}</div>
									<div class="result-meta">
										<h3 class="result-title">{result.document.title}</h3>
										<div class="result-meta-row">
											<span class="text-sm text-muted">
												{formatDate(result.document.created_at)}
											</span>
											<span class="badge badge-secondary">
												{Math.round(result.score * 100)}% match
											</span>
										</div>
									</div>
								</div>

								{#if result.highlight}
									<p class="result-highlight">{@html result.highlight}</p>
								{:else}
									<p class="result-snippet">
										{result.document.content.slice(0, 200)}
										{result.document.content.length > 200 ? '...' : ''}
									</p>
								{/if}

								{#if result.document.tags.length > 0}
									<div class="result-tags">
										{#each result.document.tags as tag}
											<span class="tag">{tag}</span>
										{/each}
									</div>
								{/if}

								{#if result.document.url}
									<a href={result.document.url} target="_blank" rel="noopener" class="result-link text-sm">
										🌐 View original page
									</a>
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-state-icon">💡</div>
				<h3>Start Searching</h3>
				<p class="text-muted">
					Use <strong>Text Search</strong> for keyword matching or <strong>Semantic Search</strong> to find content by meaning
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.search-page {
		padding: 2rem;
		max-width: 900px;
		margin: 0 auto;
	}

	.search-header {
		text-align: center;
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

	.search-bar {
		margin-bottom: 2rem;
	}

	.search-input-wrapper {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.search-input {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 1rem;
		transition: border-color var(--transition);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.search-btn {
		flex-shrink: 0;
	}

	.search-mode-tabs {
		display: flex;
		gap: 0.25rem;
		padding: 0.5rem 1rem;
	}

	.mode-tab {
		padding: 0.5rem 1rem;
		border-radius: var(--radius);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		transition: all var(--transition);
	}

	.mode-tab:hover {
		background: var(--surface);
	}

	.mode-tab.active {
		background: rgba(99, 102, 241, 0.1);
		color: var(--primary-color);
	}

	.results-header {
		margin-bottom: 1rem;
	}

	.results-count {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.result-item {
		transition: transform var(--transition), box-shadow var(--transition);
	}

	.result-item:hover {
		transform: translateX(4px);
		box-shadow: var(--shadow-md);
	}

	.result-header {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.result-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.result-meta {
		flex: 1;
		min-width: 0;
	}

	.result-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-meta-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.result-snippet,
	.result-highlight {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 0.75rem;
	}

	.result-highlight {
		color: var(--text-primary);
	}

	.result-highlight b,
	.result-highlight strong {
		background: rgba(99, 102, 241, 0.15);
		padding: 0 2px;
		border-radius: 2px;
	}

	.result-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.result-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--primary-color);
		text-decoration: none;
	}

	.result-link:hover {
		text-decoration: underline;
	}
</style>
