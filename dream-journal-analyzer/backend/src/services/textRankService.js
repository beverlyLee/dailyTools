const TextRankService = {
  extractKeyPhrases: function(text, topN = 5) {
    const sentences = this.splitSentences(text);
    const words = this.tokenize(text);
    const filteredWords = this.filterWords(words);
    
    const coOccurrenceMatrix = this.buildCoOccurrenceMatrix(filteredWords, 2);
    const wordScores = this.calculatePageRank(coOccurrenceMatrix);
    
    const sortedWords = Object.entries(wordScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN * 2)
      .map(([word, score]) => ({ word, score }));
    
    const keyPhrases = this.extractPhrases(sentences, sortedWords, topN);
    
    return keyPhrases;
  },

  splitSentences: function(text) {
    return text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
  },

  tokenize: function(text) {
    return text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
  },

  filterWords: function(words) {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'and', 'or', 'but', 'so', 'if', 'because', 'when', 'where', 'while',
      'although', 'though', 'after', 'before', 'since', 'until', 'as',
      'for', 'with', 'without', 'by', 'at', 'in', 'on', 'to', 'from',
      'up', 'down', 'over', 'under', 'again', 'further', 'then', 'once',
      'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just',
      'don', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren',
      'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma',
      'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren',
      'won', 'wouldn', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
      'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
      'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
      'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
      'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
      'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
      'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
      'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
      'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
      'don', 'should', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y'
    ]);
    
    return words.filter(word => !stopWords.has(word) && word.length > 1);
  },

  buildCoOccurrenceMatrix: function(words, windowSize = 2) {
    const matrix = {};
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!matrix[word]) {
        matrix[word] = {};
      }
      
      for (let j = i + 1; j <= i + windowSize && j < words.length; j++) {
        const neighbor = words[j];
        if (word !== neighbor) {
          if (!matrix[word][neighbor]) {
            matrix[word][neighbor] = 0;
          }
          matrix[word][neighbor] += 1;
          
          if (!matrix[neighbor]) {
            matrix[neighbor] = {};
          }
          if (!matrix[neighbor][word]) {
            matrix[neighbor][word] = 0;
          }
          matrix[neighbor][word] += 1;
        }
      }
    }
    
    return matrix;
  },

  calculatePageRank: function(matrix, maxIterations = 100, dampingFactor = 0.85, tolerance = 0.0001) {
    const nodes = Object.keys(matrix);
    const n = nodes.length;
    
    if (n === 0) return {};
    
    let scores = {};
    nodes.forEach(node => {
      scores[node] = 1.0 / n;
    });
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const newScores = {};
      let maxDiff = 0;
      
      nodes.forEach(node => {
        newScores[node] = (1 - dampingFactor) / n;
        
        nodes.forEach(incomingNode => {
          if (matrix[incomingNode] && matrix[incomingNode][node]) {
            const outDegree = Object.keys(matrix[incomingNode]).reduce((sum, key) => sum + matrix[incomingNode][key], 0);
            if (outDegree > 0) {
              newScores[node] += dampingFactor * scores[incomingNode] * (matrix[incomingNode][node] / outDegree);
            }
          }
        });
        
        const diff = Math.abs(newScores[node] - scores[node]);
        if (diff > maxDiff) {
          maxDiff = diff;
        }
      });
      
      scores = newScores;
      
      if (maxDiff < tolerance) {
        break;
      }
    }
    
    return scores;
  },

  extractPhrases: function(sentences, sortedWords, topN) {
    const keyPhrases = [];
    const usedWords = new Set();
    
    for (const { word, score } of sortedWords) {
      if (usedWords.has(word)) continue;
      
      let bestPhrase = word;
      let bestScore = score;
      
      for (const sentence of sentences) {
        const sentenceWords = this.tokenize(sentence);
        const wordIndex = sentenceWords.indexOf(word);
        
        if (wordIndex !== -1) {
          for (let windowSize = 2; windowSize <= 3; windowSize++) {
            const start = Math.max(0, wordIndex - windowSize + 1);
            const end = Math.min(sentenceWords.length, wordIndex + windowSize);
            
            for (let i = start; i <= wordIndex; i++) {
              for (let j = wordIndex + 1; j <= end; j++) {
                const phraseWords = sentenceWords.slice(i, j + 1);
                const phrase = phraseWords.join(' ');
                
                if (phraseWords.every(w => !usedWords.has(w))) {
                  const phraseScore = phraseWords.reduce((sum, pw) => {
                    const wordData = sortedWords.find(sw => sw.word === pw);
                    return sum + (wordData ? wordData.score : 0);
                  }, 0);
                  
                  if (phraseScore > bestScore) {
                    bestScore = phraseScore;
                    bestPhrase = phrase;
                  }
                }
              }
            }
          }
        }
      }
      
      if (bestPhrase) {
        keyPhrases.push({
          phrase: bestPhrase,
          score: bestScore
        });
        
        this.tokenize(bestPhrase).forEach(w => usedWords.add(w));
        
        if (keyPhrases.length >= topN) {
          break;
        }
      }
    }
    
    return keyPhrases;
  }
};

module.exports = TextRankService;
