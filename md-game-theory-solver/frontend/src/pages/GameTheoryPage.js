import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Button,
  Table,
  Space,
  Statistic,
  Divider,
  message,
  Tag,
  Descriptions,
} from 'antd';
import {
  CalculatorOutlined,
  SaveOutlined,
  ReloadOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { gameApi } from '../services/api';

const { Option } = Select;

// 经典博弈模板
const GAME_TEMPLATES = {
  prisoners_dilemma: {
    name: '囚徒困境',
    description: '两个囚犯面临背叛或合作的选择',
    player1_strategies: ['沉默', '坦白'],
    player2_strategies: ['沉默', '坦白'],
    payoff_matrix: [
      [{ player1: -1, player2: -1 }, { player1: -10, player2: 0 }],
      [{ player1: 0, player2: -10 }, { player1: -5, player2: -5 }],
    ],
  },
  battle_of_sexes: {
    name: '性别之战',
    description: '夫妻选择去看足球还是芭蕾舞',
    player1_strategies: ['足球', '芭蕾'],
    player2_strategies: ['足球', '芭蕾'],
    payoff_matrix: [
      [{ player1: 3, player2: 1 }, { player1: 0, player2: 0 }],
      [{ player1: 0, player2: 0 }, { player1: 1, player2: 3 }],
    ],
  },
  matching_pennies: {
    name: '硬币配对',
    description: '零和博弈的经典例子',
    player1_strategies: ['正面', '反面'],
    player2_strategies: ['正面', '反面'],
    payoff_matrix: [
      [{ player1: 1, player2: -1 }, { player1: -1, player2: 1 }],
      [{ player1: -1, player2: 1 }, { player1: 1, player2: -1 }],
    ],
  },
  stag_hunt: {
    name: '猎鹿博弈',
    description: '合作猎鹿或独自猎兔',
    player1_strategies: ['猎鹿', '猎兔'],
    player2_strategies: ['猎鹿', '猎兔'],
    payoff_matrix: [
      [{ player1: 4, player2: 4 }, { player1: 1, player2: 3 }],
      [{ player1: 3, player2: 1 }, { player1: 2, player2: 2 }],
    ],
  },
};

// 自定义单元格编辑器 - 显示收益对 (A, B)
const PayoffCellRenderer = (props) => {
  const value = props.value;
  const isEquilibrium = props.data?.isEquilibrium;
  
  if (!value) return '';
  
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: 4,
      background: isEquilibrium ? '#e6f7ff' : 'transparent',
      border: isEquilibrium ? '2px solid #1890ff' : 'none',
      borderRadius: 4,
      fontWeight: isEquilibrium ? 'bold' : 'normal'
    }}>
      <span style={{ color: '#1890ff' }}>{value.player1}</span>,
      <span style={{ color: '#52c41a' }}> {value.player2}</span>
    </div>
  );
};

const GameTheoryPage = () => {
  const [form] = Form.useForm();
  const [gameName, setGameName] = useState('自定义博弈');
  const [player1Strategies, setPlayer1Strategies] = useState(['策略1', '策略2']);
  const [player2Strategies, setPlayer2Strategies] = useState(['策略1', '策略2']);
  const [payoffMatrix, setPayoffMatrix] = useState([
    [{ player1: 3, player2: 2 }, { player1: 0, player2: 0 }],
    [{ player1: 0, player2: 0 }, { player1: 2, player2: 3 }],
  ]);
  const [equilibriumResult, setEquilibriumResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyGames, setHistoryGames] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // 构建 AG-Grid 的列定义
  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: '玩家1 \ 玩家2',
        field: 'strategy1',
        pinned: 'left',
        width: 150,
        cellStyle: { fontWeight: 'bold', textAlign: 'center' },
      },
    ];
    
    player2Strategies.forEach((strategy, idx) => {
      cols.push({
        headerName: strategy,
        field: `col_${idx}`,
        width: 150,
        cellRenderer: PayoffCellRenderer,
        editable: true,
        cellEditor: 'agLargeTextCellEditor',
      });
    });
    
    return cols;
  }, [player2Strategies]);

  // 构建 AG-Grid 的行数据
  const rowData = useMemo(() => {
    return player1Strategies.map((strategy, rowIdx) => {
      const row = { strategy1: strategy, id: rowIdx };
      
      player2Strategies.forEach((_, colIdx) => {
        row[`col_${colIdx}`] = payoffMatrix[rowIdx]?.[colIdx] || { player1: 0, player2: 0 };
        row.isEquilibrium = false;
      });
      
      // 高亮显示纳什均衡
      if (equilibriumResult && equilibriumResult.pure_equilibria) {
        equilibriumResult.pure_equilibria.forEach(eq => {
          if (eq.row === rowIdx) {
            row[`col_${eq.col}`] = payoffMatrix[rowIdx][eq.col];
            row[`col_${eq.col}_isEq`] = true;
          }
        });
      }
      
      return row;
    });
  }, [player1Strategies, player2Strategies, payoffMatrix, equilibriumResult]);

  // 加载历史博弈
  const loadHistoryGames = async () => {
    try {
      const response = await gameApi.listGames();
      setHistoryGames(response.data.games || []);
    } catch (error) {
      console.error('加载历史失败:', error);
    }
  };

  useEffect(() => {
    loadHistoryGames();
  }, []);

  // 应用模板
  const applyTemplate = (templateKey) => {
    const template = GAME_TEMPLATES[templateKey];
    if (!template) return;
    
    setGameName(template.name);
    setPlayer1Strategies([...template.player1_strategies]);
    setPlayer2Strategies([...template.player2_strategies]);
    setPayoffMatrix(JSON.parse(JSON.stringify(template.payoff_matrix)));
    setEquilibriumResult(null);
    form.setFieldsValue({ game_name: template.name });
    message.info(`已加载模板: ${template.name}`);
  };

  // 添加策略
  const addStrategy = (player) => {
    if (player === 1) {
      const newStrategy = `策略${player1Strategies.length + 1}`;
      setPlayer1Strategies([...player1Strategies, newStrategy]);
      const newRow = player2Strategies.map(() => ({ player1: 0, player2: 0 }));
      setPayoffMatrix([...payoffMatrix, newRow]);
    } else {
      const newStrategy = `策略${player2Strategies.length + 1}`;
      setPlayer2Strategies([...player2Strategies, newStrategy]);
      const newMatrix = payoffMatrix.map(row => [...row, { player1: 0, player2: 0 }]);
      setPayoffMatrix(newMatrix);
    }
    setEquilibriumResult(null);
  };

  // 求解纳什均衡
  const solveNashEquilibrium = async () => {
    setLoading(true);
    try {
      const config = {
        name: gameName,
        player1_strategies: player1Strategies,
        player2_strategies: player2Strategies,
        payoff_matrix: payoffMatrix,
      };
      
      const response = await gameApi.solveNashEquilibrium(config);
      setEquilibriumResult(response.data);
      message.success('求解完成！');
    } catch (error) {
      message.error('求解失败: ' + error.message);
      console.error('Solve error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存博弈
  const saveGame = async () => {
    try {
      const config = {
        name: gameName,
        player1_strategies: player1Strategies,
        player2_strategies: player2Strategies,
        payoff_matrix: payoffMatrix,
        result: equilibriumResult,
      };
      
      await gameApi.saveGame(config);
      message.success('博弈已保存！');
      loadHistoryGames();
    } catch (error) {
      message.error('保存失败: ' + error.message);
      console.error('Save error:', error);
    }
  };

  // 重置
  const handleReset = () => {
    setGameName('自定义博弈');
    setPlayer1Strategies(['策略1', '策略2']);
    setPlayer2Strategies(['策略1', '策略2']);
    setPayoffMatrix([
      [{ player1: 3, player2: 2 }, { player1: 0, player2: 0 }],
      [{ player1: 0, player2: 0 }, { player1: 2, player2: 3 }],
    ]);
    setEquilibriumResult(null);
    form.resetFields();
    message.info('已重置');
  };

  // 手动修改收益矩阵
  const updatePayoff = (row, col, player, value) => {
    const newMatrix = JSON.parse(JSON.stringify(payoffMatrix));
    newMatrix[row][col][`player${player}`] = Number(value) || 0;
    setPayoffMatrix(newMatrix);
    setEquilibriumResult(null);
  };

  // 构建结果表格
  const equilibriumColumns = [
    {
      title: '均衡类型',
      dataIndex: 'type',
      key: 'type',
      render: (text) => (
        <Tag color={text === '纯策略' ? 'blue' : 'orange'}>{text}</Tag>
      ),
    },
    {
      title: '玩家1策略',
      dataIndex: 'p1_strategy',
      key: 'p1_strategy',
    },
    {
      title: '玩家2策略',
      dataIndex: 'p2_strategy',
      key: 'p2_strategy',
    },
    {
      title: '玩家1期望收益',
      dataIndex: 'p1_payoff',
      key: 'p1_payoff',
    },
    {
      title: '玩家2期望收益',
      dataIndex: 'p2_payoff',
      key: 'p2_payoff',
    },
  ];

  const getEquilibriumTableData = () => {
    if (!equilibriumResult) return [];
    
    const data = [];
    
    // 纯策略均衡
    if (equilibriumResult.pure_equilibria && equilibriumResult.pure_equilibria.length > 0) {
      equilibriumResult.pure_equilibria.forEach(eq => {
        data.push({
          key: `pure_${eq.row}_${eq.col}`,
          type: '纯策略',
          p1_strategy: player1Strategies[eq.row],
          p2_strategy: player2Strategies[eq.col],
          p1_payoff: eq.expected_payoff.player1.toFixed(2),
          p2_payoff: eq.expected_payoff.player2.toFixed(2),
        });
      });
    }
    
    // 混合策略均衡
    if (equilibriumResult.mixed_equilibria && equilibriumResult.mixed_equilibria.length > 0) {
      equilibriumResult.mixed_equilibria.forEach((eq, idx) => {
        data.push({
          key: `mixed_${idx}`,
          type: '混合策略',
          p1_strategy: `(${eq.player1_distribution.map(v => v.toFixed(2)).join(', ')})`,
          p2_strategy: `(${eq.player2_distribution.map(v => v.toFixed(2)).join(', ')})`,
          p1_payoff: eq.expected_payoff.player1.toFixed(2),
          p2_payoff: eq.expected_payoff.player2.toFixed(2),
        });
      });
    }
    
    return data;
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 左侧配置和模板选择 */}
        <Col span={6}>
          <Card title="博弈配置" size="small">
            <Form form={form} layout="vertical">
              <Form.Item label="博弈名称">
                <Input 
                  value={gameName} 
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="输入博弈名称"
                />
              </Form.Item>
            </Form>

            <Divider>经典模板</Divider>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(GAME_TEMPLATES).map(([key, template]) => (
                <Button
                  key={key}
                  size="small"
                  onClick={() => applyTemplate(key)}
                  style={{ 
                    textAlign: 'left', 
                    height: 'auto', 
                    padding: '8px 12px',
                    whiteSpace: 'normal'
                  }}
                  block
                >
                  <div style={{ fontWeight: 'bold' }}>{template.name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                    {template.description}
                  </div>
                </Button>
              ))}
            </Space>

            <Divider>策略操作</Divider>
            
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Button type="dashed" onClick={() => addStrategy(1)} block>
                  + 玩家1策略
                </Button>
              </Col>
              <Col span={12}>
                <Button type="dashed" onClick={() => addStrategy(2)} block>
                  + 玩家2策略
                </Button>
              </Col>
            </Row>

            <Divider />
            
            <Space.Compact style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                onClick={solveNashEquilibrium}
                loading={loading}
                style={{ width: '33%' }}
              >
                求解
              </Button>
              <Button
                icon={<SaveOutlined />}
                onClick={saveGame}
                style={{ width: '34%' }}
              >
                保存
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                style={{ width: '33%' }}
              >
                重置
              </Button>
            </Space.Compact>

            <Button
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(!showHistory)}
              style={{ width: '100%', marginTop: 8 }}
            >
              {showHistory ? '隐藏历史' : '查看历史'}
            </Button>
          </Card>

          {showHistory && (
            <Card title="历史博弈" size="small" style={{ marginTop: 16 }}>
              {historyGames.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                  暂无历史记录
                </div>
              ) : (
                <Table
                  dataSource={historyGames.map((g, idx) => ({ ...g, key: idx }))}
                  columns={[
                    { title: '名称', dataIndex: 'name', key: 'name' },
                    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 100 },
                  ]}
                  size="small"
                  pagination={{ pageSize: 5 }}
                />
              )}
            </Card>
          )}
        </Col>

        {/* 中间收益矩阵 */}
        <Col span={11}>
          <Card title="收益矩阵 (玩家1收益, 玩家2收益)" size="small">
            <div className="ag-theme-alpine" style={{ height: 400 }}>
              {player1Strategies.map((s1, rowIdx) => (
                <div key={rowIdx} style={{ marginBottom: 8 }}>
                  <Space>
                    <Input 
                      value={s1} 
                      onChange={(e) => {
                        const newStrategies = [...player1Strategies];
                        newStrategies[rowIdx] = e.target.value;
                        setPlayer1Strategies(newStrategies);
                      }}
                      style={{ width: 120, fontWeight: 'bold' }}
                    />
                    {player2Strategies.map((_, colIdx) => (
                      <div key={colIdx} style={{ display: 'inline-block' }}>
                        {rowIdx === 0 && (
                          <div style={{ textAlign: 'center', marginBottom: 4 }}>
                            <Input 
                              value={player2Strategies[colIdx]}
                              onChange={(e) => {
                                const newStrategies = [...player2Strategies];
                                newStrategies[colIdx] = e.target.value;
                                setPlayer2Strategies(newStrategies);
                              }}
                              style={{ width: 100, fontWeight: 'bold' }}
                            />
                          </div>
                        )}
                        <Input.Group compact>
                          <Input
                            style={{ width: 40, textAlign: 'center', color: '#1890ff' }}
                            value={payoffMatrix[rowIdx][colIdx]?.player1 ?? 0}
                            onChange={(e) => updatePayoff(rowIdx, colIdx, 1, e.target.value)}
                          />
                          <Input style={{ width: 10, borderLeft: 0, borderRight: 0, pointerEvents: 'none' }} placeholder="," disabled />
                          <Input
                            style={{ width: 40, textAlign: 'center', color: '#52c41a' }}
                            value={payoffMatrix[rowIdx][colIdx]?.player2 ?? 0}
                            onChange={(e) => updatePayoff(rowIdx, colIdx, 2, e.target.value)}
                          />
                        </Input.Group>
                      </div>
                    ))}
                  </Space>
                </div>
              ))}
            </div>

            {equilibriumResult && equilibriumResult.pure_equilibria && equilibriumResult.pure_equilibria.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Divider>纯策略纳什均衡位置（蓝色高亮）</Divider>
                {equilibriumResult.pure_equilibria.map((eq, idx) => (
                  <Tag key={idx} color="blue" style={{ margin: 2 }}>
                    ({player1Strategies[eq.row]}, {player2Strategies[eq.col]})
                  </Tag>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧求解结果 */}
        <Col span={7}>
          <Card title="纳什均衡求解结果" size="small">
            {!equilibriumResult ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                点击"求解"按钮开始计算纳什均衡
              </div>
            ) : (
              <>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="博弈类型">
                    {equilibriumResult.game_type || '双矩阵博弈'}
                  </Descriptions.Item>
                  <Descriptions.Item label="纯策略均衡数">
                    <Tag color="blue">{equilibriumResult.pure_equilibria?.length || 0}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="混合策略均衡数">
                    <Tag color="orange">{equilibriumResult.mixed_equilibria?.length || 0}</Tag>
                  </Descriptions.Item>
                </Descriptions>

                <Divider>均衡详情</Divider>

                <Table
                  columns={equilibriumColumns}
                  dataSource={getEquilibriumTableData()}
                  size="small"
                  pagination={false}
                />

                {equilibriumResult.mixed_equilibria && equilibriumResult.mixed_equilibria.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Divider>混合策略说明</Divider>
                    <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                      混合策略分布表示玩家选择每个策略的概率。
                      <br />
                      例如: (0.6, 0.4) 表示选择第一个策略的概率为 60%，
                      选择第二个策略的概率为 40%。
                    </div>
                  </div>
                )}

                {equilibriumResult.solver_info && (
                  <div style={{ marginTop: 16 }}>
                    <Divider>求解器信息</Divider>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {equilibriumResult.solver_info.algorithm && (
                        <div>算法: {equilibriumResult.solver_info.algorithm}</div>
                      )}
                      {equilibriumResult.solver_info.nashpy_version && (
                        <div>Nashpy 版本: {equilibriumResult.solver_info.nashpy_version}</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GameTheoryPage;
