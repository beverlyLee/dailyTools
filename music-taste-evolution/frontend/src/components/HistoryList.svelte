<script>
  export let history = []

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatDuration(ms) {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }
</script>

<div class="card">
  <h2 style="margin-bottom: 20px;">Recent Listening History</h2>
  
  {#if history.length === 0}
    <p style="color: var(--text-secondary); text-align: center; padding: 40px;">
      No listening history found. Sync your data to see your recent tracks.
    </p>
  {:else}
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid var(--bg-lighter);">
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 600;">#</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 600;">Track</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 600;">Artist</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 600;">Album</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 600;">Played At</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 600;">Duration</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 600;">Popularity</th>
          </tr>
        </thead>
        <tbody>
          {#each history as track, index}
            <tr style="border-bottom: 1px solid var(--bg-lighter); transition: background-color 0.2s;">
              <td style="padding: 12px; color: var(--text-secondary);">{index + 1}</td>
              <td style="padding: 12px;">
                <div style="font-weight: 600;">{track.track_name}</div>
              </td>
              <td style="padding: 12px; color: var(--text-secondary);">{track.artist_name}</td>
              <td style="padding: 12px; color: var(--text-secondary);">{track.album_name || '-'}</td>
              <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">{formatDate(track.played_at)}</td>
              <td style="padding: 12px; color: var(--text-secondary);">{formatDuration(track.duration_ms)}</td>
              <td style="padding: 12px;">
                {#if track.popularity !== null && track.popularity !== undefined}
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 60px; height: 6px; background-color: var(--bg-lighter); border-radius: 3px; overflow: hidden;">
                      <div 
                        style="width: {track.popularity}%; height: 100%; background-color: var(--primary-color);"
                      ></div>
                    </div>
                    <span style="font-size: 12px; color: var(--text-secondary);">{track.popularity}</span>
                  </div>
                {:else}
                  <span style="color: var(--text-secondary);">-</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    
    <p style="margin-top: 16px; color: var(--text-secondary); font-size: 14px;">
      Showing {history.length} recent tracks. Sync more data to see your full history.
    </p>
  {/if}
</div>
