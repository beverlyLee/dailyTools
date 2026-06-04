import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'

try {
  const app = mount(App, {
    target: document.getElementById('app'),
  })
} catch (e) {
  console.error('Failed to mount app:', e)
  const appEl = document.getElementById('app')
  if (appEl) {
    appEl.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ef4444; font-family: system-ui;">
        <h2>❌ 应用加载失败</h2>
        <p style="margin-top: 16px; color: #94a3b8;">${e.message || String(e)}</p>
        <p style="margin-top: 8px; font-size: 14px; color: #64748b;">请检查控制台获取详细错误信息</p>
      </div>
    `
  }
}
