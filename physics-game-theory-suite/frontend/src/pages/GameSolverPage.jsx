import { useState, useEffect, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { gameSolverApi, gameExamplesApi } from '../services/api'

const DEFAULT_PLAYER1_STRATEGIES = ['策略1', '策略2']
const DEFAULT_PLAYER2_STRATEGIES = ['策略A', '策略B']

function GameSolverPage() {
  const [player1Strategies, setPlayer1Strategies] = useState(DEFAULT_PLAYER1_STRATEGIES)
  const [player2Strategies, setPlayer2Strategies] = useState(DEFAULT_PLAYER2_STRATEGIES)
  const [payoffMatrix1, setPayoffMatrix1] = useState([[0, 0], [0, 0]])
  const [payoffMatrix2, setPayoffMatrix2] = useState([[0, 0], [0, 0]])

  const [gameExamples, setGameExamples] = useState([])
  const [selectedExampleId, setSelectedExampleId] = useState(null)

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [numRows, setNumRows] = useState(2)
  const [numCols, setNumCols] = useState(2)

  useEffect(() => {
    loadGameExamples()
  }, [])

  const loadGameExamples = async () => {
    try {
      const response = await gameExamplesApi.getAll()
      setGameExamples(response.data.examples)
    } catch (err) {
      console.error('Failed to load game examples:', err)
    }
  }

  const getSelectedExample = useMemo(() => {
    return gameExamples.find(ex => ex.id === selectedExampleId) || null
  }, [gameExamples, selectedExampleId])

  const handleExampleSelect = useCallback((exampleId) => {
    const example = gameExamples.find(ex => ex.id === exampleId)
    if (!example) return

    setSelectedExampleId(exampleId)
    setPlayer1Strategies([...example.player1_strategies])
    setPlayer2Strategies([...example.player2_strategies])
    setPayoffMatrix1(example.payoff_matrix_player1.map(row => [...row]))
    setPayoffMatrix2(example.payoff_matrix_player2.map(row => [...row]))
    setNumRows(example.player1_strategies.length)
    setNumCols(example.player2_strategies.length)
    setResult(null)
    setError(null)
  }, [gameExamples])

  const handleSizeChange = useCallback((newRows, newCols) => {
    const newPlayer1Strategies = Array(newRows).fill('').map((_, i) => 
      i < player1Strategies.length ? player1Strategies[i] : `策略${i + 1}`
    )

    const newPlayer2Strategies = Array(newCols).fill('').map((_, i) =>
      i < player2Strategies.length ? player2Strategies[i] : `策略${String.fromCharCode(65 + i)}`
    )

    const newPayoff1 = Array(newRows).fill(null).map((_, i) =>
      Array(newCols).fill(0).map((_, j) =>
        i < payoffMatrix1.length && j < payoffMatrix1[i].length ? payoffMatrix1[i][j] : 0
      )
    )

    const newPayoff2 = Array(newRows).fill(null).map((_, i) =>
      Array(newCols).fill(0).map((_, j) =>
        i < payoffMatrix2.length && j < payoffMatrix2[i].length ? payoffMatrix2[i][j] : 0
      )
    )

    setPlayer1Strategies(newPlayer1Strategies)
    setPlayer2Strategies(newPlayer2Strategies)
    setPayoffMatrix1(newPayoff1)
    setPayoffMatrix2(newPayoff2)
    setNumRows(newRows)
    setNumCols(newCols)
    setResult(null)
    setError(null)
  }, [player1Strategies, player2Strategies, payoffMatrix1, payoffMatrix2])

  const handleSolve = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const request = {
        player1_strategies: player1Strategies,
        player2_strategies: player2Strategies,
        payoff_matrix_player1: payoffMatrix1,
        payoff_matrix_player2: payoffMatrix2
      }

      const response = await gameSolverApi.solve(request)
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || '求解失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPlayer1Strategies(DEFAULT_PLAYER1_STRATEGIES)
    setPlayer2Strategies(DEFAULT_PLAYER2_STRATEGIES)
    setPayoffMatrix1([[0, 0], [0, 0]])
    setPayoffMatrix2([[0, 0], [0, 0]])
    setNumRows(2)
    setNumCols(2)
    setResult(null)
    setError(null)
    setSelectedExampleId(null)
  }

  const handleStrategyNameChange = useCallback((player, index, value) => {
    if (player === 1) {
      const newStrategies = [...player1Strategies]
      newStrategies[index] = value
      setPlayer1Strategies(newStrategies)
    } else {
      const newStrategies = [...player2Strategies]
      newStrategies[index] = value
      setPlayer2Strategies(newStrategies)
    }
    setResult(null)
  }, [player1Strategies, player2Strategies])

  const handlePayoffChange = useCallback((row, col, player, value) => {
    if (player === 1) {
      const newMatrix = payoffMatrix1.map(r => [...r])
      newMatrix[row][col] = value
      setPayoffMatrix1(newMatrix)
    } else {
      const newMatrix = payoffMatrix2.map(r => [...r])
      newMatrix[row][col] = value
      setPayoffMatrix2(newMatrix)
    }
    setResult(null)
  }, [payoffMatrix1, payoffMatrix2])

  const nashEquilibriumCells = useMemo(() => {
    const cells = new Set()
    if (result?.pure_equilibria) {
      for (const eq of result.pure_equilibria) {
        cells.add(`${eq.row_index}-${eq.col_index}`)
      }
    }
    return cells
  }, [result])

  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: '玩家1\\玩家2',
        field: 'strategy',
        width: 140,
        cellStyle: { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
        valueSetter: (params) => {
          const rowIndex = params.node.rowIndex
          if (rowIndex !== undefined && rowIndex < player1Strategies.length) {
            handleStrategyNameChange(1, rowIndex, params.newValue)
            return true
          }
          return false
        },
        editable: true,
      }
    ]

    player2Strategies.forEach((strategy, colIndex) => {
      cols.push({
        headerName: strategy,
        field: `col_${colIndex}`,
        width: 220,
        editable: false,
        headerValueGetter: (params) => {
          return player2Strategies[colIndex]
        },
        cellRenderer: (params) => {
          const rowIndex = params.node.rowIndex
          if (rowIndex === undefined) return ''
          
          const value1 = payoffMatrix1[rowIndex]?.[colIndex] ?? 0
          const value2 = payoffMatrix2[rowIndex]?.[colIndex] ?? 0
          const cellKey = `${rowIndex}-${colIndex}`
          const isNash = nashEquilibriumCells.has(cellKey)
          
          return (
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isNash ? '#fff3e0' : 'transparent',
                padding: '4px',
                borderRadius: '4px',
                height: '100%'
              }}
            >
              <input
                type="number"
                value={value1}
                onChange={(e) => handlePayoffChange(rowIndex, colIndex, 1, parseFloat(e.target.value) || 0)}
                style={{ 
                  width: '65px', 
                  padding: '6px 8px', 
                  textAlign: 'center',
                  color: '#1976d2',
                  fontWeight: '500',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: '#999', fontWeight: 'bold', fontSize: '16px' }}>,</span>
              <input
                type="number"
                value={value2}
                onChange={(e) => handlePayoffChange(rowIndex, colIndex, 2, parseFloat(e.target.value) || 0)}
                style={{ 
                  width: '65px', 
                  padding: '6px 8px', 
                  textAlign: 'center',
                  color: '#c2185b',
                  fontWeight: '500',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  fontSize: '14px'
                }}
              />
            </div>
          )
        },
      })
    })

    return cols
  }, [player1Strategies, player2Strategies, payoffMatrix1, payoffMatrix2, nashEquilibriumCells, handleStrategyNameChange, handlePayoffChange])

  const rowData = useMemo(() => {
    return player1Strategies.map((strategy, i) => ({
      strategy,
    }))
  }, [player1Strategies])

  const defaultColDef = useMemo(() => ({
    sortable: false,
    filter: false,
    resizable: true,
  }), [])

  return (
    <div className="game-solver-page">
      <div className="page-header">
        <h1 className="page-title">🎮 纳什均衡求解器</h1>
        <p className="page-subtitle">
          输入双人博弈的收益矩阵，自动求解纯策略和混合策略纳什均衡
        </p>
      </div>

      <div className="grid grid-cols-2">
        <div className="config-panel">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📊 收益矩阵设置</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">📚 选择经典博弈案例</label>
                <select
                  className="form-select"
                  value={selectedExampleId || ''}
                  onChange={(e) => e.target.value && handleExampleSelect(parseInt(e.target.value))}
                >
                  <option value="">-- 自定义博弈 --</option>
                  {gameExamples.map((example) => (
                    <option key={example.id} value={example.id}>
                      {example.name} {example.category ? `(${example.category})` : ''}
                    </option>
                  ))}
                </select>
                {getSelectedExample?.description && (
                  <div className="alert alert-info" style={{ marginTop: '12px' }}>
                    {getSelectedExample.description}
                  </div>
                )}
              </div>

              <div className="divider" />

              <div className="form-row">
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">玩家1策略数</label>
                    <select
                      className="form-select"
                      value={numRows}
                      onChange={(e) => handleSizeChange(parseInt(e.target.value), numCols)}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">玩家2策略数</label>
                    <select
                      className="form-select"
                      value={numCols}
                      onChange={(e) => handleSizeChange(numRows, parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="alert alert-info">
                <h4 style={{ marginBottom: '8px' }}>📝 使用说明</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                  <p>• 点击第一列的策略名称可修改玩家1的策略名称</p>
                  <p>• 点击表头可修改玩家2的策略名称</p>
                  <p>• 每个单元格中的数值格式为：<span style={{color: '#1976d2', fontWeight: 'bold'}}>玩家1收益</span>, <span style={{color: '#c2185b', fontWeight: 'bold'}}>玩家2收益</span></p>
                  <p>• 纳什均衡单元格会以<span style={{backgroundColor: '#fff3e0', padding: '2px 6px', borderRadius: '2px'}}>橙色背景</span>高亮显示</p>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div 
                  className="ag-theme-alpine" 
                  style={{ width: '100%' }}
                >
                  <AgGridReact
                    columnDefs={columnDefs}
                    rowData={rowData}
                    defaultColDef={defaultColDef}
                    headerHeight={48}
                    rowHeight={60}
                    domLayout="autoHeight"
                  />
                </div>
              </div>

              {nashEquilibriumCells.size > 0 && (
                <div className="flex gap-lg" style={{ marginTop: '16px', flexWrap: 'wrap' }}>
                  <div className="flex items-center gap-sm">
                    <div 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        backgroundColor: '#fff3e0', 
                        borderRadius: '4px',
                        border: '1px solid #ffcc80'
                      }} 
                    />
                    <span style={{ fontSize: '13px', color: '#666' }}>纯策略纳什均衡</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span style={{ color: '#1976d2', fontWeight: 'bold', fontSize: '14px' }}>蓝色数字</span>
                    <span style={{ fontSize: '13px', color: '#666' }}>= 玩家1收益</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span style={{ color: '#c2185b', fontWeight: 'bold', fontSize: '14px' }}>红色数字</span>
                    <span style={{ fontSize: '13px', color: '#666' }}>= 玩家2收益</span>
                  </div>
                </div>
              )}

              <div className="flex gap-md" style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSolve}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? (
                    <><span className="spinner" style={{ marginRight: '8px' }} /> 求解中...</>
                  ) : (
                    '🔍 求解纳什均衡'
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleReset}
                >
                  🔄 重置
                </button>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginTop: '16px' }}>
                  ❌ {error}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="result-panel">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📈 求解结果</h3>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⏳</div>
                  <div className="empty-state-text">正在使用 Support Enumeration 算法求解...</div>
                </div>
              ) : result ? (
                <div>
                  <div className="alert alert-info">
                    <h4 style={{ marginBottom: '4px' }}>📊 求解状态</h4>
                    <p style={{ margin: 0 }}>{result.message}</p>
                  </div>

                  {result.has_pure_equilibrium && (
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '16px' 
                      }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>🎯 纯策略纳什均衡</h3>
                        <span className="badge badge-success">
                          {result.pure_equilibria.length} 个
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {result.pure_equilibria.map((eq, index) => (
                          <PureEquilibriumCard key={index} equilibrium={eq} index={index} />
                        ))}
                      </div>
                    </div>
                  )}

                  {result.has_mixed_equilibrium && (
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '16px' 
                      }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>🎲 混合策略纳什均衡</h3>
                        <span className="badge badge-warning">
                          {result.mixed_equilibria.length} 个
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {result.mixed_equilibria.map((eq, index) => (
                          <MixedEquilibriumCard key={index} equilibrium={eq} index={index} />
                        ))}
                      </div>
                    </div>
                  )}

                  {!result.has_pure_equilibrium && !result.has_mixed_equilibrium && (
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <div className="empty-state-text">未找到纳什均衡</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <div className="empty-state-text" style={{ marginBottom: '8px' }}>
                    设置收益矩阵后点击"求解纳什均衡"
                  </div>
                  <div style={{ fontSize: '13px', color: '#999' }}>
                    或从上方选择一个经典博弈案例开始
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PureEquilibriumCard({ equilibrium, index }) {
  return (
    <div 
      style={{ 
        padding: '16px', 
        border: '1px solid #e0e6ed', 
        borderRadius: '10px',
        background: '#fafbfc'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px' 
      }}>
        <span className="badge badge-success">纯策略</span>
        <span style={{ fontWeight: '600', fontSize: '14px' }}>均衡 #{index + 1}</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <h4 style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>🎮 玩家1策略</h4>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1976d2' }}>
            {equilibrium.player1_strategy}
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>🎮 玩家2策略</h4>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#c2185b' }}>
            {equilibrium.player2_strategy}
          </div>
        </div>
      </div>
      
      <div className="divider" style={{ margin: '16px 0' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>玩家1收益</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1976d2' }}>
            {equilibrium.player1_payoff}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>玩家2收益</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#c2185b' }}>
            {equilibrium.player2_payoff}
          </div>
        </div>
      </div>
    </div>
  )
}

function MixedEquilibriumCard({ equilibrium, index }) {
  return (
    <div 
      style={{ 
        padding: '16px', 
        border: '1px solid #e0e6ed', 
        borderRadius: '10px',
        background: '#fafbfc'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px' 
      }}>
        <span className="badge badge-warning">混合策略</span>
        <span style={{ fontWeight: '600', fontSize: '14px' }}>均衡 #{index + 1}</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4 style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>🎮 玩家1概率分布</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(equilibrium.player1_distribution).map(([strategy, prob]) => (
              <div key={strategy} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid #e0e6ed'
              }}>
                <span style={{ fontWeight: '500', color: '#1976d2' }}>{strategy}</span>
                <span style={{ fontWeight: '600', color: '#1976d2' }}>
                  {(prob * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>🎮 玩家2概率分布</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(equilibrium.player2_distribution).map(([strategy, prob]) => (
              <div key={strategy} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid #e0e6ed'
              }}>
                <span style={{ fontWeight: '500', color: '#c2185b' }}>{strategy}</span>
                <span style={{ fontWeight: '600', color: '#c2185b' }}>
                  {(prob * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="divider" style={{ margin: '16px 0' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>玩家1期望收益</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1976d2' }}>
            {equilibrium.player1_expected_payoff.toFixed(2)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>玩家2期望收益</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#c2185b' }}>
            {equilibrium.player2_expected_payoff.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameSolverPage
