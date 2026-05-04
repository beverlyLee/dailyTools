<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';

	interface Card {
		id: string;
		question: string;
		answer: string;
		tags: string[];
		document_id?: string;
		status: 'new' | 'learning' | 'review' | 'graduated';
		created_at: string;
		updated_at: string;
		last_reviewed?: string;
		sm2_stats: {
			interval: number;
			repetitions: number;
			ease_factor: number;
			next_review?: string;
		};
	}

	interface DailyStats {
		date: string;
		cards_reviewed: number;
		average_quality: number;
		cards_added: number;
	}

	interface ReviewResponse {
		card_id: string;
		next_review: string;
		new_interval: number;
		new_ease_factor: number;
		new_repetitions: number;
		status: string;
	}

	let dueCards: Card[] = [];
	let allCards: Card[] = [];
	let dailyStats: DailyStats[] = [];
	let loading = true;
	let showingCreateModal = false;
	let currentCardIndex = 0;
	let showAnswer = false;
	let filter: 'due' | 'all' | 'new' | 'learning' | 'review' | 'graduated' = 'due';

	let newQuestion = '';
	let newAnswer = '';
	let newTags = '';

	$: filteredCards = filter === 'due'
		? dueCards
		: filter === 'all'
		? allCards
		: allCards.filter((c) => c.status === filter);

	$: currentCard = dueCards[currentCardIndex] || null;

	async function loadData() {
		loading = true;
		try {
			const [due, all, stats] = await Promise.all([
				api.getDueCards(50),
				api.getCards(100),
				api.getDailyStats(7)
			]);
			dueCards = due as Card[];
			allCards = all as Card[];
			dailyStats = stats as DailyStats[];
		} catch (error) {
			console.error('Failed to load cards:', error);
		} finally {
			loading = false;
		}
	}

	async function createCard() {
		if (!newQuestion.trim() || !newAnswer.trim()) return;

		try {
			await api.createCard({
				question: newQuestion.trim(),
				answer: newAnswer.trim(),
				tags: newTags.trim() ? newTags.split(',').map((t) => t.trim()) : []
			});

			newQuestion = '';
			newAnswer = '';
			newTags = '';
			showingCreateModal = false;

			await loadData();
		} catch (error) {
			console.error('Failed to create card:', error);
		}
	}

	async function reviewCard(quality: number) {
		if (!currentCard) return;

		try {
			await api.reviewCard(currentCard.id, quality);
			
			if (currentCardIndex < dueCards.length - 1) {
				currentCardIndex++;
			} else {
				await loadData();
				currentCardIndex = 0;
			}
			
			showAnswer = false;
		} catch (error) {
			console.error('Failed to review card:', error);
		}
	}

	async function deleteCard(id: string) {
		if (!confirm('Are you sure you want to delete this card?')) return;
		
		try {
			await api.deleteCard(id);
			await loadData();
			if (currentCardIndex >= dueCards.length - 1) {
				currentCardIndex = Math.max(0, dueCards.length - 2);
			}
		} catch (error) {
			console.error('Failed to delete card:', error);
		}
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusBadge(status: string): string {
		const badges: Record<string, string> = {
			new: 'badge-primary',
			learning: 'badge-warning',
			review: 'badge-secondary',
			graduated: 'badge-success'
		};
		return badges[status] || 'badge-secondary';
	}

	function getStatusLabel(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}

	const qualityOptions = [
		{ value: 0, label: '0', desc: 'Complete blackout', color: 'danger' },
		{ value: 1, label: '1', desc: 'Wrong answer', color: 'danger' },
		{ value: 2, label: '2', desc: 'Wrong, seemed familiar', color: 'warning' },
		{ value: 3, label: '3', desc: 'Correct, with difficulty', color: 'warning' },
		{ value: 4, label: '4', desc: 'Correct, after hesitation', color: 'success' },
		{ value: 5, label: '5', desc: 'Perfect recall', color: 'success' }
	];

	onMount(() => {
		loadData();
	});
</script>

<div class="cards-page">
	<div class="page-header">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="page-title">Spaced Repetition</h1>
				<p class="page-subtitle">Use the SM-2 algorithm to remember what you learn</p>
			</div>
			<button class="btn btn-primary" on:click={() => (showingCreateModal = true)}>
				➕ New Card
			</button>
		</div>
	</div>

	<div class="stats-grid grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
		<div class="card stat-card">
			<div class="card-body">
				<div class="text-sm text-muted mb-1">Cards Due</div>
				<div class="stat-value">{dueCards.length}</div>
			</div>
		</div>
		<div class="card stat-card">
			<div class="card-body">
				<div class="text-sm text-muted mb-1">Total Cards</div>
				<div class="stat-value">{allCards.length}</div>
			</div>
		</div>
		<div class="card stat-card">
			<div class="card-body">
				<div class="text-sm text-muted mb-1">Reviewed Today</div>
				<div class="stat-value">
					{dailyStats.length > 0 ? dailyStats[dailyStats.length - 1].cards_reviewed : 0}
				</div>
			</div>
		</div>
		<div class="card stat-card">
			<div class="card-body">
				<div class="text-sm text-muted mb-1">Avg Quality</div>
				<div class="stat-value">
					{dailyStats.length > 0
						? (dailyStats[dailyStats.length - 1].average_quality || 0).toFixed(1)
						: '0.0'}
				</div>
			</div>
		</div>
	</div>

	<div class="filter-tabs mb-6">
		<button
			class="filter-tab"
			class:active={filter === 'due'}
			on:click={() => {
				filter = 'due';
				currentCardIndex = 0;
				showAnswer = false;
			}}
		>
			Due ({dueCards.length})
		</button>
		<button
			class="filter-tab"
			class:active={filter === 'all'}
			on:click={() => (filter = 'all')}
		>
			All ({allCards.length})
		</button>
		<button
			class="filter-tab"
			class:active={filter === 'new'}
			on:click={() => (filter = 'new')}
		>
			New ({allCards.filter((c) => c.status === 'new').length})
		</button>
		<button
			class="filter-tab"
			class:active={filter === 'learning'}
			on:click={() => (filter = 'learning')}
		>
			Learning ({allCards.filter((c) => c.status === 'learning').length})
		</button>
		<button
			class="filter-tab"
			class:active={filter === 'graduated'}
			on:click={() => (filter = 'graduated')}
		>
			Graduated ({allCards.filter((c) => c.status === 'graduated').length})
		</button>
	</div>

	{#if loading}
		<div class="empty-state">
			<div class="empty-state-icon">⏳</div>
			<p>Loading cards...</p>
		</div>
	{:else if filter === 'due'}
		{#if dueCards.length === 0}
			<div class="empty-state">
				<div class="empty-state-icon">🎉</div>
				<h3>No Cards Due!</h3>
				<p class="text-muted">All caught up. Create new cards or check back later.</p>
			</div>
		{:else if currentCard}
			<div class="review-section">
				<div class="review-progress mb-4">
					<div class="text-sm text-muted">
						Card {currentCardIndex + 1} of {dueCards.length}
					</div>
					<div class="progress-bar">
						<div
							class="progress-fill"
							style="width: {((currentCardIndex + 1) / dueCards.length) * 100}%;"
						></div>
					</div>
				</div>

				<div class="card review-card">
					<div class="card-header">
						<div class="flex items-center justify-between">
							<span class="badge {getStatusBadge(currentCard.status)}">
								{getStatusLabel(currentCard.status)}
							</span>
							<button
								class="btn btn-danger btn-sm"
								on:click={() => deleteCard(currentCard.id)}
							>
								🗑️ Delete
							</button>
						</div>
					</div>
					<div class="card-body">
						<div class="review-question">
							<h3 class="question-text">{currentCard.question}</h3>
							{#if currentCard.tags.length > 0}
								<div class="review-tags mt-4">
									{#each currentCard.tags as tag}
										<span class="tag">{tag}</span>
									{/each}
								</div>
							{/if}
						</div>

						{#if showAnswer}
							<div class="review-answer">
								<hr class="my-6" />
								<h4 class="text-sm text-muted mb-2">Answer</h4>
								<p class="answer-text">{currentCard.answer}</p>
							</div>
						{/if}
					</div>

					<div class="card-footer">
						{#if !showAnswer}
							<button class="btn btn-primary w-full" on:click={() => (showAnswer = true)}>
								👁️ Show Answer
							</button>
						{:else}
							<div class="quality-buttons">
								{#each qualityOptions as option}
									<button
										class="quality-btn btn-{option.color}"
										on:click={() => reviewCard(option.value)}
										title={option.desc}
									>
										<span class="quality-value">{option.label}</span>
										<span class="quality-desc text-sm">{option.desc}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div class="card-info mt-4 text-sm text-muted">
					<div class="flex items-center gap-4 flex-wrap">
						<span>Interval: {currentCard.sm2_stats.interval} days</span>
						<span>Repetitions: {currentCard.sm2_stats.repetitions}</span>
						<span>Ease Factor: {(currentCard.sm2_stats.ease_factor * 100).toFixed(0)}%</span>
						{#if currentCard.sm2_stats.next_review}
							<span>Next: {formatDate(currentCard.sm2_stats.next_review)}</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{:else}
		{#if filteredCards.length === 0}
			<div class="empty-state">
				<div class="empty-state-icon">🎴</div>
				<h3>No Cards</h3>
				<p class="text-muted">Create your first card to get started with spaced repetition.</p>
			</div>
		{:else}
			<div class="cards-list grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each filteredCards as card}
					<div class="card">
						<div class="card-header">
							<div class="flex items-center justify-between">
								<span class="badge {getStatusBadge(card.status)}">
									{getStatusLabel(card.status)}
								</span>
								<button
									class="btn btn-danger btn-sm btn-icon"
									on:click={() => deleteCard(card.id)}
									title="Delete"
								>
									🗑️
								</button>
							</div>
						</div>
						<div class="card-body">
							<h4 class="font-semibold mb-2">{card.question}</h4>
							<p class="text-sm text-muted line-clamp-2">{card.answer}</p>
						</div>
						<div class="card-footer flex items-center justify-between text-sm text-muted">
							<span>Created: {formatDate(card.created_at)}</span>
							<span>Interval: {card.sm2_stats.interval}d</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

{#if showingCreateModal}
	<div class="modal-overlay" on:click={() => (showingCreateModal = false)}>
		<div class="modal card" on:click|stopPropagation>
			<div class="card-header">
				<h2 class="card-title">Create New Card</h2>
			</div>
			<div class="card-body">
				<div class="form-group">
					<label class="form-label">Question</label>
					<textarea
						bind:value={newQuestion}
						class="form-textarea"
						placeholder="Enter your question..."
						rows={2}
					></textarea>
				</div>
				<div class="form-group">
					<label class="form-label">Answer</label>
					<textarea
						bind:value={newAnswer}
						class="form-textarea"
						placeholder="Enter the answer..."
						rows={4}
					></textarea>
				</div>
				<div class="form-group">
					<label class="form-label">Tags (comma-separated)</label>
					<input
						type="text"
						bind:value={newTags}
						class="form-input"
						placeholder="e.g., programming, javascript, algorithms"
					/>
				</div>
			</div>
			<div class="card-footer flex justify-end gap-3">
				<button class="btn btn-secondary" on:click={() => (showingCreateModal = false)}>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					on:click={createCard}
					disabled={!newQuestion.trim() || !newAnswer.trim()}
				>
					Create Card
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.cards-page {
		padding: 2rem;
		max-width: 900px;
		margin: 0 auto;
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
		text-align: center;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.filter-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-tab {
		padding: 0.5rem 1rem;
		border-radius: var(--radius);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		transition: all var(--transition);
	}

	.filter-tab:hover {
		background: var(--surface);
	}

	.filter-tab.active {
		background: var(--primary-color);
		color: white;
	}

	.review-progress {
		text-align: center;
	}

	.progress-bar {
		height: 6px;
		background: var(--border);
		border-radius: 3px;
		overflow: hidden;
		margin-top: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: var(--primary-color);
		transition: width var(--transition);
	}

	.review-card {
		min-height: 300px;
		display: flex;
		flex-direction: column;
	}

	.review-question {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: 150px;
	}

	.question-text {
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.6;
	}

	.answer-text {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--text-primary);
	}

	.review-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.quality-buttons {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
	}

	.quality-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		border-radius: var(--radius);
		transition: all var(--transition);
	}

	.quality-btn.btn-danger {
		background: rgba(239, 68, 68, 0.1);
		color: var(--danger-color);
	}

	.quality-btn.btn-danger:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	.quality-btn.btn-warning {
		background: rgba(245, 158, 11, 0.1);
		color: var(--warning-color);
	}

	.quality-btn.btn-warning:hover {
		background: rgba(245, 158, 11, 0.2);
	}

	.quality-btn.btn-success {
		background: rgba(16, 185, 129, 0.1);
		color: var(--success-color);
	}

	.quality-btn.btn-success:hover {
		background: rgba(16, 185, 129, 0.2);
	}

	.quality-value {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.quality-desc {
		color: inherit;
		opacity: 0.8;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.my-6 {
		margin: 1.5rem 0;
	}

	.mt-4 {
		margin-top: 1rem;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.justify-end {
		justify-content: flex-end;
	}

	.gap-3 {
		gap: 0.75rem;
	}
</style>
