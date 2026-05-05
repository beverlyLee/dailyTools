import { writable, derived } from 'svelte/store'

export const user = writable({
  id: '',
  name: '',
  role: 'student',
  roomId: '',
  isConnected: false
})

export const whiteboardState = writable({
  currentTool: 'pen',
  color: '#000000',
  strokeWidth: 2,
  canvasState: null,
  isDrawing: false
})

export const classroomState = writable({
  teacher: null,
  students: [],
  breakoutRooms: [],
  currentBreakoutRoom: null,
  handRaiseQueue: [],
  activeSpeaker: null,
  isInBreakoutRoom: false
})

export const webrtcState = writable({
  localStream: null,
  remoteStreams: [],
  isAudioEnabled: true,
  isVideoEnabled: true,
  connections: []
})

export const onlineStudents = derived(classroomState, $state => {
  return $state.students.filter(s => s.isOnline)
})

export const studentsInRoom = derived(classroomState, $state => {
  if ($state.isInBreakoutRoom && $state.currentBreakoutRoom) {
    return $state.currentBreakoutRoom.students
  }
  return $state.students
})
