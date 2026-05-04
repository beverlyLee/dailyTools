<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';

	interface GraphNode {
		id: string;
		label: string;
		title: string;
		group: string;
		value: number;
	}

	interface GraphEdge {
		id: string;
		from: string;
		to: string;
		label: string;
		value: number;
		arrows: string;
	}

	interface GraphData {
		nodes: GraphNode[];
		edges: GraphEdge[];
	}

	interface Entity {
		name: string;
		type: string;
		count: number;
	}

	let graphData: GraphData | null = null;
	let entities: Entity[] = [];
	let loading = true;
	let selectedEntity: string | null = null;
	let graphContainer: HTMLElement | null = null;
	let network: unknown = null;

	$: if (graphContainer && graphData) {
		initializeNetwork();
	}

	async function loadData() {
		loading = true;
		try {
			const [graphResult, entitiesResult] = await Promise.all([
				api.getGraphData(),
				api.getEntities(50)
			]);
			graphData = graphResult as GraphData;
			entities = entitiesResult as Entity[];
		} catch (error) {
			console.error('Failed to load graph data:', error);
		} finally {
			loading = false;
		}
	}

	async function searchRelated(entityName: string) {
		selectedEntity = entityName;
		try {
			const related = await api.searchRelated(entityName, 20);
			graphData = related as GraphData;
		} catch (error) {
			console.error('Failed to search related entities:', error);
		}
	}

	async function resetView() {
		selectedEntity = null;
		await loadData();
	}

	function initializeNetwork() {
		if (!graphContainer || !graphData) return;

		import('vis-network').then(({ default: Network }) => {
			import('vis-data').then(({ DataSet }) => {
				const nodes = new DataSet(graphData.nodes);
				const edges = new DataSet(graphData.edges);

				const data = { nodes, edges };

				const options = {
					nodes: {
						shape: 'dot',
						size: 20,
						font: {
							size: 14,
							color: '#1e293b'
						},
						borderWidth: 2,
						shadow: true
					},
					edges: {
						width: 2,
						shadow: true,
						font: {
							size: 12,
							color: '#64748b',
							strokeWidth: 3,
							strokeColor: '#ffffff'
						},
						smooth: {
							type: 'continuous'
						}
					},
					physics: {
						enabled: true,
						barnesHut: {
							gravitationalConstant: -3000,
							centralGravity: 0.3,
							springLength: 200,
							springConstant: 0.04
						},
						maxVelocity: 50,
						solver: 'barnesHut',
						stabilization: {
							iterations: 1000,
							updateInterval: 25
						}
					},
					groups: {
						technology: {
							color: { background: '#6366f1', border: '#4f46e5' },
							shape: 'dot'
						},
						concept: {
							color: { background: '#10b981', border: '#059669' },
							shape: 'dot'
						},
						person: {
							color: { background: '#f59e0b', border: '#d97706' },
							shape: 'dot'
						},
						organization: {
							color: { background: '#ef4444', border: '#dc2626' },
							shape: 'dot'
						},
						location: {
							color: { background: '#8b5cf6', border: '#7c3aed' },
							shape: 'dot'
						}
					},
					interaction: {
						hover: true,
						tooltipDelay: 200,
						hideEdgesOnDrag: false,
						hideNodesOnDrag: false
					}
				};

				network = new Network(graphContainer, data, options);
			});
		});
	}

	onMount(() => {
		loadData();
	});
</script>

<div class="graph-page">
	<div class="page-header">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="page-title">Knowledge Graph</h1>
				<p class="page-subtitle">Visualize connections between entities in your knowledge base</p>
			</div>
			{#if selectedEntity}
				<button class="btn btn-secondary btn-sm" on:click={resetView}>
					↩️ Reset View
				</button>
			{/if}
		</div>
	</div>

	<div class="graph-layout">
		<aside class="graph-sidebar card">
			<div class="card-header">
				<h2 class="card-title">Top Entities</h2>
			</div>
			<div class="card-body">
				{#if loading}
					{#each Array(5) as _}
						<div class="entity-item skeleton" style="height: 40px; margin-bottom: 0.5rem;"></div>
					{/each}
				{:else if entities.length === 0}
					<div class="empty-state">
						<div class="empty-state-icon">🕸️</div>
						<p class="text-muted">No entities found yet</p>
						<p class="text-sm text-muted">Save some documents to build your knowledge graph</p>
					</div>
				{:else}
					<ul class="entity-list">
						{#each entities.slice(0, 20) as entity}
							<li class="entity-item">
								<button
									class="entity-link"
									class:active={selectedEntity === entity.name}
									on:click={() => searchRelated(entity.name)}
								>
									<span class="entity-name">{entity.name}</span>
									<span class="badge badge-secondary">{entity.count}</span>
								</button>
								<span class="entity-type text-sm text-muted">{entity.type}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="card-header" style="border-top: 1px solid var(--border);">
				<h2 class="card-title">Legend</h2>
			</div>
			<div class="card-body">
				<ul class="legend-list">
					<li class="legend-item">
						<span class="legend-dot" style="background: #6366f1;"></span>
						<span>Technology</span>
					</li>
					<li class="legend-item">
						<span class="legend-dot" style="background: #10b981;"></span>
						<span>Concept</span>
					</li>
					<li class="legend-item">
						<span class="legend-dot" style="background: #f59e0b;"></span>
						<span>Person</span>
					</li>
					<li class="legend-item">
						<span class="legend-dot" style="background: #ef4444;"></span>
						<span>Organization</span>
					</li>
					<li class="legend-item">
						<span class="legend-dot" style="background: #8b5cf6;"></span>
						<span>Location</span>
					</li>
				</ul>
			</div>
		</aside>

		<main class="graph-main card">
			<div class="card-header">
				<h2 class="card-title">
					{#if selectedEntity}
						Connections for: <span class="text-primary">{selectedEntity}</span>
					{:else}
						Knowledge Network
					{/if}
				</h2>
			</div>
			<div class="card-body graph-container">
				{#if loading}
					<div class="empty-state">
						<div class="empty-state-icon">⏳</div>
						<p>Loading knowledge graph...</p>
					</div>
				{:else if !graphData || graphData.nodes.length === 0}
					<div class="empty-state">
						<div class="empty-state-icon">🕸️</div>
						<h3>No Graph Data</h3>
						<p class="text-muted">Your knowledge graph will grow as you save more documents</p>
					</div>
				{:else}
					<div bind:this={graphContainer} class="network-container"></div>
				{/if}
			</div>
		</main>
	</div>
</div>

<style>
	.graph-page {
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

	.text-primary {
		color: var(--primary-color);
	}

	.graph-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1.5rem;
		min-height: 600px;
	}

	.graph-sidebar {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.graph-sidebar .card-body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.entity-list {
		list-style: none;
	}

	.entity-item {
		margin-bottom: 0.5rem;
	}

	.entity-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.625rem 0.875rem;
		border-radius: var(--radius);
		transition: background var(--transition);
		text-align: left;
	}

	.entity-link:hover {
		background: var(--surface);
	}

	.entity-link.active {
		background: rgba(99, 102, 241, 0.1);
	}

	.entity-name {
		font-weight: 500;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.entity-type {
		display: block;
		margin-left: 0.875rem;
		font-size: 0.75rem;
		margin-top: 0.125rem;
	}

	.legend-list {
		list-style: none;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.legend-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.graph-main {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.graph-container {
		flex: 1;
		min-height: 500px;
		position: relative;
		padding: 0;
	}

	.network-container {
		width: 100%;
		height: 100%;
		min-height: 500px;
	}

	@media (max-width: 1024px) {
		.graph-layout {
			grid-template-columns: 1fr;
		}

		.graph-sidebar {
			max-height: 300px;
		}
	}
</style>
