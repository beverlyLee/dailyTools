import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../store/appStore'
import { processClothesImage, processPersonImageForTexture } from '../utils/imageProcessor'

const BODY_WIDTH = 2 * 0.6
const BODY_HEIGHT = 2.4
const CLOTHES_Z_OFFSET = 0.05
const CLOTHES_HEIGHT = 1.2
const PLANE_ASPECT = BODY_WIDTH / BODY_HEIGHT

const Preview: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const personGroupRef = useRef<THREE.Group | null>(null)
  const personMeshRef = useRef<THREE.Mesh | null>(null)
  const clothesMeshRef = useRef<THREE.Mesh | null>(null)
  const clothesTextureRef = useRef<THREE.Texture | null>(null)
  const clothesAspectRef = useRef<number>(1)
  const personTextureRef = useRef<THREE.Texture | null>(null)

  const personImageUrl = useAppStore((s) => s.personImageUrl)
  const clothesImageUrl = useAppStore((s) => s.clothesImageUrl)
  const clothesOffsetX = useAppStore((s) => s.clothesOffsetX)
  const clothesOffsetY = useAppStore((s) => s.clothesOffsetY)
  const clothesScale = useAppStore((s) => s.clothesScale)
  const clothesRotation = useAppStore((s) => s.clothesRotation)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 3
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    const personGroup = new THREE.Group()
    personGroup.position.y = 0
    scene.add(personGroup)
    personGroupRef.current = personGroup

    const personGeometry = new THREE.PlaneGeometry(BODY_WIDTH, BODY_HEIGHT)
    const personMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      side: THREE.DoubleSide,
    })
    const personMesh = new THREE.Mesh(personGeometry, personMaterial)
    personGroup.add(personMesh)
    personMeshRef.current = personMesh

    const clothesGeometry = new THREE.PlaneGeometry(1, CLOTHES_HEIGHT)
    const clothesMaterial = new THREE.MeshStandardMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const clothesMesh = new THREE.Mesh(clothesGeometry, clothesMaterial)
    clothesMesh.position.z = CLOTHES_Z_OFFSET
    clothesMesh.position.y = -0.15
    clothesMesh.visible = false
    personGroup.add(clothesMesh)
    clothesMeshRef.current = clothesMesh

    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - previousMousePosition.x

      if (personGroupRef.current) {
        personGroupRef.current.rotation.y += deltaX * 0.01
      }

      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging = false
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('mouseleave', onMouseUp)

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return
      cameraRef.current.aspect = container.clientWidth / container.clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('mouseleave', onMouseUp)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    if (!personImageUrl || !personMeshRef.current) {
      if (personMeshRef.current) {
        const material = personMeshRef.current.material as THREE.MeshStandardMaterial
        material.map = null
        material.color.set(0xdddddd)
        material.needsUpdate = true
      }
      return
    }

    const loadAndProcess = async () => {
      try {
        const { url } = await processPersonImageForTexture(personImageUrl, PLANE_ASPECT)
        const loader = new THREE.TextureLoader()
        loader.load(url, (texture) => {
          if (personMeshRef.current) {
            const material = personMeshRef.current.material as THREE.MeshStandardMaterial
            if (personTextureRef.current) {
              personTextureRef.current.dispose()
            }
            personTextureRef.current = texture

            texture.colorSpace = THREE.SRGBColorSpace
            texture.minFilter = THREE.LinearMipmapLinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.generateMipmaps = true
            texture.wrapS = THREE.ClampToEdgeWrapping
            texture.wrapT = THREE.ClampToEdgeWrapping
            texture.needsUpdate = true

            material.map = texture
            material.color.set(0xffffff)
            material.needsUpdate = true
          }
        })
      } catch (error) {
        console.error('Error loading person image:', error)
      }
    }

    loadAndProcess()
  }, [personImageUrl])

  useEffect(() => {
    if (!clothesImageUrl || !clothesMeshRef.current) {
      if (clothesMeshRef.current) {
        const material = clothesMeshRef.current.material as THREE.MeshStandardMaterial
        material.map = null
        material.needsUpdate = true
        clothesMeshRef.current.visible = false
        if (clothesTextureRef.current) {
          clothesTextureRef.current.dispose()
          clothesTextureRef.current = null
        }
      }
      return
    }

    const processAndLoad = async () => {
      try {
        const { url, width, height } = await processClothesImage(clothesImageUrl)
        const aspect = width / height
        clothesAspectRef.current = aspect

        const clothesWidth = CLOTHES_HEIGHT * aspect
        if (clothesMeshRef.current) {
          clothesMeshRef.current.geometry.dispose()
          clothesMeshRef.current.geometry = new THREE.PlaneGeometry(clothesWidth, CLOTHES_HEIGHT)
        }

        const loader = new THREE.TextureLoader()
        loader.load(url, (texture) => {
          if (clothesMeshRef.current) {
            const material = clothesMeshRef.current.material as THREE.MeshStandardMaterial
            if (clothesTextureRef.current) {
              clothesTextureRef.current.dispose()
            }

            texture.colorSpace = THREE.SRGBColorSpace
            texture.minFilter = THREE.LinearMipmapLinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.generateMipmaps = true

            clothesTextureRef.current = texture

            material.map = texture
            material.transparent = true
            material.side = THREE.DoubleSide
            material.depthWrite = false
            material.needsUpdate = true

            clothesMeshRef.current.visible = true
          }
        })
      } catch (error) {
        console.error('Error processing clothes image:', error)
      }
    }

    processAndLoad()
  }, [clothesImageUrl])

  useEffect(() => {
    if (clothesMeshRef.current) {
      const scale = clothesScale * 2
      clothesMeshRef.current.scale.set(scale, scale, 1)
      clothesMeshRef.current.position.x = clothesOffsetX * 0.5
      clothesMeshRef.current.position.y = -0.15 - clothesOffsetY * 0.5
      clothesMeshRef.current.rotation.z = -clothesRotation
    }
  }, [clothesOffsetX, clothesOffsetY, clothesScale, clothesRotation])

  const setClothesOffsetX = useAppStore((s) => s.setClothesOffsetX)
  const setClothesOffsetY = useAppStore((s) => s.setClothesOffsetY)
  const setClothesScale = useAppStore((s) => s.setClothesScale)
  const setClothesRotation = useAppStore((s) => s.setClothesRotation)

  return (
    <div className="preview-container">
      <div className="preview-canvas" ref={containerRef} />
      <div className="preview-controls">
        <h4>衣服调整</h4>
        <div className="control-group">
          <label>水平位置</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={clothesOffsetX}
            onChange={(e) => setClothesOffsetX(parseFloat(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>垂直位置</label>
          <input
            type="range"
            min="-1.2"
            max="1.2"
            step="0.01"
            value={clothesOffsetY}
            onChange={(e) => setClothesOffsetY(parseFloat(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>缩放</label>
          <input
            type="range"
            min="0.2"
            max="0.8"
            step="0.01"
            value={clothesScale}
            onChange={(e) => setClothesScale(parseFloat(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>旋转</label>
          <input
            type="range"
            min="-0.5"
            max="0.5"
            step="0.01"
            value={clothesRotation}
            onChange={(e) => setClothesRotation(parseFloat(e.target.value))}
          />
        </div>
        <p className="preview-hint">提示：拖动鼠标可旋转 3D 模型</p>
      </div>
    </div>
  )
}

export default Preview
