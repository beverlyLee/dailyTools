const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MAJOR_SCALE_DEGREES = [0, 2, 4, 5, 7, 9, 11];

export interface PitchFrame {
  frequency: number | null;
  midi: number | null;
  noteName: string | null;
  time: number;
  confidence: number;
  isMajorScale: boolean;
}

export interface RecordingResult {
  audioData: Float32Array;
  sampleRate: number;
  frames: PitchFrame[];
  duration: number;
  debugInfo: {
    totalFrames: number;
    framesWithPitch: number;
    averageRMS: number;
    maxRMS: number;
  };
}

export interface RealtimeAudioState {
  isRecording: boolean;
  currentRMS: number;
  currentNote: string | null;
  currentFrequency: number | null;
  isAudioInputActive: boolean;
}

type AudioCallback = (state: RealtimeAudioState) => void;

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private isRecording: boolean = false;
  private processor: ScriptProcessorNode | null = null;
  private recordedData: Float32Array[] = [];
  private frames: PitchFrame[] = [];
  private startTime: number = 0;
  private audioCallback: AudioCallback | null = null;

  private allRMSValues: number[] = [];
  private totalProcessedFrames: number = 0;
  private framesWithValidPitch: number = 0;

  private readonly MIN_RMS = 0.008;
  private readonly OPTIMAL_RMS_MIN = 0.015;
  private readonly MIN_FREQ = 80;
  private readonly MAX_FREQ = 1200;
  private readonly CONFIDENCE_THRESHOLD = 0.3;

  setAudioCallback(callback: AudioCallback | null): void {
    this.audioCallback = callback;
  }

  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (result.state === 'granted') {
        return true;
      }
      if (result.state === 'prompt') {
        return this.requestMicrophonePermission();
      }
      return false;
    } catch {
      return this.requestMicrophonePermission();
    }
  }

  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('麦克风权限被拒绝:', err);
      return false;
    }
  }

  async listAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (err) {
      console.error('无法获取音频设备列表:', err);
      return [];
    }
  }

  async initialize(): Promise<void> {
    if (typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext({ sampleRate: 44100 });
    } else {
      const WebKitAudioContext = (window as any).webkitAudioContext;
      this.audioContext = new WebKitAudioContext({ sampleRate: 44100 });
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.3;
  }

  private ensureAudioContext(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext) {
        this.initialize().then(resolve);
        return;
      }

      if (this.audioContext.state === 'closed') {
        this.initialize().then(resolve);
        return;
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(resolve);
        return;
      }

      resolve();
    });
  }

  async startRecording(deviceId?: string): Promise<boolean> {
    const hasPermission = await this.checkMicrophonePermission();
    if (!hasPermission) {
      throw new Error('无法获得麦克风权限，请检查浏览器权限设置');
    }

    await this.ensureAudioContext();

    if (!this.audioContext) {
      throw new Error('无法初始化音频上下文');
    }

    const audioConstraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1,
      },
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    } catch (err) {
      console.error('获取麦克风失败:', err);
      throw new Error('无法访问麦克风，请确保麦克风已连接且已授权');
    }

    const audioTracks = this.mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error('未找到可用的麦克风设备');
    }

    const track = audioTracks[0];
    console.log('使用麦克风:', track.label || '默认麦克风');

    this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.mediaStreamSource.connect(this.analyser!);

    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.recordedData = [];
    this.frames = [];
    this.allRMSValues = [];
    this.totalProcessedFrames = 0;
    this.framesWithValidPitch = 0;
    this.startTime = performance.now();
    this.isRecording = true;

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.isRecording) return;

      const inputData = e.inputBuffer.getChannelData(0);

      const dataCopy = new Float32Array(inputData.length);
      dataCopy.set(inputData);
      this.recordedData.push(dataCopy);

      this.totalProcessedFrames++;

      const currentTime = (performance.now() - this.startTime) / 1000;
      const rms = this.calculateRMS(inputData);
      this.allRMSValues.push(rms);

      let currentNote: string | null = null;
      let currentFrequency: number | null = null;
      let isAudioActive = rms > this.MIN_RMS;

      if (rms >= this.MIN_RMS) {
        const pitchResult = this.detectPitchWithConfidence(inputData, this.audioContext!.sampleRate);

        if (pitchResult !== null) {
          const { frequency, confidence } = pitchResult;
          const midi = this.frequencyToMidi(frequency);

          if (midi !== null && confidence >= this.CONFIDENCE_THRESHOLD) {
            this.framesWithValidPitch++;
            const isMajor = this.isInMajorScale(midi);

            this.frames.push({
              frequency: frequency,
              midi: midi,
              noteName: this.midiToNoteName(midi),
              time: currentTime,
              confidence: confidence,
              isMajorScale: isMajor,
            });

            currentNote = this.midiToNoteName(midi);
            currentFrequency = frequency;
          }
        }
      }

      if (this.audioCallback) {
        this.audioCallback({
          isRecording: this.isRecording,
          currentRMS: rms,
          currentNote: currentNote,
          currentFrequency: currentFrequency,
          isAudioInputActive: isAudioActive,
        });
      }
    };

    this.mediaStreamSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    return true;
  }

  stopRecording(): RecordingResult {
    this.isRecording = false;

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {}
      this.processor = null;
    }

    if (this.mediaStreamSource) {
      try {
        this.mediaStreamSource.disconnect();
      } catch (e) {}
      this.mediaStreamSource = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.mediaStream = null;
    }

    if (this.audioCallback) {
      this.audioCallback({
        isRecording: false,
        currentRMS: 0,
        currentNote: null,
        currentFrequency: null,
        isAudioInputActive: false,
      });
    }

    const totalLength = this.recordedData.reduce((sum, arr) => sum + arr.length, 0);
    const audioData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.recordedData) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    const duration = this.audioContext ? totalLength / this.audioContext.sampleRate : 0;

    const avgRMS = this.allRMSValues.length > 0
      ? this.allRMSValues.reduce((a, b) => a + b, 0) / this.allRMSValues.length
      : 0;
    const maxRMS = this.allRMSValues.length > 0
      ? Math.max(...this.allRMSValues)
      : 0;

    console.log('录音调试信息:', {
      totalDuration: duration.toFixed(2) + 's',
      totalProcessedFrames: this.totalProcessedFrames,
      framesWithPitch: this.framesWithValidPitch,
      rawFrames: this.frames.length,
      avgRMS: avgRMS.toFixed(4),
      maxRMS: maxRMS.toFixed(4),
      minRMSThreshold: this.MIN_RMS,
    });

    return {
      audioData,
      sampleRate: this.audioContext?.sampleRate || 44100,
      frames: this.applyFrameFiltering(this.frames),
      duration,
      debugInfo: {
        totalFrames: this.totalProcessedFrames,
        framesWithPitch: this.framesWithValidPitch,
        averageRMS: avgRMS,
        maxRMS: maxRMS,
      },
    };
  }

  private applyFrameFiltering(frames: PitchFrame[]): PitchFrame[] {
    if (frames.length === 0) return frames;

    const filtered: PitchFrame[] = [];
    let currentGroup: PitchFrame[] = [];

    const addConsolidated = (group: PitchFrame[]) => {
      if (group.length === 0) return;

      const midiCounts: Record<number, number> = {};
      let totalConfidence = 0;

      for (const frame of group) {
        if (frame.midi !== null) {
          midiCounts[frame.midi] = (midiCounts[frame.midi] || 0) + 1;
          totalConfidence += frame.confidence;
        }
      }

      if (Object.keys(midiCounts).length === 0) return;

      let mostCommonMidi = -1;
      let maxCount = 0;
      for (const [midi, count] of Object.entries(midiCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonMidi = parseInt(midi, 10);
        }
      }

      const consistency = maxCount / group.length;
      if (consistency < 0.3) return;

      const avgConfidence = totalConfidence / group.length;
      const finalConfidence = Math.min(avgConfidence * consistency * 1.5, 1.0);

      if (finalConfidence < 0.2) return;

      filtered.push({
        frequency: group[group.length - 1].frequency,
        midi: mostCommonMidi,
        noteName: this.midiToNoteName(mostCommonMidi),
        time: group[0].time,
        confidence: finalConfidence,
        isMajorScale: this.isInMajorScale(mostCommonMidi),
      });
    };

    for (const frame of frames) {
      if (currentGroup.length === 0) {
        currentGroup.push(frame);
        continue;
      }

      const lastFrame = currentGroup[currentGroup.length - 1];
      const timeGap = frame.time - lastFrame.time;
      const midiDiff = frame.midi !== null && lastFrame.midi !== null
        ? Math.abs(frame.midi - lastFrame.midi)
        : 100;

      if (timeGap > 0.15 || midiDiff > 2) {
        addConsolidated(currentGroup);
        currentGroup = [frame];
      } else {
        currentGroup.push(frame);
      }
    }

    if (currentGroup.length > 0) {
      addConsolidated(currentGroup);
    }

    return filtered;
  }

  private isInMajorScale(midi: number): boolean {
    const noteClass = midi % 12;
    return MAJOR_SCALE_DEGREES.includes(noteClass);
  }

  private detectPitchWithConfidence(
    buffer: Float32Array,
    sampleRate: number,
  ): { frequency: number; confidence: number } | null {
    const freq1 = this.autocorrelationPitch(buffer, sampleRate);
    if (!freq1) return null;

    const freq2 = this.peakBasedPitch(buffer, sampleRate);
    if (!freq2) {
      return { frequency: freq1, confidence: 0.5 };
    }

    const ratio = Math.max(freq1, freq2) / Math.min(freq1, freq2);

    if (ratio < 1.05) {
      return {
        frequency: (freq1 + freq2) / 2,
        confidence: 0.9,
      };
    }

    if (Math.abs(ratio - 2) < 0.1 || Math.abs(ratio - 0.5) < 0.1) {
      return {
        frequency: Math.min(freq1, freq2),
        confidence: 0.7,
      };
    }

    return {
      frequency: freq1,
      confidence: 0.4,
    };
  }

  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    const n = Math.min(buffer.length, 1024);
    for (let i = 0; i < n; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / n);
  }

  private autocorrelationPitch(buffer: Float32Array, sampleRate: number): number | null {
    const size = buffer.length;
    const maxSamples = Math.floor(size / 2);
    const correlations = new Float32Array(maxSamples);

    for (let lag = 0; lag < maxSamples; lag++) {
      let sum = 0;
      const limit = maxSamples;
      for (let i = 0; i < limit; i++) {
        sum += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = sum;
    }

    const minLag = Math.floor(sampleRate / this.MAX_FREQ);
    const maxLag = Math.floor(sampleRate / this.MIN_FREQ);

    let bestLag = 0;
    let bestCorrelation = 0;

    for (let lag = minLag; lag < maxLag - 1; lag++) {
      if (
        correlations[lag] > correlations[lag - 1] &&
        correlations[lag] > correlations[lag + 1] &&
        correlations[lag] > bestCorrelation
      ) {
        bestCorrelation = correlations[lag];
        bestLag = lag;
      }
    }

    if (bestLag > 0 && bestCorrelation > correlations[0] * 0.1) {
      const refinedLag = this.parabolicInterpolation(correlations, bestLag);
      return sampleRate / refinedLag;
    }

    return null;
  }

  private parabolicInterpolation(correlations: Float32Array, peak: number): number {
    if (peak <= 0 || peak >= correlations.length - 1) {
      return peak;
    }

    const left = correlations[peak - 1];
    const center = correlations[peak];
    const right = correlations[peak + 1];

    const delta = (right - left) / (2 * (2 * center - left - right));
    if (isNaN(delta) || !isFinite(delta)) {
      return peak;
    }
    return peak + delta;
  }

  private peakBasedPitch(buffer: Float32Array, sampleRate: number): number | null {
    const n = Math.min(buffer.length, 1024);

    let zeroCrossings = 0;
    for (let i = 1; i < n; i++) {
      if ((buffer[i] >= 0 && buffer[i - 1] < 0) ||
          (buffer[i] < 0 && buffer[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }

    if (zeroCrossings < 4) return null;

    const estimatedFreq = (zeroCrossings / 2) * (sampleRate / n);

    if (estimatedFreq >= this.MIN_FREQ && estimatedFreq <= this.MAX_FREQ) {
      return estimatedFreq;
    }

    return null;
  }

  frequencyToMidi(frequency: number): number | null {
    if (frequency <= 0) return null;
    if (frequency < this.MIN_FREQ || frequency > this.MAX_FREQ) return null;

    const midiFloat = 69 + 12 * Math.log2(frequency / 440);
    return Math.round(midiFloat);
  }

  midiToNoteName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = ((midi % 12) + 12) % 12;
    return NOTE_NAMES[noteIndex] + octave;
  }

  noteNameToMidi(noteName: string): number | null {
    const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return null;

    const note = match[1];
    const octave = parseInt(match[2], 10);
    const noteIndex = NOTE_NAMES.indexOf(note);

    if (noteIndex === -1) return null;

    return (octave + 1) * 12 + noteIndex;
  }

  midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  destroy(): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      this.audioContext = null;
    }
    if (this.analyser) {
      this.analyser = null;
    }
  }
}

export default PitchDetector;
