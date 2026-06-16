<script>
  import { createEventDispatcher } from 'svelte'
  import { STORES, add } from '../lib/db.js'
  import { BREED_CONFIG } from '../lib/growthModel.js'
  import { generateEarTag } from '../lib/mockData.js'

  const dispatch = createEventDispatcher()

  let form = {
    earTag: generateEarTag(),
    breed: '杜洛克猪',
    birthDate: new Date().toISOString().split('T')[0],
    gender: '公',
    sire: '',
    dam: '',
    notes: ''
  }

  const breedOptions = Object.keys(BREED_CONFIG)

  function regenerateEarTag() {
    form.earTag = generateEarTag()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const id = await add(STORES.LIVESTOCK, form)
      dispatch('saved', { id, ...form })
    } catch (err) {
      if (err.name === 'ConstraintError') {
        alert('耳标编号已存在，请重新生成')
      } else {
        alert('保存失败: ' + err.message)
      }
    }
  }

  function handleCancel() {
    dispatch('close')
  }
</script>

<div class="form-panel">
  <form on:submit={handleSubmit}>
    <div class="form-grid">
      <div class="form-group">
        <label for="f-eartag">电子耳标编号 <span class="required">*</span></label>
        <div class="input-with-btn">
          <input id="f-eartag" type="text" bind:value={form.earTag} required readonly />
          <button type="button" class="btn-regenerate" on:click={regenerateEarTag}>
            🔄 重新生成
          </button>
        </div>
        <small class="hint">系统自动生成唯一标识</small>
      </div>

      <div class="form-group">
        <label for="f-breed">品种 <span class="required">*</span></label>
        <select id="f-breed" bind:value={form.breed} required>
          {#each breedOptions as breed}
            <option value={breed}>{breed}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="f-birth">出生日期 <span class="required">*</span></label>
        <input id="f-birth" type="date" bind:value={form.birthDate} required />
      </div>

      <div class="form-group">
        <label for="f-gender">性别</label>
        <select id="f-gender" bind:value={form.gender}>
          <option value="公">公</option>
          <option value="母">母</option>
          <option value="未知">未知</option>
        </select>
      </div>

      <div class="form-group">
        <label for="f-sire">父本系谱 (父耳号)</label>
        <input id="f-sire" type="text" bind:value={form.sire} placeholder="例如：S001" />
      </div>

      <div class="form-group">
        <label for="f-dam">母本系谱 (母耳号)</label>
        <input id="f-dam" type="text" bind:value={form.dam} placeholder="例如：D001" />
      </div>

      <div class="form-group full-width">
        <label for="f-notes">备注信息</label>
        <textarea id="f-notes" bind:value={form.notes} rows="3" placeholder="输入备注信息..."></textarea>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" on:click={handleCancel}>
        取消
      </button>
      <button type="submit" class="btn btn-primary">
        保存档案
      </button>
    </div>
  </form>
</div>

<style>
  .form-panel {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 28px;
    box-shadow: var(--shadow);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .required {
    color: var(--danger);
  }

  input, select, textarea {
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--primary);
  }

  input[readonly] {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .input-with-btn {
    display: flex;
    gap: 8px;
  }

  .input-with-btn input {
    flex: 1;
  }

  .btn-regenerate {
    padding: 10px 14px;
    background: var(--info);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
  }

  .btn-regenerate:hover {
    background: #1976d2;
  }

  .hint {
    font-size: 11px;
    color: var(--text-light);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  .btn {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
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

  .btn-secondary {
    background: #f5f5f5;
    color: var(--text);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    background: #eee;
  }
</style>
