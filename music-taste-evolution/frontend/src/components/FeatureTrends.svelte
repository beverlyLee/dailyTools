<script>
  export let evolutionData

  const featureDescriptions = {
    acousticness: "A confidence measure from 0.0 to 1.0 of whether the track is acoustic.",
    danceability: "How suitable a track is for dancing based on tempo, rhythm stability, beat strength, and regularity.",
    energy: "A perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy.",
    instrumentalness: "Predicts whether a track contains no vocals. Values above 0.5 are intended to represent instrumental tracks.",
    liveness: "Detects the presence of an audience in the recording. Higher liveness values represent an increased probability that the track was performed live.",
    loudness: "The overall loudness of a track in decibels (dB). Values typical range between -60 and 0 db.",
    speechiness: "Speechiness detects the presence of spoken words in a track. Values above 0.66 describe tracks that are probably made entirely of spoken words.",
    tempo: "The overall estimated tempo of a track in beats per minute (BPM).",
    valence: "A measure from 0.0 to 1.0 describing the musical positiveness conveyed by a track. High valence sounds more positive."
  }

  function getTrendClass(trend) {
    switch (trend) {
      case 'increasing': return 'trend-up'
      case 'decreasing': return 'trend-down'
      default: return 'trend-stable'
    }
  }

  function getTrendIcon(trend) {
    switch (trend) {
      case 'increasing': return '↗'
      case 'decreasing': return '↘'
      default: return '→'
    }
  }

  function getTrendLabel(trend) {
    switch (trend) {
      case 'increasing': return 'Rising'
      case 'decreasing': return 'Falling'
      default: return 'Stable'
    }
  }
</script>

{#if evolutionData?.trends}
  <h2 style="margin-bottom: 24px;">Audio Feature Trends</h2>
  
  <div class="feature-grid">
    {#each Object.entries(evolutionData.trends) as [feature, data]}
      <div class="feature-card">
        <h3>{feature.charAt(0).toUpperCase() + feature.slice(1)}</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
          {featureDescriptions[feature] || ''}
        </p>
        
        <div class="change {getTrendClass(data.trend)}">
          {getTrendIcon(data.trend)} {data.change_percent}%
        </div>
        
        <div class="trend">
          <span class="{getTrendClass(data.trend)}">
            {getTrendLabel(data.trend)}
          </span>
        </div>
        
        <div style="margin-top: 16px; display: flex; justify-content: space-between; font-size: 13px;">
          <div>
            <div style="color: var(--text-secondary);">Start</div>
            <div style="font-weight: bold;">{data.first_value}</div>
          </div>
          <div style="text-align: right;">
            <div style="color: var(--text-secondary);">Current</div>
            <div style="font-weight: bold;">{data.last_value}</div>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div class="card" style="margin-top: 24px;">
    <h3>Feature Values Over Time</h3>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--bg-lighter);">
            <th style="text-align: left; padding: 12px; color: var(--text-secondary);">Month</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary);">Tracks</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary);">Energy</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary);">Danceability</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary);">Valence</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary);">Tempo</th>
          </tr>
        </thead>
        <tbody>
          {#each evolutionData.monthly_data as month}
            <tr style="border-bottom: 1px solid var(--bg-lighter);">
              <td style="padding: 12px;">{month.year}-{String(month.month).padStart(2, '0')}</td>
              <td style="padding: 12px;">{month.total_tracks}</td>
              <td style="padding: 12px;">{month.avg_energy?.toFixed(2) || '-'}</td>
              <td style="padding: 12px;">{month.avg_danceability?.toFixed(2) || '-'}</td>
              <td style="padding: 12px;">{month.avg_valence?.toFixed(2) || '-'}</td>
              <td style="padding: 12px;">{month.avg_tempo?.toFixed(0) || '-'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
