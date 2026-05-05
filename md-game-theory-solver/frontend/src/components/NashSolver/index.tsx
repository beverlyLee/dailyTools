import { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ValueSetterParams, GridApi, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { api } from '../../services/api';
import {
  PureStrategyEquilibrium,
  MixedStrategyEquilibrium,
  NashEquilibriumResponse,
  GameExample,
  PayoffMatrixData
} from '../../types';
import './NashSolver.css';

interface MatrixRow {
  strategy: string;
  [key: string]: string | number;
}

const DEFAULT_PLAYER1_STRATEGIES = ['策略1', '策略2'];
const DEFAULT_PLAYER2_STRATEGIES = ['策略A', '策略B'];

export default function NashSolver() {
  const [player1Strategies, setPlayer1Strategies] = useState<string[]>(DEFAULT_PLAYER1_STRATEGIES);
  const [player2Strategies, setPlayer2Strategies] = useState<string[]>(DEFAULT_PLAYER2_STRATEGIES);
  const [payoffMatrix1, setPayoffMatrix1] = useState<number[][]>([[0, 0], [0, 0]]);
  const [payoffMatrix2, setPayoffMatrix2] = useState<number[][]>([[0, 0], [0, 0]]);

  const [gameExamples, setGameExamples] = useState<GameExample[]>([]);
  const [selectedExampleId, setSelectedExampleId] = useState<number | null>(null);

  const [result, setResult] = useState<NashEquilibriumResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [numRows, setNumRows] = useState(2);
  const [numCols, setNumCols] = useState(2);

  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  useEffect(() => {
    loadGameExamples();
  }, []);

  const loadGameExamples = async () => {
    try {
      const examples = await api.getGameExamples();
      setGameExamples(examples);
    } catch (err) {
      console.error('Failed to load game examples:', err);
    }
  };

  const getSelectedExample = useMemo(() => {
    return gameExamples.find(ex => ex.id === selectedExampleId) || null;
  }, [gameExamples, selectedExampleId]);

  const handleExampleSelect = (exampleId: number) => {
    const example = gameExamples.find(ex => ex.id === exampleId);
    if (!example) return;

    setSelectedExampleId(exampleId);
    setPlayer1Strategies([...example.player1_strategies]);
    setPlayer2Strategies([...example.player2_strategies]);
    setPayoffMatrix1(example.payoff_matrix_player1.map(row => [...row]));
    setPayoffMatrix2(example.payoff_matrix_player2.map(row => [...row]));
    setNumRows(example.player1_strategies.length);
    setNumCols(example.player2_strategies.length);
    setResult(null);
    setError(null);
  };

  const handleSizeChange = (newRows: number, newCols: number) => {
    const newPlayer1Strategies = Array(newRows).fill('').map((_, i) => 
      i < player1Strategies.length ? player1Strategies[i] : `策略${i + 1}`
    );

    const newPlayer2Strategies = Array(newCols).fill('').map((_, i) =>
      i < player2Strategies.length ? player2Strategies[i] : `策略${String.fromCharCode(65 + i)}`
    );

    const newPayoff1 = Array(newRows).fill(null).map((_, i) =>
      Array(newCols).fill(0).map((_, j) =>
        i < payoffMatrix1.length && j < payoffMatrix1[i].length ? payoffMatrix1[i][j] : 0
      )
    );

    const newPayoff2 = Array(newRows).fill(null).map((_, i) =>
      Array(newCols).fill(0).map((_, j) =>
        i < payoffMatrix2.length && j < payoffMatrix2[i].length ? payoffMatrix2[i][j] : 0
      )
    );

    setPlayer1Strategies(newPlayer1Strategies);
    setPlayer2Strategies(newPlayer2Strategies);
    setPayoffMatrix1(newPayoff1);
    setPayoffMatrix2(newPayoff2);
    setNumRows(newRows);
    setNumCols(newCols);
    setResult(null);
    setError(null);
    setSelectedExampleId(null);
  };

  const handleSolve = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: PayoffMatrixData = {
        player1_strategies: player1Strategies,
        player2_strategies: player2Strategies,
        payoff_matrix_player1: payoffMatrix1,
        payoff_matrix_player2: payoffMatrix2
      };

      const response = await api.solveNashEquilibrium(request);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '求解失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPlayer1Strategies(DEFAULT_PLAYER1_STRATEGIES);
    setPlayer2Strategies(DEFAULT_PLAYER2_STRATEGIES);
    setPayoffMatrix1([[0, 0], [0, 0]]);
    setPayoffMatrix2([[0, 0], [0, 0]]);
    setNumRows(2);
    setNumCols(2);
    setResult(null);
    setError(null);
    setSelectedExampleId(null);
  };

  const handleStrategyNameChange = (player: 1 | 2, index: number, value: string) => {
    if (player === 1) {
      const newStrategies = [...player1Strategies];
      newStrategies[index] = value;
      setPlayer1Strategies(newStrategies);
    } else {
      const newStrategies = [...player2Strategies];
      newStrategies[index] = value;
      setPlayer2Strategies(newStrategies);
    }
    setResult(null);
  };

  const handlePayoffChange = (row: number, col: number, player: 1 | 2, value: number) => {
    if (player === 1) {
      const newMatrix = payoffMatrix1.map(r => [...r]);
      newMatrix[row][col] = value;
      setPayoffMatrix1(newMatrix);
    } else {
      const newMatrix = payoffMatrix2.map(r => [...r]);
      newMatrix[row][col] = value;
      setPayoffMatrix2(newMatrix);
    }
    setResult(null);
  };

  const nashEquilibriumCells = useMemo(() => {
    const cells: Set<string> = new Set();
    if (result?.pure_equilibria) {
      for (const eq of result.pure_equilibria) {
        cells.add(`${eq.row_index}-${eq.col_index}`);
      }
    }
    return cells;
  }, [result]);

  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [
      {
        headerName: '玩家1\\玩家2',
        field: 'strategy',
        width: 140,
        cellStyle: { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
        valueSetter: (params: ValueSetterParams) => {
          const rowIndex = params.node.rowIndex;
          if (rowIndex !== undefined && rowIndex < player1Strategies.length) {
            handleStrategyNameChange(1, rowIndex, params.newValue);
            return true;
          }
          return false;
        },
        editable: true,
      }
    ];

    player2Strategies.forEach((strategy, colIndex) => {
      cols.push({
        headerName: strategy,
        field: `col_${colIndex}`,
        width: 220,
        editable: true,
        cellRenderer: (params: any) => {
          const rowIndex = params.node.rowIndex;
          if (rowIndex === undefined) return '';
          
          const value1 = payoffMatrix1[rowIndex]?.[colIndex] ?? 0;
          const value2 = payoffMatrix2[rowIndex]?.[colIndex] ?? 0;
          const cellKey = `${rowIndex}-${colIndex}`;
          const isNash = nashEquilibriumCells.has(cellKey);
          
          return (
            <div 
              className={`payoff-pair ${isNash ? 'nash-equilibrium' : ''}`}
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isNash ? '#fff3e0' : 'transparent',
                padding: '4px',
                borderRadius: '4px'
              }}
            >
              <input
                type="number"
                value={value1}
                onChange={(e) => handlePayoffChange(rowIndex, colIndex, 1, parseFloat(e.target.value) || 0)}
                style={{ 
                  width: '70px', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  color: '#1976d2',
                  fontWeight: '500',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: '#999', fontWeight: 'bold' }}>,</span>
              <input
                type="number"
                value={value2}
                onChange={(e) => handlePayoffChange(rowIndex, colIndex, 2, parseFloat(e.target.value) || 0)}
                style={{ 
                  width: '70px', 
                  padding: '6px 4px', 
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
          );
        },
      });
    });

    return cols;
  }, [player1Strategies, player2Strategies, payoffMatrix1, payoffMatrix2, nashEquilibriumCells]);

  const rowData = useMemo<MatrixRow[]>(() => {
    return player1Strategies.map((strategy) => ({
      strategy,
    }));
  }, [player1Strategies]);

  const defaultColDef: ColDef = useMemo(() => ({
    sortable: false,
    filter: false,
    resizable: true,
  }), []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  return (
    <div className="nash-solver">
      <div className="main-content">
        <div className="left-panel">
          <div className="card">
            <h2>📊 收益矩阵设置</h2>

            <div className="example-selector">
              <label>📚 选择经典博弈案例：</label>
              <select
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
                <div className="example-description">
                  {getSelectedExample.description}
                </div>
              )}
            </div>

            <div className="size-control">
              <label>玩家1策略数：</label>
              <select
                value={numRows}
                onChange={(e) => handleSizeChange(parseInt(e.target.value), numCols)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              <label style={{ marginLeft: '20px' }}>玩家2策略数：</label>
              <select
                value={numCols}
                onChange={(e) => handleSizeChange(numRows, parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="info-box">
              <h4>📝 使用说明</h4>
              <p>
                • 点击第一列的策略名称可修改玩家1的策略名称<br/>
                • 点击表头可修改玩家2的策略名称<br/>
                • 每个单元格中的数值格式为：<span style={{color: '#1976d2', fontWeight: 'bold'}}>玩家1收益</span>, <span style={{color: '#c2185b', fontWeight: 'bold'}}>玩家2收益</span><br/>
                • 纳什均衡单元格会以<span style={{backgroundColor: '#fff3e0', padding: '2px 4px', borderRadius: '2px'}}>橙色背景</span>高亮显示
              </p>
            </div>

            <div style={{ height: '400px', width: '100%' }} className="ag-theme-alpine">
              <AgGridReact
                columnDefs={columnDefs}
                rowData={rowData}
                defaultColDef={defaultColDef}
                headerHeight={45}
                rowHeight={55}
                onGridReady={onGridReady}
              />
            </div>

            {nashEquilibriumCells.size > 0 && (
              <div className="highlight-legend">
                <div className="highlight-item">
                  <div className="highlight-color" style={{ backgroundColor: '#fff3e0' }}></div>
                  <span className="highlight-label">纯策略纳什均衡</span>
                </div>
                <div className="highlight-item">
                  <span className="highlight-label" style={{ color: '#1976d2', fontWeight: 'bold' }}>蓝色数字</span>
                  <span className="highlight-label">= 玩家1收益</span>
                </div>
                <div className="highlight-item">
                  <span className="highlight-label" style={{ color: '#c2185b', fontWeight: 'bold' }}>红色数字</span>
                  <span className="highlight-label">= 玩家2收益</span>
                </div>
              </div>
            )}

            <div className="button-group" style={{ marginTop: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSolve}
                disabled={loading}
              >
                {loading ? '⏳ 求解中...' : '🔍 求解纳什均衡'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
              >
                🔄 重置
              </button>
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="card">
            <h2>📈 求解结果</h2>

            {loading ? (
              <div className="loading">
                <div className="no-result-icon">⏳</div>
                <p>正在使用 Support Enumeration 算法求解...</p>
              </div>
            ) : result ? (
              <>
                <div className="info-box" style={{ marginBottom: '20px' }}>
                  <h4>📊 求解状态</h4>
                  <p>{result.message}</p>
                </div>

                {result.has_pure_equilibrium && (
                  <div className="result-section">
                    <h3>
                      🎯 纯策略纳什均衡
                      <span className="badge">{result.pure_equilibria.length} 个</span>
                    </h3>
                    {result.pure_equilibria.map((eq, index) => (
                      <PureEquilibriumCard key={index} equilibrium={eq} index={index} />
                    ))}
                  </div>
                )}

                {result.has_mixed_equilibrium && (
                  <div className="result-section">
                    <h3>
                      🎲 混合策略纳什均衡
                      <span className="badge">{result.mixed_equilibria.length} 个</span>
                    </h3>
                    {result.mixed_equilibria.map((eq, index) => (
                      <MixedEquilibriumCard key={index} equilibrium={eq} index={index} />
                    ))}
                  </div>
                )}

                {!result.has_pure_equilibrium && !result.has_mixed_equilibrium && (
                  <div className="no-result">
                    <div className="no-result-icon">🔍</div>
                    <p>未找到纳什均衡</p>
                  </div>
                )}
              </>
            ) : (
              <div className="no-result">
                <div className="no-result-icon">📊</div>
                <p>设置收益矩阵后点击"求解纳什均衡"</p>
                <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '10px' }}>
                  或从上方选择一个经典博弈案例开始
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PureEquilibriumCard({ equilibrium, index }: { equilibrium: PureStrategyEquilibrium; index: number }) {
  return (
    <div className="equilibrium-card pure">
      <div className="equilibrium-title">
        <span className="type-badge pure">纯策略</span>
        均衡 #{index + 1}
      </div>
      <div className="strategy-detail">
        <div className="player-detail">
          <h4>🎮 玩家1策略</h4>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1976d2' }}>
            {equilibrium.player1_strategy}
          </div>
        </div>
        <div className="player-detail">
          <h4>🎮 玩家2策略</h4>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#c2185b' }}>
            {equilibrium.player2_strategy}
          </div>
        </div>
      </div>
      <div className="expected-payoff">
        <div className="payoff-item">
          <div className="payoff-label">玩家1收益</div>
          <div className="payoff-value" style={{ color: '#1976d2' }}>
            {equilibrium.player1_payoff}
          </div>
        </div>
        <div className="payoff-item">
          <div className="payoff-label">玩家2收益</div>
          <div className="payoff-value" style={{ color: '#c2185b' }}>
            {equilibrium.player2_payoff}
          </div>
        </div>
      </div>
    </div>
  );
}

function MixedEquilibriumCard({ equilibrium, index }: { equilibrium: MixedStrategyEquilibrium; index: number }) {
  return (
    <div className="equilibrium-card mixed">
      <div className="equilibrium-title">
        <span className="type-badge mixed">混合策略</span>
        均衡 #{index + 1}
      </div>
      <div className="strategy-detail">
        <div className="player-detail">
          <h4>🎮 玩家1概率分布</h4>
          <ul className="distribution-list">
            {Object.entries(equilibrium.player1_distribution).map(([strategy, prob]) => (
              <li key={strategy}>
                <span className="strategy-name" style={{ color: '#1976d2' }}>{strategy}</span>
                <span className="strategy-prob">{(prob * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="player-detail">
          <h4>🎮 玩家2概率分布</h4>
          <ul className="distribution-list">
            {Object.entries(equilibrium.player2_distribution).map(([strategy, prob]) => (
              <li key={strategy}>
                <span className="strategy-name" style={{ color: '#c2185b' }}>{strategy}</span>
                <span className="strategy-prob">{(prob * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="expected-payoff">
        <div className="payoff-item">
          <div className="payoff-label">玩家1期望收益</div>
          <div className="payoff-value" style={{ color: '#1976d2' }}>
            {equilibrium.player1_expected_payoff.toFixed(2)}
          </div>
        </div>
        <div className="payoff-item">
          <div className="payoff-label">玩家2期望收益</div>
          <div className="payoff-value" style={{ color: '#c2185b' }}>
            {equilibrium.player2_expected_payoff.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
