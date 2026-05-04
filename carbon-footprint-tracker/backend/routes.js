const express = require('express')
const router = express.Router()
const db = require('./database')
const calculationEngine = require('./calculationEngine')

function parseCustomData(rows) {
  return rows.map(row => {
    if (row && row.custom_data) {
      try {
        return { ...row, custom_data: JSON.parse(row.custom_data) }
      } catch (e) {
        return row
      }
    }
    return row
  })
}

router.get('/records', (req, res) => {
  db.all('SELECT * FROM records ORDER BY date DESC, created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('获取记录失败:', err.message)
      return res.status(500).json({ error: '获取记录失败' })
    }
    res.json(parseCustomData(rows))
  })
})

router.get('/records/:id', (req, res) => {
  const id = req.params.id
  db.get('SELECT * FROM records WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('获取记录失败:', err.message)
      return res.status(500).json({ error: '获取记录失败' })
    }
    if (!row) {
      return res.status(404).json({ error: '记录不存在' })
    }
    const parsed = parseCustomData([row])[0]
    res.json(parsed)
  })
})

router.get('/records/type/:type', (req, res) => {
  const type = req.params.type
  db.all('SELECT * FROM records WHERE type = ? ORDER BY date DESC, created_at DESC', [type], (err, rows) => {
    if (err) {
      console.error('获取记录失败:', err.message)
      return res.status(500).json({ error: '获取记录失败' })
    }
    res.json(parseCustomData(rows))
  })
})

router.post('/records', (req, res) => {
  const { type, subtype, amount, date, note, unit, carbon_emission, customData } = req.body

  if (!type || !subtype || amount === undefined || !date) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  try {
    let finalUnit = unit
    let finalCarbonEmission = carbon_emission

    if (finalCarbonEmission === undefined || finalUnit === undefined) {
      const calculation = calculationEngine.calculateCarbonEmission(type, subtype, amount)
      finalCarbonEmission = calculation.carbon_emission
      finalUnit = calculation.unit
    }

    const stmt = db.prepare(`
      INSERT INTO records (type, subtype, amount, unit, carbon_emission, date, note, custom_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const customDataStr = customData ? JSON.stringify(customData) : null

    stmt.run(type, subtype, amount, finalUnit, finalCarbonEmission, date, note, customDataStr, function(err) {
      if (err) {
        console.error('添加记录失败:', err.message)
        return res.status(500).json({ error: '添加记录失败' })
      }

      db.get('SELECT * FROM records WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('获取新记录失败:', err.message)
          return res.status(500).json({ error: '获取新记录失败' })
        }
        if (row && row.custom_data) {
          row.custom_data = JSON.parse(row.custom_data)
        }
        res.status(201).json(row)
      })
    })

    stmt.finalize()
  } catch (error) {
    console.error('计算碳排放量失败:', error.message)
    return res.status(400).json({ error: error.message })
  }
})

router.put('/records/:id', (req, res) => {
  const id = req.params.id
  const { type, subtype, amount, date, note } = req.body

  if (!type || !subtype || amount === undefined || !date) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  try {
    const calculation = calculationEngine.calculateCarbonEmission(type, subtype, amount)
    const carbon_emission = calculation.carbon_emission
    const unit = calculation.unit

    const stmt = db.prepare(`
      UPDATE records 
      SET type = ?, subtype = ?, amount = ?, unit = ?, carbon_emission = ?, date = ?, note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    stmt.run(type, subtype, amount, unit, carbon_emission, date, note, id, function(err) {
      if (err) {
        console.error('更新记录失败:', err.message)
        return res.status(500).json({ error: '更新记录失败' })
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '记录不存在' })
      }

      db.get('SELECT * FROM records WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('获取更新后记录失败:', err.message)
          return res.status(500).json({ error: '获取更新后记录失败' })
        }
        res.json(row)
      })
    })

    stmt.finalize()
  } catch (error) {
    console.error('计算碳排放量失败:', error.message)
    return res.status(400).json({ error: error.message })
  }
})

router.delete('/records/:id', (req, res) => {
  const id = req.params.id
  
  db.run('DELETE FROM records WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('删除记录失败:', err.message)
      return res.status(500).json({ error: '删除记录失败' })
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '记录不存在' })
    }
    
    res.json({ message: '删除成功', id: id })
  })
})

router.get('/calculations', (req, res) => {
  db.all('SELECT * FROM records', [], (err, rows) => {
    if (err) {
      console.error('获取记录失败:', err.message)
      return res.status(500).json({ error: '获取记录失败' })
    }

    const total = calculationEngine.calculateTotalCarbon(rows)
    const byType = calculationEngine.calculateByType(rows)
    const trend = calculationEngine.calculateDailyTrend(rows, 30)

    res.json({
      total: total,
      byType: byType,
      trend: trend,
      recordCount: rows.length
    })
  })
})

router.get('/calculations/range', (req, res) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    return res.status(400).json({ error: '缺少日期范围参数' })
  }

  db.all(
    'SELECT * FROM records WHERE date >= ? AND date <= ? ORDER BY date DESC',
    [startDate, endDate],
    (err, rows) => {
      if (err) {
        console.error('获取记录失败:', err.message)
        return res.status(500).json({ error: '获取记录失败' })
      }

      const result = calculationEngine.calculateByDateRange(rows, startDate, endDate)
      res.json(result)
    }
  )
})

router.get('/calculations/trend', (req, res) => {
  const days = req.query.days ? parseInt(req.query.days) : 30

  db.all('SELECT * FROM records', [], (err, rows) => {
    if (err) {
      console.error('获取记录失败:', err.message)
      return res.status(500).json({ error: '获取记录失败' })
    }

    const trend = calculationEngine.calculateDailyTrend(rows, days)
    res.json(trend)
  })
})

router.get('/emission-factors', (req, res) => {
  try {
    const factors = calculationEngine.getAllEmissionFactors()
    res.json(factors)
  } catch (error) {
    console.error('获取排放因子失败:', error.message)
    res.status(500).json({ error: '获取排放因子失败' })
  }
})

router.get('/emission-factors/:type', (req, res) => {
  const type = req.params.type
  
  try {
    const factors = calculationEngine.getEmissionFactorsByType(type)
    res.json(factors)
  } catch (error) {
    console.error('获取排放因子失败:', error.message)
    res.status(404).json({ error: error.message })
  }
})

module.exports = router
