const STORAGE_KEY = 'pinball_high_scores';
const MAX_SCORES = 10;

export class HighScoreManager {
  constructor() {
    this.scores = this.loadScores();
  }

  loadScores() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load high scores:', e);
    }
    return [];
  }

  saveScores() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
    } catch (e) {
      console.warn('Failed to save high scores:', e);
    }
  }

  addScore(score) {
    const scoreEntry = {
      score: score,
      date: new Date().toISOString()
    };

    this.scores.push(scoreEntry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, MAX_SCORES);
    
    this.saveScores();
  }

  getTopScores(count = 10) {
    return this.scores.slice(0, count);
  }

  isHighScore(score) {
    if (this.scores.length < MAX_SCORES) {
      return true;
    }
    return score > this.scores[this.scores.length - 1].score;
  }

  clearScores() {
    this.scores = [];
    this.saveScores();
  }

  getHighestScore() {
    if (this.scores.length === 0) return 0;
    return this.scores[0].score;
  }
}
