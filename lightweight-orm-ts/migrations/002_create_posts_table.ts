import { Migration } from "../src";

export default {
  name: "002_create_posts_table",
  
  up: async (db) => {
    const sql = `
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        userId INTEGER NOT NULL,
        createdAt TIMESTAMP,
        updatedAt TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `;
    db.exec(sql);
  },
  
  down: async (db) => {
    db.exec("DROP TABLE IF EXISTS posts");
  }
} as Migration;
