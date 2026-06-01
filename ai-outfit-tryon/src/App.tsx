import Uploader from './components/Uploader'
import Preview from './components/Preview'
import { useAppStore } from './store/appStore'
import './App.css'

function App() {
  const reset = useAppStore((s) => s.reset)

  return (
    <div className="app">
      <header className="app-header">
        <h1>虚拟试衣 Demo</h1>
        <p>上传人像和衣服图片，查看试穿效果</p>
      </header>

      <div className="app-main">
        <aside className="app-sidebar">
          <Uploader type="person" />
          <Uploader type="clothes" />
          <button className="reset-btn" onClick={reset}>
            重置所有
          </button>
        </aside>

        <main className="app-content">
          <Preview />
        </main>
      </div>
    </div>
  )
}

export default App
