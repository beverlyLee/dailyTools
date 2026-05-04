export interface Note {
  id: string;
  time: number;
  lane: number;
  type: NoteType;
  duration?: number;
}

export enum NoteType {
  TAP = 'tap',
  HOLD = 'hold',
  SWIPE = 'swipe'
}

export interface Chart {
  id: string;
  name: string;
  difficulty: Difficulty;
  bpm: number;
  offset: number;
  audioUrl?: string;
  audioData?: string;
  notes: Note[];
  createdAt: number;
  updatedAt: number;
}

export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  EXPERT = 'expert'
}

export interface ChartMetadata {
  id: string;
  name: string;
  difficulty: Difficulty;
  bpm: number;
  noteCount: number;
  createdAt: number;
}

export interface BeatMarker {
  time: number;
  lane: number;
  type: NoteType;
}

export const CHART_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Rhythm Game Chart',
  type: 'object',
  required: ['id', 'name', 'difficulty', 'bpm', 'offset', 'notes'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for the chart'
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Name of the song/chart'
    },
    difficulty: {
      type: 'string',
      enum: ['easy', 'normal', 'hard', 'expert'],
      description: 'Difficulty level'
    },
    bpm: {
      type: 'number',
      minimum: 20,
      maximum: 500,
      description: 'Beats per minute'
    },
    offset: {
      type: 'number',
      description: 'Time offset in milliseconds for syncing'
    },
    audioUrl: {
      type: 'string',
      format: 'uri',
      description: 'URL to the audio file'
    },
    audioData: {
      type: 'string',
      description: 'Base64 encoded audio data'
    },
    notes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'time', 'lane', 'type'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique note identifier'
          },
          time: {
            type: 'number',
            minimum: 0,
            description: 'Time in milliseconds when the note should be hit'
          },
          lane: {
            type: 'number',
            minimum: 0,
            maximum: 3,
            description: 'Lane index (0-3)'
          },
          type: {
            type: 'string',
            enum: ['tap', 'hold', 'swipe'],
            description: 'Type of note'
          },
          duration: {
            type: 'number',
            minimum: 0,
            description: 'Duration for hold notes in milliseconds'
          }
        }
      }
    },
    createdAt: {
      type: 'number',
      description: 'Timestamp when chart was created'
    },
    updatedAt: {
      type: 'number',
      description: 'Timestamp when chart was last updated'
    }
  }
};

export function validateChart(chart: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!chart || typeof chart !== 'object') {
    return { valid: false, errors: ['Chart must be an object'] };
  }

  const c = chart as Record<string, unknown>;

  if (!c.id || typeof c.id !== 'string') {
    errors.push('Chart must have a valid id string');
  }

  if (!c.name || typeof c.name !== 'string' || c.name.length === 0) {
    errors.push('Chart must have a non-empty name');
  }

  const validDifficulties = ['easy', 'normal', 'hard', 'expert'];
  if (!c.difficulty || typeof c.difficulty !== 'string' || !validDifficulties.includes(c.difficulty)) {
    errors.push(`Difficulty must be one of: ${validDifficulties.join(', ')}`);
  }

  if (c.bpm === undefined || typeof c.bpm !== 'number' || c.bpm < 20 || c.bpm > 500) {
    errors.push('BPM must be a number between 20 and 500');
  }

  if (c.offset === undefined || typeof c.offset !== 'number') {
    errors.push('Offset must be a number');
  }

  if (!c.notes || !Array.isArray(c.notes)) {
    errors.push('Notes must be an array');
  } else {
    const notes = c.notes as Array<Record<string, unknown>>;
    const validNoteTypes = ['tap', 'hold', 'swipe'];
    const noteIds = new Set<string>();

    notes.forEach((note, index) => {
      if (!note.id || typeof note.id !== 'string') {
        errors.push(`Note ${index}: must have a valid id`);
      } else {
        if (noteIds.has(note.id)) {
          errors.push(`Note ${index}: duplicate id ${note.id}`);
        }
        noteIds.add(note.id);
      }

      if (note.time === undefined || typeof note.time !== 'number' || note.time < 0) {
        errors.push(`Note ${index}: time must be a non-negative number`);
      }

      if (note.lane === undefined || typeof note.lane !== 'number' || note.lane < 0 || note.lane > 3) {
        errors.push(`Note ${index}: lane must be between 0 and 3`);
      }

      if (!note.type || typeof note.type !== 'string' || !validNoteTypes.includes(note.type)) {
        errors.push(`Note ${index}: type must be one of: ${validNoteTypes.join(', ')}`);
      }

      if (note.type === 'hold') {
        if (note.duration === undefined || typeof note.duration !== 'number' || note.duration <= 0) {
          errors.push(`Note ${index}: hold notes must have a positive duration`);
        }
      }
    });

    const sortedNotes = [...notes].sort((a, b) => (a.time as number) - (b.time as number));
    for (let i = 0; i < sortedNotes.length - 1; i++) {
      if ((sortedNotes[i].time as number) > (sortedNotes[i + 1].time as number)) {
        errors.push('Notes are not sorted by time');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
