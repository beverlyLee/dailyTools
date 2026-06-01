import { useRef, useState, Suspense, useMemo, useEffect, useCallback } from 'react'
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  FURNITURE_CATALOG,
  checkOverlap,
} from './types'
import type {
  FurnitureItem,
  FurnitureType,
  Wall,
  WallPoint,
} from './types'
import ModelErrorBoundary from './ModelErrorBoundary'

interface Props {
  points: WallPoint[]
  walls: Wall[]
  furniture: FurnitureItem[]
  onAddPoint: (p: WallPoint) => void
  onCloseRoom: () => void
  onUndoPoint: () => void
  onResetPoints: () => void
  onAddFurniture: (f: FurnitureItem) => void
  onUpdateFurniture: (f: FurnitureItem) => void
  onRemoveFurniture: (id: string) => void
  onUpdateWall: (w: Wall) => void
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const CLOSE_PX_THRESHOLD = 40

function WallMesh({
  wall,
  onUpdate,
}: {
  wall: Wall
  onUpdate: (w: Wall) => void
}) {
  const dx = wall.to.x - wall.from.x
  const dz = wall.to.z - wall.from.z
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dz, dx)
  const centerX = (wall.from.x + wall.to.x) / 2
  const centerZ = (wall.from.z + wall.to.z) / 2

  if (length < 0.001) return null

  return (
    <group
      position={[centerX, wall.height / 2, centerZ]}
      rotation={[0, -angle, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, wall.height, wall.thickness]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh
        onDoubleClick={(e) => {
          e.stopPropagation()
          const next = window.prompt('墙高 (m)', String(wall.height))
          const h = Number(next)
          if (!Number.isNaN(h) && h > 0.1) {
            onUpdate({ ...wall, height: h })
          }
        }}
      >
        <boxGeometry args={[length + 0.002, wall.height + 0.002, wall.thickness + 0.002]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

function FallbackFurniture({
  type,
  castShadow,
}: {
  type: FurnitureType
  castShadow?: boolean
}) {
  const cat = FURNITURE_CATALOG[type]
  const [w, h, d] = cat.size

  if (type === 'sofa') {
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow={castShadow}>
          <boxGeometry args={[w, h * 0.5, d]} />
          <meshStandardMaterial color={cat.color} />
        </mesh>
        <mesh position={[0, h * 0.75, -d / 2 + 0.15]} castShadow={castShadow}>
          <boxGeometry args={[w, h * 0.5, 0.3]} />
          <meshStandardMaterial color={cat.color} />
        </mesh>
        <mesh position={[-w / 2 + 0.15, h * 0.7, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.3, h * 0.35, d]} />
          <meshStandardMaterial color={cat.color} />
        </mesh>
        <mesh position={[w / 2 - 0.15, h * 0.7, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.3, h * 0.35, d]} />
          <meshStandardMaterial color={cat.color} />
        </mesh>
      </group>
    )
  }

  if (type === 'bed') {
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow={castShadow}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={cat.color} />
        </mesh>
        <mesh position={[0, h + 0.08, -d / 2 + 0.15]} castShadow={castShadow}>
          <boxGeometry args={[w * 0.55, 0.18, 0.3]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
    )
  }

  if (type === 'table') {
    const tableTopThickness = 0.05
    const legHeight = h - tableTopThickness
    return (
      <group>
        <mesh position={[0, h - tableTopThickness / 2, 0]} castShadow={castShadow}>
          <boxGeometry args={[w, tableTopThickness, d]} />
          <meshStandardMaterial color={cat.color} />
        </mesh>
        {[
          [-w / 2 + 0.08, -d / 2 + 0.08],
          [w / 2 - 0.08, -d / 2 + 0.08],
          [-w / 2 + 0.08, d / 2 - 0.08],
          [w / 2 - 0.08, d / 2 - 0.08],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, legHeight / 2, z]} castShadow={castShadow}>
            <boxGeometry args={[0.06, legHeight, 0.06]} />
            <meshStandardMaterial color={cat.color} />
          </mesh>
        ))}
      </group>
    )
  }

  const seatThickness = 0.06
  const legHeight = 0.45
  const backHeight = 0.45
  return (
    <group>
      <mesh position={[0, legHeight + seatThickness / 2, 0]} castShadow={castShadow}>
        <boxGeometry args={[w, seatThickness, d]} />
        <meshStandardMaterial color={cat.color} />
      </mesh>
      {[
        [-w / 2 + 0.04, -d / 2 + 0.04],
        [w / 2 - 0.04, -d / 2 + 0.04],
        [-w / 2 + 0.04, d / 2 - 0.04],
        [w / 2 - 0.04, d / 2 - 0.04],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, legHeight / 2, z]} castShadow={castShadow}>
          <boxGeometry args={[0.05, legHeight, 0.05]} />
          <meshStandardMaterial color={cat.color} />
        </mesh>
      ))}
      <mesh position={[0, legHeight + seatThickness + backHeight / 2, -d / 2 + 0.03]} castShadow={castShadow}>
        <boxGeometry args={[w, backHeight, 0.04]} />
        <meshStandardMaterial color={cat.color} />
      </mesh>
    </group>
  )
}

function ModelFromGLB({
  type,
  castShadow,
}: {
  type: FurnitureType
  castShadow?: boolean
}) {
  const modelPath = FURNITURE_CATALOG[type].modelPath
  const { scene } = useGLTF(modelPath)

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).castShadow = castShadow ?? true
        ;(child as THREE.Mesh).receiveShadow = true
      }
    })
  }, [scene, castShadow])

  return <primitive object={scene} />
}

function ModelWrapper({
  type,
  castShadow,
}: {
  type: FurnitureType
  castShadow?: boolean
}) {
  return (
    <ModelErrorBoundary fallback={<FallbackFurniture type={type} castShadow={castShadow} />}>
      <Suspense fallback={<FallbackFurniture type={type} castShadow={castShadow} />}>
        <ModelFromGLB type={type} castShadow={castShadow} />
      </Suspense>
    </ModelErrorBoundary>
  )
}

function FurnitureMesh({
  item,
  selected,
  onSelect,
  onUpdate,
  dragging,
  setDragging,
  others,
}: {
  item: FurnitureItem
  selected: boolean
  onSelect: () => void
  onUpdate: (next: FurnitureItem) => void
  dragging: boolean
  setDragging: (v: boolean) => void
  others: FurnitureItem[]
}) {
  const cat = FURNITURE_CATALOG[item.type]
  const groupRef = useRef<THREE.Group>(null)
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const offset = useRef(new THREE.Vector3())
  const hitPoint = useRef(new THREE.Vector3())

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onSelect()
    if (e.button === 2) {
      return
    }
    const raycaster = new THREE.Raycaster()
    const camera = (e as any).camera as THREE.Camera
    raycaster.setFromCamera(e.pointer, camera)
    if (groupRef.current && raycaster.ray.intersectPlane(plane.current, hitPoint.current)) {
      offset.current.copy(hitPoint.current).sub(groupRef.current.position)
      setDragging(true)
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    }
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging || !groupRef.current) return
    const raycaster = new THREE.Raycaster()
    const camera = (e as any).camera as THREE.Camera
    raycaster.setFromCamera(e.pointer, camera)
    if (raycaster.ray.intersectPlane(plane.current, hitPoint.current)) {
      const next = hitPoint.current.clone().sub(offset.current)
      const candidate: FurnitureItem = {
        ...item,
        position: [next.x, 0, next.z],
      }
      const conflict = others.find((o) => o.id !== item.id && checkOverlap(candidate, o))
      if (!conflict) {
        onUpdate(candidate)
      }
    }
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setDragging(false)
  }

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onUpdate({ ...item, rotationY: item.rotationY + Math.PI / 6 })
  }

  const highlightRadius = useMemo(() => {
    return Math.max(cat.size[0], cat.size[1]) * 0.6
  }, [cat.size])

  return (
    <group
      ref={groupRef}
      position={item.position}
      rotation={[0, item.rotationY, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => setDragging(false)}
      onContextMenu={handleContextMenu}
    >
      <ModelWrapper type={item.type} />
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[highlightRadius, highlightRadius + 0.1, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}

function ShadowConfig() {
  const { gl } = useThree()
  useEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl])
  return null
}

function CameraCapture({
  cameraRef,
}: {
  cameraRef: React.MutableRefObject<THREE.Camera | null>
}) {
  const { camera } = useThree()
  useEffect(() => {
    cameraRef.current = camera
  }, [camera, cameraRef])
  return null
}

export default function EditorCanvas({
  points,
  walls,
  furniture,
  onAddPoint,
  onCloseRoom,
  onUndoPoint,
  onResetPoints,
  onAddFurniture,
  onUpdateFurniture,
  onRemoveFurniture,
  onUpdateWall,
}: Props) {
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)

  const handleFloorDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const newPoint: WallPoint = { id: uid(), x: e.point.x, z: e.point.z }

      if (points.length >= 3) {
        const first = points[0]
        const camera = cameraRef.current
        const container = containerRef.current
        if (camera && container) {
          const rect = container.getBoundingClientRect()
          const proj = new THREE.Vector3(first.x, 0, first.z).project(camera)
          const firstScreenX = (proj.x * 0.5 + 0.5) * rect.width
          const firstScreenY = (-proj.y * 0.5 + 0.5) * rect.height
          const clickScreenX = e.nativeEvent.clientX - rect.left
          const clickScreenY = e.nativeEvent.clientY - rect.top
          const pxDist = Math.sqrt(
            (clickScreenX - firstScreenX) ** 2 + (clickScreenY - firstScreenY) ** 2,
          )
          if (pxDist < CLOSE_PX_THRESHOLD) {
            onCloseRoom()
            return
          }
        } else {
          const dist = Math.sqrt(
            (newPoint.x - first.x) ** 2 + (newPoint.z - first.z) ** 2,
          )
          if (dist < 0.6) {
            onCloseRoom()
            return
          }
        }
      }

      onAddPoint(newPoint)
      setSelectedFurnitureId(null)
    },
    [points, onAddPoint, onCloseRoom],
  )

  const handleFloorDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('furniture-type') as FurnitureType
      if (!type || !containerRef.current) return

      const camera = cameraRef.current
      if (!camera) return

      const rect = containerRef.current.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(ndc, camera)
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const hit = new THREE.Vector3()
      if (!raycaster.ray.intersectPlane(floorPlane, hit)) return

      const candidate: FurnitureItem = {
        id: uid(),
        type,
        position: [hit.x, 0, hit.z],
        rotationY: 0,
      }

      const conflict = furniture.find((o) => checkOverlap(candidate, o))
      if (conflict) {
        console.warn('[room-planner-3d] 放置位置与已有家具重叠，已拒绝放置')
        return
      }
      onAddFurniture(candidate)
    },
    [furniture, onAddFurniture],
  )

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-900"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFloorDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas shadows camera={{ position: [10, 10, 15], fov: 50 }}>
        <ShadowConfig />
        <CameraCapture cameraRef={cameraRef} />
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <Grid
          args={[40, 40]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={40}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
          onDoubleClick={handleFloorDoubleClick}
        >
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.6} />
        </mesh>

        {points.map((p) => (
          <mesh key={p.id} position={[p.x, 0.1, p.z]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        ))}

        {walls.map((w) => (
          <WallMesh key={w.id} wall={w} onUpdate={onUpdateWall} />
        ))}

        {furniture.map((item) => (
          <FurnitureMesh
            key={item.id}
            item={item}
            selected={selectedFurnitureId === item.id}
            onSelect={() => setSelectedFurnitureId(item.id)}
            onUpdate={onUpdateFurniture}
            dragging={draggingId === item.id}
            setDragging={(v) => setDraggingId(v ? item.id : null)}
            others={furniture}
          />
        ))}

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>

      <div className="absolute top-4 left-4 text-xs text-slate-300 bg-slate-800/80 rounded-md px-3 py-2 space-y-1 pointer-events-none backdrop-blur">
        <div>双击地板放置墙角点，靠近起点双击自动闭合房间</div>
        <div>从左侧拖拽家具到画布即可放置</div>
        <div>点击家具后可拖拽移动，右键旋转 30°</div>
      </div>

      {points.length > 0 && (
        <div className="absolute top-4 right-4 flex gap-2 bg-slate-800/90 rounded-md px-3 py-2 text-xs">
          <button
            onClick={onUndoPoint}
            className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100"
          >
            撤销上一个点
          </button>
          <button
            onClick={onResetPoints}
            className="px-3 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white"
          >
            重置全部点
          </button>
          <span className="self-center text-slate-400">
            已放 {points.length} 个点
          </span>
        </div>
      )}

      {selectedFurnitureId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-slate-800/90 rounded-md px-4 py-2 text-xs text-slate-100">
          <button
            className="hover:text-blue-300"
            onClick={() => {
              const item = furniture.find((f) => f.id === selectedFurnitureId)
              if (item) onUpdateFurniture({ ...item, rotationY: item.rotationY + Math.PI / 6 })
            }}
          >
            旋转 +30°
          </button>
          <button
            className="hover:text-blue-300"
            onClick={() => {
              const item = furniture.find((f) => f.id === selectedFurnitureId)
              if (item) onUpdateFurniture({ ...item, rotationY: item.rotationY - Math.PI / 6 })
            }}
          >
            旋转 -30°
          </button>
          <button
            className="text-red-400 hover:text-red-300"
            onClick={() => {
              onRemoveFurniture(selectedFurnitureId)
              setSelectedFurnitureId(null)
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  )
}
