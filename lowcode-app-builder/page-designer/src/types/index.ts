export interface Component {
  id: string
  type: ComponentType
  properties: Record<string, any>
  styles: Record<string, string>
  children?: Component[]
}

export type ComponentType = 
  | 'input'
  | 'button'
  | 'text'
  | 'image'
  | 'container'
  | 'form'
  | 'list'
  | 'chart'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'date-picker'
  | 'table'
  | 'card'
  | 'divider'
  | 'tabs'

export interface EventBinding {
  id: string
  componentId: string
  eventType: EventType
  action: ActionType
  target?: string
  handler: string
  config?: Record<string, any>
}

export type EventType = 
  | 'click'
  | 'change'
  | 'input'
  | 'focus'
  | 'blur'
  | 'submit'
  | 'load'
  | 'scroll'

export type ActionType = 
  | 'navigate'
  | 'showModal'
  | 'hideModal'
  | 'setData'
  | 'getData'
  | 'submitForm'
  | 'resetForm'
  | 'custom'

export interface PageData {
  id: string
  name: string
  description: string
  content: Record<string, any>
  components: Component[]
  events: EventBinding[]
  createdAt: string
  updatedAt: string
}

export interface PropertyConfig {
  name: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'textarea'
  options?: { label: string; value: string }[]
  default?: any
}

export interface ComponentDefinition {
  type: ComponentType
  label: string
  icon: string
  category: string
  properties: PropertyConfig[]
  defaultStyles: Record<string, string>
  defaultProperties: Record<string, any>
}

export interface GeneratedCode {
  html: string
  css: string
  javascript: string
  framework: string
}
