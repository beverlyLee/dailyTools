import axios from 'axios'
import { Story, StoryCreate, StoryUpdate, Slide } from '../types'

const API_BASE = '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const storyApi = {
  getStories: () => api.get<Story[]>('/stories/'),
  
  getStory: (storyId: string) => api.get<Story>(`/stories/${storyId}`),
  
  createStory: (story: StoryCreate) => api.post<Story>('/stories/', story),
  
  updateStory: (storyId: string, story: StoryUpdate) => api.put<Story>(`/stories/${storyId}`, story),
  
  deleteStory: (storyId: string) => api.delete(`/stories/${storyId}`),
  
  addSlide: (storyId: string, slide: Slide) => api.post<Slide>(`/stories/${storyId}/slides`, slide),
  
  updateSlide: (storyId: string, slideId: string, slide: Slide) => 
    api.put<Slide>(`/stories/${storyId}/slides/${slideId}`, slide),
  
  deleteSlide: (storyId: string, slideId: string) => 
    api.delete(`/stories/${storyId}/slides/${slideId}`),
  
  createSampleData: () => api.post('/stories/sample-data'),
}

export const reportApi = {
  getTemplates: () => api.get('/reports/templates'),
  
  getTemplate: (templateId: string) => api.get(`/reports/templates/${templateId}`),
  
  createTemplate: (template: { name: string; description?: string }) => 
    api.post('/reports/templates', template),
  
  updateTemplate: (templateId: string, data: Record<string, unknown>) => 
    api.put(`/reports/templates/${templateId}`, data),
  
  deleteTemplate: (templateId: string) => api.delete(`/reports/templates/${templateId}`),
  
  generateReport: (request: { templateId: string; parameters: Record<string, unknown>; format?: string }) => 
    api.post('/reports/generate', request),
  
  getSchedules: () => api.get('/reports/schedules'),
  
  createSchedule: (schedule: Record<string, unknown>) => 
    api.post('/reports/schedules', schedule),
  
  updateSchedule: (scheduleId: string, data: Record<string, unknown>) => 
    api.put(`/reports/schedules/${scheduleId}`, data),
  
  deleteSchedule: (scheduleId: string) => api.delete(`/reports/schedules/${scheduleId}`),
  
  createSampleTemplates: () => api.post('/reports/sample-templates'),
}

export default api
