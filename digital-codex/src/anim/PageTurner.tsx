import { useRef, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import type { BendCurvePoints } from '../book/Book'

interface PageTurnerProps {
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  turnProgress: number
  onTurnProgressChange: (progress: number) => void
  isAnimating: boolean
  onIsAnimatingChange: (animating: boolean) => void
  onBendCurveChange: (points: BendCurvePoints | undefined) => void
  bookWidth?: number
}

export default function PageTurner({
  totalPages,
  currentPage,
  onPageChange,
  turnProgress,
  onTurnProgressChange,
  isAnimating,
  onIsAnimatingChange,
  onBendCurveChange,
  bookWidth = 3,
}: PageTurnerProps) {
  const { camera, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const isDragging = useRef(false)
  const startX = useRef(0)
  const planeRef = useRef<THREE.Mesh>(null)
  const curveSamples = 50

  const curvePointsCache = useRef<{
    progress: number
    forward: boolean
    points: BendCurvePoints
  } | null>(null)

  const createBendCurvePoints = useCallback((progress: number, forward: boolean): BendCurvePoints => {
    const rawPoints: THREE.Vector3[] = []
    const direction = forward ? 1 : -1
    const angle = progress * Math.PI
    const bendAmount = Math.sin(progress * Math.PI) * 0.6

    for (let i = 0; i <= curveSamples; i++) {
      const t = i / curveSamples
      const localX = direction * t * bookWidth

      const x = localX * Math.cos(angle)
      const z = localX * Math.sin(angle)

      const curveDepth = Math.sin(t * Math.PI) * bendAmount * bookWidth * 0.25
      const zCurve = curveDepth * Math.sin(progress * Math.PI)

      rawPoints.push(new THREE.Vector3(x, 0, z + zCurve))
    }

    const curve = new THREE.CatmullRomCurve3(rawPoints)
    const sampledPoints = curve.getPoints(curveSamples)

    const xArr = new Float32Array(curveSamples + 1)
    const zArr = new Float32Array(curveSamples + 1)

    for (let i = 0; i <= curveSamples; i++) {
      xArr[i] = sampledPoints[i].x
      zArr[i] = sampledPoints[i].z
    }

    return { x: xArr, z: zArr }
  }, [bookWidth, curveSamples])

  useFrame(() => {
    const absProgress = Math.abs(turnProgress)
    const forward = turnProgress > 0

    if (absProgress > 0.001 && absProgress < 0.999) {
      const cache = curvePointsCache.current
      const needsUpdate = !cache
        || Math.abs(cache.progress - absProgress) > 0.002
        || cache.forward !== forward

      if (needsUpdate) {
        const points = createBendCurvePoints(absProgress, forward)
        curvePointsCache.current = { progress: absProgress, forward, points }
        onBendCurveChange(points)
      }
    } else if (curvePointsCache.current) {
      curvePointsCache.current = null
      onBendCurveChange(undefined)
    }
  })

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (isAnimating) return

    const rect = gl.domElement.getBoundingClientRect()
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(mouse.current, camera)

    const plane = planeRef.current
    if (plane) {
      const intersects = raycaster.current.intersectObject(plane)
      if (intersects.length > 0) {
        isDragging.current = true
        startX.current = event.clientX
      }
    }
  }, [camera, gl, isAnimating])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isDragging.current || isAnimating) return

    const deltaX = event.clientX - startX.current
    const screenWidth = window.innerWidth

    let progress = Math.abs(deltaX) / (screenWidth * 0.25)
    progress = Math.min(Math.max(progress, 0), 1)

    if (deltaX < 0) {
      onTurnProgressChange(progress)
    } else {
      onTurnProgressChange(-progress)
    }
  }, [isAnimating, onTurnProgressChange])

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false

    const threshold = 0.3
    const maxSpread = Math.floor((totalPages - 1) / 2)

    if (turnProgress > threshold) {
      onIsAnimatingChange(true)
      let hasSwitched = false

      gsap.to({ value: turnProgress }, {
        value: 1,
        duration: 0.5,
        ease: 'power3.out',
        onUpdate: function() {
          const val = this.targets()[0].value
          onTurnProgressChange(val)

          if (val > 0.9 && !hasSwitched) {
            hasSwitched = true
            const next = currentPage + 1 > maxSpread ? 0 : currentPage + 1
            onPageChange(next)
          }
        },
        onComplete: () => {
          onTurnProgressChange(0)
          onIsAnimatingChange(false)
          curvePointsCache.current = null
          onBendCurveChange(undefined)
        }
      })
    } else if (turnProgress < -threshold) {
      onIsAnimatingChange(true)
      let hasSwitched = false
      const prev = currentPage - 1 < 0 ? maxSpread : currentPage - 1

      gsap.to({ value: turnProgress }, {
        value: -1,
        duration: 0.5,
        ease: 'power3.out',
        onUpdate: function() {
          const val = this.targets()[0].value
          onTurnProgressChange(val)

          if (val < -0.9 && !hasSwitched) {
            hasSwitched = true
            onPageChange(prev)
          }
        },
        onComplete: () => {
          onTurnProgressChange(0)
          onIsAnimatingChange(false)
          curvePointsCache.current = null
          onBendCurveChange(undefined)
        }
      })
    } else {
      onIsAnimatingChange(true)
      gsap.to({ value: turnProgress }, {
        value: 0,
        duration: 0.3,
        ease: 'power2.out',
        onUpdate: function() {
          onTurnProgressChange(this.targets()[0].value)
        },
        onComplete: () => {
          onIsAnimatingChange(false)
          curvePointsCache.current = null
          onBendCurveChange(undefined)
        }
      })
    }
  }, [turnProgress, currentPage, totalPages, onPageChange, onTurnProgressChange, onIsAnimatingChange, onBendCurveChange])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp, gl])

  return (
    <mesh ref={planeRef} position={[0, 0, 0.1]} visible={false}>
      <planeGeometry args={[bookWidth * 3, 6, 1, 1]} />
      <meshBasicMaterial color="white" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  )
}

export type { PageTurnerProps }
