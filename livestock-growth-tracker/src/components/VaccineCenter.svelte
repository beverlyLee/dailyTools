<script>
  import { onMount } from 'svelte'
  import { STORES, add, getByIndex, getAll } from '../lib/db.js'
  import { generateVaccineReminders, getUpcomingReminders, addDays, STANDARD_VACCINE_SCHEDULES } from '../lib/vaccine.js'

  export let livestockList = []

  let vaccineRecords = []
  let reminders = []
  let upcomingReminders = []
  let selectedLivestockId = null
  let showVaccineForm = false
  let activeTab = 'reminders'

  let newVaccine = {
    livestockId: '',
    vaccineName: '',
    vaccineDate: new Date().toISOString().split('T')[0],
    batchNumber: '',
    type: 'initial',
    operator: '',
    notes: ''
  }

  $: filteredVaccineRecords = selectedLivestockId
    ? vaccineRecords
        .filter(r => r.livestockId === parseInt(selectedLivestockId))
        .sort((a, b) => new Date(b.vaccineDate) - new Date(a.vaccineDate))
    : [...vaccineRecords].sort((a, b) => new Date(b.vaccineDate) - new Date(a.vaccineDate))

  async function loadVaccineRecords() {
    vaccineRecords = await getAll(STORES.VACCINE_RECORDS)
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

  function getLivestockById(id) {
    return livestockList.find(l => l.id === id)
  }

  function getLivestockRecords(id) {
    return vaccineRecords
      .filter(r => r.livestockId === id)
      .sort((a, b) => new Date(b.vaccineDate) - new Date(a.vaccineDate))
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

  onMount(async () => {
    await loadVaccineRecords()
    buildReminders()
  })

  $: {
    if (livestockList.length > 0) {
      buildReminders()
    }
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
    <button class="btn-add" on:click={() => showVaccineForm = !showVaccineForm}>
      {showVaccineForm ? '取消' : '+ 登记接种'}
    </button>
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

  input, select {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
  }

  input:focus, select:focus {
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

  .panel {
    background: var(--card-bg);
    padding: 24px;
    border-radius: 10px;
    box-shadow: var(--shadow);
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
</style>
