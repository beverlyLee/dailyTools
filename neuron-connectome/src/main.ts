import './style.css'
import { NeuronScene } from './core/NeuronScene'

const appContainer = document.querySelector<HTMLDivElement>('#app')!

const loadingElement = document.createElement('div')
loadingElement.className = 'loading'
loadingElement.textContent = '加载神经元网络'
appContainer.appendChild(loadingElement)

setTimeout(() => {
  const neuronCount = 30000
  const connectionDensity = 4

  const scene = new NeuronScene(appContainer, neuronCount, connectionDensity)
  
  loadingElement.remove()
  
  scene.start()

  window.addEventListener('beforeunload', () => {
    scene.dispose()
  })
}, 500)
