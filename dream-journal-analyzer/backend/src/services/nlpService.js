const nlp = require('compromise');

const NLPService = {
  analyze: function(text) {
    try {
      const doc = nlp(text);
      
      const nouns = this.safeExtract(doc, 'nouns', []);
      const verbs = this.safeExtract(doc, 'verbs', []);
      const adjectives = this.safeExtract(doc, 'adjectives', []);
      
      const entities = this.extractEntities(doc);
      const keywords = this.extractKeywords(nouns, verbs, adjectives);
      const emotions = this.analyzeEmotion(adjectives, verbs);
      
      return {
        nouns,
        verbs,
        adjectives,
        entities,
        keywords,
        emotions
      };
    } catch (error) {
      console.error('NLP Analysis error:', error.message);
      return {
        nouns: [],
        verbs: [],
        adjectives: [],
        entities: [],
        keywords: [],
        emotions: {
          positive: 0,
          negative: 0,
          neutral: 0,
          dominantEmotion: 'neutral'
        }
      };
    }
  },

  safeExtract: function(doc, method, defaultValue) {
    try {
      if (typeof doc[method] === 'function') {
        return doc[method]().out('array');
      }
      return defaultValue;
    } catch (error) {
      console.warn(`Warning: ${method}() extraction failed:`, error.message);
      return defaultValue;
    }
  },

  extractEntities: function(doc) {
    const entities = [];
    
    try {
      if (typeof doc.people === 'function') {
        const people = doc.people().out('array');
        people.forEach(p => entities.push({ text: p, type: 'person' }));
      }
    } catch (e) {
      console.warn('People extraction skipped:', e.message);
    }
    
    try {
      if (typeof doc.places === 'function') {
        const places = doc.places().out('array');
        places.forEach(p => entities.push({ text: p, type: 'place' }));
      }
    } catch (e) {
      console.warn('Places extraction skipped:', e.message);
    }
    
    try {
      if (typeof doc.dates === 'function') {
        const dates = doc.dates().out('array');
        dates.forEach(d => entities.push({ text: d, type: 'date' }));
      }
    } catch (e) {
      console.warn('Dates extraction skipped:', e.message);
    }
    
    try {
      if (typeof doc.values === 'function') {
        const values = doc.values().out('array');
        values.forEach(v => entities.push({ text: v, type: 'value' }));
      }
    } catch (e) {
      console.warn('Values extraction skipped:', e.message);
    }
    
    return entities;
  },

  extractKeywords: function(nouns, verbs, adjectives) {
    const allWords = [...nouns, ...verbs, ...adjectives];
    const wordCount = {};
    
    allWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
    });
    
    const sortedWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
    
    return sortedWords;
  },

  analyzeEmotion: function(adjectives, verbs) {
    const positiveWords = ['happy', 'joy', 'love', 'exciting', 'wonderful', 'amazing', 'beautiful', 'peaceful', 'calm', 'bright'];
    const negativeWords = ['sad', 'scary', 'fear', 'angry', 'dark', 'terrible', 'horrible', 'anxious', 'worried', 'afraid'];
    const neutralWords = ['neutral', 'normal', 'ordinary', 'calm', 'quiet', 'still'];
    
    const allWords = [...adjectives, ...verbs].map(w => w.toLowerCase());
    
    const positive = allWords.filter(w => positiveWords.includes(w)).length;
    const negative = allWords.filter(w => negativeWords.includes(w)).length;
    const neutral = allWords.filter(w => neutralWords.includes(w)).length;
    
    let dominantEmotion = 'neutral';
    if (positive > negative && positive > neutral) {
      dominantEmotion = 'positive';
    } else if (negative > positive && negative > neutral) {
      dominantEmotion = 'negative';
    }
    
    return {
      positive,
      negative,
      neutral,
      dominantEmotion
    };
  }
};

module.exports = NLPService;
