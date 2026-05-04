<script>
  import { onMount, onDestroy } from 'svelte'
  import { Chart, registerables } from 'chart.js'
  import 'chartjs-adapter-date-fns'

  export let data = []
  
  let chartContainer
  let chart = null

  Chart.register(...registerables)

  const featureConfig = {
    energy: { color: '#ef4444', label: 'Energy' },
    danceability: { color: '#8b5cf6', label: 'Danceability' },
    valence: { color: '#10b981', label: 'Valence (Mood)' },
    acousticness: { color: '#f59e0b', label: 'Acousticness' },
    instrumentalness: { color: '#06b6d4', label: 'Instrumentalness' },
    speechiness: { color: '#ec4899', label: 'Speechiness' }
  }

  function createChart() {
    if (!chartContainer || data.length === 0) return

    if (chart) {
      chart.destroy()
    }

    const labels = data.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`)
    const datasets = Object.entries(featureConfig).map(([key, config]) => ({
      label: config.label,
      data: data.map(d => d[`avg_${key}`]),
      borderColor: config.color,
      backgroundColor: config.color + '20',
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6
    }))

    const ctx = chartContainer.getContext('2d')
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#ffffff',
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#282828',
            titleColor: '#ffffff',
            bodyColor: '#b3b3b3',
            borderColor: '#1DB954',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: {
            grid: {
              color: '#282828'
            },
            ticks: {
              color: '#b3b3b3'
            }
          },
          y: {
            min: 0,
            max: 1,
            grid: {
              color: '#282828'
            },
            ticks: {
              color: '#b3b3b3'
            }
          }
        }
      }
    })
  }

  onMount(() => {
    createChart()
  })

  $: {
    if (chartContainer && data) {
      createChart()
    }
  }

  onDestroy(() => {
    if (chart) {
      chart.destroy()
    }
  })
</script>

<div class="chart-container">
  <canvas bind:this={chartContainer}></canvas>
</div>
