<script>
  import { onMount, afterUpdate } from 'svelte'
  import { STORES, add, getByIndex, getAll, remove, update } from '../lib/db.js'
  import { generateVaccineReminders, getUpcomingReminders, addDays, STANDARD_VACCINE_SCHEDULES } from '../lib/vaccine.js'
  import { calculateAgeDays, getStandardWeight, calculateDeviation, BREED_CONFIG } from '../lib/growthModel.js'

  export let livestockList = []

  let vaccineRecords = []
  let reminders = []
  let upcomingReminders = []
  let selectedLivestockId = null
  let showVaccineForm = false
  let showDiseaseForm = false
  let showTreatmentForm = false
  let activeTab = 'reminders'
  let selectedDiseaseId = null
  let diseaseRecords = []
  let treatmentRecords = []
  let treatmentSvg = null
  let treatmentTooltipEl = null
  let treatmentTooltipData = null

  let newVaccine = {
    livestockId: '',
    vaccineName: '',
    vaccineDate: new Date().toISOString().split('T')[0],
    batchNumber: '',
    type: 'initial',
    operator: '',
    notes: ''
  }

  let newDisease = {
    livestockId: '',
    diseaseName: '',
    diseaseDate: new Date().toISOString().split('T')[0],
    symptoms: '',
    severity: 'moderate',
    status: 'sick'
  }

  let newTreatment = {
    diseaseId: '',
    treatmentDate: new Date().toISOString().split('T')[0],
    medication: '',
    dosage: '',
    condition: 'stable',
    notes: ''
  }

  $: filteredVaccineRecords = selectedLivestockId
    ? vaccineRecords
        .filter(r => r.livestockId === parseInt(selectedLivestockId))
        .sort((a, b) => new Date(b.vaccineDate) - new Date(a.vaccineDate))
    : [...vaccineRecords].sort((a, b) => new Date(b.vaccineDate) - new Date(a.vaccineDate))

  $: filteredDiseaseRecords = selectedLivestockId
    ? diseaseRecords
        .filter(r => String(r.livestockId) === String(selectedLivestockId))
        .sort((a, b) => new Date(b.diseaseDate) - new Date(a.diseaseDate))
    : [...diseaseRecords].sort((a, b) => new Date(b.diseaseDate) - new Date(a.diseaseDate))

  $: selectedDiseaseTreatments = selectedDiseaseId
    ? treatmentRecords
        .filter(r => String(r.diseaseId) === String(selectedDiseaseId))
        .sort((a, b) => new Date(a.treatmentDate) - new Date(b.treatmentDate))
    : []

  $: selectedDiseaseDetail = selectedDiseaseId
    ? diseaseRecords.find(r => String(r.id) === String(selectedDiseaseId))
    : null

  async function loadVaccineRecords() {
    vaccineRecords = await getAll(STORES.VACCINE_RECORDS)
  }

  async function loadDiseaseRecords() {
    diseaseRecords = await getAll(STORES.DISEASE_RECORDS)
  }

  async function loadTreatmentRecords() {
    treatmentRecords = await getAll(STORES.TREATMENT_RECORDS)
  }

  function buildReminders() {
    const allReminders = []
    livestockList.forEach(l => {
      const rems = generateVaccineReminders(l)
      allReminders.push(...rems)
    })
    reminders = allReminders
    upcomingReminders = getUpcomingReminders(reminders, vaccineRecords, 30)
  }

  async function saveVaccine() {
    if (!newVaccine.livestockId || !newVaccine.vaccineName || !newVaccine.vaccineDate) {
      alert('请填写完整信息')
      return
    }
    await add(STORES.VACCINE_RECORDS, {
      ...newVaccine,
      livestockId: Number(newVaccine.livestockId)
    })
    newVaccine = {
      livestockId: '',
      vaccineName: '',
      vaccineDate: new Date().toISOString().split('T')[0],
      batchNumber: '',
      type: 'initial',
      operator: '',
      notes: ''
    }
    showVaccineForm = false
    await loadVaccineRecords()
    buildReminders()
  }

  async function saveDisease() {
    if (!newDisease.livestockId || !newDisease.diseaseName || !newDisease.diseaseDate) {
      alert('请填写完整信息')
      return
    }
    await add(STORES.DISEASE_RECORDS, {
      ...newDisease,
      livestockId: Number(newDisease.livestockId)
    })
    newDisease = {
      livestockId: '',
      diseaseName: '',
      diseaseDate: new Date().toISOString().split('T')[0],
      symptoms: '',
      severity: 'moderate',
      status: 'sick'
    }
    showDiseaseForm = false
    await loadDiseaseRecords()
  }

  async function saveTreatment() {
    if (!newTreatment.diseaseId || !newTreatment.treatmentDate || !newTreatment.medication) {
      alert('请填写完整信息')
      return
    }
    const disease = diseaseRecords.find(r => String(r.id) === String(newTreatment.diseaseId))
    await add(STORES.TREATMENT_RECORDS, {
      ...newTreatment,
      diseaseId: Number(newTreatment.diseaseId),
      livestockId: disease ? disease.livestockId : 0
    })
    newTreatment = {
      diseaseId: '',
      treatmentDate: new Date().toISOString().split('T')[0],
      medication: '',
      dosage: '',
      condition: 'stable',
      notes: ''
    }
    showTreatmentForm = false
    await loadTreatmentRecords()
  }

  async function updateDiseaseStatus(diseaseId, newStatus) {
    const disease = diseaseRecords.find(r => r.id === diseaseId)
    if (!disease) return
    await update(STORES.DISEASE_RECORDS, { ...disease, status: newStatus })
    await loadDiseaseRecords()
  }

  async function deleteDisease(id) {
    if (!confirm('确定删除该疾病记录？相关治疗记录也将被删除。')) return
    const related = treatmentRecords.filter(r => String(r.diseaseId) === String(id))
    for (const t of related) await remove(STORES.TREATMENT_RECORDS, t.id)
    await remove(STORES.DISEASE_RECORDS, id)
    if (String(selectedDiseaseId) === String(id)) selectedDiseaseId = null
    await loadDiseaseRecords()
    await loadTreatmentRecords()
  }

  async function deleteTreatment(id) {
    if (!confirm('确定删除该治疗记录？')) return
    await remove(STORES.TREATMENT_RECORDS, id)
    await loadTreatmentRecords()
  }

  function getLivestockById(id) {
    return livestockList.find(l => l.id === id)
  }

  function getVaccineOptions(breed) {
    return STANDARD_VACCINE_SCHEDULES[breed] || STANDARD_VACCINE_SCHEDULES['地方品种']
  }

  function getLivestockBreed() {
    if (!newVaccine.livestockId) return null
    const l = getLivestockById(Number(newVaccine.livestockId))
    return l?.breed
  }

  $: selectedBreed = newVaccine.livestockId ? getLivestockBreed() : null

  function getSeverityLabel(s) {
    return { mild: '轻度', moderate: '中度', severe: '重度' }[s] || s
  }

  function getStatusLabel(s) {
    return { sick: '患病中', recovering: '恢复中', recovered: '已康复' }[s] || s
  }

  function getConditionLabel(c) {
    return { improving: '好转', stable: '稳定', worsening: '恶化' }[c] || c
  }

  onMount(async () => {
    await loadVaccineRecords()
    await loadDiseaseRecords()
    await loadTreatmentRecords()
    buildReminders()
  })

  $: {
    if (livestockList.length > 0) {
      buildReminders()
    }
  }

  $: if (activeTab === 'monitor' && selectedDiseaseId && treatmentSvg) {
    drawTreatmentChart()
  }

  function drawTreatmentChart() {
    if (!treatmentSvg || !selectedDiseaseDetail) return

    const disease = selectedDiseaseDetail
    const livestock = getLivestockById(disease.livestockId)
    if (!livestock) return

    const treatments = treatmentRecords
      .filter(r => String(r.diseaseId) === String(disease.id))
      .sort((a, b) => new Date(a.treatmentDate) - new Date(b.treatmentDate))

    const container = treatmentSvg.parentElement
    const width = container.clientWidth
    const height = 340
    const padding = { top: 30, right: 30, bottom: 60, left: 60 }

    const diseaseStart = new Date(disease.diseaseDate)
    const diseaseEnd = disease.status === 'recovered'
      ? new Date(treatments.length > 0 ? treatments[treatments.length - 1].treatmentDate : disease.diseaseDate)
      : new Date()
    const totalDays = Math.max(Math.ceil((diseaseEnd - diseaseStart) / (1000 * 60 * 60 * 24)), 1)

    const days = []
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(diseaseStart)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const ageDays = calculateAgeDays(livestock.birthDate, dateStr)
      days.push({
        day: i,
        date: dateStr,
        ageDays,
        standardWeight: getStandardWeight(livestock.breed, ageDays),
        treatment: treatments.find(t => t.treatmentDate === dateStr)
      })
    }

    const maxW = Math.max(...days.map(d => d.standardWeight), 1) * 1.15

    const xScale = (day) => padding.left + (day / Math.max(totalDays, 1)) * (width - padding.left - padding.right)
    const yScale = (w) => height - padding.bottom - (w / maxW) * (height - padding.top - padding.bottom)

    let svg = ''
    svg += `<rect width="${width}" height="${height}" fill="white"/>`

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i * (height - padding.top - padding.bottom)) / 5
      const w = maxW - (i * maxW) / 5
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#eee" stroke-dasharray="3,3"/>`
      svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="#999" font-size="11">${w.toFixed(0)}kg</text>`
    }

    const xStep = Math.max(1, Math.ceil(totalDays / 8))
    for (let x = 0; x <= totalDays; x += xStep) {
      const xPos = xScale(x)
      svg += `<line x1="${xPos}" y1="${padding.top}" x2="${xPos}" y2="${height - padding.bottom}" stroke="#f5f5f5"/>`
      svg += `<text x="${xPos}" y="${height - padding.bottom + 18}" text-anchor="middle" fill="#999" font-size="10">第${x}天</text>`
      const dayData = days.find(d => d.day === x)
      if (dayData) {
        svg += `<text x="${xPos}" y="${height - padding.bottom + 32}" text-anchor="middle" fill="#bbb" font-size="9">${dayData.date.slice(5)}</text>`
      }
    }

    let stdPath = ''
    days.forEach((d, i) => {
      const x = xScale(d.day)
      const y = yScale(d.standardWeight)
      stdPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
    })
    svg += `<path d="${stdPath}" fill="none" stroke="#4caf50" stroke-width="2" stroke-dasharray="6,3"/>`

    svg += `<rect x="${xScale(0)}" y="${padding.top}" width="${xScale(totalDays) - xScale(0)}" height="${height - padding.top - padding.bottom}" fill="rgba(244,67,54,0.05)"/>`
    svg += `<text x="${(xScale(0) + xScale(totalDays)) / 2}" y="${padding.top + 16}" text-anchor="middle" fill="rgba(244,67,54,0.3)" font-size="12" font-weight="bold">疾病期间</text>`

    days.forEach(d => {
      if (d.treatment) {
        const x = xScale(d.day)
        const y = yScale(d.standardWeight)
        const condColor = d.treatment.condition === 'improving' ? '#4caf50' : d.treatment.condition === 'worsening' ? '#f44336' : '#ff9800'
        svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="${condColor}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>`
        svg += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${condColor}" stroke="white" stroke-width="1.5" transform="rotate(45 ${x} ${y})" data-treatment="${d.day}"/>`
        svg += `<text x="${x}" y="${padding.top + 14}" text-anchor="middle" fill="${condColor}" font-size="9" font-weight="bold">${d.treatment.medication.slice(0, 4)}</text>`
      }
    })

    svg += `<text x="${width / 2}" y="${height - 5}" text-anchor="middle" fill="#666" font-size="12">治疗天数</text>`
    svg += `<text transform="rotate(-90, 18, ${height / 2})" x="18" y="${height / 2}" text-anchor="middle" fill="#666" font-size="12">标准体重 (kg)</text>`

    const legendY = height - 20
    svg += `<line x1="${padding.left}" y1="${legendY}" x2="${padding.left + 20}" y2="${legendY}" stroke="#4caf50" stroke-width="2" stroke-dasharray="4,2"/>`
    svg += `<text x="${padding.left + 24}" y="${legendY + 4}" fill="#666" font-size="10">标准曲线</text>`
    svg += `<rect x="${padding.left + 90}" y="${legendY - 4}" width="8" height="8" fill="#ff9800" transform="rotate(45 ${padding.left + 94} ${legendY})"/>`
    svg += `<text x="${padding.left + 108}" y="${legendY + 4}" fill="#666" font-size="10">治疗用药</text>`
    svg += `<rect x="${padding.left + 170}" y="${legendY - 4}" width="8" height="8" fill="#4caf50" transform="rotate(45 ${padding.left + 174} ${legendY})"/>`
    svg += `<text x="${padding.left + 188}" y="${legendY + 4}" fill="#666" font-size="10">好转</text>`
    svg += `<rect x="${padding.left + 220}" y="${legendY - 4}" width="8" height="8" fill="#f44336" transform="rotate(45 ${padding.left + 224} ${legendY})"/>`
    svg += `<text x="${padding.left + 238}" y="${legendY + 4}" fill="#666" font-size="10">恶化</text>`

    treatmentSvg.innerHTML = svg
    treatmentSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    treatmentSvg.querySelectorAll('[data-treatment]').forEach(el => {
      el.style.cursor = 'pointer'
      el.addEventListener('mouseenter', () => {
        const dayIdx = parseInt(el.getAttribute('data-treatment'))
        const dayData = days.find(d => d.day === dayIdx)
        if (dayData && dayData.treatment) {
          const t = dayData.treatment
          treatmentTooltipData = {
            date: t.treatmentDate,
            day: dayIdx,
            medication: t.medication,
            dosage: t.dosage || '--',
            condition: getConditionLabel(t.condition),
            conditionRaw: t.condition,
            notes: t.notes || ''
          }
        }
      })
      el.addEventListener('mouseleave', () => {
        treatmentTooltipData = null
      })
    })
  }

  function handleTreatmentMouseMove(e) {
    if (!treatmentTooltipEl) return
    const rect = treatmentSvg.parentElement.getBoundingClientRect()
    const x = e.clientX - rect.left + 16
    const y = e.clientY - rect.top - 10
    treatmentTooltipEl.style.left = x + 'px'
    treatmentTooltipEl.style.top = y + 'px'
  }
</script>

<div class="vaccine-container">
  <div class="tab-bar">
    <button
      class="sub-tab {activeTab === 'reminders' ? 'active' : ''}"
      on:click={() => activeTab = 'reminders'}
    >
      🔔 接种提醒 ({upcomingReminders.length})
    </button>
    <button
      class="sub-tab {activeTab === 'records' ? 'active' : ''}"
      on:click={() => activeTab = 'records'}
    >
      📋 接种记录
    </button>
    <button
      class="sub-tab {activeTab === 'schedule' ? 'active' : ''}"
      on:click={() => activeTab = 'schedule'}
    >
      📅 标准免疫程序
    </button>
    <button
      class="sub-tab {activeTab === 'disease' ? 'active' : ''}"
      on:click={() => activeTab = 'disease'}
    >
      🏥 疾病登记
    </button>
    <button
      class="sub-tab {activeTab === 'treatment' ? 'active' : ''}"
      on:click={() => activeTab = 'treatment'}
    >
      💊 疾病治疗
    </button>
    <button
      class="sub-tab {activeTab === 'monitor' ? 'active' : ''}"
      on:click={() => activeTab = 'monitor'}
    >
      📉 治疗监控
    </button>
    {#if activeTab === 'reminders' || activeTab === 'records'}
      <button class="btn-add" on:click={() => showVaccineForm = !showVaccineForm}>
        {showVaccineForm ? '取消' : '+ 登记接种'}
      </button>
    {/if}
    {#if activeTab === 'disease'}
      <button class="btn-add btn-add-disease" on:click={() => showDiseaseForm = !showDiseaseForm}>
        {showDiseaseForm ? '取消' : '+ 登记疾病'}
      </button>
    {/if}
  </div>

  {#if showVaccineForm}
    <div class="form-panel">
      <h4>登记接种记录</h4>
      <div class="form-grid">
        <div>
          <label for="v-livestock">选择牲畜</label>
          <select id="v-livestock" bind:value={newVaccine.livestockId}>
            <option value="">-- 请选择 --</option>
            {#each livestockList as l}
              <option value={l.id}>{l.earTag} - {l.breed}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="v-name">疫苗名称</label>
          <select id="v-name" bind:value={newVaccine.vaccineName}>
            <option value="">-- 请选择 --</option>
            {#if selectedBreed}
              {#each getVaccineOptions(selectedBreed) as v}
                <option value={v.name}>{v.name}</option>
              {/each}
            {/if}
          </select>
        </div>
        <div>
          <label for="v-date">接种日期</label>
          <input id="v-date" type="date" bind:value={newVaccine.vaccineDate} />
        </div>
        <div>
          <label for="v-type">接种类型</label>
          <select id="v-type" bind:value={newVaccine.type}>
            <option value="initial">首免</option>
            <option value="booster">加强免疫</option>
          </select>
        </div>
        <div>
          <label for="v-batch">疫苗批号</label>
          <input id="v-batch" type="text" bind:value={newVaccine.batchNumber} placeholder="例如：B20240101" />
        </div>
        <div>
          <label for="v-operator">接种人员</label>
          <input id="v-operator" type="text" bind:value={newVaccine.operator} />
        </div>
        <div class="full-width">
          <label for="v-notes">备注</label>
          <input id="v-notes" type="text" bind:value={newVaccine.notes} />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" on:click={saveVaccine}>保存记录</button>
      </div>
    </div>
  {/if}

  {#if showDiseaseForm}
    <div class="form-panel">
      <h4>🏥 登记疾病</h4>
      <div class="form-grid">
        <div>
          <label for="d-livestock">选择牲畜</label>
          <select id="d-livestock" bind:value={newDisease.livestockId}>
            <option value="">-- 请选择 --</option>
            {#each livestockList as l}
              <option value={l.id}>{l.earTag} - {l.breed}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="d-name">疾病名称</label>
          <input id="d-name" type="text" bind:value={newDisease.diseaseName} placeholder="例如：猪流感" />
        </div>
        <div>
          <label for="d-date">发病日期</label>
          <input id="d-date" type="date" bind:value={newDisease.diseaseDate} />
        </div>
        <div>
          <label for="d-severity">严重程度</label>
          <select id="d-severity" bind:value={newDisease.severity}>
            <option value="mild">轻度</option>
            <option value="moderate">中度</option>
            <option value="severe">重度</option>
          </select>
        </div>
        <div class="full-width">
          <label for="d-symptoms">症状描述</label>
          <textarea id="d-symptoms" bind:value={newDisease.symptoms} placeholder="描述发病症状..."></textarea>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-danger" on:click={saveDisease}>确认登记疾病</button>
      </div>
    </div>
  {/if}

  {#if activeTab === 'reminders'}
    <div class="panel">
      {#if upcomingReminders.length === 0}
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>30天内暂无待接种疫苗</p>
        </div>
      {:else}
        <table class="data-table">
          <thead>
            <tr>
              <th>耳标</th>
              <th>品种</th>
              <th>疫苗名称</th>
              <th>类型</th>
              <th>应接种日期</th>
              <th>剩余天数</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {#each upcomingReminders as r}
              <tr class:overdue={r.isOverdue}>
                <td><strong>{r.earTag}</strong></td>
                <td>{getLivestockById(r.livestockId)?.breed || '-'}</td>
                <td>{r.vaccineName}</td>
                <td>{r.type === 'initial' ? '首免' : '加强免疫'}</td>
                <td>{r.dueDate}</td>
                <td>
                  {#if r.isOverdue}
                    <span class="badge overdue">已逾期 {-r.daysLeft} 天</span>
                  {:else if r.daysLeft <= 7}
                    <span class="badge urgent">{r.daysLeft} 天</span>
                  {:else}
                    <span class="badge normal">{r.daysLeft} 天</span>
                  {/if}
                </td>
                <td>
                  {#if r.isOverdue}
                    <span class="status-danger">⚠ 逾期</span>
                  {:else if r.daysLeft <= 7}
                    <span class="status-warning">即将到期</span>
                  {:else}
                    <span class="status-normal">待接种</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {:else if activeTab === 'records'}
    <div class="panel">
      {#if livestockList.length === 0}
        <div class="empty-state">
          <p>暂无牲畜档案</p>
        </div>
      {:else}
        <div class="livestock-selector">
          <label for="v-select">选择牲畜查看接种记录:</label>
          <select id="v-select" bind:value={selectedLivestockId}>
            <option value={null}>全部记录</option>
            {#each livestockList as l}
              <option value={l.id}>{l.earTag} - {l.breed}</option>
            {/each}
          </select>
        </div>

        {#if filteredVaccineRecords.length === 0}
          <p class="empty-text">暂无接种记录</p>
        {:else}
          <table class="data-table">
            <thead>
              <tr>
                <th>耳标</th>
                <th>疫苗名称</th>
                <th>类型</th>
                <th>接种日期</th>
                <th>批号</th>
                <th>接种人员</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredVaccineRecords as r}
                <tr>
                  <td><strong>{getLivestockById(r.livestockId)?.earTag || '-'}</strong></td>
                  <td>{r.vaccineName}</td>
                  <td>{r.type === 'initial' ? '首免' : '加强免疫'}</td>
                  <td>{r.vaccineDate}</td>
                  <td><code>{r.batchNumber || '-'}</code></td>
                  <td>{r.operator || '-'}</td>
                  <td>{r.notes || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}
    </div>
  {:else if activeTab === 'schedule'}
    <div class="schedule-grid">
      {#each Object.entries(STANDARD_VACCINE_SCHEDULES) as [breed, vaccines]}
        <div class="panel schedule-card">
          <h4>{breed}</h4>
          <table class="data-table compact">
            <thead>
              <tr>
                <th>疫苗名称</th>
                <th>首免日龄</th>
                <th>加强免疫</th>
              </tr>
            </thead>
            <tbody>
              {#each vaccines as v}
                <tr>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.days} 日龄</td>
                  <td>{v.boosterDays ? v.boosterDays + ' 日龄' : '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
    </div>
  {:else if activeTab === 'disease'}
    <div class="panel">
      {#if livestockList.length === 0}
        <div class="empty-state">
          <p>暂无牲畜档案</p>
        </div>
      {:else}
        <div class="livestock-selector">
          <label for="d-select">筛选牲畜:</label>
          <select id="d-select" bind:value={selectedLivestockId}>
            <option value={null}>全部</option>
            {#each livestockList as l}
              <option value={l.id}>{l.earTag} - {l.breed}</option>
            {/each}
          </select>
        </div>

        {#if filteredDiseaseRecords.length === 0}
          <p class="empty-text">暂无疾病记录</p>
        {:else}
          <table class="data-table">
            <thead>
              <tr>
                <th>耳标</th>
                <th>疾病名称</th>
                <th>发病日期</th>
                <th>严重程度</th>
                <th>症状</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredDiseaseRecords as d}
                <tr class:disease-sick={d.status === 'sick'} class:disease-recovering={d.status === 'recovering'} class:disease-recovered={d.status === 'recovered'}>
                  <td><strong>{getLivestockById(d.livestockId)?.earTag || '-'}</strong></td>
                  <td>{d.diseaseName}</td>
                  <td>{d.diseaseDate}</td>
                  <td>
                    <span class="badge severity-{d.severity}">{getSeverityLabel(d.severity)}</span>
                  </td>
                  <td class="symptom-cell">{d.symptoms || '-'}</td>
                  <td>
                    <span class="badge status-{d.status}">{getStatusLabel(d.status)}</span>
                  </td>
                  <td class="action-cell">
                    {#if d.status === 'sick'}
                      <button class="link-btn" on:click={() => updateDiseaseStatus(d.id, 'recovering')}>标记恢复中</button>
                    {/if}
                    {#if d.status === 'recovering'}
                      <button class="link-btn success" on:click={() => updateDiseaseStatus(d.id, 'recovered')}>标记康复</button>
                    {/if}
                    <button class="link-btn danger" on:click={() => deleteDisease(d.id)}>删除</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}
    </div>
  {:else if activeTab === 'treatment'}
    <div class="treatment-layout">
      <div class="panel disease-list-panel">
        <div class="panel-header">
          <h4>患病牲畜列表</h4>
          <button class="btn btn-sm btn-danger" on:click={() => showTreatmentForm = !showTreatmentForm}>
            {showTreatmentForm ? '取消' : '+ 添加治疗'}
          </button>
        </div>
        {#if diseaseRecords.filter(d => d.status !== 'recovered').length === 0}
          <p class="empty-text">暂无患病牲畜</p>
        {:else}
          <div class="disease-cards">
            {#each diseaseRecords.filter(d => d.status !== 'recovered') as d}
              <button class="disease-card {String(selectedDiseaseId) === String(d.id) ? 'selected' : ''}" on:click={() => selectedDiseaseId = d.id}>
                <div class="dc-header">
                  <strong>{getLivestockById(d.livestockId)?.earTag || '-'}</strong>
                  <span class="badge severity-{d.severity}">{getSeverityLabel(d.severity)}</span>
                </div>
                <div class="dc-body">
                  <div>{d.diseaseName}</div>
                  <div class="dc-date">{d.diseaseDate}</div>
                  <span class="badge status-{d.status}">{getStatusLabel(d.status)}</span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="panel treatment-detail-panel">
        {#if selectedDiseaseDetail}
          <h4>{selectedDiseaseDetail.diseaseName} - 治疗记录</h4>
          <div class="disease-info-bar">
            <span>牲畜: {getLivestockById(selectedDiseaseDetail.livestockId)?.earTag || '-'}</span>
            <span>发病: {selectedDiseaseDetail.diseaseDate}</span>
            <span>严重程度: {getSeverityLabel(selectedDiseaseDetail.severity)}</span>
            <span class="badge status-{selectedDiseaseDetail.status}">{getStatusLabel(selectedDiseaseDetail.status)}</span>
          </div>

          {#if selectedDiseaseTreatments.length === 0}
            <p class="empty-text">暂无治疗记录，请点击"添加治疗"按钮</p>
          {:else}
            <table class="data-table">
              <thead>
                <tr>
                  <th>治疗日期</th>
                  <th>用药名称</th>
                  <th>剂量</th>
                  <th>病情状态</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {#each selectedDiseaseTreatments as t}
                  <tr class:cond-improving={t.condition === 'improving'} class:cond-worsening={t.condition === 'worsening'}>
                    <td>{t.treatmentDate}</td>
                    <td><strong>{t.medication}</strong></td>
                    <td>{t.dosage || '-'}</td>
                    <td>
                      <span class="badge cond-{t.condition}">{getConditionLabel(t.condition)}</span>
                    </td>
                    <td>{t.notes || '-'}</td>
                    <td>
                      <button class="link-btn danger" on:click={() => deleteTreatment(t.id)}>删除</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        {:else}
          <p class="empty-text">请从左侧选择一个患病牲畜查看治疗记录</p>
        {/if}
      </div>
    </div>

    {#if showTreatmentForm}
      <div class="form-panel">
        <h4>💊 添加治疗记录</h4>
        <div class="form-grid">
          <div>
            <label for="t-disease">选择疾病记录</label>
            <select id="t-disease" bind:value={newTreatment.diseaseId}>
              <option value="">-- 请选择 --</option>
              {#each diseaseRecords.filter(d => d.status !== 'recovered') as d}
                <option value={d.id}>{getLivestockById(d.livestockId)?.earTag || '-'} - {d.diseaseName}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="t-date">治疗日期</label>
            <input id="t-date" type="date" bind:value={newTreatment.treatmentDate} />
          </div>
          <div>
            <label for="t-med">用药名称</label>
            <input id="t-med" type="text" bind:value={newTreatment.medication} placeholder="例如：阿莫西林" />
          </div>
          <div>
            <label for="t-dosage">剂量</label>
            <input id="t-dosage" type="text" bind:value={newTreatment.dosage} placeholder="例如：10mg/kg" />
          </div>
          <div>
            <label for="t-cond">病情状态</label>
            <select id="t-cond" bind:value={newTreatment.condition}>
              <option value="improving">好转</option>
              <option value="stable">稳定</option>
              <option value="worsening">恶化</option>
            </select>
          </div>
          <div>
            <label for="t-notes">备注</label>
            <input id="t-notes" type="text" bind:value={newTreatment.notes} />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" on:click={saveTreatment}>保存治疗记录</button>
        </div>
      </div>
    {/if}
  {:else if activeTab === 'monitor'}
    <div class="panel">
      <div class="panel-header">
        <h4>📉 疾病治疗监控曲线</h4>
        <div>
          <label for="m-disease" class="inline-label">选择疾病记录:</label>
          <select id="m-disease" bind:value={selectedDiseaseId}>
            <option value={null}>-- 请选择 --</option>
            {#each diseaseRecords as d}
              <option value={d.id}>{getLivestockById(d.livestockId)?.earTag || '-'} - {d.diseaseName} ({d.diseaseDate})</option>
            {/each}
          </select>
        </div>
      </div>

      {#if selectedDiseaseDetail}
        <div class="monitor-info">
          <span>牲畜: <strong>{getLivestockById(selectedDiseaseDetail.livestockId)?.earTag || '-'}</strong></span>
          <span>疾病: <strong>{selectedDiseaseDetail.diseaseName}</strong></span>
          <span>发病日期: {selectedDiseaseDetail.diseaseDate}</span>
          <span>严重程度: {getSeverityLabel(selectedDiseaseDetail.severity)}</span>
          <span class="badge status-{selectedDiseaseDetail.status}">{getStatusLabel(selectedDiseaseDetail.status)}</span>
        </div>
        <div class="chart-container">
          <svg bind:this={treatmentSvg} class="treatment-chart" role="img" aria-label="治疗监控曲线" on:mousemove={handleTreatmentMouseMove}></svg>
          {#if treatmentTooltipData}
            <div class="chart-tooltip" bind:this={treatmentTooltipEl}>
              <div class="tip-date">第{treatmentTooltipData.day}天 - {treatmentTooltipData.date}</div>
              <div class="tip-row"><span>用药:</span><span class="tip-med">{treatmentTooltipData.medication}</span></div>
              <div class="tip-row"><span>剂量:</span><span>{treatmentTooltipData.dosage}</span></div>
              <div class="tip-row">
                <span>病情:</span>
                <span class={treatmentTooltipData.conditionRaw === 'improving' ? 'text-success' : (treatmentTooltipData.conditionRaw === 'worsening' ? 'text-danger' : 'text-warning')}>
                  {treatmentTooltipData.condition}
                </span>
              </div>
              {#if treatmentTooltipData.notes}
                <div class="tip-notes">{treatmentTooltipData.notes}</div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="treatment-timeline">
          <h5>每日治疗情况</h5>
          {#if selectedDiseaseTreatments.length === 0}
            <p class="empty-text">暂无治疗记录</p>
          {:else}
            <div class="timeline-items">
              {#each selectedDiseaseTreatments as t}
                <div class="timeline-item cond-{t.condition}">
                  <div class="tl-dot"></div>
                  <div class="tl-content">
                    <div class="tl-date">{t.treatmentDate}</div>
                    <div class="tl-med">{t.medication} {t.dosage ? '(' + t.dosage + ')' : ''}</div>
                    <div class="tl-condition">{getConditionLabel(t.condition)}</div>
                    {#if t.notes}<div class="tl-notes">{t.notes}</div>{/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <p class="empty-text">请选择一个疾病记录查看治疗监控曲线</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .vaccine-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .tab-bar {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .sub-tab {
    padding: 10px 20px;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-light);
    transition: all 0.2s;
  }

  .sub-tab:hover {
    border-color: var(--primary-light);
    color: var(--primary);
  }

  .sub-tab.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .btn-add {
    margin-left: auto;
    padding: 10px 20px;
    background: var(--secondary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .btn-add:hover {
    background: #f57c00;
  }

  .btn-add-disease {
    background: #e53935;
  }

  .btn-add-disease:hover {
    background: #c62828;
  }

  .form-panel {
    background: var(--card-bg);
    padding: 24px;
    border-radius: 10px;
    box-shadow: var(--shadow);
  }

  .form-panel h4 {
    margin-bottom: 16px;
    color: var(--text);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-grid > div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-grid .full-width {
    grid-column: 1 / -1;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-light);
  }

  .inline-label {
    margin-right: 8px;
  }

  input, select, textarea {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
  }

  textarea {
    min-height: 60px;
    resize: vertical;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--primary);
  }

  .form-actions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .btn {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-dark);
  }

  .btn-danger {
    background: var(--danger);
    color: white;
  }

  .btn-danger:hover {
    background: #c62828;
  }

  .btn-sm {
    padding: 6px 14px;
    font-size: 12px;
  }

  .panel {
    background: var(--card-bg);
    padding: 24px;
    border-radius: 10px;
    box-shadow: var(--shadow);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .panel-header h4 {
    font-size: 16px;
    color: var(--text);
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-light);
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table.compact th,
  .data-table.compact td {
    padding: 8px 10px;
  }

  .data-table th, .data-table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  .data-table th {
    background: #f8f9fa;
    font-weight: 600;
    color: var(--text-light);
  }

  .data-table tr:hover {
    background: #fafafa;
  }

  .data-table tr.overdue {
    background: #fff5f5;
  }

  .data-table tr.disease-sick {
    background: #fff5f5;
  }

  .data-table tr.disease-recovering {
    background: #fff8e1;
  }

  .data-table tr.disease-recovered {
    background: #f1f8e9;
  }

  .data-table tr.cond-improving {
    background: #f1f8e9;
  }

  .data-table tr.cond-worsening {
    background: #fff5f5;
  }

  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }

  .badge {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .badge.overdue {
    background: #ffebee;
    color: #c62828;
  }

  .badge.urgent {
    background: #fff3e0;
    color: #e65100;
  }

  .badge.normal {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge.severity-mild {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge.severity-moderate {
    background: #fff3e0;
    color: #e65100;
  }

  .badge.severity-severe {
    background: #ffebee;
    color: #c62828;
  }

  .badge.status-sick {
    background: #ffebee;
    color: #c62828;
  }

  .badge.status-recovering {
    background: #fff3e0;
    color: #e65100;
  }

  .badge.status-recovered {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge.cond-improving {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .badge.cond-stable {
    background: #fff3e0;
    color: #e65100;
  }

  .badge.cond-worsening {
    background: #ffebee;
    color: #c62828;
  }

  .status-danger {
    color: var(--danger);
    font-weight: 600;
  }

  .status-warning {
    color: var(--secondary);
    font-weight: 600;
  }

  .status-normal {
    color: var(--primary);
  }

  .text-danger {
    color: #f44336;
    font-weight: 700;
  }

  .text-warning {
    color: #ff9800;
    font-weight: 700;
  }

  .text-success {
    color: #4caf50;
    font-weight: 700;
  }

  .livestock-selector {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }

  .livestock-selector label {
    font-size: 14px;
    color: var(--text);
  }

  .empty-text {
    text-align: center;
    padding: 30px;
    color: var(--text-light);
  }

  .schedule-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
  }

  .schedule-card h4 {
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--primary-light);
    color: var(--primary-dark);
  }

  .symptom-cell {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action-cell {
    white-space: nowrap;
  }

  .link-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 6px;
    color: var(--primary);
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  .link-btn.success {
    color: #2e7d32;
  }

  .link-btn.danger {
    color: var(--danger);
  }

  .treatment-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 20px;
  }

  .disease-list-panel h4 {
    font-size: 14px;
    color: var(--text);
  }

  .disease-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .disease-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--card-bg);
    text-align: left;
    width: 100%;
    font-family: inherit;
  }

  .disease-card:hover {
    border-color: var(--primary);
  }

  .disease-card.selected {
    border-color: var(--primary);
    background: rgba(46, 125, 50, 0.05);
    box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
  }

  .dc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .dc-body {
    font-size: 13px;
    color: var(--text-light);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dc-date {
    font-size: 12px;
  }

  .disease-info-bar {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--text-light);
    flex-wrap: wrap;
  }

  .chart-container {
    width: 100%;
    overflow-x: auto;
    position: relative;
    margin-bottom: 20px;
  }

  .treatment-chart {
    width: 100%;
    height: 340px;
  }

  .chart-tooltip {
    position: absolute;
    background: rgba(33, 33, 33, 0.92);
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 12px;
    pointer-events: none;
    z-index: 100;
    min-width: 180px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  }

  .tip-date {
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.2);
  }

  .tip-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 2px 0;
  }

  .tip-row span:first-child {
    color: rgba(255,255,255,0.7);
  }

  .tip-med {
    font-weight: 700;
    color: #64b5f6;
  }

  .tip-notes {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.7);
    font-size: 11px;
  }

  .monitor-info {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--text-light);
    flex-wrap: wrap;
  }

  .treatment-timeline {
    margin-top: 20px;
  }

  .treatment-timeline h5 {
    font-size: 14px;
    color: var(--text);
    margin-bottom: 16px;
  }

  .timeline-items {
    display: flex;
    gap: 0;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .timeline-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 140px;
    position: relative;
    padding: 0 8px;
  }

  .timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: var(--border);
    z-index: 0;
  }

  .tl-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff9800;
    border: 3px solid white;
    box-shadow: 0 0 0 2px #ff9800;
    z-index: 1;
    margin-bottom: 8px;
  }

  .timeline-item.cond-improving .tl-dot {
    background: #4caf50;
    box-shadow: 0 0 0 2px #4caf50;
  }

  .timeline-item.cond-worsening .tl-dot {
    background: #f44336;
    box-shadow: 0 0 0 2px #f44336;
  }

  .tl-content {
    text-align: center;
    font-size: 12px;
  }

  .tl-date {
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
  }

  .tl-med {
    color: var(--primary);
    font-weight: 500;
    margin-bottom: 2px;
  }

  .tl-condition {
    font-size: 11px;
    color: var(--text-light);
  }

  .tl-notes {
    font-size: 11px;
    color: var(--text-light);
    font-style: italic;
    margin-top: 2px;
  }

  @media (max-width: 900px) {
    .treatment-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
