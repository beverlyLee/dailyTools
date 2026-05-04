import { Chart, Note, NoteType, Difficulty, validateChart, ChartMetadata } from '../src/rhythm/types';
import { ChartManager } from '../src/rhythm/ChartManager';

describe('validateChart function', () => {
  it('should validate a correct chart', () => {
    const chart: Chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Song',
      difficulty: Difficulty.NORMAL,
      bpm: 120,
      offset: 0,
      notes: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          time: 0,
          lane: 0,
          type: NoteType.TAP
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject invalid chart without id', () => {
    const chart = {
      name: 'Test Song',
      difficulty: 'normal',
      bpm: 120,
      offset: 0,
      notes: []
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chart must have a valid id string');
  });

  it('should reject chart with empty name', () => {
    const chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: '',
      difficulty: 'normal',
      bpm: 120,
      offset: 0,
      notes: []
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chart must have a non-empty name');
  });

  it('should reject chart with invalid difficulty', () => {
    const chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Song',
      difficulty: 'invalid',
      bpm: 120,
      offset: 0,
      notes: []
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
  });

  it('should reject chart with invalid BPM', () => {
    const chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Song',
      difficulty: 'normal',
      bpm: 10,
      offset: 0,
      notes: []
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('BPM must be a number between 20 and 500');
  });

  it('should reject chart with negative note time', () => {
    const chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Song',
      difficulty: 'normal',
      bpm: 120,
      offset: 0,
      notes: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          time: -100,
          lane: 0,
          type: 'tap'
        }
      ]
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
  });

  it('should reject chart with invalid lane', () => {
    const chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Song',
      difficulty: 'normal',
      bpm: 120,
      offset: 0,
      notes: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          time: 0,
          lane: 5,
          type: 'tap'
        }
      ]
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
  });

  it('should reject chart with duplicate note ids', () => {
    const chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Song',
      difficulty: 'normal',
      bpm: 120,
      offset: 0,
      notes: [
        {
          id: 'same-id',
          time: 0,
          lane: 0,
          type: 'tap'
        },
        {
          id: 'same-id',
          time: 500,
          lane: 1,
          type: 'tap'
        }
      ]
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
  });

  it('should reject hold note without duration', () => {
    const chart = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Song',
      difficulty: 'normal',
      bpm: 120,
      offset: 0,
      notes: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          time: 0,
          lane: 0,
          type: 'hold'
        }
      ]
    };

    const result = validateChart(chart);
    expect(result.valid).toBe(false);
  });

  it('should reject non-object chart', () => {
    expect(validateChart(null).valid).toBe(false);
    expect(validateChart(undefined).valid).toBe(false);
    expect(validateChart('not an object').valid).toBe(false);
    expect(validateChart(123).valid).toBe(false);
  });
});

describe('ChartManager', () => {
  let chartManager: ChartManager;

  beforeEach(async () => {
    chartManager = new ChartManager();
    await chartManager.initialize();
  });

  describe('createChart', () => {
    it('should create a chart with basic properties', () => {
      const chart = chartManager.createChart('Test Song', 120, Difficulty.HARD);

      expect(chart.id).toBeDefined();
      expect(chart.name).toBe('Test Song');
      expect(chart.bpm).toBe(120);
      expect(chart.difficulty).toBe(Difficulty.HARD);
      expect(chart.notes).toEqual([]);
      expect(chart.offset).toBe(0);
      expect(chart.createdAt).toBeLessThanOrEqual(Date.now());
      expect(chart.updatedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should use default difficulty when not provided', () => {
      const chart = chartManager.createChart('Test Song', 120);
      expect(chart.difficulty).toBe(Difficulty.NORMAL);
    });
  });

  describe('addNote', () => {
    it('should add a TAP note correctly', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const time = 1000;
      const lane = 1;

      const note = chartManager.addNote(chart, time, lane);

      expect(note.id).toBeDefined();
      expect(note.time).toBe(time);
      expect(note.lane).toBe(lane);
      expect(note.type).toBe(NoteType.TAP);
      expect(note.duration).toBeUndefined();
      expect(chart.notes.length).toBe(1);
      expect(chart.notes[0].id).toBe(note.id);
    });

    it('should add a HOLD note with duration', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const time = 1000;
      const lane = 2;
      const duration = 500;

      const note = chartManager.addNote(chart, time, lane, NoteType.HOLD, duration);

      expect(note.type).toBe(NoteType.HOLD);
      expect(note.duration).toBe(duration);
    });

    it('should update chart updatedAt timestamp', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const originalUpdatedAt = chart.updatedAt;

      chartManager.addNote(chart, 1000, 0);

      expect(chart.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should keep notes sorted by time', () => {
      const chart = chartManager.createChart('Test Song', 120);

      chartManager.addNote(chart, 2000, 1);
      chartManager.addNote(chart, 1000, 0);
      chartManager.addNote(chart, 1500, 2);

      expect(chart.notes[0].time).toBe(1000);
      expect(chart.notes[1].time).toBe(1500);
      expect(chart.notes[2].time).toBe(2000);
    });

    it('should sort notes with same time by lane', () => {
      const chart = chartManager.createChart('Test Song', 120);

      chartManager.addNote(chart, 1000, 3);
      chartManager.addNote(chart, 1000, 1);
      chartManager.addNote(chart, 1000, 2);
      chartManager.addNote(chart, 1000, 0);

      expect(chart.notes[0].lane).toBe(0);
      expect(chart.notes[1].lane).toBe(1);
      expect(chart.notes[2].lane).toBe(2);
      expect(chart.notes[3].lane).toBe(3);
    });
  });

  describe('removeNote', () => {
    it('should remove an existing note', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const note = chartManager.addNote(chart, 1000, 0);

      expect(chart.notes.length).toBe(1);

      const result = chartManager.removeNote(chart, note.id);

      expect(result).toBe(true);
      expect(chart.notes.length).toBe(0);
    });

    it('should return false when note not found', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const result = chartManager.removeNote(chart, 'non-existent-id');

      expect(result).toBe(false);
    });

    it('should update updatedAt timestamp', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const note = chartManager.addNote(chart, 1000, 0);
      const afterAddTimestamp = chart.updatedAt;

      chartManager.removeNote(chart, note.id);

      expect(chart.updatedAt).toBeGreaterThanOrEqual(afterAddTimestamp);
    });
  });

  describe('updateNote', () => {
    it('should update an existing note', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const note = chartManager.addNote(chart, 1000, 0);

      const updatedNote = chartManager.updateNote(chart, note.id, {
        time: 2000,
        lane: 2
      });

      expect(updatedNote).not.toBeNull();
      expect(updatedNote!.time).toBe(2000);
      expect(updatedNote!.lane).toBe(2);
    });

    it('should return null when note not found', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const updatedNote = chartManager.updateNote(chart, 'non-existent-id', { time: 2000 });

      expect(updatedNote).toBeNull();
    });

    it('should re-sort notes after time update', () => {
      const chart = chartManager.createChart('Test Song', 120);
      const note1 = chartManager.addNote(chart, 1000, 0);
      const note2 = chartManager.addNote(chart, 2000, 0);

      chartManager.updateNote(chart, note2.id, { time: 500 });

      expect(chart.notes[0].id).toBe(note2.id);
      expect(chart.notes[1].id).toBe(note1.id);
    });
  });

  describe('getNotesInRange', () => {
    it('should return notes within time range', () => {
      const chart = chartManager.createChart('Test Song', 120);
      chartManager.addNote(chart, 500, 0);
      chartManager.addNote(chart, 1000, 1);
      chartManager.addNote(chart, 1500, 2);
      chartManager.addNote(chart, 2000, 3);

      const notes = chartManager.getNotesInRange(chart, 750, 1750);

      expect(notes.length).toBe(2);
      expect(notes[0].time).toBe(1000);
      expect(notes[1].time).toBe(1500);
    });

    it('should include boundary times', () => {
      const chart = chartManager.createChart('Test Song', 120);
      chartManager.addNote(chart, 1000, 0);
      chartManager.addNote(chart, 2000, 1);

      const notes = chartManager.getNotesInRange(chart, 1000, 2000);

      expect(notes.length).toBe(2);
    });

    it('should return empty array when no notes in range', () => {
      const chart = chartManager.createChart('Test Song', 120);
      chartManager.addNote(chart, 1000, 0);

      const notes = chartManager.getNotesInRange(chart, 2000, 3000);

      expect(notes.length).toBe(0);
    });
  });

  describe('exportChart and importChart', () => {
    it('should export chart as pretty-printed JSON', () => {
      const chart = chartManager.createChart('Test Song', 120, Difficulty.EXPERT);
      chartManager.addNote(chart, 1000, 0);
      chartManager.addNote(chart, 2000, 1);

      const json = chartManager.exportChart(chart);

      expect(json).toContain('Test Song');
      expect(json).toContain('120');
      expect(json).toContain('expert');

      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Test Song');
      expect(parsed.bpm).toBe(120);
      expect(parsed.notes.length).toBe(2);
    });

    it('should import a valid chart JSON', () => {
      const originalChart = chartManager.createChart('Test Song', 120);
      chartManager.addNote(originalChart, 1000, 0);

      const json = chartManager.exportChart(originalChart);
      const importedChart = chartManager.importChart(json);

      expect(importedChart).not.toBeNull();
      expect(importedChart!.name).toBe('Test Song');
      expect(importedChart!.bpm).toBe(120);
      expect(importedChart!.notes.length).toBe(1);
    });

    it('should return null for invalid JSON', () => {
      const result = chartManager.importChart('not valid json');
      expect(result).toBeNull();
    });

    it('should return null for invalid chart data', () => {
      const invalidChart = JSON.stringify({
        id: 'test',
        name: ''
      });

      const result = chartManager.importChart(invalidChart);
      expect(result).toBeNull();
    });
  });

  describe('generateDemoChart', () => {
    it('should generate a demo chart with notes', () => {
      const chart = chartManager.generateDemoChart();

      expect(chart.name).toBe('Demo Song');
      expect(chart.bpm).toBe(120);
      expect(chart.notes.length).toBeGreaterThan(0);
      expect(chart.difficulty).toBe(Difficulty.NORMAL);
    });

    it('should generate notes in different lanes', () => {
      const chart = chartManager.generateDemoChart();

      const lanes = new Set(chart.notes.map(n => n.lane));
      expect(lanes.size).toBeGreaterThan(1);
    });
  });

  describe('storage operations', () => {
    it('should save and load charts', async () => {
      const chart = chartManager.createChart('Save Test', 140, Difficulty.HARD);
      chartManager.addNote(chart, 500, 0);
      chartManager.addNote(chart, 1000, 1);

      const saveResult = await chartManager.saveChart(chart);
      expect(saveResult).toBe(true);

      const loadedChart = await chartManager.loadChart(chart.id);
      expect(loadedChart).not.toBeNull();
      expect(loadedChart!.name).toBe('Save Test');
      expect(loadedChart!.bpm).toBe(140);
      expect(loadedChart!.notes.length).toBe(2);
    });

    it('should return null for non-existent chart', async () => {
      const chart = await chartManager.loadChart('non-existent-id');
      expect(chart).toBeNull();
    });

    it('should load all charts', async () => {
      const chart1 = chartManager.createChart('Chart 1', 120);
      const chart2 = chartManager.createChart('Chart 2', 140);

      await chartManager.saveChart(chart1);
      await chartManager.saveChart(chart2);

      const allCharts = await chartManager.loadAllCharts();
      expect(allCharts.length).toBeGreaterThanOrEqual(2);
    });

    it('should get chart metadata', async () => {
      const chart = chartManager.createChart('Metadata Test', 130);
      chartManager.addNote(chart, 1000, 0);
      chartManager.addNote(chart, 2000, 1);

      await chartManager.saveChart(chart);

      const metadataList = await chartManager.getChartMetadata();
      const metadata = metadataList.find(m => m.id === chart.id);

      expect(metadata).toBeDefined();
      expect(metadata!.name).toBe('Metadata Test');
      expect(metadata!.bpm).toBe(130);
      expect(metadata!.noteCount).toBe(2);
    });

    it('should delete a chart', async () => {
      const chart = chartManager.createChart('To Delete', 120);
      await chartManager.saveChart(chart);

      const beforeDelete = await chartManager.loadChart(chart.id);
      expect(beforeDelete).not.toBeNull();

      const deleteResult = await chartManager.deleteChart(chart.id);
      expect(deleteResult).toBe(true);

      const afterDelete = await chartManager.loadChart(chart.id);
      expect(afterDelete).toBeNull();
    });
  });
});
