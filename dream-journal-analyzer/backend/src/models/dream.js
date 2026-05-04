const db = require('../database');

const Dream = {
  create: function(dream, callback) {
    const { title, content, date, emotion, clarity } = dream;
    db.run(
      'INSERT INTO dreams (title, content, date, emotion, clarity) VALUES (?, ?, ?, ?, ?)',
      [title, content, date, emotion, clarity],
      function(err) {
        if (err) return callback(err);
        callback(null, { id: this.lastID });
      }
    );
  },

  findById: function(id, callback) {
    db.get('SELECT * FROM dreams WHERE id = ?', [id], function(err, row) {
      if (err) return callback(err);
      callback(null, row);
    });
  },

  findAll: function(callback) {
    db.all('SELECT * FROM dreams ORDER BY date DESC', function(err, rows) {
      if (err) return callback(err);
      callback(null, rows);
    });
  },

  update: function(id, dream, callback) {
    const { title, content, date, emotion, clarity } = dream;
    db.run(
      'UPDATE dreams SET title = ?, content = ?, date = ?, emotion = ?, clarity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, date, emotion, clarity, id],
      function(err) {
        if (err) return callback(err);
        callback(null, { changes: this.changes });
      }
    );
  },

  delete: function(id, callback) {
    db.run('DELETE FROM dreams WHERE id = ?', [id], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }
};

module.exports = Dream;
