<script>
  import { onMount, onDestroy } from 'svelte'
  import { navigate } from 'svelte-routing'
  import { musicAPI, compositionAPI } from '../lib/api'

  export let id = null
  export let shareToken = null

  let composition = null
  let midiData = null
  let tracks = []
  let selectedTrack = 0
  let isPlaying = false
  let currentTime = 0
  let error = ''
  let isLoading = true
  let title = ''
  let isSaving = false

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const minNote = 36
  const maxNote = 84
  const pixelsPerBeat = 80
  const noteHeight = 20
  const totalBeats = 16

  let canvas
  let gridCanvas
  let animationFrame

  $: totalNotes = maxNote - minNote + 1
  $: canvasHeight = totalNotes * noteHeight
  $: canvasWidth = totalBeats * pixelsPerBeat

  onMount(async () => {
    await loadComposition()
  })

  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  })

  async function loadComposition() {
    isLoading = true
    error = ''

    try {
      if (shareToken) {
        composition = await compositionAPI.getByShareToken(shareToken)
      } else if (id) {
        composition = await compositionAPI.get(id)
      }

      if (composition) {
        midiData = composition.midi_data
        title = composition.title
      } else {
        const tempMidi = localStorage.getItem('temp_midi_data')
        if (tempMidi) {
          midiData = tempMidi
          title = '未命名作品'
        } else {
          midiData = createEmptyMidi()
          title = '新作品'
        }
      }

      if (midiData) {
        parseMidiData(midiData)
      }
    } catch (err) {
      error = err.message || '加载失败'
    } finally {
      isLoading = false
    }
  }

  function createEmptyMidi() {
    return JSON.stringify({
      tracks: [{
        name: 'Melody',
        instrument: 'Piano',
        notes: []
      }],
      tempo: 120,
      time_signature: '4/4'
    })
  }

  function parseMidiData(data) {
    try {
      const parsed = JSON.parse(data)
      tracks = parsed.tracks || []
      if (tracks.length === 0) {
        tracks = [{
          name: 'Melody',
          instrument: 'Piano',
          notes: []
        }]
      }
    } catch (err) {
      error = '解析 MIDI 数据失败'
    }
  }

  function getNoteName(pitch) {
    const octave = Math.floor(pitch / 12) - 1
    const note = pitch % 12
    return `${noteNames[note]}${octave}`
  }

  function beatToX(beat) {
    return beat * pixelsPerBeat
  }

  function pitchToY(pitch) {
    return (maxNote - pitch) * noteHeight
  }

  function xToBeat(x) {
    return Math.round(x / pixelsPerBeat * 4) / 4
  }

  function yToPitch(y) {
    return maxNote - Math.floor(y / noteHeight)
  }

  function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const beat = xToBeat(x)
    const pitch = yToPitch(y)

    const track = tracks[selectedTrack]
    if (!track) return

    const existingNoteIndex = track.notes.findIndex(n => 
      n.pitch === pitch && n.start <= beat && n.start + n.duration > beat
    )

    if (existingNoteIndex >= 0) {
      track.notes.splice(existingNoteIndex, 1)
    } else {
      track.notes.push({
        pitch,
        start: beat,
        duration: 0.25,
        velocity: 80
      })
    }

    updateMidiData()
  }

  function addNote(pitch, start, duration, velocity = 80) {
    const track = tracks[selectedTrack]
    if (!track) return

    track.notes.push({
      pitch,
      start,
      duration,
      velocity
    })

    updateMidiData()
  }

  function removeNote(index) {
    const track = tracks[selectedTrack]
    if (!track || index < 0 || index >= track.notes.length) return

    track.notes.splice(index, 1)
    updateMidiData()
  }

  function updateNote(index, updates) {
    const track = tracks[selectedTrack]
    if (!track || index < 0 || index >= track.notes.length) return

    Object.assign(track.notes[index], updates)
    updateMidiData()
  }

  function updateMidiData() {
    const data = {
      tracks,
      tempo: 120,
      time_signature: '4/4'
    }
    midiData = JSON.stringify(data)
  }

  function togglePlay() {
    if (isPlaying) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }

  function startPlayback() {
    isPlaying = true
    currentTime = 0
    animate()
  }

  function stopPlayback() {
    isPlaying = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  }

  function animate() {
    if (!isPlaying) return

    currentTime += 0.02
    if (currentTime >= totalBeats) {
      currentTime = 0
    }

    animationFrame = requestAnimationFrame(animate)
  }

  async function saveComposition() {
    if (!title.trim()) {
      error = '请输入标题'
      return
    }

    isSaving = true
    error = ''

    try {
      if (composition?.id) {
        await compositionAPI.update(composition.id, {
          title: title.trim(),
          midi_data: midiData
        })
      } else {
        composition = await compositionAPI.create({
          title: title.trim(),
          keywords: '编辑器创作',
          folk_ratio: 0.5,
          modern_ratio: 0.5,
          midi_data: midiData
        })
      }
    } catch (err) {
      error = err.message || '保存失败'
    } finally {
      isSaving = false
    }
  }

  async function shareComposition() {
    if (!composition?.id) {
      await saveComposition()
    }

    try {
      const result = await compositionAPI.share(composition.id)
      const shareUrl = `${window.location.origin}/share/${result.share_token}`
      
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert(`分享链接已复制到剪贴板：${shareUrl}`)
      } catch {
        alert(`分享链接：${shareUrl}`)
      }
    } catch (err) {
      error = err.message || '分享失败'
    }
  }

  async function forkComposition() {
    if (!composition?.id) return

    try {
      const fork = await compositionAPI.fork(composition.id, `${title} (副本)`)
      navigate(`/editor/${fork.id}`)
    } catch (err) {
      error = err.message || '创建副本失败'
    }
  }

  async function exportMidi() {
    try {
      const response = await musicAPI.exportMidiRaw(midiData)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'music'}.mid`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      error = err.message || '导出失败'
    }
  }
</script>

<div class="piano-roll-editor">
  <div class="editor-header">
    <div class="header-left">
      <input
        type="text"
        class="title-input"
        bind:value={title}
        placeholder="作品标题"
      />
      {#if composition?.id}
        <span class="badge badge-primary">已保存</span>
      {/if}
    </div>

    <div class="header-actions">
      <button class="btn btn-ghost" on:click={togglePlay}>
        {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
      </button>
      <button class="btn btn-primary" on:click={saveComposition} disabled={isSaving}>
        {isSaving ? '保存中...' : '💾 保存'}
      </button>
      <button class="btn btn-secondary" on:click={shareComposition}>
        🔗 分享
      </button>
      <button class="btn btn-secondary" on:click={forkComposition}>
        📋 创建副本
      </button>
      <button class="btn btn-secondary" on:click={exportMidi}>
        📥 导出 MIDI
      </button>
    </div>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if isLoading}
    <div class="loading-state">
      <span class="loading">
        <span class="spinner" />
        加载中...
      </span>
    </div>
  {:else}
    <div class="editor-body">
      <div class="track-sidebar">
        <h3>音轨</h3>
        <div class="track-list">
          {#each tracks as track, index}
            <button
              class="track-item"
              class:active={selectedTrack === index}
              on:click={() => selectedTrack = index}
            >
              <span class="track-icon">🎵</span>
              <span class="track-name">{track.name}</span>
              <span class="track-instrument">{track.instrument}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="editor-canvas">
        <div class="piano-keys">
          {#each Array.from({ length: totalNotes }, (_, i) => maxNote - i) as pitch}
            <div
              class="piano-key"
              class:black={noteNames[pitch % 12].includes('#')}
              class:active={false}
            >
              <span class="note-label">{getNoteName(pitch)}</span>
            </div>
          {/each}
        </div>

        <div class="grid-container">
          <div class="time-ruler">
            {#each Array.from({ length: totalBeats + 1 }, (_, i) => i) as beat}
              <div
                class="time-mark"
                style="left: {beat * pixelsPerBeat}px"
              >
                {beat + 1}
              </div>
            {/each}
          </div>

          <canvas
            bind:this={canvas}
            width={canvasWidth}
            height={canvasHeight}
            class="grid-canvas"
            on:click={handleCanvasClick}
          />

          {#if tracks[selectedTrack]}
            {#each tracks[selectedTrack].notes as note, index}
              <div
                class="note-block"
                style="
                  left: {beatToX(note.start)}px;
                  top: {pitchToY(note.pitch)}px;
                  width: {note.duration * pixelsPerBeat}px;
                  height: {noteHeight - 2}px;
                "
                title="点击删除此音符"
              />
            {/each}
          {/if}

          {#if isPlaying}
            <div
              class="playhead"
              style="left: {beatToX(currentTime)}px"
            />
          {/if}
        </div>
      </div>

      <div class="note-inspector">
        <h3>音符编辑</h3>
        
        {#if tracks[selectedTrack]?.notes.length > 0}
          <div class="note-list">
            {#each tracks[selectedTrack].notes as note, index}
              <div class="note-item">
                <div class="note-info">
                  <span class="note-pitch">{getNoteName(note.pitch)}</span>
                  <span class="note-time">
                    时间: {note.start.toFixed(2)} - {(note.start + note.duration).toFixed(2)}
                  </span>
                </div>
                <div class="note-controls">
                  <button
                    class="btn btn-ghost btn-sm"
                    on:click={() => removeNote(index)}
                  >
                    删除
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-notes">
            <p>点击网格添加音符</p>
            <p class="hint">点击已有音符可删除</p>
          </div>
        {/if}

        <div class="divider" />

        <div class="quick-add">
          <h4>快速添加</h4>
          <div class="pitch-selector">
            {#each ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] as noteName}
              <button
                class="pitch-btn"
                on:click={() => {
                  const pitch = noteNames.indexOf(noteName.slice(0, -1)) + (parseInt(noteName.slice(-1)) + 1) * 12
                  addNote(pitch, currentTime, 0.25)
                }}
              >
                {noteName}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .piano-roll-editor {
    max-width: 100%;
    height: calc(100vh - 84px);
    display: flex;
    flex-direction: column;
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    gap: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .title-input {
    font-size: 20px;
    font-weight: 600;
    padding: 8px 12px;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    transition: var(--transition);
  }

  .title-input:focus {
    outline: none;
    border-color: var(--primary-color);
    background: var(--bg-color);
  }

  .header-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  .error-message {
    padding: 12px 16px;
    background: rgba(198, 40, 40, 0.1);
    border: 1px solid var(--error-color);
    border-radius: var(--radius-md);
    color: var(--error-color);
    margin: 16px 24px;
  }

  .loading-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .editor-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .track-sidebar {
    width: 200px;
    background: white;
    border-right: 1px solid var(--border-color);
    padding: 16px;
    overflow-y: auto;
  }

  .track-sidebar h3 {
    font-size: 14px;
    margin-bottom: 12px;
    color: var(--text-light);
  }

  .track-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .track-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: var(--radius-md);
    background: var(--bg-color);
    border: 2px solid transparent;
    transition: var(--transition);
    width: 100%;
    text-align: left;
  }

  .track-item:hover {
    background: rgba(196, 30, 58, 0.05);
  }

  .track-item.active {
    background: rgba(196, 30, 58, 0.1);
    border-color: var(--primary-color);
  }

  .track-icon {
    font-size: 16px;
  }

  .track-name {
    font-weight: 500;
    font-size: 13px;
  }

  .track-instrument {
    font-size: 11px;
    color: var(--text-light);
  }

  .editor-canvas {
    flex: 1;
    display: flex;
    overflow: auto;
    background: var(--bg-dark);
  }

  .piano-keys {
    flex-shrink: 0;
    width: 60px;
    background: #2a2a3a;
  }

  .piano-key {
    height: {noteHeight}px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    background: linear-gradient(90deg, #3a3a4a, #2a2a3a);
    border-bottom: 1px solid #1a1a2a;
  }

  .piano-key.black {
    background: linear-gradient(90deg, #1a1a2a, #0a0a1a);
  }

  .note-label {
    font-size: 9px;
  }

  .grid-container {
    flex: 1;
    position: relative;
    overflow: auto;
    min-width: {canvasWidth}px;
  }

  .time-ruler {
    position: sticky;
    top: 0;
    height: 24px;
    background: #2a2a3a;
    border-bottom: 1px solid #1a1a2a;
    z-index: 10;
  }

  .time-mark {
    position: absolute;
    top: 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    width: 40px;
    text-align: center;
  }

  .grid-canvas {
    display: block;
    background: 
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent {pixelsPerBeat - 1}px,
        #3a3a4a {pixelsPerBeat - 1}px,
        #3a3a4a {pixelsPerBeat}px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent {noteHeight - 1}px,
        #3a3a4a {noteHeight - 1}px,
        #3a3a4a {noteHeight}px
      );
    cursor: crosshair;
  }

  .note-block {
    position: absolute;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: var(--transition);
  }

  .note-block:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(196, 30, 58, 0.4);
  }

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--secondary-light);
    z-index: 20;
    pointer-events: none;
  }

  .note-inspector {
    width: 280px;
    background: white;
    border-left: 1px solid var(--border-color);
    padding: 16px;
    overflow-y: auto;
  }

  .note-inspector h3,
  .note-inspector h4 {
    font-size: 14px;
    margin-bottom: 12px;
    color: var(--text-light);
  }

  .note-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .note-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--bg-color);
    border-radius: var(--radius-sm);
  }

  .note-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .note-pitch {
    font-weight: 600;
    color: var(--primary-color);
  }

  .note-time {
    font-size: 11px;
    color: var(--text-light);
  }

  .empty-notes {
    text-align: center;
    padding: 24px;
    color: var(--text-light);
  }

  .empty-notes .hint {
    font-size: 12px;
    margin-top: 8px;
  }

  .pitch-selector {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .pitch-btn {
    padding: 8px;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 12px;
    transition: var(--transition);
  }

  .pitch-btn:hover {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  @media (max-width: 1024px) {
    .editor-body {
      flex-direction: column;
    }

    .track-sidebar,
    .note-inspector {
      width: 100%;
      height: auto;
      max-height: 200px;
    }

    .editor-canvas {
      order: -1;
    }
  }
</style>
