import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElButton,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElCheckbox,
  ElCheckboxGroup,
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
  ElMessage,
  ElDialog,
  ElForm,
  ElFormItem,
  ElLoading,
  ElIcon,
  ElRow,
  ElCol,
  ElTooltip
} from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 按需注册 Element Plus 组件
app.use(ElButton)
app.use(ElSelect)
app.use(ElOption)
app.use(ElDatePicker)
app.use(ElCheckbox)
app.use(ElCheckboxGroup)
app.use(ElCard)
app.use(ElTable)
app.use(ElTableColumn)
app.use(ElTag)
app.use(ElDialog)
app.use(ElForm)
app.use(ElFormItem)
app.use(ElLoading)
app.use(ElIcon)
app.use(ElRow)
app.use(ElCol)
app.use(ElTooltip)

// 全局注册消息组件
app.config.globalProperties.$message = ElMessage

app.mount('#app')
