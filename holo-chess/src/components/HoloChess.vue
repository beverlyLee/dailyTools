<script setup lang="ts">
import { ref, onMounted, nextTick, reactive } from 'vue'
import * as THREE from 'three'
import { useThreeScene } from '@/composables/useThreeScene'
import HoloGrid from '@/board/HoloGrid.vue'
import TrailEffect from '@/effects/TrailEffect.vue'
import ChessPiece, { type ChessPieceHandle } from '@/pieces/ChessPiece.vue'
import { ChessGame, type Position, type Color } from '@/game/chess'

const CELL_SIZE = 1
const HALF_BOARD = 4

function boardToWorld(row: number, col: number): THREE.Vector3 {
  return new THREE.Vector3(
    (col - HALF_BOARD + 0.5) * CELL_SIZE,
    0,
    (row - HALF_BOARD + 0.5) * CELL_SIZE
  )
}

interface PieceData {
  uid: string
  id: string
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king'
  color: Color
  position: Position
  animating: boolean
}

const containerRef = ref<HTMLElement | null>(null)
const { scene, isReady, onAnimate, getIntersection } = useThreeScene(containerRef)

const game = new ChessGame()
const currentTurn = ref<Color>('white')
const selectedPos = ref<Position | null>(null)
const highlightedCells = ref<Position[]>([])
const isAnimating = ref(false)
const gameStatus = ref('')
const turnLabel = ref('WHITE TURN')

const holoGridRef = ref<InstanceType<typeof HoloGrid> | null>(null)
const trailRef = ref<InstanceType<typeof TrailEffect> | null>(null)

const piecesList = reactive<PieceData[]>([])
const pieceRefs = ref<Map<string, ChessPieceHandle>>(new Map())

let uidCounter = 0

function generateUid(): string {
  return `piece_${++uidCounter}`
}

function pieceKey(row: number, col: number): string {
  return `${row},${col}`
}

function initPieces() {
  piecesList.length = 0
  pieceRefs.value.clear()
  for (const { pos, piece } of game.getAllPieces()) {
    piecesList.push({
      uid: generateUid(),
      id: pieceKey(pos.row, pos.col),
      type: piece.type,
      color: piece.color,
      position: { ...pos },
      animating: false,
    })
  }
}

function setPieceRef(uid: string, el: any) {
  if (el) {
    pieceRefs.value.set(uid, el as ChessPieceHandle)
  } else {
    pieceRefs.value.delete(uid)
  }
}

function setPieceSelection(pieceData: PieceData, selected: boolean) {
  const handle = pieceRefs.value.get(pieceData.uid)
  if (!handle) return

  for (const mesh of handle.getMeshes()) {
    const mat = mesh.material as THREE.MeshPhongMaterial
    if (selected) {
      mat.opacity = 0.85
      mat.emissiveIntensity = 1.5
    } else {
      mat.opacity = 0.55
      mat.emissiveIntensity = 0.6
    }
  }
}

function onCellClick(event: MouseEvent) {
  if (isAnimating.value || game.isGameOver) return

  const clickables: THREE.Object3D[] = []

  const cellMeshes = holoGridRef.value?.getCellMeshes()
  if (cellMeshes) clickables.push(...cellMeshes)

  for (const piece of piecesList) {
    const handle = pieceRefs.value.get(piece.uid)
    if (handle) clickables.push(handle.pieceGroup)
  }

  const intersection = getIntersection(clickables, event)
  if (!intersection) return

  let clickedRow = -1
  let clickedCol = -1

  const obj = intersection.object
  if (obj.userData.row !== undefined && obj.userData.col !== undefined) {
    clickedRow = obj.userData.row
    clickedCol = obj.userData.col
  } else {
    let parent: THREE.Object3D | null = obj
    while (parent) {
      if (parent.userData.row !== undefined && parent.userData.col !== undefined) {
        clickedRow = parent.userData.row
        clickedCol = parent.userData.col
        break
      }
      parent = parent.parent
    }
  }

  if (clickedRow === -1) return

  const clickedPos: Position = { row: clickedRow, col: clickedCol }
  const clickedPiece = game.getPiece(clickedPos)

  if (selectedPos.value) {
    const isLegalTarget = highlightedCells.value.some(
      p => p.row === clickedPos.row && p.col === clickedPos.col
    )

    if (isLegalTarget) {
      executeMove(selectedPos.value, clickedPos)
      return
    }

    if (clickedPiece && clickedPiece.color === game.currentTurn) {
      selectPiece(clickedPos)
      return
    }

    deselectPiece()
    return
  }

  if (clickedPiece && clickedPiece.color === game.currentTurn) {
    selectPiece(clickedPos)
  }
}

function selectPiece(pos: Position) {
  if (selectedPos.value) {
    const prevId = pieceKey(selectedPos.value.row, selectedPos.value.col)
    const prevPiece = piecesList.find(p => p.id === prevId)
    if (prevPiece) setPieceSelection(prevPiece, false)
  }

  selectedPos.value = pos
  highlightedCells.value = game.getLegalMoves(pos)

  const id = pieceKey(pos.row, pos.col)
  const piece = piecesList.find(p => p.id === id)
  if (piece) setPieceSelection(piece, true)

  holoGridRef.value?.updateHighlights()
}

function deselectPiece() {
  if (selectedPos.value) {
    const prevId = pieceKey(selectedPos.value.row, selectedPos.value.col)
    const prevPiece = piecesList.find(p => p.id === prevId)
    if (prevPiece) setPieceSelection(prevPiece, false)
  }

  selectedPos.value = null
  highlightedCells.value = []
  holoGridRef.value?.updateHighlights()
}

async function animatePieceMove(
  pieceData: PieceData,
  targetPos: Position,
  duration: number = 800
): Promise<void> {
  pieceData.animating = true
  const handle = pieceRefs.value.get(pieceData.uid)
  if (handle) {
    await handle.moveToPosition(targetPos, duration)
  }
  pieceData.position = { ...targetPos }
  pieceData.animating = false
}

async function animatePieceDissolve(pieceData: PieceData, duration: number = 600): Promise<void> {
  const handle = pieceRefs.value.get(pieceData.uid)
  if (handle) {
    await handle.dissolve(scene, duration)
  }
  const idx = piecesList.findIndex(p => p.uid === pieceData.uid)
  if (idx > -1) piecesList.splice(idx, 1)
  pieceRefs.value.delete(pieceData.uid)
}

async function executeMove(from: Position, to: Position) {
  isAnimating.value = true

  const fromId = pieceKey(from.row, from.col)
  const movingPiece = piecesList.find(p => p.id === fromId)
  const movingPieceData = game.getPiece(from)

  const fromWorld = boardToWorld(from.row, from.col)
  const toWorld = boardToWorld(to.row, to.col)
  const pieceColor = movingPieceData?.color === 'white' ? 0x00e5ff : 0xff00ff
  trailRef.value?.spawnTrail(fromWorld, toWorld, pieceColor)

  const targetPieceData = game.getPiece(to)
  const move = game.makeMove(from, to)
  if (!move) {
    isAnimating.value = false
    return
  }

  if (targetPieceData || move.isEnPassant) {
    const capturedPos = move.isEnPassant ? { row: from.row, col: to.col } : to
    const capturedId = pieceKey(capturedPos.row, capturedPos.col)
    const capturedPiece = piecesList.find(p => p.id === capturedId)
    if (capturedPiece) {
      animatePieceDissolve(capturedPiece)
    }
  }

  deselectPiece()

  if (movingPiece) {
    const toId = pieceKey(to.row, to.col)
    movingPiece.id = toId
    movingPiece.position = { ...to }
    await animatePieceMove(movingPiece, to)

    if (move.promotion && movingPiece) {
      movingPiece.type = move.promotion
      const handle = pieceRefs.value.get(movingPiece.uid)
      if (handle) handle.buildPiece()
    }
  }

  if (move.isCastling) {
    const row = from.row
    if (to.col === 6) {
      const rookFromId = pieceKey(row, 7)
      const rookToId = pieceKey(row, 5)
      const rookPiece = piecesList.find(p => p.id === rookFromId)
      if (rookPiece) {
        rookPiece.id = rookToId
        rookPiece.position = { row, col: 5 }
        await animatePieceMove(rookPiece, { row, col: 5 }, 600)
      }
    } else if (to.col === 2) {
      const rookFromId = pieceKey(row, 0)
      const rookToId = pieceKey(row, 3)
      const rookPiece = piecesList.find(p => p.id === rookFromId)
      if (rookPiece) {
        rookPiece.id = rookToId
        rookPiece.position = { row, col: 3 }
        await animatePieceMove(rookPiece, { row, col: 3 }, 600)
      }
    }
  }

  currentTurn.value = game.currentTurn
  updateGameStatus()
  isAnimating.value = false
}

function updateGameStatus() {
  if (game.isGameOver) {
    if (game.winner === 'draw') {
      gameStatus.value = 'STALEMATE - DRAW'
    } else {
      gameStatus.value = `CHECKMATE - ${game.winner?.toUpperCase()} WINS`
    }
    turnLabel.value = 'GAME OVER'
  } else if (game.isInCheck(game.currentTurn)) {
    turnLabel.value = `${game.currentTurn.toUpperCase()} TURN - CHECK!`
    gameStatus.value = 'CHECK!'
  } else {
    turnLabel.value = `${game.currentTurn.toUpperCase()} TURN`
    gameStatus.value = ''
  }
}

function resetGame() {
  for (const piece of piecesList) {
    const handle = pieceRefs.value.get(piece.uid)
    if (handle) {
      scene.remove(handle.pieceGroup)
      for (const mesh of handle.getMeshes()) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
    }
  }
  piecesList.length = 0
  pieceRefs.value.clear()

  const newGame = new ChessGame()
  Object.assign(game, newGame)

  selectedPos.value = null
  highlightedCells.value = []
  gameStatus.value = ''
  turnLabel.value = 'WHITE TURN'
  currentTurn.value = 'white'
  isAnimating.value = false

  nextTick(() => {
    initPieces()
  })
  holoGridRef.value?.updateHighlights()
}

function updateIdleAnimations(elapsed: number) {
  for (const piece of piecesList) {
    if (piece.animating) continue

    const handle = pieceRefs.value.get(piece.uid)
    if (!handle) continue

    const isSelected = selectedPos.value?.row === piece.position.row &&
                       selectedPos.value?.col === piece.position.col

    if (isSelected) {
      handle.pieceGroup.position.y = 0.1 + Math.sin(elapsed * 3) * 0.05
      for (const mesh of handle.getMeshes()) {
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.emissiveIntensity = 1.2 + Math.sin(elapsed * 5) * 0.5
      }
    } else {
      handle.pieceGroup.position.y = Math.sin(elapsed * 1.5 + piece.position.row * 0.3 + piece.position.col * 0.5) * 0.02
    }
  }
}

onMounted(() => {
  nextTick(() => {
    if (isReady.value) {
      initPieces()
      updateGameStatus()
    }
  })

  onAnimate((_delta, elapsed) => {
    updateIdleAnimations(elapsed)
  })
})
</script>

<template>
  <div ref="containerRef" class="holo-chess-container" @click="onCellClick">
    <template v-if="isReady">
      <HoloGrid
        ref="holoGridRef"
        :scene="scene"
        :on-animate="onAnimate"
        :highlighted-cells="highlightedCells"
        :selected-cell="selectedPos"
      />
      <TrailEffect
        ref="trailRef"
        :scene="scene"
        :on-animate="onAnimate"
      />

      <template v-for="piece in piecesList" :key="piece.uid">
        <ChessPiece
          :ref="(el) => setPieceRef(piece.uid, el)"
          :scene="scene"
          :piece-type="piece.type"
          :piece-color="piece.color"
          :position="piece.position"
          :is-selected="selectedPos?.row === piece.position.row && selectedPos?.col === piece.position.col"
        />
      </template>
    </template>

    <div class="ui-overlay">
      <div class="turn-indicator" :class="{ 'check': gameStatus === 'CHECK!' }">
        <div class="turn-label">{{ turnLabel }}</div>
        <div v-if="gameStatus" class="status-label">{{ gameStatus }}</div>
      </div>

      <div class="side-panel">
        <div class="panel-title">HOLO CHESS</div>
        <div class="panel-divider"></div>
        <div class="piece-legend">
          <span class="legend-cyan">●</span> WHITE
        </div>
        <div class="piece-legend">
          <span class="legend-magenta">●</span> BLACK
        </div>
      </div>

      <div v-if="game.isGameOver" class="game-over-panel">
        <div class="game-over-title">{{ game.winner === 'draw' ? 'DRAW' : `${game.winner?.toUpperCase()} WINS` }}</div>
        <button class="holo-btn" @click="resetGame">NEW GAME</button>
      </div>

      <div class="bottom-bar">
        <span class="hint">Click piece to select · Click highlighted cell to move</span>
        <button class="holo-btn small" @click="resetGame">RESET</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.holo-chess-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  cursor: crosshair;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.turn-indicator {
  position: absolute;
  top: 24px;
  left: 24px;
  padding: 12px 24px;
  background: rgba(0, 229, 255, 0.05);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 4px;
  font-family: 'Orbitron', monospace;
  backdrop-filter: blur(8px);
}

.turn-indicator.check {
  border-color: rgba(255, 0, 255, 0.6);
  background: rgba(255, 0, 255, 0.05);
}

.turn-label {
  font-size: 14px;
  font-weight: 700;
  color: #00e5ff;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
}

.check .turn-label {
  color: #ff00ff;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
}

.status-label {
  font-size: 11px;
  font-weight: 400;
  color: #ff00ff;
  letter-spacing: 2px;
  margin-top: 4px;
  text-shadow: 0 0 8px rgba(255, 0, 255, 0.5);
}

.side-panel {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  padding: 16px 20px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 4px;
  font-family: 'Orbitron', monospace;
  backdrop-filter: blur(8px);
}

.panel-title {
  font-size: 13px;
  font-weight: 900;
  color: #00e5ff;
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
}

.panel-divider {
  width: 100%;
  height: 1px;
  background: rgba(0, 229, 255, 0.2);
  margin: 10px 0;
}

.piece-legend {
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  color: rgba(200, 220, 240, 0.5);
  letter-spacing: 2px;
  margin: 4px 0;
}

.legend-cyan {
  color: #00e5ff;
  text-shadow: 0 0 6px rgba(0, 229, 255, 0.5);
}

.legend-magenta {
  color: #ff00ff;
  text-shadow: 0 0 6px rgba(255, 0, 255, 0.5);
}

.game-over-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  padding: 40px 60px;
  background: rgba(10, 14, 26, 0.85);
  border: 1px solid rgba(0, 229, 255, 0.4);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  pointer-events: auto;
}

.game-over-title {
  font-family: 'Orbitron', monospace;
  font-size: 28px;
  font-weight: 900;
  color: #00e5ff;
  letter-spacing: 6px;
  text-shadow: 0 0 20px rgba(0, 229, 255, 0.6);
  margin-bottom: 24px;
}

.bottom-bar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 20px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 4px;
  backdrop-filter: blur(8px);
}

.hint {
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  color: rgba(0, 229, 255, 0.5);
  letter-spacing: 1px;
}

.holo-btn {
  font-family: 'Orbitron', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.05);
  border: 1px solid rgba(0, 229, 255, 0.4);
  padding: 10px 28px;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 3px;
  text-transform: uppercase;
  transition: all 0.3s ease;
  pointer-events: auto;
}

.holo-btn:hover {
  background: rgba(0, 229, 255, 0.15);
  border-color: rgba(0, 229, 255, 0.8);
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.2);
}

.holo-btn.small {
  font-size: 10px;
  padding: 6px 16px;
  letter-spacing: 2px;
}
</style>
