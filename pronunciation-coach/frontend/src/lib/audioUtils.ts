export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function getAudioContext(): AudioContext {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AudioContextCtor();
}

export function getAudioWaveformData(
  audioContext: AudioContext,
  audioData: Float32Array,
  targetLength: number = 200
): number[] {
  const blockSize = Math.floor(audioData.length / targetLength);
  const waveform: number[] = [];

  for (let i = 0; i < targetLength; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let sum = 0;

    for (let j = start; j < end; j++) {
      sum += Math.abs(audioData[j]);
    }

    waveform.push(sum / blockSize);
  }

  const max = Math.max(...waveform, 0.01);
  return waveform.map((v) => v / max);
}

export async function recordAudio(durationMs: number = 3000): Promise<{
  blob: Blob;
  audioData: Float32Array;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioContext = getAudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const chunks: Blob[] = [];
  const allData: number[] = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  return new Promise((resolve) => {
    mediaRecorder.start();

    const dataInterval = setInterval(() => {
      const dataArray = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatTimeDomainData(dataArray);
      allData.push(...Array.from(dataArray));
    }, 10);

    setTimeout(() => {
      mediaRecorder.stop();
      clearInterval(dataInterval);

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioData = new Float32Array(allData);
        resolve({ blob, audioData });
      };
    }, durationMs);
  });
}

export interface VoiceDetectionResult {
  hasValidVoice: boolean;
  voiceDurationMs: number;
  avgEnergy: number;
  maxEnergy: number;
  speechSegments: { startMs: number; endMs: number; energy: number }[];
  isTooShort: boolean;
  isSilent: boolean;
}

export function detectVoiceActivity(
  audioData: Float32Array,
  sampleRate: number = 48000,
  options: {
    silenceThreshold?: number;
    minVoiceDurationMs?: number;
    frameSize?: number;
  } = {}
): VoiceDetectionResult {
  const {
    silenceThreshold = 0.02,
    minVoiceDurationMs = 1000,
    frameSize = 1024,
  } = options;

  if (audioData.length === 0) {
    return {
      hasValidVoice: false,
      voiceDurationMs: 0,
      avgEnergy: 0,
      maxEnergy: 0,
      speechSegments: [],
      isTooShort: true,
      isSilent: true,
    };
  }

  const speechSegments: { startMs: number; endMs: number; energy: number }[] = [];
  let inSpeech = false;
  let segmentStart = 0;
  let segmentEnergySum = 0;
  let segmentFrames = 0;
  let totalEnergySum = 0;
  let maxEnergy = 0;
  let totalVoiceFrames = 0;

  const frameDurationMs = (frameSize / sampleRate) * 1000;

  for (let i = 0; i < audioData.length; i += frameSize) {
    const frame = audioData.slice(i, Math.min(i + frameSize, audioData.length));
    
    let frameEnergy = 0;
    for (const sample of frame) {
      frameEnergy += Math.abs(sample);
    }
    frameEnergy /= frame.length;

    totalEnergySum += frameEnergy;
    maxEnergy = Math.max(maxEnergy, frameEnergy);

    const frameTimeMs = (i / sampleRate) * 1000;

    if (frameEnergy > silenceThreshold) {
      if (!inSpeech) {
        inSpeech = true;
        segmentStart = frameTimeMs;
        segmentEnergySum = 0;
        segmentFrames = 0;
      }
      segmentEnergySum += frameEnergy;
      segmentFrames++;
      totalVoiceFrames++;
    } else {
      if (inSpeech) {
        inSpeech = false;
        speechSegments.push({
          startMs: segmentStart,
          endMs: frameTimeMs,
          energy: segmentEnergySum / Math.max(segmentFrames, 1),
        });
      }
    }
  }

  if (inSpeech) {
    speechSegments.push({
      startMs: segmentStart,
      endMs: (audioData.length / sampleRate) * 1000,
      energy: segmentEnergySum / Math.max(segmentFrames, 1),
    });
  }

  const totalVoiceDurationMs = speechSegments.reduce(
    (sum, seg) => sum + (seg.endMs - seg.startMs),
    0
  );

  const avgEnergy = totalEnergySum / Math.max(Math.ceil(audioData.length / frameSize), 1);
  const isSilent = avgEnergy < silenceThreshold * 0.5;
  const isTooShort = totalVoiceDurationMs < minVoiceDurationMs;

  return {
    hasValidVoice: !isSilent && !isTooShort,
    voiceDurationMs: totalVoiceDurationMs,
    avgEnergy,
    maxEnergy,
    speechSegments,
    isTooShort,
    isSilent,
  };
}

export interface TextAlignmentResult {
  targetWords: string[];
  recognizedWords: string[];
  matchedWordIndices: number[];
  matchedTargetWords: string[];
  unmatchedTargetWords: string[];
  matchRatio: number;
  isComplete: boolean;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function wordSimilarity(word1: string, word2: string): number {
  const w1 = normalizeWord(word1);
  const w2 = normalizeWord(word2);

  if (w1 === w2) return 1.0;
  if (w1.length === 0 || w2.length === 0) return 0.0;

  let matches = 0;
  const shorter = w1.length <= w2.length ? w1 : w2;
  const longer = w1.length > w2.length ? w1 : w2;

  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }

  return matches / longer.length;
}

export function alignText(
  targetSentence: string,
  recognizedText: string
): TextAlignmentResult {
  const targetWords = targetSentence
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const recognizedWords = recognizedText
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const matchedWordIndices: number[] = [];
  const matchedTargetWords: string[] = [];

  for (const recWord of recognizedWords) {
    let bestMatchIdx = -1;
    let bestScore = 0.6;

    for (let i = 0; i < targetWords.length; i++) {
      if (matchedWordIndices.includes(i)) continue;
      const score = wordSimilarity(recWord, targetWords[i]);
      if (score > bestScore) {
        bestScore = score;
        bestMatchIdx = i;
      }
    }

    if (bestMatchIdx >= 0) {
      matchedWordIndices.push(bestMatchIdx);
      matchedTargetWords.push(targetWords[bestMatchIdx]);
    }
  }

  matchedWordIndices.sort((a, b) => a - b);

  const unmatchedTargetWords = targetWords.filter(
    (_, idx) => !matchedWordIndices.includes(idx)
  );

  const matchRatio = targetWords.length > 0 
    ? matchedWordIndices.length / targetWords.length 
    : 0;
  const isComplete = matchedWordIndices.length === targetWords.length;

  return {
    targetWords,
    recognizedWords,
    matchedWordIndices,
    matchedTargetWords,
    unmatchedTargetWords,
    matchRatio,
    isComplete,
  };
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternativeTranscripts?: string[];
}

export interface SpeechRecognitionController {
  start: () => Promise<void>;
  stop: () => Promise<string>;
  isRunning: () => boolean;
  getCurrentTranscript: () => string;
}

type AnySR = new () => any;

export function createSpeechRecognition(
  lang: string = 'en-US'
): SpeechRecognitionController | null {
  const SpeechRecognitionCtor = 
    (window as unknown as { SpeechRecognition: AnySR }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition: AnySR }).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    console.warn('Speech Recognition API 不可用');
    return null;
  }

  let currentTranscript = '';
  let running = false;
  let finalTranscript = '';

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    currentTranscript = finalTranscript + interimTranscript;
  };

  recognition.onerror = (event: any) => {
    console.warn('Speech recognition error:', event.error);
  };

  const start = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      recognition.onstart = () => {
        running = true;
        currentTranscript = '';
        finalTranscript = '';
        resolve();
      };
      recognition.onerror = (e: any) => {
        running = false;
        if (e.error === 'not-allowed') {
          reject(new Error('语音识别权限被拒绝'));
        } else {
          resolve();
        }
      };
      recognition.start();
    });
  };

  const stop = async (): Promise<string> => {
    return new Promise((resolve) => {
      recognition.onend = () => {
        running = false;
        resolve(finalTranscript.trim());
      };
      recognition.stop();
    });
  };

  const isRunning = () => running;
  const getCurrentTranscript = () => currentTranscript;

  return { start, stop, isRunning, getCurrentTranscript };
}

export interface RecordingResult {
  audioBlob: Blob;
  audioData: Float32Array;
  audioBase64: string;
  voiceDetection: VoiceDetectionResult;
  recognizedText: string;
  alignment?: TextAlignmentResult;
}

export async function recordAndAnalyze(
  targetSentence: string,
  durationMs: number = 5000,
  lang: string = 'en-US'
): Promise<RecordingResult> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioContext = getAudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const chunks: Blob[] = [];
  const allData: number[] = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  const speechRecognition = createSpeechRecognition(lang);
  if (speechRecognition) {
    try {
      await speechRecognition.start();
    } catch (e) {
      console.warn('语音识别启动失败:', e);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      mediaRecorder.start();
      const startTime = Date.now();

      const dataInterval = setInterval(() => {
        const dataArray = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatTimeDomainData(dataArray);
        allData.push(...Array.from(dataArray));
      }, 10);

      const stopRecording = async () => {
        clearInterval(dataInterval);
        mediaRecorder.stop();

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const audioData = new Float32Array(allData);
          const audioBase64 = await blobToBase64(audioBlob);

          const sampleRate = audioContext.sampleRate || 48000;
          const voiceDetection = detectVoiceActivity(audioData, sampleRate);

          let recognizedText = '';
          if (speechRecognition && speechRecognition.isRunning()) {
            try {
              recognizedText = await speechRecognition.stop();
            } catch (e) {
              console.warn('语音识别停止失败:', e);
            }
          }

          let alignment: TextAlignmentResult | undefined;
          if (recognizedText.length > 0) {
            alignment = alignText(targetSentence, recognizedText);
          }

          resolve({
            audioBlob,
            audioData,
            audioBase64,
            voiceDetection,
            recognizedText,
            alignment,
          });
        };
      };

      setTimeout(stopRecording, durationMs);
    } catch (e) {
      stream.getTracks().forEach((track) => track.stop());
      reject(e);
    }
  });
}
