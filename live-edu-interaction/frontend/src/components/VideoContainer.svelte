<script>
  import { onMount, onDestroy } from 'svelte'
  import { webrtcState } from '../store/classroomStore.js'

  let localVideoRef
  let remoteVideos = []

  let localStream = null
  let streams = []

  const unsub = webrtcState.subscribe(state => {
    localStream = state.localStream
    streams = state.remoteStreams
  })

  onMount(() => {
    if (localStream && localVideoRef) {
      localVideoRef.srcObject = localStream
    }
  })

  $: if (localStream && localVideoRef) {
    localVideoRef.srcObject = localStream
  }
</script>

<style>
  .video-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #1a1a2e;
    padding: 20px;
    overflow: auto;
  }

  .main-video {
    width: 100%;
    max-width: 800px;
    margin: 0 auto 20px;
    background: #16213e;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 16/9;
  }

  .main-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remote-videos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
    max-height: 300px;
    overflow-y: auto;
  }

  .remote-video-item {
    background: #16213e;
    border-radius: 8px;
    overflow: hidden;
    aspect-ratio: 16/9;
    position: relative;
  }

  .remote-video-item video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-label {
    position: absolute;
    bottom: 8px;
    left: 8px;
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .no-video {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #4a5568;
    font-size: 14px;
  }
</style>

<div class="video-container">
  <div class="main-video">
    {#if localStream}
      <video bind:this={localVideoRef} autoplay muted playsinline></video>
    {:else}
      <div class="no-video">正在等待摄像头权限...</div>
    {/if}
  </div>

  <div class="remote-videos">
    {#each streams as streamInfo}
      <div class="remote-video-item" key={streamInfo.peerId}>
        <RemoteVideo {streamInfo} />
      </div>
    {:else}
      <div class="no-video" style="grid-column: 1/-1;">暂无其他参与者</div>
    {/each}
  </div>
</div>

<script>
  let RemoteVideo
</script>

{#snippet RemoteVideo(streamInfo)}
  <script>
    import { onMount } from 'svelte'

    export let streamInfo

    let videoRef

    onMount(() => {
      if (videoRef && streamInfo.stream) {
        videoRef.srcObject = streamInfo.stream
      }
    })
  </script>

  <video 
    bind:this={videoRef} 
    autoplay 
    playsinline
  ></video>
  <div class="video-label">
    参与者 {streamInfo.peerId.slice(-4)}
  </div>
{/snippet}
