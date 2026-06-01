import { useCallback } from 'react'
import EditorCanvas from './editor/EditorCanvas'
import FurnitureSidebar from './editor/FurnitureSidebar'
import { useLocalStorage } from './hooks/useLocalStorage'
import {
  WALL_HEIGHT,
  WALL_THICKNESS,
} from './editor/types'
import type {
  FurnitureItem,
  Wall,
  WallPoint,
} from './editor/types'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function App() {
  const [points, setPoints] = useLocalStorage<WallPoint[]>('rp3d:points', [])
  const [walls, setWalls] = useLocalStorage<Wall[]>('rp3d:walls', [])
  const [furniture, setFurniture] = useLocalStorage<FurnitureItem[]>('rp3d:furniture', [])

  const handleAddPoint = useCallback(
    (p: WallPoint) => setPoints((prev) => [...prev, p]),
    [setPoints],
  )

  const handleCloseRoom = useCallback(() => {
    if (points.length < 3) return
    const newWalls: Wall[] = []
    for (let i = 0; i < points.length; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      newWalls.push({
        id: uid(),
        from: a,
        to: b,
        height: WALL_HEIGHT,
        thickness: WALL_THICKNESS,
      })
    }
    setWalls((prev) => [...prev, ...newWalls])
    setPoints([])
  }, [points, setWalls, setPoints])

  const handleUndoPoint = useCallback(() => {
    setPoints((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev))
  }, [setPoints])

  const handleResetPoints = useCallback(() => {
    setPoints([])
  }, [setPoints])

  const handleAddFurniture = useCallback(
    (f: FurnitureItem) => setFurniture((prev) => [...prev, f]),
    [setFurniture],
  )

  const handleUpdateFurniture = useCallback(
    (f: FurnitureItem) =>
      setFurniture((prev) => prev.map((it) => (it.id === f.id ? f : it))),
    [setFurniture],
  )

  const handleRemoveFurniture = useCallback(
    (id: string) => setFurniture((prev) => prev.filter((it) => it.id !== id)),
    [setFurniture],
  )

  const handleUpdateWall = useCallback(
    (w: Wall) => setWalls((prev) => prev.map((it) => (it.id === w.id ? w : it))),
    [setWalls],
  )

  const handleClear = useCallback(() => {
    setPoints([])
    setWalls([])
    setFurniture([])
  }, [setPoints, setWalls, setFurniture])

  return (
    <div className="w-screen h-screen flex bg-slate-950 text-slate-100">
      <FurnitureSidebar onClear={handleClear} />
      <main className="flex-1 relative">
        <EditorCanvas
          points={points}
          walls={walls}
          furniture={furniture}
          onAddPoint={handleAddPoint}
          onCloseRoom={handleCloseRoom}
          onUndoPoint={handleUndoPoint}
          onResetPoints={handleResetPoints}
          onAddFurniture={handleAddFurniture}
          onUpdateFurniture={handleUpdateFurniture}
          onRemoveFurniture={handleRemoveFurniture}
          onUpdateWall={handleUpdateWall}
        />
      </main>
    </div>
  )
}

export default App
