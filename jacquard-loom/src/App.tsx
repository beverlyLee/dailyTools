import { useEffect, useRef, useState, useCallback } from 'react'
import { SceneManager } from './utils/SceneManager'
import { WarpThreads } from './loom/WarpThreads'
import { Shuttle } from './loom/Shuttle'
import { WeftThreads } from './loom/WeftThreads'
import { getRowPattern, PATTERN_DATA } from './loom/Pattern'
import type { LoomConfig, LoomState } from './types'
import { Play, Pause, RotateCcw, Info, Gauge } from 'lucide-react'

const LOOM_CONFIG: LoomConfig = {
  warpCount: 200,
  warpHeight: 4,
  warpSpacing: 0.05,
  weftMaxRows: 40,
  shuttleSpeed: 9.1,
  animationSpeed: 1.0,
}

const PHASE_DURATION_MS = {
  'warp-lifting': 400,
  'shuttle-moving': 1200,
  'weft-setting': 300,
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const warpThreadsRef = useRef<WarpThreads | null>(null)
  const shuttleRef = useRef<Shuttle | null>(null)
  const weftThreadsRef = useRef<WeftThreads | null>(null)
  const animationFrameRef = useRef<number>(0)
  const loomStateRef = useRef<LoomState>({
    currentRow: 0,
    isWeaving: false,
    shuttleDirection: 1,
    phase: 'idle',
    phaseProgress: 0,
  })
  const currentPatternRef = useRef<boolean[]>(
    new Array(LOOM_CONFIG.warpCount).fill(false)
  )
  const phaseTimerRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentRow, setCurrentRow] = useState(0)
  const [speed, setSpeed] = useState(1.0)
  const [showInfo, setShowInfo] = useState(true)

  const initLoom = useCallback(() => {
    if (!containerRef.current) return

    const sceneManager = new SceneManager(containerRef.current)
    sceneManagerRef.current = sceneManager

    const warpThreads = new WarpThreads(
      LOOM_CONFIG.warpCount,
      LOOM_CONFIG.warpHeight,
      LOOM_CONFIG.warpSpacing,
      0.15
    )
    warpThreadsRef.current = warpThreads
    sceneManager.scene.add(warpThreads.getMesh())

    const shuttle = new Shuttle()
    shuttleRef.current = shuttle
    shuttle.setSpeed(LOOM_CONFIG.shuttleSpeed)
    sceneManager.scene.add(shuttle.getMesh())

    const weftThreads = new WeftThreads(
      LOOM_CONFIG.weftMaxRows,
      LOOM_CONFIG.warpCount,
      LOOM_CONFIG.warpSpacing,
      0.15
    )
    weftThreadsRef.current = weftThreads
    sceneManager.scene.add(weftThreads.getMesh())

    const leftEdge = warpThreads.getStartX() - 0.5
    shuttle.getMesh().position.x = leftEdge
    ;(shuttle as any).currentX = leftEdge

    loomStateRef.current = {
      currentRow: 0,
      isWeaving: false,
      shuttleDirection: 1,
      phase: 'idle',
      phaseProgress: 0,
    }
    phaseTimerRef.current = 0
    lastFrameTimeRef.current = performance.now()
    setCurrentRow(0)
  }, [])

  const startWeavingRow = useCallback(() => {
    const state = loomStateRef.current
    if (state.currentRow >= PATTERN_DATA.height) {
      state.phase = 'complete'
      state.isWeaving = false
      setIsPlaying(false)
      return
    }

    const patternRow = getRowPattern(state.currentRow, LOOM_CONFIG.warpCount)
    currentPatternRef.current = patternRow
    state.phase = 'warp-lifting'
    state.phaseProgress = 0
    phaseTimerRef.current = 0
    lastFrameTimeRef.current = performance.now()
  }, [])

  const animate = useCallback(() => {
    animationFrameRef.current = requestAnimationFrame(animate)

    const sceneManager = sceneManagerRef.current
    const warpThreads = warpThreadsRef.current
    const shuttle = shuttleRef.current
    const weftThreads = weftThreadsRef.current

    if (!sceneManager || !warpThreads || !shuttle || !weftThreads) return

    const now = performance.now()
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = now
    }
    const rawDeltaMs = now - lastFrameTimeRef.current
    lastFrameTimeRef.current = now

    const deltaMs = rawDeltaMs * speed
    const clampedDeltaMs = Math.min(deltaMs, 100)
    const deltaSeconds = clampedDeltaMs / 1000

    const state = loomStateRef.current

    if (state.isWeaving) {
      phaseTimerRef.current += clampedDeltaMs

      switch (state.phase) {
        case 'warp-lifting': {
          const phaseDuration = PHASE_DURATION_MS['warp-lifting']
          state.phaseProgress = Math.min(
            phaseTimerRef.current / phaseDuration,
            1
          )

          const liftAmount = 0.6 * Math.sin(state.phaseProgress * Math.PI * 0.5)
          warpThreads.update(
            currentPatternRef.current,
            deltaSeconds,
            liftAmount
          )

          if (phaseTimerRef.current >= phaseDuration) {
            state.phase = 'shuttle-moving'
            phaseTimerRef.current = 0

            const warpStartX = warpThreads.getStartX()
            const warpEndX = -warpStartX
            const margin = 0.5

            if (state.shuttleDirection === 1) {
              shuttle.moveTo(warpEndX + margin, 1)
            } else {
              shuttle.moveTo(warpStartX - margin, -1)
            }
          }
          break
        }

        case 'shuttle-moving': {
          const phaseDuration = PHASE_DURATION_MS['shuttle-moving']
          state.phaseProgress = Math.min(
            phaseTimerRef.current / phaseDuration,
            1
          )

          const shuttleZ =
            state.shuttleDirection === 1 ? 0.3 : -0.1
          shuttle.setZPosition(shuttleZ)

          shuttle.update(deltaSeconds)

          const liftAmount = 0.6
          warpThreads.update(
            currentPatternRef.current,
            deltaSeconds,
            liftAmount
          )

          if (phaseTimerRef.current >= phaseDuration) {
            state.phase = 'weft-setting'
            phaseTimerRef.current = 0
          }
          break
        }

        case 'weft-setting': {
          const phaseDuration = PHASE_DURATION_MS['weft-setting']
          state.phaseProgress = Math.min(
            phaseTimerRef.current / phaseDuration,
            1
          )

          const liftAmount =
            0.6 * (1 - Math.sin(state.phaseProgress * Math.PI * 0.5))
          warpThreads.update(
            currentPatternRef.current,
            deltaSeconds,
            liftAmount
          )

          if (phaseTimerRef.current >= phaseDuration) {
            weftThreads.addRow(currentPatternRef.current, 0.6)

            state.currentRow++
            setCurrentRow(state.currentRow)
            state.shuttleDirection = (state.shuttleDirection === 1
              ? -1
              : 1) as 1 | -1

            if (state.currentRow >= PATTERN_DATA.height) {
              state.phase = 'complete'
              state.isWeaving = false
              setIsPlaying(false)
            } else {
              startWeavingRow()
            }
          }
          break
        }

        default:
          warpThreads.update(
            new Array(LOOM_CONFIG.warpCount).fill(false),
            deltaSeconds,
            0
          )
      }
    } else {
      warpThreads.update(
        new Array(LOOM_CONFIG.warpCount).fill(false),
        deltaSeconds,
        0
      )
      shuttle.update(deltaSeconds)
    }

    sceneManager.update()
  }, [speed, startWeavingRow])

  const handlePlayPause = useCallback(() => {
    const state = loomStateRef.current

    if (state.phase === 'complete') {
      handleReset()
      return
    }

    if (!state.isWeaving) {
      state.isWeaving = true
      setIsPlaying(true)
      lastFrameTimeRef.current = performance.now()

      if (state.phase === 'idle') {
        startWeavingRow()
      }
    } else {
      state.isWeaving = false
      setIsPlaying(false)
    }
  }, [startWeavingRow])

  const handleReset = useCallback(() => {
    loomStateRef.current = {
      currentRow: 0,
      isWeaving: false,
      shuttleDirection: 1,
      phase: 'idle',
      phaseProgress: 0,
    }
    phaseTimerRef.current = 0
    lastFrameTimeRef.current = performance.now()
    setCurrentRow(0)
    setIsPlaying(false)

    if (weftThreadsRef.current) {
      weftThreadsRef.current.reset()
    }

    if (shuttleRef.current && warpThreadsRef.current) {
      const leftEdge = warpThreadsRef.current.getStartX() - 0.5
      shuttleRef.current.getMesh().position.x = leftEdge
      ;(shuttleRef.current as any).currentX = leftEdge
    }
  }, [])

  useEffect(() => {
    initLoom()
    animate()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      sceneManagerRef.current?.dispose()
      warpThreadsRef.current?.dispose()
      shuttleRef.current?.dispose()
      weftThreadsRef.current?.dispose()
      sceneManagerRef.current = null
      warpThreadsRef.current = null
      shuttleRef.current = null
      weftThreadsRef.current = null
    }
  }, [initLoom, animate])

  const progress = (currentRow / PATTERN_DATA.height) * 100
  const phaseText = {
    idle: '待机中',
    'warp-lifting': '经线抬起',
    'shuttle-moving': '梭子穿梭',
    'weft-setting': '打纬交织',
    complete: '编织完成',
  }

  return (
    <div className="relative w-full h-screen bg-[#1a1a2e] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-4 min-w-[240px] text-white border border-white/10">
        <h3 className="text-lg font-bold mb-3 text-amber-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          提花机状态
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">进度</span>
            <span className="font-mono">
              {currentRow} / {PATTERN_DATA.height} 行
            </span>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">当前阶段</span>
            <span className="text-cyan-400 font-medium">
              {phaseText[loomStateRef.current.phase]}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center gap-1">
              <Gauge size={14} />
              速度
            </span>
            <input
              type="range"
              min="0.25"
              max="3"
              step="0.25"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-24 accent-amber-500"
            />
            <span className="font-mono w-10 text-right">{speed.toFixed(2)}x</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handlePlayPause}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg transition-colors font-medium"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? '暂停' : loomStateRef.current.phase === 'complete' ? '重新开始' : '开始'}
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded-lg transition-colors"
            title="重置"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-xl p-4 text-white border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-amber-400">编织图案</h4>
          <span className="text-xs text-gray-400">
            {PATTERN_DATA.width} × {PATTERN_DATA.height}
          </span>
        </div>
        <div
          className="grid gap-px bg-gray-800 p-1 rounded"
          style={{
            gridTemplateColumns: `repeat(${PATTERN_DATA.width}, 4px)`,
          }}
        >
          {PATTERN_DATA.data.map((row, y) =>
            row.map((pixel, x) => (
              <div
                key={`${x}-${y}`}
                className={`w-1 h-1 ${
                  y < currentRow
                    ? pixel
                      ? 'bg-red-500'
                      : 'bg-gray-600'
                    : pixel
                    ? 'bg-amber-500'
                    : 'bg-gray-700'
                }`}
              />
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-full p-2 text-white hover:bg-black/80 transition-colors border border-white/10"
        title="显示/隐藏说明"
      >
        <Info size={20} />
      </button>

      {showInfo && (
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-4 max-w-[320px] text-white border border-white/10">
          <h4 className="font-bold text-amber-400 mb-2">雅卡尔提花机</h4>
          <p className="text-sm text-gray-300 leading-relaxed mb-2">
            雅卡尔提花机由约瑟夫·玛丽·雅卡尔于 1801 年发明，是第一台可编程的纺织机械。
            它使用打孔卡片控制经线的抬起，让梭子带着纬线穿过，从而编织出复杂的图案。
          </p>
          <p className="text-xs text-gray-400">
            💡 操作提示：拖动鼠标可环绕视角，滚轮缩放。
          </p>
        </div>
      )}
    </div>
  )
}

export default App
