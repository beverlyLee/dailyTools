const db = require('../database');

const DreamAnalysis = {
  create: function(analysis, callback) {
    const { dream_id, themes, entities, emotions, keywords, analysis: analysisText } = analysis;
    db.run(
      'INSERT INTO dream_analysis (dream_id, themes, entities, emotions, keywords, analysis) VALUES (?, ?, ?, ?, ?, ?)',
      [dream_id, JSON.stringify(themes), JSON.stringify(entities), JSON.stringify(emotions), JSON.stringify(keywords), analysisText],
      function(err) {
        if (err) return callback(err);
        callback(null, { id: this.lastID });
      }
    );
  },

  findByDreamId: function(dreamId, callback) {
    db.get('SELECT * FROM dream_analysis WHERE dream_id = ?', [dreamId], function(err, row) {
      if (err) return callback(err);
      if (row) {
        row.themes = JSON.parse(row.themes || '[]');
        row.entities = JSON.parse(row.entities || '[]');
        row.emotions = JSON.parse(row.emotions || '[]');
        row.keywords = JSON.parse(row.keywords || '[]');
      }
      callback(null, row);
    });
  },

  update: function(dreamId, analysis, callback) {
    const { themes, entities, emotions, keywords, analysis: analysisText } = analysis;
    db.run(
      'UPDATE dream_analysis SET themes = ?, entities = ?, emotions = ?, keywords = ?, analysis = ?, created_at = CURRENT_TIMESTAMP WHERE dream_id = ?',
      [JSON.stringify(themes), JSON.stringify(entities), JSON.stringify(emotions), JSON.stringify(keywords), analysisText, dreamId],
      function(err) {
        if (err) return callback(err);
        callback(null, { changes: this.changes });
      }
    );
  },

  deleteByDreamId: function(dreamId, callback) {
    db.run('DELETE FROM dream_analysis WHERE dream_id = ?', [dreamId], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }
};

module.exports = DreamAnalysis;
