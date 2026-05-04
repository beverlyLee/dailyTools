const TextRankService = require('../src/services/textRankService');

describe('TextRankService', () => {
  describe('splitSentences', () => {
    test('should split text into sentences', () => {
      const text = 'This is the first sentence. This is the second. And the third?';
      const sentences = TextRankService.splitSentences(text);
      expect(sentences.length).toBe(3);
      expect(sentences[0]).toBe('This is the first sentence');
      expect(sentences[1]).toBe(' This is the second');
      expect(sentences[2]).toBe(' And the third');
    });

    test('should handle empty text', () => {
      const sentences = TextRankService.splitSentences('');
      expect(sentences.length).toBe(0);
    });
  });

  describe('tokenize', () => {
    test('should tokenize text into words', () => {
      const text = 'Hello, world! This is a test.';
      const words = TextRankService.tokenize(text);
      expect(words).toEqual(['hello', 'world', 'this', 'is', 'a', 'test']);
    });

    test('should handle empty text', () => {
      const words = TextRankService.tokenize('');
      expect(words.length).toBe(0);
    });
  });

  describe('filterWords', () => {
    test('should filter out stop words', () => {
      const words = ['the', 'a', 'is', 'are', 'test', 'word'];
      const filtered = TextRankService.filterWords(words);
      expect(filtered).toEqual(['test', 'word']);
    });

    test('should filter out single character words', () => {
      const words = ['a', 'b', 'test', 'word'];
      const filtered = TextRankService.filterWords(words);
      expect(filtered).toEqual(['test', 'word']);
    });
  });

  describe('buildCoOccurrenceMatrix', () => {
    test('should build co-occurrence matrix with window size 2', () => {
      const words = ['test', 'word', 'test', 'another'];
      const matrix = TextRankService.buildCoOccurrenceMatrix(words, 2);
      
      expect(matrix['test']).toBeDefined();
      expect(matrix['word']).toBeDefined();
      expect(matrix['another']).toBeDefined();
      
      expect(matrix['test']['word']).toBeGreaterThan(0);
      expect(matrix['word']['test']).toBeGreaterThan(0);
    });

    test('should handle empty words', () => {
      const matrix = TextRankService.buildCoOccurrenceMatrix([], 2);
      expect(Object.keys(matrix).length).toBe(0);
    });
  });

  describe('calculatePageRank', () => {
    test('should calculate PageRank scores', () => {
      const matrix = {
        'a': { 'b': 1, 'c': 1 },
        'b': { 'a': 1, 'c': 1 },
        'c': { 'a': 1, 'b': 1 }
      };
      
      const scores = TextRankService.calculatePageRank(matrix);
      
      expect(scores['a']).toBeDefined();
      expect(scores['b']).toBeDefined();
      expect(scores['c']).toBeDefined();
      
      const total = scores['a'] + scores['b'] + scores['c'];
      expect(total).toBeCloseTo(1, 1);
    });

    test('should handle empty matrix', () => {
      const scores = TextRankService.calculatePageRank({});
      expect(Object.keys(scores).length).toBe(0);
    });
  });

  describe('extractKeyPhrases', () => {
    test('should extract key phrases from text', () => {
      const text = 'I had a dream about flying in the sky. The sky was blue and beautiful. I felt very happy and free.';
      const keyPhrases = TextRankService.extractKeyPhrases(text, 3);
      
      expect(keyPhrases.length).toBeGreaterThan(0);
      expect(keyPhrases[0]).toHaveProperty('phrase');
      expect(keyPhrases[0]).toHaveProperty('score');
    });

    test('should return specified number of key phrases', () => {
      const text = 'This is a test text with multiple words. It has several sentences. Each sentence contains important information.';
      const keyPhrases = TextRankService.extractKeyPhrases(text, 2);
      
      expect(keyPhrases.length).toBeLessThanOrEqual(2);
    });

    test('should handle empty text', () => {
      const keyPhrases = TextRankService.extractKeyPhrases('');
      expect(keyPhrases.length).toBe(0);
    });

    test('should extract meaningful key phrases from dream content', () => {
      const dreamText = 'Last night I dreamed I was walking through a dark forest. Suddenly, I saw a bright light in the distance. As I approached, the light revealed a beautiful garden with colorful flowers and singing birds. I felt a sense of peace and wonder that I have never experienced before.';
      
      const keyPhrases = TextRankService.extractKeyPhrases(dreamText, 5);
      
      expect(keyPhrases.length).toBeGreaterThan(0);
      
      const phrases = keyPhrases.map(kp => kp.phrase);
      const hasForest = phrases.some(p => p.includes('forest'));
      const hasLight = phrases.some(p => p.includes('light'));
      const hasGarden = phrases.some(p => p.includes('garden'));
      
      expect(hasForest || hasLight || hasGarden).toBe(true);
    });
  });
});
