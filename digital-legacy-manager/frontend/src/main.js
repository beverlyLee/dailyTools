import { boot } from 'quasar/wrappers'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar } from 'quasar'

import '@quasar/extras/roboto-font/roboto-font.css'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './css/app.scss'

import App from './App.vue'
import router from './router'
import { cryptoUtils } from './boot/crypto'

export default boot(async ({ app }) => {
  await cryptoUtils.ensureReady()
})

const myApp = createApp(App)

myApp.use(createPinia())
myApp.use(router)

myApp.use(Quasar, {
  plugins: {}
})

myApp.mount('#q-app')
