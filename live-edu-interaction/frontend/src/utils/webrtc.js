import SimplePeer from 'simple-peer'
import { webrtcState, user } from '../store/classroomStore.js'
import { getSocket, emit } from './websocket.js'

let localStream = null
const peers = new Map()
let isInitialized = false

export async function initWebRTC() {
  if (isInitialized) return
  
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    
    webrtcState.update(state => ({
      ...state,
      localStream
    }))
    
    setupSocketHandlers()
    isInitialized = true
    
    console.log('WebRTC initialized successfully')
  } catch (error) {
    console.error('Failed to initialize WebRTC:', error)
    alert('无法获取摄像头和麦克风权限，请检查设备设置')
  }
}

function setupSocketHandlers() {
  const socket = getSocket()
  if (!socket) return

  socket.on('webrtc-offer', async (data) => {
    console.log('Received offer from:', data.from)
    await handleOffer(data.from, data.offer)
  })

  socket.on('webrtc-answer', async (data) => {
    console.log('Received answer from:', data.from)
    await handleAnswer(data.from, data.answer)
  })

  socket.on('webrtc-ice-candidate', async (data) => {
    console.log('Received ICE candidate from:', data.from)
    await handleIceCandidate(data.from, data.candidate)
  })

  socket.on('user-joined', (data) => {
    if (data.id !== socket.id) {
      createPeer(data.id, true)
    }
  })
}

function createPeer(peerId, isInitiator) {
  if (peers.has(peerId)) {
    console.log('Peer already exists:', peerId)
    return peers.get(peerId)
  }

  console.log('Creating peer with:', peerId, 'isInitiator:', isInitiator)

  const peer = new SimplePeer({
    initiator: isInitiator,
    stream: localStream,
    trickle: true,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  })

  peer.on('signal', (signal) => {
    if (signal.type === 'offer') {
      emit('webrtc-offer', {
        to: peerId,
        offer: signal
      })
    } else if (signal.type === 'answer') {
      emit('webrtc-answer', {
        to: peerId,
        answer: signal
      })
    } else {
      emit('webrtc-ice-candidate', {
        to: peerId,
        candidate: signal
      })
    }
  })

  peer.on('stream', (remoteStream) => {
    console.log('Received remote stream from:', peerId)
    webrtcState.update(state => {
      const streams = state.remoteStreams.filter(s => s.peerId !== peerId)
      streams.push({
        peerId,
        stream: remoteStream
      })
      return { ...state, remoteStreams: streams }
    })
  })

  peer.on('error', (err) => {
    console.error('Peer error with', peerId, ':', err)
  })

  peer.on('close', () => {
    console.log('Peer connection closed with:', peerId)
    peers.delete(peerId)
    webrtcState.update(state => ({
      ...state,
      remoteStreams: state.remoteStreams.filter(s => s.peerId !== peerId)
    }))
  })

  peers.set(peerId, peer)
  
  webrtcState.update(state => ({
    ...state,
    connections: [...state.connections, peerId]
  }))

  return peer
}

async function handleOffer(from, offer) {
  const peer = createPeer(from, false)
  await peer.signal(offer)
}

async function handleAnswer(from, answer) {
  const peer = peers.get(from)
  if (peer) {
    await peer.signal(answer)
  }
}

async function handleIceCandidate(from, candidate) {
  const peer = peers.get(from)
  if (peer) {
    await peer.signal(candidate)
  }
}

export function toggleAudio() {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      webrtcState.update(state => ({
        ...state,
        isAudioEnabled: audioTrack.enabled
      }))
    }
  }
}

export function toggleVideo() {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      webrtcState.update(state => ({
        ...state,
        isVideoEnabled: videoTrack.enabled
      }))
    }
  }
}

export function getLocalStream() {
  return localStream
}

export function getRemoteStreams() {
  const streams = []
  webrtcState.subscribe(state => {
    streams.push(...state.remoteStreams)
  })
  return streams
}
