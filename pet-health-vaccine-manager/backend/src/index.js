const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

// 初始化数据库
const { db, initDatabase } = require('./init-db')

// 创建 Express 应用
const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件目录
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 确保上传目录存在
const fs = require('fs')
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '宠物健康管理平台后端服务运行正常',
    timestamp: new Date().toISOString()
  })
})

// 用户相关接口

// 注册用户
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码不能为空'
      })
    }

    // 检查用户名是否已存在
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        console.error('检查用户名失败:', err)
        return res.status(500).json({
          success: false,
          message: '服务器错误'
        })
      }

      if (row) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        })
      }

      // 检查邮箱是否已存在
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          console.error('检查邮箱失败:', err)
          return res.status(500).json({
            success: false,
            message: '服务器错误'
          })
        }

        if (row) {
          return res.status(400).json({
            success: false,
            message: '邮箱已存在'
          })
        }

        // 插入新用户
        db.run(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, password],
          function (err) {
            if (err) {
              console.error('创建用户失败:', err)
              return res.status(500).json({
                success: false,
                message: '创建用户失败'
              })
            }

            res.status(201).json({
              success: true,
              message: '用户创建成功',
              data: {
                id: this.lastID,
                username,
                email
              }
            })
          }
        )
      })
    })
  } catch (error) {
    console.error('注册用户失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 用户登录
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码不能为空'
      })
    }

    db.get(
      'SELECT id, username, email FROM users WHERE email = ? AND password = ?',
      [email, password],
      (err, row) => {
        if (err) {
          console.error('登录失败:', err)
          return res.status(500).json({
            success: false,
            message: '服务器错误'
          })
        }

        if (!row) {
          return res.status(401).json({
            success: false,
            message: '邮箱或密码错误'
          })
        }

        res.json({
          success: true,
          message: '登录成功',
          data: row
        })
      }
    )
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 疫苗计划相关接口

// 获取疫苗计划列表
app.get('/api/vaccine-plans', (req, res) => {
  try {
    db.all('SELECT * FROM vaccine_plans ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('获取疫苗计划失败:', err)
        return res.status(500).json({
          success: false,
          message: '获取疫苗计划失败'
        })
      }

      res.json({
        success: true,
        data: rows
      })
    })
  } catch (error) {
    console.error('获取疫苗计划失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 创建疫苗计划
app.post('/api/vaccine-plans', (req, res) => {
  try {
    const { pet_name, pet_type, template_id, status, vaccines } = req.body

    if (!pet_name || !pet_type) {
      return res.status(400).json({
        success: false,
        message: '宠物名称和类型不能为空'
      })
    }

    db.run(
      'INSERT INTO vaccine_plans (pet_name, pet_type, template_id, status) VALUES (?, ?, ?, ?)',
      [pet_name, pet_type, template_id || null, status || 'pending'],
      function (err) {
        if (err) {
          console.error('创建疫苗计划失败:', err)
          return res.status(500).json({
            success: false,
            message: '创建疫苗计划失败'
          })
        }

        const planId = this.lastID

        // 如果有疫苗数据，插入疫苗记录
        if (vaccines && vaccines.length > 0) {
          const insertVaccine = db.prepare(
            'INSERT INTO vaccines (plan_id, name, date, status, notes) VALUES (?, ?, ?, ?, ?)'
          )

          vaccines.forEach(vaccine => {
            insertVaccine.run(
              planId,
              vaccine.name,
              vaccine.date || null,
              vaccine.status || 'pending',
              vaccine.notes || null
            )
          })

          insertVaccine.finalize()
        }

        res.status(201).json({
          success: true,
          message: '疫苗计划创建成功',
          data: {
            id: planId,
            pet_name,
            pet_type,
            template_id,
            status: status || 'pending'
          }
        })
      }
    )
  } catch (error) {
    console.error('创建疫苗计划失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 更新疫苗计划
app.put('/api/vaccine-plans/:id', (req, res) => {
  try {
    const { id } = req.params
    const { pet_name, pet_type, status } = req.body

    db.run(
      'UPDATE vaccine_plans SET pet_name = ?, pet_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pet_name, pet_type, status, id],
      function (err) {
        if (err) {
          console.error('更新疫苗计划失败:', err)
          return res.status(500).json({
            success: false,
            message: '更新疫苗计划失败'
          })
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: '疫苗计划不存在'
          })
        }

        res.json({
          success: true,
          message: '疫苗计划更新成功'
        })
      }
    )
  } catch (error) {
    console.error('更新疫苗计划失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 删除疫苗计划
app.delete('/api/vaccine-plans/:id', (req, res) => {
  try {
    const { id } = req.params

    // 先删除关联的疫苗记录
    db.run('DELETE FROM vaccines WHERE plan_id = ?', [id], (err) => {
      if (err) {
        console.error('删除疫苗记录失败:', err)
        return res.status(500).json({
          success: false,
          message: '删除疫苗计划失败'
        })
      }

      // 然后删除疫苗计划
      db.run('DELETE FROM vaccine_plans WHERE id = ?', [id], function (err) {
        if (err) {
          console.error('删除疫苗计划失败:', err)
          return res.status(500).json({
            success: false,
            message: '删除疫苗计划失败'
          })
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: '疫苗计划不存在'
          })
        }

        res.json({
          success: true,
          message: '疫苗计划删除成功'
        })
      })
    })
  } catch (error) {
    console.error('删除疫苗计划失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 病历记录相关接口

// 获取病历记录列表
app.get('/api/medical-records', (req, res) => {
  try {
    db.all('SELECT * FROM medical_records ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('获取病历记录失败:', err)
        return res.status(500).json({
          success: false,
          message: '获取病历记录失败'
        })
      }

      // 解析 photos 字段（存储为 JSON 字符串）
      const records = rows.map(row => ({
        ...row,
        photos: row.photos ? JSON.parse(row.photos) : []
      }))

      res.json({
        success: true,
        data: records
      })
    })
  } catch (error) {
    console.error('获取病历记录失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 创建病历记录
app.post('/api/medical-records', (req, res) => {
  try {
    const { pet_name, type, date, notes, photos } = req.body

    if (!pet_name || !type || !date) {
      return res.status(400).json({
        success: false,
        message: '宠物名称、类型和日期不能为空'
      })
    }

    const photosJson = photos ? JSON.stringify(photos) : JSON.stringify([])

    db.run(
      'INSERT INTO medical_records (pet_name, type, date, notes, photos) VALUES (?, ?, ?, ?, ?)',
      [pet_name, type, date, notes || null, photosJson],
      function (err) {
        if (err) {
          console.error('创建病历记录失败:', err)
          return res.status(500).json({
            success: false,
            message: '创建病历记录失败'
          })
        }

        res.status(201).json({
          success: true,
          message: '病历记录创建成功',
          data: {
            id: this.lastID,
            pet_name,
            type,
            date,
            notes,
            photos: photos || []
          }
        })
      }
    )
  } catch (error) {
    console.error('创建病历记录失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 更新病历记录
app.put('/api/medical-records/:id', (req, res) => {
  try {
    const { id } = req.params
    const { pet_name, type, date, notes, photos } = req.body

    const photosJson = photos ? JSON.stringify(photos) : null

    db.run(
      'UPDATE medical_records SET pet_name = ?, type = ?, date = ?, notes = ?, photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pet_name, type, date, notes, photosJson, id],
      function (err) {
        if (err) {
          console.error('更新病历记录失败:', err)
          return res.status(500).json({
            success: false,
            message: '更新病历记录失败'
          })
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: '病历记录不存在'
          })
        }

        res.json({
          success: true,
          message: '病历记录更新成功'
        })
      }
    )
  } catch (error) {
    console.error('更新病历记录失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 删除病历记录
app.delete('/api/medical-records/:id', (req, res) => {
  try {
    const { id } = req.params

    db.run('DELETE FROM medical_records WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('删除病历记录失败:', err)
        return res.status(500).json({
          success: false,
          message: '删除病历记录失败'
        })
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: '病历记录不存在'
        })
      }

      res.json({
        success: true,
        message: '病历记录删除成功'
      })
    })
  } catch (error) {
    console.error('删除病历记录失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 症状自查历史相关接口

// 保存症状自查记录
app.post('/api/symptom-checks', (req, res) => {
  try {
    const { user_id, pet_type, symptoms, duration, severity, result } = req.body

    if (!pet_type || !symptoms) {
      return res.status(400).json({
        success: false,
        message: '宠物类型和症状不能为空'
      })
    }

    const symptomsJson = JSON.stringify(symptoms)

    db.run(
      'INSERT INTO symptom_checks (user_id, pet_type, symptoms, duration, severity, result) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id || 1, pet_type, symptomsJson, duration || null, severity || null, result || null],
      function (err) {
        if (err) {
          console.error('保存症状自查记录失败:', err)
          return res.status(500).json({
            success: false,
            message: '保存症状自查记录失败'
          })
        }

        res.status(201).json({
          success: true,
          message: '症状自查记录保存成功',
          data: {
            id: this.lastID
          }
        })
      }
    )
  } catch (error) {
    console.error('保存症状自查记录失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 获取症状自查历史
app.get('/api/symptom-checks', (req, res) => {
  try {
    db.all('SELECT * FROM symptom_checks ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('获取症状自查历史失败:', err)
        return res.status(500).json({
          success: false,
          message: '获取症状自查历史失败'
        })
      }

      // 解析 symptoms 字段
      const checks = rows.map(row => ({
        ...row,
        symptoms: row.symptoms ? JSON.parse(row.symptoms) : []
      }))

      res.json({
        success: true,
        data: checks
      })
    })
  } catch (error) {
    console.error('获取症状自查历史失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`宠物健康管理平台后端服务运行在 http://localhost:${PORT}`)
  console.log(`API 文档: http://localhost:${PORT}/api/health`)
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭服务器...')
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接失败:', err)
    } else {
      console.log('数据库连接已关闭')
    }
    process.exit(0)
  })
})
