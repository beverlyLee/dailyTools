import * as THREE from 'three'

interface ParticleData {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

export class SprayCan {
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera
  private sprayMesh: THREE.Mesh
  private sprayMaterial: THREE.ShaderMaterial
  private size: number = 30
  private color: THREE.Color = new THREE.Color(0xff6b6b)
  private textureSize: number
  private particles: THREE.Points | null = null
  private particleCount: number = 40
  private particleGeometry: THREE.BufferGeometry | null = null
  private particleMaterial: THREE.PointsMaterial | null = null
  private particleData: ParticleData[] = []

  constructor(textureSize: number = 1024) {
    this.textureSize = textureSize
    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(
      -textureSize / 2,
      textureSize / 2,
      textureSize / 2,
      -textureSize / 2,
      0.1,
      1000
    )
    this.camera.position.z = 1

    const geometry = new THREE.PlaneGeometry(1, 1)
    this.sprayMaterial = this.createSprayShader()
    this.sprayMesh = new THREE.Mesh(geometry, this.sprayMaterial)
    this.sprayMesh.visible = false
    this.scene.add(this.sprayMesh)

    this.createParticles()
  }

  private createSprayShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.color },
        uSize: { value: this.size },
        uTextureSize: { value: this.textureSize }
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
        uniform float uSize;
        uniform float uTextureSize;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          float innerRadius = uSize * 0.3 / (uSize + 10.0);
          float outerRadius = 0.5;
          
          float alpha;
          if (dist < innerRadius) {
            alpha = 1.0;
          } else {
            alpha = 1.0 - smoothstep(innerRadius, outerRadius, dist);
          }
          
          alpha *= 0.25;
          
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthTest: false,
      depthWrite: false
    })
  }

  private createParticles() {
    this.particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.particleCount * 3)
    
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      
      this.particleData.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0
      })
    }
    
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    this.particleMaterial = new THREE.PointsMaterial({
      color: this.color,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending,
      depthTest: false,
      sizeAttenuation: true
    })
    
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial)
    this.particles.visible = false
  }

  public emitParticles(worldX: number, worldY: number) {
    if (!this.particles || !this.particleGeometry) return
    
    for (let i = 0; i < this.particleCount; i++) {
      if (this.particleData[i].life <= 0) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1.2 + Math.random() * 1.8
        
        this.particleData[i] = {
          x: worldX,
          y: worldY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          maxLife: 0.5 + Math.random() * 0.5
        }
      }
    }
    
    this.particles.visible = true
  }

  public updateParticles(deltaTime: number) {
    if (!this.particles || !this.particleGeometry) return
    
    const positions = this.particleGeometry.attributes.position.array as Float32Array
    let anyAlive = false
    
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particleData[i]
      if (p.life > 0) {
        p.life -= deltaTime / p.maxLife
        if (p.life > 0) {
          p.x += p.vx * deltaTime
          p.y += p.vy * deltaTime
          positions[i * 3] = p.x
          positions[i * 3 + 1] = p.y
          positions[i * 3 + 2] = 0.01
          anyAlive = true
        } else {
          positions[i * 3] = 0
          positions[i * 3 + 1] = 0
          positions[i * 3 + 2] = -100
        }
      }
    }
    
    this.particleGeometry.attributes.position.needsUpdate = true
    this.particles.visible = anyAlive
  }

  public hideParticles() {
    if (this.particles) {
      this.particles.visible = false
    }
  }

  public getParticleSystem(): THREE.Points | null {
    return this.particles
  }

  public setColor(color: string | THREE.Color) {
    if (typeof color === 'string') {
      this.color.set(color)
    } else {
      this.color.copy(color)
    }
    this.sprayMaterial.uniforms.uColor.value = this.color
    if (this.particleMaterial) {
      this.particleMaterial.color = this.color
    }
  }

  public setSize(size: number) {
    this.size = size
    this.sprayMaterial.uniforms.uSize.value = size
  }

  public getSize(): number {
    return this.size
  }

  public getColor(): THREE.Color {
    return this.color.clone()
  }

  public spray(
    renderer: THREE.WebGLRenderer,
    target: THREE.WebGLRenderTarget,
    uvX: number,
    uvY: number
  ) {
    const x = uvX * this.textureSize
    const y = uvY * this.textureSize

    const diameterPx = this.size * 2
    this.sprayMesh.position.set(
      x - this.textureSize / 2,
      y - this.textureSize / 2,
      0
    )
    this.sprayMesh.scale.set(diameterPx, diameterPx, 1)
    this.sprayMesh.visible = true

    const oldRenderTarget = renderer.getRenderTarget()
    const oldAutoClear = renderer.autoClear
    renderer.autoClear = false
    
    renderer.setRenderTarget(target)
    renderer.render(this.scene, this.camera)
    
    renderer.setRenderTarget(oldRenderTarget)
    renderer.autoClear = oldAutoClear
    
    this.sprayMesh.visible = false
  }

  public dispose() {
    this.sprayMesh.geometry.dispose()
    this.sprayMaterial.dispose()
    if (this.particleGeometry) {
      this.particleGeometry.dispose()
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose()
    }
  }
}
