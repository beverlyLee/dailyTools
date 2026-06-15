import * as THREE from 'three'

if (typeof THREE.Clock !== 'undefined') {
  try {
    Object.defineProperty(THREE, 'Clock', {
      get() {
        return THREE.Timer
      },
      configurable: true
    })
  } catch {}
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
