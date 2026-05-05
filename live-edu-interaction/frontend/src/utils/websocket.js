import { io } from 'socket.io-client'
import { user, classroomState, whiteboardState } from '../store/classroomStore.js'

let socket = null
let isInitialized = false

export function initWebSocket() {
  if (isInitialized) return
  
  socket = io('http://localhost:8080', {
    transports: ['websocket', 'polling'],
    auth: {
      token: 'temp-auth-token'
    }
  })

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket.id)
    user.update(u => ({ ...u, isConnected: true, id: socket.id }))
  })

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected')
    user.update(u => ({ ...u, isConnected: false }))
  })

  socket.on('user-joined', (data) => {
    console.log('User joined:', data)
    classroomState.update(state => {
      const students = [...state.students]
      const existing = students.findIndex(s => s.id === data.id)
      if (existing === -1) {
        students.push({
          id: data.id,
          name: data.name,
          isOnline: true,
          focusScore: 100,
          joinedAt: Date.now()
        })
      } else {
        students[existing].isOnline = true
      }
      return { ...state, students }
    })
  })

  socket.on('user-left', (data) => {
    console.log('User left:', data)
    classroomState.update(state => {
      const students = state.students.map(s => 
        s.id === data.id ? { ...s, isOnline: false } : s
      )
      return { ...state, students }
    })
  })

  socket.on('classroom-update', (data) => {
    console.log('Classroom update:', data)
    classroomState.set(data)
  })

  socket.on('whiteboard-draw', (data) => {
    whiteboardState.update(state => ({
      ...state,
      remoteDrawAction: data
    }))
  })

  socket.on('hand-raise', (data) => {
    console.log('Hand raised:', data)
    classroomState.update(state => {
      const queue = [...state.handRaiseQueue]
      if (!queue.find(q => q.id === data.userId)) {
        queue.push({
          id: data.userId,
          name: data.userName,
          raisedAt: Date.now()
        })
      }
      return { ...state, handRaiseQueue: queue }
    })
  })

  socket.on('hand-lower', (data) => {
    console.log('Hand lowered:', data)
    classroomState.update(state => ({
      ...state,
      handRaiseQueue: state.handRaiseQueue.filter(q => q.id !== data.userId)
    }))
  })

  socket.on('breakout-created', (data) => {
    console.log('Breakout room created:', data)
    classroomState.update(state => ({
      ...state,
      breakoutRooms: [...state.breakoutRooms, data.room]
    }))
  })

  socket.on('breakout-assigned', (data) => {
    console.log('Assigned to breakout room:', data)
    classroomState.update(state => ({
      ...state,
      currentBreakoutRoom: data.room,
      isInBreakoutRoom: true
    }))
  })

  socket.on('breakout-closed', (data) => {
    console.log('Breakout room closed:', data)
    classroomState.update(state => ({
      ...state,
      currentBreakoutRoom: null,
      isInBreakoutRoom: false,
      breakoutRooms: state.breakoutRooms.filter(r => r.id !== data.roomId)
    }))
  })

  isInitialized = true
}

export function getSocket() {
  return socket
}

export function emit(event, data) {
  if (socket) {
    socket.emit(event, data)
  }
}

export function joinRoom(roomId, userName, role = 'student') {
  emit('join-room', {
    roomId,
    userName,
    role
  })
  user.set({
    id: socket?.id || '',
    name: userName,
    role,
    roomId,
    isConnected: !!socket?.connected
  })
}

export function raiseHand() {
  emit('raise-hand', {})
}

export function lowerHand() {
  emit('lower-hand', {})
}

export function sendWhiteboardAction(action) {
  emit('whiteboard-action', action)
}
