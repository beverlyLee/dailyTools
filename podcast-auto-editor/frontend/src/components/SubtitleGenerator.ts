export interface SubtitleCue {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export class SubtitleGenerator {
  static formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  static generateSRT(cues: SubtitleCue[]): string {
    return cues
      .map((cue) => {
        return `${cue.id}\n${this.formatTime(cue.startTime)} --> ${this.formatTime(cue.endTime)}\n${cue.text}\n`;
      })
      .join('\n');
  }

  static generateFromTranscript(words: TranscriptWord[], maxWordsPerCue: number = 8): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    let currentWords: TranscriptWord[] = [];
    let cueId = 1;

    words.forEach((word, index) => {
      currentWords.push(word);

      const shouldSplit = 
        currentWords.length >= maxWordsPerCue ||
        /[。！？.!?]/.test(word.word) ||
        index === words.length - 1;

      if (shouldSplit && currentWords.length > 0) {
        const startTime = currentWords[0].start;
        const endTime = currentWords[currentWords.length - 1].end;
        const text = currentWords.map(w => w.word).join('');

        cues.push({
          id: cueId++,
          startTime,
          endTime,
          text
        });

        currentWords = [];
      }
    });

    return cues;
  }

  static downloadSRT(srtContent: string, filename: string = 'subtitles.srt'): void {
    const blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static mergeShortCues(cues: SubtitleCue[], minDuration: number = 1.5): SubtitleCue[] {
    const merged: SubtitleCue[] = [];
    let i = 0;

    while (i < cues.length) {
      let current = { ...cues[i] };
      
      while (i + 1 < cues.length && current.endTime - current.startTime < minDuration) {
        const next = cues[i + 1];
        current.endTime = next.endTime;
        current.text += ' ' + next.text;
        i++;
      }
      
      merged.push(current);
      i++;
    }

    return merged;
  }
}
