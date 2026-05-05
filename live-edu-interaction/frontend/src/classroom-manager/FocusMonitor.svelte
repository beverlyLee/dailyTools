<script>
  import { onMount, onDestroy } from 'svelte'
  import * as tf from '@tensorflow/tfjs'
  import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
  import { classroomState, user } from '../store/classroomStore.js'
  import { emit } from '../utils/websocket.js'

  let videoRef
  let model = null
  let isMonitoring = false
  let focusScore = 100
  let monitoringInterval = null
  let isModelLoaded = false
  let errorMsg = ''

  let isTeacher = false
  const unsub = user.subscribe(u => {
    isTeacher = u.role === 'teacher'
  })

  async function loadModel() {
    try {
      errorMsg = '正在加载面部识别模型...'
      await tf.ready()
      model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: 'tfjs' }
      )
      isModelLoaded = true
      errorMsg = ''
      console.log('Face landmarks model loaded')
    } catch (err) {
      console.error('Failed to load model:', err)
      errorMsg = '模型加载失败，专注度监测功能不可用'
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef) {
        videoRef.srcObject = stream
        await videoRef.play()
      }
      return stream
    } catch (err) {
      console.error('Failed to access camera:', err)
      errorMsg = '无法访问摄像头，请检查权限设置'
      return null
    }
  }

  async function startMonitoring() {
    if (isMonitoring) return

    if (!isModelLoaded) {
      await loadModel()
    }

    const stream = await startCamera()
    if (!stream) return

    isMonitoring = true
    focusScore = 100

    monitoringInterval = setInterval(async () => {
      if (!model || !videoRef) return

      try {
        const faces = await model.estimateFaces(videoRef)
        
        if (faces.length === 0) {
          focusScore = Math.max(0, focusScore - 5)
        } else {
          const face = faces[0]
          const score = calculateFocusScore(face)
          focusScore = Math.min(100, Math.max(0, focusScore * 0.7 + score * 0.3))
        }

        emit('focus-score', { score: Math.round(focusScore) })

      } catch (err) {
        console.error('Error during detection:', err)
      }
    }, 2000)
  }

  function calculateFocusScore(face) {
    const keypoints = face.keypoints

    const leftEye = keypoints[33]
    const rightEye = keypoints[263]
    const noseTip = keypoints[1]

    const eyeY = (leftEye.y + rightEye.y) / 2
    const noseY = noseTip.y

    const verticalDistance = noseY - eyeY
    const verticalThreshold = 30

    if (Math.abs(verticalDistance - 50) > verticalThreshold) {
      return 60
    }

    const eyeDistance = Math.abs(leftEye.x - rightEye.x)
    if (eyeDistance < 40) {
      return 70
    }

    const leftEyeUpper = keypoints[386]
    const leftEyeLower = keypoints[374]
    const rightEyeUpper = keypoints[159]
    const rightEyeLower = keypoints[145]

    const leftEyeOpen = Math.abs(leftEyeUpper.y - leftEyeLower.y)
    const rightEyeOpen = Math.abs(rightEyeUpper.y - rightEyeLower.y)

    if (leftEyeOpen < 5 || rightEyeOpen < 5) {
      return 50
    }

    return 95
  }

  function stopMonitoring() {
    isMonitoring = false
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
    if (videoRef && videoRef.srcObject) {
      videoRef.srcObject.getTracks().forEach(track => track.stop())
      videoRef.srcObject = null
    }
  }

  function getFocusStatus(score) {
    if (score >= 70) return { label: '专注', color: '#22c55e', bg: '#dcfce7' }
    if (score >= 40) return { label: '一般', color: '#f59e0b', bg: '#fef3c7' }
    return { label: '不专注', color: '#ef4444', bg: '#fee2e2' }
  }

  onDestroy(() => {
    stopMonitoring()
    unsub()
  })
</script>

<style>
  .focus-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .student-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .camera-container {
    width: 400px;
    max-width: 100%;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  }

  .video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #1a1a2e;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }

  .camera-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6b7280;
  }

  .placeholder-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .focus-display {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .focus-score-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    position: relative;
  }

  .focus-score-circle::before {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: white;
  }

  .score-text {
    position: relative;
    z-index: 1;
  }

  .focus-info {
    flex: 1;
  }

  .focus-status {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .focus-description {
    font-size: 13px;
    color: #6b7280;
  }

  .monitor-btn {
    padding: 12px 32px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.2s;
    margin-top: 16px;
  }

  .monitor-btn.start {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .monitor-btn.start:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
  }

  .monitor-btn.stop {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .teacher-view {
    flex: 1;
    overflow-y: auto;
  }

  .students-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    padding: 8px 0;
  }

  .student-focus-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .student-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
  }

  .student-info {
    flex: 1;
  }

  .student-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .student-status {
    font-size: 13px;
    color: #6b7280;
  }

  .mini-score {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
  }

  .error-msg {
    padding: 12px 16px;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 13px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #9ca3af;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
</style>

<div class="focus-container">
  {#if !isTeacher}
    <div class="student-view">
      {#if errorMsg}
        <div class="error-msg">{errorMsg}</div>
      {/if}

      <div class="camera-container">
        <div class="video-wrapper">
          {#if isMonitoring}
            <video bind:this={videoRef} autoplay muted playsinline></video>
          {:else}
            <div class="camera-placeholder">
              <div class="placeholder-icon">📷</div>
              <div>点击下方按钮开始专注度监测</div>
            </div>
          {/if}
        </div>

        <div class="focus-display">
          <div 
            class="focus-score-circle"
            style="background: {getFocusStatus(Math.round(focusScore)).color};"
          >
            <span class="score-text">{Math.round(focusScore)}</span>
          </div>
          <div class="focus-info">
            <div 
              class="focus-status"
              style="background: {getFocusStatus(Math.round(focusScore)).bg}; color: {getFocusStatus(Math.round(focusScore)).color};"
            >
              {getFocusStatus(Math.round(focusScore)).label}
            </div>
            <div class="focus-description">
              {isMonitoring ? '正在监测您的专注状态...' : '开启摄像头以监测专注度'}
            </div>
          </div>
        </div>
      </div>

      <button
        class="monitor-btn {isMonitoring ? 'stop' : 'start'}"
        on:click={isMonitoring ? stopMonitoring : startMonitoring}
      >
        {isMonitoring ? '⏹ 停止监测' : '▶ 开始监测'}
      </button>
    </div>
  {:else}
    <div class="teacher-view">
      <div class="students-grid">
        {#if $classroomState.students && $classroomState.students.length > 0}
          {#each $classroomState.students as student (student.id)}
            <div class="student-focus-card">
              <div class="student-avatar">
                {student.name ? student.name[0].toUpperCase() : '?'}
              </div>
              <div class="student-info">
                <div class="student-name">{student.name || '未知用户'}</div>
                <div class="student-status">
                  {student.isOnline ? '🟢 在线' : '⚪ 离线'}
                </div>
              </div>
              <div 
                class="mini-score"
                style="background: {getFocusStatus(student.focusScore || 0).bg}; color: {getFocusStatus(student.focusScore || 0).color};"
              >
                {student.focusScore || 0}%
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty-state" style="grid-column: 1/-1;">
            <div class="empty-icon">👁</div>
            <div>暂无学生数据</div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
