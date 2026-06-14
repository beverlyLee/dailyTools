import { FloorImpactSoundScene } from './scene/FloorImpactSoundScene'
import { impactSources } from './sources/ImpactSourceGenerator'
import { floorStructures } from './structure/FloorStructureManager'

let scene: FloorImpactSoundScene
let autoWalkEnabled: boolean = true
let selectedSourceId: string = 'highHeel'

function init() {
  scene = new FloorImpactSoundScene()

  scene.setOnSPLUpdate((avg, peak, level) => {
    updateSPLDisplay(avg, peak, level)
  })

  scene.setOnSolutionsUpdate((solutions) => {
    updateSolutionPanel(solutions)
  })

  setupUI()
  updateStructureList()
  updateSourceList()
}

function updateSPLDisplay(avg: number, peak: number, level: string) {
  const avgEl = document.getElementById('avgSPL')
  const peakEl = document.getElementById('peakSPL')
  const levelEl = document.getElementById('insulationLevel')
  const barFill = document.getElementById('splBarFill')

  if (avgEl) avgEl.textContent = avg.toFixed(1) + ' dB'
  if (peakEl) peakEl.textContent = peak.toFixed(1) + ' dB'

  const levelText: Record<string, string> = {
    poor: '🔴 隔音差',
    fair: '🟡 隔音一般',
    good: '🟢 隔音良好',
    excellent: '🔵 隔音优秀'
  }

  const levelColor: Record<string, string> = {
    poor: '#ff4757',
    fair: '#ffa502',
    good: '#2ed573',
    excellent: '#1e90ff'
  }

  if (levelEl) {
    levelEl.textContent = levelText[level] || '未知'
    levelEl.style.color = levelColor[level] || '#ffffff'
  }

  if (barFill) {
    const percent = Math.min(peak / 80, 1) * 100
    barFill.style.width = percent + '%'
    barFill.style.background = peak > 55
      ? 'linear-gradient(90deg, #ff4757, #ff6b6b)'
      : peak > 40
        ? 'linear-gradient(90deg, #ffa502, #ffbe76)'
        : 'linear-gradient(90deg, #2ed573, #7bed9f)'
  }
}

function updateSolutionPanel(solutions: any[]) {
  const container = document.getElementById('solutionsList')
  if (!container) return

  if (solutions.length === 0) {
    container.innerHTML = '<div class="solution-empty">✓ 当前隔音效果良好</div>'
    return
  }

  container.innerHTML = solutions.map((s, i) => `
    <div class="solution-item">
      <div class="solution-icon">${s.icon}</div>
      <div class="solution-content">
        <div class="solution-title">${i + 1}. ${s.title}</div>
        <div class="solution-desc">${s.description}</div>
        <div class="solution-meta">
          <span class="solution-improvement">降噪 +${s.expectedImprovement}dB</span>
          <span class="solution-cost cost-${s.cost}">${getCostText(s.cost)}</span>
        </div>
      </div>
    </div>
  `).join('')
}

function getCostText(cost: string): string {
  const map: Record<string, string> = {
    low: '💰 低成本',
    medium: '💰💰 中成本',
    high: '💰💰💰 高成本'
  }
  return map[cost] || cost
}

function updateStructureList() {
  const container = document.getElementById('structureList')
  if (!container) return

  container.innerHTML = floorStructures.map(s => `
    <div class="structure-item ${s.id === 'bareConcrete' ? 'active' : ''}" data-id="${s.id}">
      <div class="structure-name">${s.name}</div>
      <div class="structure-info">
        <span>${s.layers.length}层结构</span>
        <span class="structure-insulation">${s.totalInsulation}dB</span>
      </div>
      <div class="structure-layers">
        ${s.layers.map(l => `
          <span class="layer-dot" style="background: ${l.color}" title="${l.name}"></span>
        `).join('')}
      </div>
    </div>
  `).join('')

  container.querySelectorAll('.structure-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id')
      if (id) {
        container.querySelectorAll('.structure-item').forEach(i => i.classList.remove('active'))
        item.classList.add('active')
        scene.setStructure(id)
      }
    })
  })
}

function updateSourceList() {
  const container = document.getElementById('sourceList')
  if (!container) return

  container.innerHTML = impactSources.map(s => `
    <div class="source-item ${s.id === 'highHeel' ? 'active' : ''}" data-id="${s.id}">
      <span class="source-icon">${s.icon}</span>
      <span class="source-name">${s.name}</span>
    </div>
  `).join('')

  container.querySelectorAll('.source-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id')
      if (id) {
        selectedSourceId = id
        container.querySelectorAll('.source-item').forEach(i => i.classList.remove('active'))
        item.classList.add('active')
      }
    })
  })
}

function setupUI() {
  const btnTrigger = document.getElementById('btnTrigger')
  if (btnTrigger) {
    btnTrigger.addEventListener('click', () => {
      scene.triggerImpact(selectedSourceId, 1.0)
    })
  }

  const btnAutoWalk = document.getElementById('btnAutoWalk')
  if (btnAutoWalk) {
    btnAutoWalk.addEventListener('click', () => {
      autoWalkEnabled = !autoWalkEnabled
      scene.setAutoWalk(autoWalkEnabled)
      btnAutoWalk.textContent = autoWalkEnabled ? '⏸ 暂停走动' : '▶ 开始走动'
      btnAutoWalk.classList.toggle('active', autoWalkEnabled)
    })
  }

  const btnClear = document.getElementById('btnClear')
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      // Clear impacts by waiting for them to fade
    })
  }

  const intensitySlider = document.getElementById('intensitySlider') as HTMLInputElement
  const intensityValue = document.getElementById('intensityValue')
  if (intensitySlider && intensityValue) {
    intensitySlider.addEventListener('input', () => {
      intensityValue.textContent = (parseFloat(intensitySlider.value) * 100).toFixed(0) + '%'
    })
  }
}

document.addEventListener('DOMContentLoaded', init)
