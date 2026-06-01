export interface AudioData {
  bass: number;
  treble: number;
  mid: number;
  raw: Uint8Array;
}

export class AudioAnalyser {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private source: AudioBufferSourceNode | null = null;
  private dataArray: Uint8Array;
  private buffer: AudioBuffer | null = null;

  private _isPlaying = false;

  constructor() {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.analyser.connect(this.ctx.destination);
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  async loadFile(file: File): Promise<void> {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this._isPlaying = false;

    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
  }

  play(): void {
    if (!this.buffer) return;
    if (this._isPlaying) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.analyser);
    this.source.start(0);

    this._isPlaying = true;

    this.source.onended = () => {
      this._isPlaying = false;
    };
  }

  stop(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this._isPlaying = false;
  }

  getData(): AudioData {
    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

    const binCount = this.analyser.frequencyBinCount;
    const bassEnd = Math.floor(binCount * 0.1);
    const midEnd = Math.floor(binCount * 0.5);

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.dataArray[i];
    }
    const bass = bassSum / bassEnd / 255;

    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this.dataArray[i];
    }
    const mid = midSum / (midEnd - bassEnd) / 255;

    let trebleSum = 0;
    for (let i = midEnd; i < binCount; i++) {
      trebleSum += this.dataArray[i];
    }
    const treble = trebleSum / (binCount - midEnd) / 255;

    return { bass, treble, mid, raw: this.dataArray };
  }
}
