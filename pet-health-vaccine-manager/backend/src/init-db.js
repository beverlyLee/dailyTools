const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

// 确保数据库目录存在
const dbDir = path.join(__dirname, '../data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// 数据库文件路径
const dbPath = path.join(dbDir, 'pet-health.db')

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message)
    return
  }
  console.log('成功连接到 SQLite 数据库')
})

// 初始化数据库表
const initDatabase = () => {
  db.serialize(() => {
    // 创建用户表
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('创建用户表失败:', err.message)
      } else {
        console.log('用户表创建成功或已存在')
      }
    })

    // 创建宠物表
    db.run(`
      CREATE TABLE IF NOT EXISTS pets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        breed TEXT,
        birth_date DATE,
        gender TEXT,
        weight REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `, (err) => {
      if (err) {
        console.error('创建宠物表失败:', err.message)
      } else {
        console.log('宠物表创建成功或已存在')
      }
    })

    // 创建疫苗计划表
    db.run(`
      CREATE TABLE IF NOT EXISTS vaccine_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_id INTEGER NOT NULL,
        pet_name TEXT NOT NULL,
        pet_type TEXT NOT NULL,
        template_id INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets (id)
      )
    `, (err) => {
      if (err) {
        console.error('创建疫苗计划表失败:', err.message)
      } else {
        console.log('疫苗计划表创建成功或已存在')
      }
    })

    // 创建疫苗记录表
    db.run(`
      CREATE TABLE IF NOT EXISTS vaccines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        date DATE,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES vaccine_plans (id)
      )
    `, (err) => {
      if (err) {
        console.error('创建疫苗记录表失败:', err.message)
      } else {
        console.log('疫苗记录表创建成功或已存在')
      }
    })

    // 创建病历记录表
    db.run(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_id INTEGER NOT NULL,
        pet_name TEXT NOT NULL,
        type TEXT NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        photos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets (id)
      )
    `, (err) => {
      if (err) {
        console.error('创建病历记录表失败:', err.message)
      } else {
        console.log('病历记录表创建成功或已存在')
      }
    })

    // 创建症状自查历史表
    db.run(`
      CREATE TABLE IF NOT EXISTS symptom_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        pet_type TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        duration TEXT,
        severity TEXT,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `, (err) => {
      if (err) {
        console.error('创建症状自查历史表失败:', err.message)
      } else {
        console.log('症状自查历史表创建成功或已存在')
      }
    })

    // 创建索引以提高查询性能
    db.run(`CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets (user_id)`, (err) => {
      if (err) {
        console.error('创建宠物表索引失败:', err.message)
      }
    })

    db.run(`CREATE INDEX IF NOT EXISTS idx_vaccine_plans_pet_id ON vaccine_plans (pet_id)`, (err) => {
      if (err) {
        console.error('创建疫苗计划表索引失败:', err.message)
      }
    })

    db.run(`CREATE INDEX IF NOT EXISTS idx_vaccines_plan_id ON vaccines (plan_id)`, (err) => {
      if (err) {
        console.error('创建疫苗记录表索引失败:', err.message)
      }
    })

    db.run(`CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records (pet_id)`, (err) => {
      if (err) {
        console.error('创建病历记录表索引失败:', err.message)
      }
    })

    console.log('数据库初始化完成')
  })
}

// 关闭数据库连接
const closeDatabase = () => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接失败:', err.message)
      return
    }
    console.log('数据库连接已关闭')
  })
}

// 执行初始化
initDatabase()

// 导出数据库连接和函数
module.exports = {
  db,
  initDatabase,
  closeDatabase
}
