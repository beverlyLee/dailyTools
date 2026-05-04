<script>
  export let label
  export let value
  export let trend = null
</script>

<div class="stat-card">
  <div class="stat-value">{value}</div>
  <div class="stat-label">{label}</div>
  {#if trend !== null}
    <div class="trend trend-{trend}">
      {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
    </div>
  {/if}
</div>
