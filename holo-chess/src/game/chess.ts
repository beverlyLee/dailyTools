export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'
export type Color = 'white' | 'black'

export interface Piece {
  type: PieceType
  color: Color
}

export interface Position {
  row: number
  col: number
}

export interface Move {
  from: Position
  to: Position
  piece: Piece
  captured?: Piece
  isEnPassant?: boolean
  isCastling?: boolean
  promotion?: PieceType
}

type Board = (Piece | null)[][]

function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null))

  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRow[col], color: 'black' }
    board[1][col] = { type: 'pawn', color: 'black' }
    board[6][col] = { type: 'pawn', color: 'white' }
    board[7][col] = { type: backRow[col], color: 'white' }
  }

  return board
}

export class ChessGame {
  board: Board
  currentTurn: Color = 'white'
  moveHistory: Move[] = []
  private castlingRights = {
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  }
  private enPassantTarget: Position | null = null
  isGameOver = false
  winner: Color | 'draw' | null = null

  constructor() {
    this.board = createInitialBoard()
  }

  getPiece(pos: Position): Piece | null {
    if (pos.row < 0 || pos.row > 7 || pos.col < 0 || pos.col > 7) return null
    return this.board[pos.row][pos.col]
  }

  isInBounds(pos: Position): boolean {
    return pos.row >= 0 && pos.row <= 7 && pos.col >= 0 && pos.col <= 7
  }

  getLegalMoves(pos: Position): Position[] {
    const piece = this.getPiece(pos)
    if (!piece || piece.color !== this.currentTurn) return []

    const pseudoMoves = this.getPseudoLegalMoves(pos)
    return pseudoMoves.filter(to => {
      const sim = this.clone()
      sim.forceMove({ from: pos, to, piece })
      return !sim.isInCheck(piece.color)
    })
  }

  private getPseudoLegalMoves(pos: Position): Position[] {
    const piece = this.getPiece(pos)
    if (!piece) return []

    const moves: Position[] = []

    switch (piece.type) {
      case 'pawn':
        this.getPawnMoves(pos, piece.color, moves)
        break
      case 'rook':
        this.getSlidingMoves(pos, piece.color, [[0, 1], [0, -1], [1, 0], [-1, 0]], moves)
        break
      case 'bishop':
        this.getSlidingMoves(pos, piece.color, [[1, 1], [1, -1], [-1, 1], [-1, -1]], moves)
        break
      case 'queen':
        this.getSlidingMoves(pos, piece.color, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]], moves)
        break
      case 'knight':
        this.getKnightMoves(pos, piece.color, moves)
        break
      case 'king':
        this.getKingMoves(pos, piece.color, moves)
        break
    }

    return moves
  }

  private getPawnMoves(pos: Position, color: Color, moves: Position[]): void {
    const dir = color === 'white' ? -1 : 1
    const startRow = color === 'white' ? 6 : 1

    const oneStep = { row: pos.row + dir, col: pos.col }
    if (this.isInBounds(oneStep) && !this.getPiece(oneStep)) {
      moves.push(oneStep)

      if (pos.row === startRow) {
        const twoStep = { row: pos.row + dir * 2, col: pos.col }
        if (!this.getPiece(twoStep)) {
          moves.push(twoStep)
        }
      }
    }

    for (const dc of [-1, 1]) {
      const diag = { row: pos.row + dir, col: pos.col + dc }
      if (this.isInBounds(diag)) {
        const target = this.getPiece(diag)
        if (target && target.color !== color) {
          moves.push(diag)
        }
        if (this.enPassantTarget && diag.row === this.enPassantTarget.row && diag.col === this.enPassantTarget.col) {
          moves.push(diag)
        }
      }
    }
  }

  private getSlidingMoves(pos: Position, color: Color, directions: number[][], moves: Position[]): void {
    for (const [dr, dc] of directions) {
      let r = pos.row + dr
      let c = pos.col + dc
      while (this.isInBounds({ row: r, col: c })) {
        const target = this.getPiece({ row: r, col: c })
        if (!target) {
          moves.push({ row: r, col: c })
        } else {
          if (target.color !== color) moves.push({ row: r, col: c })
          break
        }
        r += dr
        c += dc
      }
    }
  }

  private getKnightMoves(pos: Position, color: Color, moves: Position[]): void {
    const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
    for (const [dr, dc] of offsets) {
      const np = { row: pos.row + dr, col: pos.col + dc }
      if (this.isInBounds(np)) {
        const target = this.getPiece(np)
        if (!target || target.color !== color) moves.push(np)
      }
    }
  }

  private getKingMoves(pos: Position, color: Color, moves: Position[]): void {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const np = { row: pos.row + dr, col: pos.col + dc }
        if (this.isInBounds(np)) {
          const target = this.getPiece(np)
          if (!target || target.color !== color) moves.push(np)
        }
      }
    }

    if (color === 'white') {
      if (this.castlingRights.whiteKingSide && !this.getPiece({ row: 7, col: 5 }) && !this.getPiece({ row: 7, col: 6 })) {
        if (this.getPiece({ row: 7, col: 7 })?.type === 'rook' && !this.isInCheck(color)) {
          moves.push({ row: 7, col: 6 })
        }
      }
      if (this.castlingRights.whiteQueenSide && !this.getPiece({ row: 7, col: 3 }) && !this.getPiece({ row: 7, col: 2 }) && !this.getPiece({ row: 7, col: 1 })) {
        if (this.getPiece({ row: 7, col: 0 })?.type === 'rook' && !this.isInCheck(color)) {
          moves.push({ row: 7, col: 2 })
        }
      }
    } else {
      if (this.castlingRights.blackKingSide && !this.getPiece({ row: 0, col: 5 }) && !this.getPiece({ row: 0, col: 6 })) {
        if (this.getPiece({ row: 0, col: 7 })?.type === 'rook' && !this.isInCheck(color)) {
          moves.push({ row: 0, col: 6 })
        }
      }
      if (this.castlingRights.blackQueenSide && !this.getPiece({ row: 0, col: 3 }) && !this.getPiece({ row: 0, col: 2 }) && !this.getPiece({ row: 0, col: 1 })) {
        if (this.getPiece({ row: 0, col: 0 })?.type === 'rook' && !this.isInCheck(color)) {
          moves.push({ row: 0, col: 2 })
        }
      }
    }
  }

  findKing(color: Color): Position | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c]
        if (p?.type === 'king' && p.color === color) return { row: r, col: c }
      }
    }
    return null
  }

  isInCheck(color: Color): boolean {
    const kingPos = this.findKing(color)
    if (!kingPos) return false

    const opponent = color === 'white' ? 'black' : 'white'
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c]
        if (p && p.color === opponent) {
          const moves = this.getPseudoLegalMoves({ row: r, col: c })
          if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) return true
        }
      }
    }
    return false
  }

  makeMove(from: Position, to: Position): Move | null {
    const piece = this.getPiece(from)
    if (!piece || piece.color !== this.currentTurn) return null

    const legalMoves = this.getLegalMoves(from)
    if (!legalMoves.some(m => m.row === to.row && m.col === to.col)) return null

    const captured = this.getPiece(to)
    const move: Move = { from, to, piece, captured: captured || undefined }

    if (piece.type === 'pawn' && this.enPassantTarget && to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
      const epRow = piece.color === 'white' ? to.row + 1 : to.row - 1
      move.captured = this.getPiece({ row: epRow, col: to.col }) || undefined
      move.isEnPassant = true
      this.board[epRow][to.col] = null
    }

    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      move.isCastling = true
      if (to.col === 6) {
        const rook = this.board[from.row][7]
        this.board[from.row][5] = rook
        this.board[from.row][7] = null
      } else if (to.col === 2) {
        const rook = this.board[from.row][0]
        this.board[from.row][3] = rook
        this.board[from.row][0] = null
      }
    }

    this.enPassantTarget = null
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
      this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col }
    }

    this.board[to.row][to.col] = piece
    this.board[from.row][from.col] = null

    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
      this.board[to.row][to.col] = { type: 'queen', color: piece.color }
      move.promotion = 'queen'
    }

    this.updateCastlingRights(from, piece)
    this.moveHistory.push(move)
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white'

    this.checkGameEnd()

    return move
  }

  private forceMove(move: { from: Position; to: Position; piece: Piece }): void {
    this.board[move.to.row][move.to.col] = move.piece
    this.board[move.from.row][move.from.col] = null
  }

  private updateCastlingRights(from: Position, piece: Piece): void {
    if (piece.type === 'king') {
      if (piece.color === 'white') {
        this.castlingRights.whiteKingSide = false
        this.castlingRights.whiteQueenSide = false
      } else {
        this.castlingRights.blackKingSide = false
        this.castlingRights.blackQueenSide = false
      }
    }
    if (piece.type === 'rook') {
      if (from.row === 7 && from.col === 0) this.castlingRights.whiteQueenSide = false
      if (from.row === 7 && from.col === 7) this.castlingRights.whiteKingSide = false
      if (from.row === 0 && from.col === 0) this.castlingRights.blackQueenSide = false
      if (from.row === 0 && from.col === 7) this.castlingRights.blackKingSide = false
    }
  }

  private checkGameEnd(): void {
    const hasLegalMoves = this.hasAnyLegalMoves(this.currentTurn)
    if (!hasLegalMoves) {
      this.isGameOver = true
      if (this.isInCheck(this.currentTurn)) {
        this.winner = this.currentTurn === 'white' ? 'black' : 'white'
      } else {
        this.winner = 'draw'
      }
    }
  }

  private hasAnyLegalMoves(color: Color): boolean {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c]
        if (p && p.color === color) {
          const moves = this.getLegalMoves({ row: r, col: c })
          if (moves.length > 0) return true
        }
      }
    }
    return false
  }

  clone(): ChessGame {
    const copy = new ChessGame()
    copy.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null))
    copy.currentTurn = this.currentTurn
    copy.moveHistory = [...this.moveHistory]
    copy.castlingRights = { ...this.castlingRights }
    copy.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null
    copy.isGameOver = this.isGameOver
    copy.winner = this.winner
    return copy
  }

  getAllPieces(): { pos: Position; piece: Piece }[] {
    const pieces: { pos: Position; piece: Piece }[] = []
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c]
        if (p) pieces.push({ pos: { row: r, col: c }, piece: p })
      }
    }
    return pieces
  }
}
