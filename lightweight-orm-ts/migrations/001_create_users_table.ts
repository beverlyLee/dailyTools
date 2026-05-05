import { Migration } from "../src";

export default {
  name: "001_create_users_table",
  
  up: async (db) => {
    const sql = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        age INTEGER,
        isActive BOOLEAN DEFAULT 1,
        createdAt TIMESTAMP,
        updatedAt TIMESTAMP
      )
    `;
    db.exec(sql);
  },
  
  down: async (db) => {
    db.exec("DROP TABLE IF EXISTS users");
  }
} as Migration;
