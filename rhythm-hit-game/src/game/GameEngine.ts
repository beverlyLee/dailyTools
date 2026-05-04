import { Chart, Note, NoteType, Difficulty } from '../rhythm/types';
import { AudioAnalyzer } from '../audio/AudioAnalyzer';
import { JudgeSystem, JudgeResult, JudgeResultData, HitStats } from './JudgeSystem';
import { ScoreSystem, GameRank } from './ScoreSystem';

export enum GameState {
  LOADING = 'loading',
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  EDITING = 'editing',
  GAME_OVER = 'game_over'
}

export interface GameNote extends Note {
  isActive: boolean;
  isHit: boolean;
  isMissed: boolean;
  screenY: number;
  lane: number;
}

export interface GameConfig {
  noteSpeed: number;
  hitLineY: number;
  lanes: number;
  laneWidth: number;
  padding: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  noteSpeed: 500,
  hitLineY: 0.85,
  lanes: 4,
  laneWidth: 60,
  padding: 20
};

export class GameEngine {
  private state: GameState = GameState.LOADING;
  private config: GameConfig;
  private currentChart: Chart | null = null;
  private gameNotes: GameNote[] = [];
  private audioBuffer: AudioBuffer | null = null;

  private audioAnalyzer: AudioAnalyzer;
  private judgeSystem: JudgeSystem;
  private scoreSystem: ScoreSystem;

  private startTime: number = 0;
  private currentTime: number = 0;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private onStateChange?: (state: GameState) => void;
  private onScoreChange?: (score: number) => void;
  private onComboChange?: (combo: number) => void;
  private onJudgeResult?: (result: JudgeResult, combo: number) => void;
  private onGameOver?: (stats: HitStats, score: number, rank: GameRank) => void;

  private laneColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA'];
  private selectedLane: number = 0;

  constructor(config?: Partial<GameConfig>) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    this.audioAnalyzer = new AudioAnalyzer();
    this.judgeSystem = new JudgeSystem();
    this.scoreSystem = new ScoreSystem();
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    await this.audioAnalyzer.initialize();
    
    this.setState(GameState.MENU);
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  setState(state: GameState): void {
    if (this.state === state) return;
    this.state = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  getState(): GameState {
    return this.state;
  }

  async loadChart(chart: Chart, audioBuffer?: AudioBuffer): Promise<void> {
    this.currentChart = chart;
    if (audioBuffer) {
      this.audioBuffer = audioBuffer;
    }

    this.gameNotes = this.convertChartToGameNotes(chart);
    this.judgeSystem.resetStats();
    this.scoreSystem.reset();
    this.currentTime = 0;
  }

  private convertChartToGameNotes(chart: Chart): GameNote[] {
    return chart.notes.map(note => ({
      ...note,
      isActive: false,
      isHit: false,
      isMissed: false,
      screenY: 0,
      lane: note.lane
    }));
  }

  startGame(): void {
    if (!this.currentChart) {
      throw new Error('No chart loaded');
    }

    this.gameNotes.forEach(note => {
      note.isActive = false;
      note.isHit = false;
      note.isMissed = false;
      note.screenY = 0;
    });

    this.judgeSystem.resetStats();
    this.scoreSystem.reset();
    this.currentTime = 0;
    this.startTime = performance.now();

    if (this.audioBuffer) {
      this.audioAnalyzer.play(this.audioBuffer);
    }

    this.setState(GameState.PLAYING);
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    if (this.state !== GameState.PLAYING) return;

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.currentTime = (now - this.startTime) + (this.currentChart?.offset || 0);

    this.update(deltaTime);
    this.render();

    this.checkGameOver();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    if (!this.currentChart) return;

    const canvasHeight = this.canvas?.clientHeight || 600;
    const hitLineY = canvasHeight * this.config.hitLineY;
    const noteSpeed = this.config.noteSpeed;

    for (const note of this.gameNotes) {
      if (note.isHit || note.isMissed) continue;

      const timeUntilHit = note.time - this.currentTime;
      const distanceToHit = timeUntilHit * noteSpeed / 1000;
      note.screenY = hitLineY - distanceToHit;

      note.isActive = note.screenY >= 0 && note.screenY <= canvasHeight + 50;

      if (this.judgeSystem.isTooLate(this.currentTime, note.time) && !note.isHit) {
        note.isMissed = true;
        this.processJudgeResult(JudgeResult.MISS, note);
      }
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);

    this.renderLanes(width, height);
    this.renderHitLine(width, height);
    this.renderNotes(width, height);
    this.renderVisualizer(width, height);
  }

  private renderLanes(width: number, height: number): void {
    if (!this.ctx) return;

    const totalLaneWidth = this.config.lanes * this.config.laneWidth;
    const startX = (width - totalLaneWidth) / 2;

    for (let i = 0; i <= this.config.lanes; i++) {
      const x = startX + i * this.config.laneWidth;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    for (let i = 0; i < this.config.lanes; i++) {
      const x = startX + i * this.config.laneWidth;
      const laneColor = this.laneColors[i] + '08';
      this.ctx.fillStyle = laneColor;
      this.ctx.fillRect(x + 1, 0, this.config.laneWidth - 2, height);
    }
  }

  private renderHitLine(width: number, height: number): void {
    if (!this.ctx) return;

    const hitLineY = height * this.config.hitLineY;
    const totalLaneWidth = this.config.lanes * this.config.laneWidth;
    const startX = (width - totalLaneWidth) / 2;
    const endX = startX + totalLaneWidth;

    const gradient = this.ctx.createLinearGradient(startX, hitLineY, endX, hitLineY);
    gradient.addColorStop(0, 'rgba(233, 69, 96, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 107, 107, 1)');
    gradient.addColorStop(1, 'rgba(233, 69, 96, 0.8)');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(startX, hitLineY);
    this.ctx.lineTo(endX, hitLineY);
    this.ctx.stroke();

    this.ctx.shadowColor = '#e94560';
    this.ctx.shadowBlur = 20;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    for (let i = 0; i < this.config.lanes; i++) {
      const x = startX + i * this.config.laneWidth + this.config.laneWidth / 2;
      const radius = 25;

      this.ctx.strokeStyle = this.laneColors[i] + '60';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, hitLineY, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.fillStyle = this.laneColors[i] + '10';
      this.ctx.fill();
    }
  }

  private renderNotes(width: number, height: number): void {
    if (!this.ctx) return;

    const totalLaneWidth = this.config.lanes * this.config.laneWidth;
    const startX = (width - totalLaneWidth) / 2;
    const noteHeight = 30;
    const notePadding = 5;

    for (const note of this.gameNotes) {
      if (!note.isActive || note.isHit || note.isMissed) continue;

      const laneX = startX + note.lane * this.config.laneWidth + notePadding;
      const laneWidth = this.config.laneWidth - notePadding * 2;

      if (note.screenY < -noteHeight || note.screenY > height + noteHeight) continue;

      this.ctx.fillStyle = this.laneColors[note.lane];
      this.ctx.shadowColor = this.laneColors[note.lane];
      this.ctx.shadowBlur = 15;

      const y = note.screenY - noteHeight / 2;

      if (note.type === NoteType.HOLD && note.duration) {
        const holdHeight = (note.duration * this.config.noteSpeed) / 1000;
        this.ctx.fillRect(laneX, y - holdHeight, laneWidth, holdHeight);
      }

      this.ctx.fillRect(laneX, y, laneWidth, noteHeight);
      this.ctx.shadowBlur = 0;

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fillRect(laneX, y, laneWidth, noteHeight / 3);
    }
  }

  private renderVisualizer(width: number, height: number): void {
    if (!this.ctx) return;

    try {
      const analysis = this.audioAnalyzer.analyze();
      const barCount = 64;
      const barWidth = width / barCount;
      const maxBarHeight = height * 0.3;

      for (let i = 0; i < barCount; i++) {
        const hue = (i / barCount) * 360;
        const value = (Math.sin(i * 0.1 + performance.now() * 0.001) + 1) / 2;
        const barHeight = value * maxBarHeight * (analysis.rms * 5 + 0.1);

        this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.3)`;
        this.ctx.fillRect(
          i * barWidth,
          height - barHeight,
          barWidth - 1,
          barHeight
        );
      }
    } catch (e) {
      // Ignore visualization errors
    }
  }

  hitLane(lane: number): void {
    if (this.state !== GameState.PLAYING) return;

    const hittableNotes = this.gameNotes.filter(note => 
      note.lane === lane && 
      !note.isHit && 
      !note.isMissed &&
      this.judgeSystem.canHit(this.currentTime, note.time)
    );

    if (hittableNotes.length === 0) return;

    let closestNote: GameNote | null = null;
    let closestError = Infinity;

    for (const note of hittableNotes) {
      const error = Math.abs(this.currentTime - note.time);
      if (error < closestError) {
        closestError = error;
        closestNote = note;
      }
    }

    if (closestNote) {
      const resultData = this.judgeSystem.judgeAtTime(
        this.currentTime,
        closestNote.time
      );

      closestNote.isHit = true;
      this.processJudgeResult(resultData.result, closestNote);
    }
  }

  private processJudgeResult(result: JudgeResult, note: GameNote): void {
    this.judgeSystem.processResult(result);
    
    const stats = this.judgeSystem.getStats();
    const score = this.scoreSystem.addScore(result, stats.combo);

    if (this.onScoreChange) {
      this.onScoreChange(score);
    }

    if (this.onComboChange) {
      this.onComboChange(stats.combo);
    }

    if (this.onJudgeResult) {
      this.onJudgeResult(result, stats.combo);
    }
  }

  private checkGameOver(): void {
    if (!this.currentChart) return;

    const allNotesProcessed = this.gameNotes.every(note => note.isHit || note.isMissed);
    
    if (allNotesProcessed) {
      this.endGame();
    }
  }

  endGame(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.audioAnalyzer.stop();

    const stats = this.judgeSystem.getStats();
    const finalScore = this.scoreSystem.calculateFinalScore(stats);
    const rank = this.scoreSystem.calculateRank(stats);

    this.setState(GameState.GAME_OVER);

    if (this.onGameOver) {
      this.onGameOver(stats, finalScore, rank);
    }
  }

  pauseGame(): void {
    if (this.state !== GameState.PLAYING) return;
    this.setState(GameState.PAUSED);
  }

  resumeGame(): void {
    if (this.state !== GameState.PAUSED) return;
    this.setState(GameState.PLAYING);
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  setOnScoreChange(callback: (score: number) => void): void {
    this.onScoreChange = callback;
  }

  setOnComboChange(callback: (combo: number) => void): void {
    this.onComboChange = callback;
  }

  setOnJudgeResult(callback: (result: JudgeResult, combo: number) => void): void {
    this.onJudgeResult = callback;
  }

  setOnGameOver(callback: (stats: HitStats, score: number, rank: GameRank) => void): void {
    this.onGameOver = callback;
  }

  getStats(): HitStats {
    return this.judgeSystem.getStats();
  }

  getScore(): number {
    return this.scoreSystem.getScore();
  }

  getRank(): GameRank {
    return this.scoreSystem.calculateRank(this.judgeSystem.getStats());
  }

  getAudioAnalyzer(): AudioAnalyzer {
    return this.audioAnalyzer;
  }

  getJudgeSystem(): JudgeSystem {
    return this.judgeSystem;
  }

  getScoreSystem(): ScoreSystem {
    return this.scoreSystem;
  }

  getCurrentChart(): Chart | null {
    return this.currentChart;
  }

  setSelectedLane(lane: number): void {
    this.selectedLane = Math.max(0, Math.min(this.config.lanes - 1, lane));
  }

  getSelectedLane(): number {
    return this.selectedLane;
  }

  getGameNotes(): GameNote[] {
    return [...this.gameNotes];
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audioAnalyzer.dispose();
    this.canvas = null;
    this.ctx = null;
  }
}
