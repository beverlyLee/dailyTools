import { GameEngine, GameState, GameRank } from './game/GameEngine';
import { JudgeResult, JudgeSystem, HitStats } from './game/JudgeSystem';
import { ChartManager, Difficulty, NoteType, Chart, Note, validateChart } from './rhythm';
import { AudioAnalyzer } from './audio/AudioAnalyzer';

class GameApp {
  private gameEngine: GameEngine;
  private chartManager: ChartManager;
  private audioAnalyzer: AudioAnalyzer;
  
  private canvas: HTMLCanvasElement;
  private loadingScreen: HTMLElement;
  private startScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private editorScreen: HTMLElement;
  private hud: HTMLElement;
  private gameLanes: HTMLElement;
  
  private scoreDisplay: HTMLElement;
  private comboDisplay: HTMLElement;
  private comboText: HTMLElement;
  private judgeText: HTMLElement;
  
  private editorSelectedLane: number = 0;
  private currentAudioBuffer: AudioBuffer | null = null;
  private isPreviewPlaying: boolean = false;
  private previewStartTime: number = 0;
  private previewAnimationFrame: number | null = null;

  constructor() {
    this.gameEngine = new GameEngine();
    this.chartManager = new ChartManager();
    this.audioAnalyzer = new AudioAnalyzer();
    
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.loadingScreen = document.getElementById('loading')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.editorScreen = document.getElementById('editor-screen')!;
    this.hud = document.getElementById('hud')!;
    this.gameLanes = document.getElementById('game-lanes')!;
    
    this.scoreDisplay = document.getElementById('score')!;
    this.comboDisplay = document.getElementById('combo')!;
    this.comboText = document.getElementById('combo-display')!;
    this.judgeText = document.getElementById('judge-text')!;
  }

  async initialize(): Promise<void> {
    try {
      await this.chartManager.initialize();
      await this.gameEngine.initialize(this.canvas);
      
      this.setupEventListeners();
      this.setupGameCallbacks();
      
      this.hideLoading();
      this.showStartScreen();
      
      try {
        await this.audioAnalyzer.initialize();
      } catch (e) {
        console.warn('Audio context auto-init failed, will retry on user interaction');
      }
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.showError('初始化失败，请刷新页面重试');
      this.hideLoading();
    }
  }

  private setupEventListeners(): void {
    document.getElementById('btn-start')?.addEventListener('click', () => this.startQuickPlay());
    document.getElementById('btn-editor')?.addEventListener('click', () => this.showEditor());
    
    document.getElementById('btn-retry')?.addEventListener('click', () => this.retryGame());
    document.getElementById('btn-back')?.addEventListener('click', () => this.showStartScreen());
    
    document.getElementById('btn-editor-back')?.addEventListener('click', () => {
      this.stopPreview();
      this.showStartScreen();
    });
    
    document.querySelectorAll('.lane-btn[data-lane]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lane = parseInt((e.target as HTMLElement).dataset.lane || '0');
        this.handleLaneClick(lane);
      });
    });
    
    document.querySelectorAll('#editor-screen .lane-btn[data-lane]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lane = parseInt((e.target as HTMLElement).dataset.lane || '0');
        this.setEditorSelectedLane(lane);
      });
    });
    
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    const audioUpload = document.getElementById('audio-upload');
    const audioFile = document.getElementById('audio-file') as HTMLInputElement;
    
    audioUpload?.addEventListener('click', () => audioFile.click());
    
    audioFile?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadAudioFile(file);
      }
    });
    
    audioUpload?.addEventListener('dragover', (e) => {
      e.preventDefault();
      audioUpload.classList.add('dragover');
    });
    
    audioUpload?.addEventListener('dragleave', () => {
      audioUpload.classList.remove('dragover');
    });
    
    audioUpload?.addEventListener('drop', (e) => {
      e.preventDefault();
      audioUpload.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('audio/')) {
        this.loadAudioFile(file);
      }
    });
    
    document.getElementById('btn-play-preview')?.addEventListener('click', () => this.startPreview());
    document.getElementById('btn-stop-preview')?.addEventListener('click', () => this.stopPreview());
    document.getElementById('btn-save-chart')?.addEventListener('click', () => this.saveCurrentChart());
    document.getElementById('btn-load-chart')?.addEventListener('click', () => this.loadChartFromStorage());
  }

  private setupGameCallbacks(): void {
    this.gameEngine.setOnStateChange((state) => this.onStateChange(state));
    this.gameEngine.setOnScoreChange((score) => this.onScoreChange(score));
    this.gameEngine.setOnComboChange((combo) => this.onComboChange(combo));
    this.gameEngine.setOnJudgeResult((result, combo) => this.onJudgeResult(result, combo));
    this.gameEngine.setOnGameOver((stats, score, rank) => this.onGameOver(stats, score, rank));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const keyMap: Record<string, number> = {
      'd': 0, 'f': 1, 'j': 2, 'k': 3,
      '1': 0, '2': 1, '3': 2, '4': 3
    };
    
    if (this.gameEngine.getState() === GameState.PLAYING) {
      const lane = keyMap[e.key.toLowerCase()];
      if (lane !== undefined) {
        e.preventDefault();
        this.gameEngine.hitLane(lane);
        this.animateLaneButton(lane);
      }
    }
    
    if (e.key === 'Escape') {
      if (this.gameEngine.getState() === GameState.PLAYING) {
        this.gameEngine.endGame();
      }
    }
  }

  private handleLaneClick(lane: number): void {
    if (this.gameEngine.getState() === GameState.PLAYING) {
      this.gameEngine.hitLane(lane);
      this.animateLaneButton(lane);
    }
    
    if (this.gameEngine.getState() === GameState.EDITING || this.isPreviewPlaying) {
      this.addNoteAtCurrentTime(lane);
    }
  }

  private animateLaneButton(lane: number): void {
    const buttons = this.gameLanes.querySelectorAll('.lane-btn');
    const button = buttons[lane] as HTMLElement;
    if (button) {
      button.classList.add('active');
      setTimeout(() => button.classList.remove('active'), 100);
    }
  }

  private onStateChange(state: GameState): void {
    console.log('Game state changed:', state);
  }

  private onScoreChange(score: number): void {
    this.scoreDisplay.textContent = score.toLocaleString();
  }

  private onComboChange(combo: number): void {
    this.comboDisplay.textContent = combo.toString();
    
    if (combo >= 10 && combo % 10 === 0) {
      this.showComboText(combo);
    }
  }

  private showComboText(combo: number): void {
    this.comboText.textContent = `${combo} COMBO!`;
    this.comboText.classList.add('show');
    
    setTimeout(() => {
      this.comboText.classList.remove('show');
    }, 800);
  }

  private onJudgeResult(result: JudgeResult, combo: number): void {
    this.judgeText.className = 'judge-text';
    this.judgeText.classList.add(result);
    this.judgeText.textContent = JudgeSystem.getResultName(result);
    
    this.judgeText.classList.add('show');
    
    setTimeout(() => {
      this.judgeText.classList.remove('show');
    }, 500);
  }

  private onGameOver(stats: HitStats, score: number, rank: GameRank): void {
    this.hideHUD();
    this.hideGameLanes();
    this.showGameOverScreen(stats, score, rank);
  }

  private hideLoading(): void {
    this.loadingScreen.classList.remove('active');
  }

  private showStartScreen(): void {
    this.startScreen.classList.add('active');
    this.gameOverScreen.classList.remove('active');
    this.editorScreen.classList.remove('active');
  }

  private showEditor(): void {
    this.startScreen.classList.remove('active');
    this.editorScreen.classList.add('active');
    this.gameEngine.setState(GameState.EDITING);
  }

  private showHUD(): void {
    this.hud.classList.add('active');
  }

  private hideHUD(): void {
    this.hud.classList.remove('active');
  }

  private showGameLanes(): void {
    this.gameLanes.style.display = 'flex';
  }

  private hideGameLanes(): void {
    this.gameLanes.style.display = 'none';
  }

  private showGameOverScreen(stats: HitStats, score: number, rank: GameRank): void {
    document.getElementById('final-score')!.textContent = score.toLocaleString();
    document.getElementById('stat-perfect')!.textContent = stats.perfect.toString();
    document.getElementById('stat-great')!.textContent = stats.great.toString();
    document.getElementById('stat-good')!.textContent = stats.good.toString();
    document.getElementById('stat-miss')!.textContent = stats.miss.toString();
    document.getElementById('max-combo')!.textContent = stats.maxCombo.toString();
    
    this.gameOverScreen.classList.add('active');
  }

  private showError(message: string): void {
    alert(message);
  }

  async startQuickPlay(): Promise<void> {
    const demoChart = this.chartManager.generateDemoChart();
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 8;
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        const beatInterval = 60 / 120;
        
        for (let sample = 0; sample < channelData.length; sample++) {
          const time = sample / sampleRate;
          const beatTime = time % beatInterval;
          
          let value = 0;
          
          if (beatTime < 0.1) {
            const t = beatTime / 0.1;
            const kickFreq = 150 * (1 - t * 0.5);
            value = Math.sin(2 * Math.PI * kickFreq * beatTime) * (1 - t) * 0.8;
          }
          
          const hihatFreq = 8000 + Math.sin(time * 10) * 500;
          const hihat = Math.sin(2 * Math.PI * hihatFreq * time) * 0.1;
          
          channelData[sample] = value + hihat;
        }
      }
      
      this.currentAudioBuffer = buffer;
      
    } catch (error) {
      console.warn('Could not generate demo audio:', error);
    }
    
    await this.gameEngine.loadChart(demoChart, this.currentAudioBuffer || undefined);
    
    this.startScreen.classList.remove('active');
    this.showHUD();
    this.showGameLanes();
    
    this.gameEngine.startGame();
  }

  private retryGame(): void {
    const chart = this.gameEngine.getCurrentChart();
    if (chart) {
      this.gameOverScreen.classList.remove('active');
      this.showHUD();
      this.showGameLanes();
      this.gameEngine.startGame();
    }
  }

  private setEditorSelectedLane(lane: number): void {
    this.editorSelectedLane = lane;
    
    document.querySelectorAll('#editor-screen .lane-btn').forEach((btn, index) => {
      if (index === lane) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private async loadAudioFile(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.currentAudioBuffer = await this.audioAnalyzer.loadAudioBuffer(arrayBuffer);
      
      document.getElementById('audio-info')!.style.display = 'block';
      document.getElementById('audio-name')!.textContent = file.name;
      document.getElementById('audio-duration')!.textContent = 
        this.currentAudioBuffer.duration.toFixed(2);
      
    } catch (error) {
      console.error('Failed to load audio:', error);
      this.showError('无法加载音频文件');
    }
  }

  private addNoteAtCurrentTime(lane: number): void {
    const currentTime = this.getPreviewCurrentTime();
    const chart = this.gameEngine.getCurrentChart();
    
    if (chart) {
      this.chartManager.addNote(chart, currentTime, lane, NoteType.TAP);
      console.log('Added note at', currentTime, 'ms, lane', lane);
      this.updateTimeline();
    }
  }

  private getPreviewCurrentTime(): number {
    if (this.previewStartTime > 0) {
      return (performance.now() - this.previewStartTime);
    }
    return 0;
  }

  private startPreview(): void {
    if (!this.currentAudioBuffer) {
      this.showError('请先加载音频文件');
      return;
    }
    
    const songNameInput = document.getElementById('song-name') as HTMLInputElement;
    const bpmInput = document.getElementById('song-bpm') as HTMLInputElement;
    
    const chart = this.chartManager.createChart(
      songNameInput.value || 'Untitled Song',
      parseFloat(bpmInput.value) || 120,
      Difficulty.NORMAL
    );
    
    this.gameEngine.loadChart(chart, this.currentAudioBuffer);
    
    this.audioAnalyzer.play(this.currentAudioBuffer);
    this.isPreviewPlaying = true;
    this.previewStartTime = performance.now();
    
    this.updatePreviewTime();
  }

  private updatePreviewTime(): void {
    if (!this.isPreviewPlaying) return;
    
    const currentTime = this.getPreviewCurrentTime();
    const currentTimeEl = document.getElementById('current-time');
    if (currentTimeEl) {
      currentTimeEl.textContent = (currentTime / 1000).toFixed(2);
    }
    
    this.previewAnimationFrame = requestAnimationFrame(() => this.updatePreviewTime());
  }

  private stopPreview(): void {
    this.audioAnalyzer.stop();
    this.isPreviewPlaying = false;
    
    if (this.previewAnimationFrame) {
      cancelAnimationFrame(this.previewAnimationFrame);
      this.previewAnimationFrame = null;
    }
  }

  private updateTimeline(): void {
    const chart = this.gameEngine.getCurrentChart();
    const track = document.getElementById('timeline-track');
    
    if (!chart || !track) return;
    
    track.innerHTML = '';
    
    chart.notes.forEach(note => {
      const marker = document.createElement('div');
      marker.className = 'beat-marker';
      marker.dataset.time = (note.time / 1000).toFixed(2);
      marker.style.marginLeft = `${(note.time / 1000) * 50}px`;
      track.appendChild(marker);
    });
  }

  private async saveCurrentChart(): Promise<void> {
    const chart = this.gameEngine.getCurrentChart();
    if (!chart) {
      this.showError('没有可保存的谱面');
      return;
    }
    
    const success = await this.chartManager.saveChart(chart);
    if (success) {
      alert('谱面已保存！');
    } else {
      this.showError('保存失败');
    }
  }

  private async loadChartFromStorage(): Promise<void> {
    const charts = await this.chartManager.loadAllCharts();
    
    if (charts.length === 0) {
      this.showError('没有已保存的谱面');
      return;
    }
    
    const chartNames = charts.map((c, i) => `${i + 1}. ${c.name} (${c.notes.length} notes)`).join('\n');
    const input = prompt(`选择要加载的谱面 (输入编号):\n${chartNames}`);
    
    if (input) {
      const index = parseInt(input) - 1;
      if (index >= 0 && index < charts.length) {
        const chart = charts[index];
        await this.gameEngine.loadChart(chart);
        
        const songNameInput = document.getElementById('song-name') as HTMLInputElement;
        const bpmInput = document.getElementById('song-bpm') as HTMLInputElement;
        
        songNameInput.value = chart.name;
        bpmInput.value = chart.bpm.toString();
        
        this.updateTimeline();
        alert('谱面已加载！');
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new GameApp();
  await app.initialize();
});
