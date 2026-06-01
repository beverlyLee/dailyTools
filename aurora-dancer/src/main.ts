import * as THREE from 'three'
import { AuroraShader, sampleNoiseAt } from './shaders/AuroraShader'

interface DebugInfo {
  fps: number
  frameCount: number
  lastFpsUpdate: number
  currentNoise: number
  currentTime: number
}

interface DebugElements {
  fpsValue: HTMLElement
  timeValue: HTMLElement
  noiseValue: HTMLElement
  bandsValue: HTMLElement
  statusIndicator: HTMLElement
}

class AuroraApp {
  private scene: THREE.Scene
  private auroraScene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private orthoCamera: THREE.OrthographicCamera
  private renderer: THREE.WebGLRenderer
  private auroraMeshes: THREE.Mesh[] = []
  private clock: THREE.Clock
  private debugInfo: DebugInfo
  private debugElements: DebugElements | null = null
  private firstBandMaterial: THREE.ShaderMaterial | null = null
  private lastDebugUpdate: number = 0

  private renderTarget: THREE.WebGLRenderTarget
  private compositeMesh!: THREE.Mesh
  private stars!: THREE.Points
  private horizon!: THREE.Mesh
  private horizonGlow!: THREE.Mesh

  constructor() {
    this.clock = new THREE.Clock()
    this.debugInfo = {
      fps: 0,
      frameCount: 0,
      lastFpsUpdate: performance.now(),
      currentNoise: 0,
      currentTime: 0
    }
    
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x010104)
    
    this.auroraScene = new THREE.Scene()
    
    this.camera = new THREE.PerspectiveCamera(
      95,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    )
    this.camera.position.set(0, 12, 40)
    this.camera.lookAt(0, 20, 0)
    
    const aspect = window.innerWidth / window.innerHeight
    this.orthoCamera = new THREE.OrthographicCamera(
      -aspect, aspect, 1, -1, 0, 1
    )
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    document.body.appendChild(this.renderer.domElement)
    
    this.renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    )
    
    this.createDebugPanel()
    this.stars = this.createStars()
    this.scene.add(this.stars)
    this.horizon = this.createHorizon()
    this.scene.add(this.horizon)
    this.horizonGlow = this.createHorizonGlow()
    this.scene.add(this.horizonGlow)
    this.createAuroraBands()
    this.createCompositeMesh()
    
    window.addEventListener('resize', this.onResize.bind(this))
    
    this.animate()
  }

  private createDebugPanel() {
    const container = document.createElement('div')
    container.style.cssText = `
      position: fixed;
      top: 16px;
      left: 16px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(100, 255, 150, 0.3);
      border-radius: 8px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      font-size: 12px;
      color: #7fff9f;
      z-index: 1000;
      backdrop-filter: blur(8px);
      line-height: 1.6;
      min-width: 180px;
    `
    document.body.appendChild(container)

    const title = document.createElement('div')
    title.style.cssText = 'font-weight: bold; color: #aaffcc; margin-bottom: 6px; font-size: 13px;'
    title.textContent = 'Aurora Debug'
    container.appendChild(title)

    const createRow = (label: string): HTMLElement => {
      const row = document.createElement('div')
      const labelSpan = document.createElement('span')
      labelSpan.style.cssText = 'color: #88aadd;'
      labelSpan.textContent = `${label}:`
      const valueSpan = document.createElement('span')
      valueSpan.style.cssText = 'color: #ffffff;'
      valueSpan.textContent = '-'
      row.appendChild(labelSpan)
      row.appendChild(document.createTextNode(' '))
      row.appendChild(valueSpan)
      container.appendChild(row)
      return valueSpan
    }

    const fpsValue = createRow('FPS')
    const timeValue = createRow('Time')
    const noiseValue = createRow('Noise')
    const bandsValue = createRow('Bands')

    const statusRow = document.createElement('div')
    statusRow.style.cssText = 'margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(100, 255, 150, 0.2);'
    const statusIndicator = document.createElement('span')
    statusIndicator.style.cssText = 'color: #ffdd77;'
    statusIndicator.textContent = '● '
    const statusText = document.createElement('span')
    statusText.style.cssText = 'color: #aaaaaa; font-size: 11px;'
    statusText.textContent = 'Animation Running'
    statusRow.appendChild(statusIndicator)
    statusRow.appendChild(statusText)
    container.appendChild(statusRow)

    this.debugElements = {
      fpsValue,
      timeValue,
      noiseValue,
      bandsValue,
      statusIndicator
    }
  }

  private updateDebugPanel() {
    const now = performance.now()
    
    this.debugInfo.frameCount++
    if (now - this.debugInfo.lastFpsUpdate >= 1000) {
      this.debugInfo.fps = this.debugInfo.frameCount
      this.debugInfo.frameCount = 0
      this.debugInfo.lastFpsUpdate = now
    }

    if (now - this.lastDebugUpdate < 100) return
    this.lastDebugUpdate = now

    if (!this.debugElements) return

    const material = this.firstBandMaterial
    if (material) {
      this.debugInfo.currentTime = material.uniforms.uTime.value
      this.debugInfo.currentNoise = sampleNoiseAt(this.debugInfo.currentTime)
    }

    this.debugElements.fpsValue.textContent = String(this.debugInfo.fps)
    this.debugElements.timeValue.textContent = `${this.debugInfo.currentTime.toFixed(2)}s`
    this.debugElements.noiseValue.textContent = this.debugInfo.currentNoise.toFixed(4)
    this.debugElements.bandsValue.textContent = String(this.auroraMeshes.length)
  }

  private createAuroraBands() {
    const bandCount = 18
    const bandWidth = 280
    const bandHeight = 180
    
    for (let i = 0; i < bandCount; i++) {
      const geometry = new THREE.PlaneGeometry(bandWidth, bandHeight, 80, 30)
      
      const bandMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(AuroraShader.uniforms),
        vertexShader: AuroraShader.vertexShader,
        fragmentShader: AuroraShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
      
      if (i === 0) {
        this.firstBandMaterial = bandMaterial
      }
      
      const mesh = new THREE.Mesh(geometry, bandMaterial)
      
      const heightProgress = i / (bandCount - 1)
      
      const offsetX = (Math.random() - 0.5) * 120
      const offsetY = heightProgress * 70 - 15
      const offsetZ = i * 0.8 - 12
      
      mesh.position.set(offsetX, offsetY, offsetZ)
      mesh.rotation.z = (Math.random() - 0.5) * 0.25
      mesh.rotation.x = -0.45 + heightProgress * 0.9
      
      const scaleX = 0.5 + heightProgress * 0.7 + Math.random() * 0.3
      const scaleY = 0.8 + Math.random() * 0.4
      mesh.scale.set(scaleX, scaleY, 1.0)
      
      this.auroraMeshes.push(mesh)
      this.auroraScene.add(mesh)
    }
  }

  private createCompositeMesh() {
    const compositeGeometry = new THREE.PlaneGeometry(2, 2)
    const compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.renderTarget.texture }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec2 vUv;
        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          vec3 color = min(texColor.rgb, vec3(0.95));
          gl_FragColor = vec4(color, texColor.a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    this.compositeMesh = new THREE.Mesh(compositeGeometry, compositeMaterial)
    this.scene.add(this.compositeMesh)
  }

  private createStars(): THREE.Points {
    const starsGeometry = new THREE.BufferGeometry()
    const starCount = 4000
    
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3
      const radius = 150 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.8
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.cos(phi) + 30
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      const starColor = new THREE.Color()
      starColor.setHSL(0.55 + Math.random() * 0.1, 0.15, 0.7 + Math.random() * 0.3)
      colors[i3] = starColor.r
      colors[i3 + 1] = starColor.g
      colors[i3 + 2] = starColor.b
      
      sizes[i] = Math.random() * 1.5 + 0.3
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      vertexColors: true
    })
    
    return new THREE.Points(starsGeometry, starsMaterial)
  }

  private createHorizon(): THREE.Mesh {
    const horizonGeometry = new THREE.PlaneGeometry(600, 150, 1, 1)
    const horizonMaterial = new THREE.MeshBasicMaterial({
      color: 0x050510,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    })
    
    const horizon = new THREE.Mesh(horizonGeometry, horizonMaterial)
    horizon.position.set(0, -35, 0)
    horizon.rotation.x = Math.PI / 2
    return horizon
  }

  private createHorizonGlow(): THREE.Mesh {
    const glowGeometry = new THREE.PlaneGeometry(600, 50, 1, 1)
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0.06, 0.25, 0.12) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float alpha = smoothstep(0.0, 0.5, vUv.y) * 0.2;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.set(0, -20, -12)
    glow.rotation.x = Math.PI / 2.3
    return glow
  }

  private onResize() {
    const width = window.innerWidth
    const height = window.innerHeight
    
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    
    const aspect = width / height
    this.orthoCamera.left = -aspect
    this.orthoCamera.right = aspect
    this.orthoCamera.top = 1
    this.orthoCamera.bottom = -1
    this.orthoCamera.updateProjectionMatrix()
    
    this.renderer.setSize(width, height)
    this.renderTarget.setSize(width, height)
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this))
    
    const time = this.clock.getElapsedTime()
    
    this.auroraMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = time + index * 1.2
      
      mesh.position.x += Math.sin(time * 0.04 + index * 0.3) * 0.004
      mesh.position.y += Math.sin(time * 0.025 + index * 0.18) * 0.0018
    })
    
    this.camera.position.x = Math.sin(time * 0.012) * 4
    this.camera.position.y = 12 + Math.sin(time * 0.008) * 2
    this.camera.lookAt(0, 20, 0)
    
    this.updateDebugPanel()
    
    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.clear()
    this.renderer.render(this.auroraScene, this.camera)
    
    this.renderer.setRenderTarget(null)
    this.renderer.setClearColor(0x010104, 1)
    this.renderer.clear()
    this.renderer.render(this.scene, this.orthoCamera)
  }
}

new AuroraApp()
