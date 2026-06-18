import { writable, get } from 'svelte/store'
import dayjs from 'dayjs'

const STORAGE_KEY = 'feeding_schedules'

function loadSchedules() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load schedules:', e)
  }
  
  return [
    { id: '1', name: '早餐投喂', time: '07:00', enabled: true, feedAmount: 50 },
    { id: '2', name: '午餐投喂', time: '12:00', enabled: true, feedAmount: 60 },
    { id: '3', name: '晚餐投喂', time: '18:00', enabled: true, feedAmount: 55 },
    { id: '4', name: '夜间投喂', time: '22:00', enabled: false, feedAmount: 30 },
  ]
}

function saveSchedules(schedules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  } catch (e) {
    console.error('Failed to save schedules:', e)
  }
}

function createScheduleStore() {
  const schedules = writable(loadSchedules())
  
  schedules.subscribe(value => {
    saveSchedules(value)
  })
  
  return {
    subscribe: schedules.subscribe,
    
    addSchedule(schedule) {
      const newSchedule = {
        ...schedule,
        id: Date.now().toString(),
      }
      schedules.update(list => [...list, newSchedule])
    },
    
    updateSchedule(id, updates) {
      schedules.update(list => 
        list.map(s => s.id === id ? { ...s, ...updates } : s)
      )
    },
    
    deleteSchedule(id) {
      schedules.update(list => list.filter(s => s.id !== id))
    },
    
    toggleSchedule(id) {
      schedules.update(list =>
        list.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
      )
    },
    
    markTriggered(id) {
      const today = dayjs().format('YYYY-MM-DD')
      schedules.update(list =>
        list.map(s => s.id === id ? { ...s, lastTriggered: today } : s)
      )
    },
    
    checkAndTrigger(now) {
      const currentTime = now.format('HH:mm')
      const today = now.format('YYYY-MM-DD')
      const list = get(schedules)
      
      const triggered = []
      
      for (const schedule of list) {
        if (!schedule.enabled) continue
        if (schedule.time !== currentTime) continue
        if (schedule.lastTriggered === today) continue
        
        triggered.push(schedule)
      }
      
      return triggered
    },
  }
}

export const scheduleStore = createScheduleStore()
