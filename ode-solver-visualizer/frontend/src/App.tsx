import React, { useState, useEffect, useCallback } from 'react';
import { odeApi } from './lib/api';
import type {
  ClassicExample,
  SolutionData,
  PoincareData,
  ParameterScanData,
} from './types';
import { TimeSeriesPlot } from './components/TimeSeriesPlot';
import { PhasePortrait } from './components/PhasePortrait';
import { PoincarePlot } from './components/PoincarePlot';
import { ParameterScanPlot } from './components/ParameterScanPlot';

type TabType = 'solution' | 'phase' | 'poincare' | 'scan';

export default function App() {
  const [examples, setExamples] = useState<ClassicExample[]>([]);
  const [selectedExample, setSelectedExample] = useState<ClassicExample | null>(null);
  
  const [solverMethod, setSolverMethod] = useState<'euler' | 'rk4' | 'rk45'>('rk4');
  const [initialConditions, setInitialConditions] = useState<number[]>([]);
  const [parameters, setParameters] = useState<Record<string, number>>({});
  
  const [tStart, setTStart] = useState(0);
  const [tEnd, setTEnd] = useState(50);
  const [numPoints, setNumPoints] = useState(1000);
  
  const [activeTab, setActiveTab] = useState<TabType>('solution');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [solutionData, setSolutionData] = useState<SolutionData | null>(null);
  const [poincareData, setPoincareData] = useState<PoincareData | null>(null);
  const [scanData, setScanData] = useState<ParameterScanData | null>(null);
  
  const [planeDimension, setPlaneDimension] = useState(0);
  const [planeValue, setPlaneValue] = useState(0);
  const [poincareDirection, setPoincareDirection] = useState(1);
  
  const [scanParameter, setScanParameter] = useState('');
  const [scanStart, setScanStart] = useState(0);
  const [scanEnd, setScanEnd] = useState(100);
  const [scanSteps, setScanSteps] = useState(20);

  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      const data = await odeApi.getExamples();
      setExamples(data);
      if (data.length > 0) {
        selectExample(data[0]);
      }
    } catch (err) {
      console.error('Failed to load examples:', err);
    }
  };

  const selectExample = useCallback((example: ClassicExample) => {
    setSelectedExample(example);
    setInitialConditions([...example.default_initial]);
    setParameters({ ...example.default_params });
    setTStart(example.t_span[0]);
    setTEnd(example.t_span[1]);
    setPlaneDimension(0);
    setPlaneValue(0);
    
    const paramNames = Object.keys(example.default_params);
    if (paramNames.length > 0) {
      setScanParameter(paramNames[0]);
      const range = example.param_ranges[paramNames[0]];
      if (range) {
        setScanStart(range[0]);
        setScanEnd(range[1]);
      }
    }
    
    setSolutionData(null);
    setPoincareData(null);
    setScanData(null);
    setError(null);
  }, []);

  const handleParameterChange = (key: string, value: number) => {
    setParameters((prev: Record<string, number>) => ({ ...prev, [key]: value }));
  };

  const handleInitialConditionChange = (index: number, value: number) => {
    setInitialConditions((prev: number[]) => {
      const newIC = [...prev];
      newIC[index] = value;
      return newIC;
    });
  };

  const handleSolve = async () => {
    if (!selectedExample) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await odeApi.solve({
        equation_key: selectedExample.key,
        initial_conditions: initialConditions,
        parameters: parameters,
        solver_method: solverMethod,
        t_start: tStart,
        t_end: tEnd,
        num_points: numPoints,
      });
      
      if (response.success) {
        setSolutionData(response.data);
        setActiveTab('solution');
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || '求解失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePoincare = async () => {
    if (!selectedExample) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await odeApi.computePoincare({
        equation_key: selectedExample.key,
        initial_conditions: initialConditions,
        parameters: parameters,
        solver_method: solverMethod,
        t_start: tStart,
        t_end: tEnd * 2,
        num_points: numPoints * 3,
        plane_dimension: planeDimension,
        plane_value: planeValue,
        direction: poincareDirection,
      });
      
      if (response.success) {
        setPoincareData(response.data);
        setActiveTab('poincare');
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || '庞加莱截面计算失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParameterScan = async () => {
    if (!selectedExample || !scanParameter) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await odeApi.runParameterScan({
        equation_key: selectedExample.key,
        initial_conditions: initialConditions,
        parameters: parameters,
        scan_parameter: scanParameter,
        param_start: scanStart,
        param_end: scanEnd,
        param_steps: scanSteps,
        solver_method: solverMethod,
        t_start: tStart,
        t_end: tEnd,
        num_points: numPoints,
        save_to_db: true,
      });
      
      if (response.success) {
        setScanData(response.data);
        setActiveTab('scan');
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || '参数扫描失败');
    } finally {
      setIsLoading(false);
    }
  };

  const paramNames = selectedExample ? Object.keys(selectedExample.default_params) : [];

  return (
    <div className="app-container">
      <header className="header">
        <h1>常微分方程数值解可视化系统</h1>
        <p>支持欧拉法、龙格-库塔法等多种数值求解算法 | 相平面分析 | 庞加莱截面 | 参数扫描</p>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="panel">
            <h3 className="panel-title">经典方程模型</h3>
            <div className="example-list">
              {examples.map((example) => (
                <div
                  key={example.key}
                  className={`example-item ${selectedExample?.key === example.key ? 'selected' : ''}`}
                  onClick={() => selectExample(example)}
                >
                  <div className="example-item-name">{example.name}</div>
                  <div className="example-item-desc">{example.description}</div>
                </div>
              ))}
            </div>
          </div>

          {selectedExample && (
            <>
              <div className="panel">
                <h3 className="panel-title">求解器设置</h3>
                <div className="form-group">
                  <label className="form-label">数值方法</label>
                  <select
                    className="form-select"
                    value={solverMethod}
                    onChange={(e) => setSolverMethod(e.target.value as any)}
                  >
                    <option value="euler">欧拉法 (Euler)</option>
                    <option value="rk4">龙格-库塔法 (RK4)</option>
                    <option value="rk45">自适应步长 (RK45)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">时间范围 [t0, tf]</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={tStart}
                      onChange={(e) => setTStart(parseFloat(e.target.value) || 0)}
                      style={{ width: '50%' }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      value={tEnd}
                      onChange={(e) => setTEnd(parseFloat(e.target.value) || 50)}
                      style={{ width: '50%' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">时间步数: {numPoints}</label>
                  <input
                    type="range"
                    className="param-slider"
                    min={100}
                    max={10000}
                    step={100}
                    value={numPoints}
                    onChange={(e) => setNumPoints(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="panel">
                <h3 className="panel-title">初始条件</h3>
                {initialConditions.map((ic, idx) => (
                  <div className="form-group" key={idx}>
                    <label className="form-label">{selectedExample.variables[idx]}</label>
                    <input
                      type="number"
                      className="form-input"
                      step="any"
                      value={ic}
                      onChange={(e) => handleInitialConditionChange(idx, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>

              <div className="panel">
                <h3 className="panel-title">方程参数</h3>
                {paramNames.map((param) => (
                  <div className="form-group" key={param}>
                    <label className="form-label">{param}</label>
                    <input
                      type="number"
                      className="form-input"
                      step="any"
                      value={parameters[param] ?? 0}
                      onChange={(e) => handleParameterChange(param, parseFloat(e.target.value) || 0)}
                    />
                    {selectedExample.param_ranges[param] && (
                      <div className="param-value">
                        范围: [{selectedExample.param_ranges[param][0]}, {selectedExample.param_ranges[param][1]}]
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="panel">
                <h3 className="panel-title">操作</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSolve}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="loading">
                        <span className="spinner"></span>求解中...
                      </span>
                    ) : '求解 ODE'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handlePoincare}
                    disabled={isLoading}
                  >
                    计算庞加莱截面
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleParameterScan}
                    disabled={isLoading}
                  >
                    参数扫描
                  </button>
                </div>
              </div>

              <div className="panel">
                <h3 className="panel-title">庞加莱截面设置</h3>
                <div className="form-group">
                  <label className="form-label">截面维度</label>
                  <select
                    className="form-select"
                    value={planeDimension}
                    onChange={(e) => setPlaneDimension(parseInt(e.target.value))}
                  >
                    {selectedExample.variables.map((v, idx) => (
                      <option key={idx} value={idx}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">截面值: {planeValue}</label>
                  <input
                    type="range"
                    className="param-slider"
                    min={-50}
                    max={50}
                    step={0.1}
                    value={planeValue}
                    onChange={(e) => setPlaneValue(parseFloat(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">穿越方向</label>
                  <select
                    className="form-select"
                    value={poincareDirection}
                    onChange={(e) => setPoincareDirection(parseInt(e.target.value))}
                  >
                    <option value={1}>正方向 (+)</option>
                    <option value={-1}>负方向 (-)</option>
                    <option value={0}>双向</option>
                  </select>
                </div>
              </div>

              <div className="panel">
                <h3 className="panel-title">参数扫描设置</h3>
                <div className="form-group">
                  <label className="form-label">扫描参数</label>
                  <select
                    className="form-select"
                    value={scanParameter}
                    onChange={(e) => {
                      setScanParameter(e.target.value);
                      const range = selectedExample.param_ranges[e.target.value];
                      if (range) {
                        setScanStart(range[0]);
                        setScanEnd(range[1]);
                      }
                    }}
                  >
                    {paramNames.map((param) => (
                      <option key={param} value={param}>{param}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">参数范围</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-input"
                      step="any"
                      value={scanStart}
                      onChange={(e) => setScanStart(parseFloat(e.target.value) || 0)}
                      style={{ width: '50%' }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      step="any"
                      value={scanEnd}
                      onChange={(e) => setScanEnd(parseFloat(e.target.value) || 100)}
                      style={{ width: '50%' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">扫描点数: {scanSteps}</label>
                  <input
                    type="range"
                    className="param-slider"
                    min={2}
                    max={100}
                    value={scanSteps}
                    onChange={(e) => setScanSteps(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </>
          )}
        </aside>

        <main className="main-area">
          {error && (
            <div className="message message-error">
              {error}
            </div>
          )}

          {!solutionData && !poincareData && !scanData && (
            <div className="viz-panel">
              <div className="loading" style={{ flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '1.25rem', color: '#3b82f6', fontWeight: '600' }}>
                  请选择方程模型并开始求解
                </div>
                <div style={{ color: '#64748b', textAlign: 'center', maxWidth: '500px' }}>
                  <p style={{ marginBottom: '8px' }}>左侧面板提供了多种经典常微分方程模型：</p>
                  <ul style={{ listStylePosition: 'inside', textAlign: 'left', margin: '0 auto', maxWidth: '350px' }}>
                    <li><strong>洛伦兹吸引子</strong> - 三维混沌系统，展现蝴蝶效应</li>
                    <li><strong>捕食者-猎物模型</strong> - 生态系统种群动态</li>
                    <li><strong>范德波尔振荡器</strong> - 非线性极限环</li>
                    <li><strong>单摆</strong> - 经典力学系统</li>
                    <li>以及更多...</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {(solutionData || poincareData || scanData) && (
            <>
              <nav className="tab-nav">
                <button
                  className={`tab-btn ${activeTab === 'solution' ? 'active' : ''}`}
                  onClick={() => setActiveTab('solution')}
                >
                  时间序列
                </button>
                <button
                  className={`tab-btn ${activeTab === 'phase' ? 'active' : ''}`}
                  onClick={() => setActiveTab('phase')}
                  disabled={!solutionData}
                >
                  相平面图
                </button>
                <button
                  className={`tab-btn ${activeTab === 'poincare' ? 'active' : ''}`}
                  onClick={() => setActiveTab('poincare')}
                  disabled={!poincareData}
                >
                  庞加莱截面
                </button>
                <button
                  className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scan')}
                  disabled={!scanData}
                >
                  参数扫描
                </button>
              </nav>

              {activeTab === 'solution' && solutionData && (
                <div className="viz-panel">
                  <div className="viz-header">
                    <h3 className="viz-title">时间序列图 - {solutionData.equation_name}</h3>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      求解方法: {solutionData.solver_method.toUpperCase()}
                    </div>
                  </div>
                  <TimeSeriesPlot
                    time={solutionData.time}
                    states={solutionData.states}
                    variables={solutionData.variables}
                  />
                </div>
              )}

              {activeTab === 'phase' && solutionData && (
                <div className="viz-panel">
                  <div className="viz-header">
                    <h3 className="viz-title">相平面图 - {solutionData.equation_name}</h3>
                  </div>
                  <PhasePortrait
                    states={solutionData.states}
                    variables={solutionData.variables}
                  />
                </div>
              )}

              {activeTab === 'poincare' && poincareData && (
                <div className="viz-panel">
                  <div className="viz-header">
                    <h3 className="viz-title">庞加莱截面 - {poincareData.equation_name}</h3>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      截面: {poincareData.plane_variable} = {poincareData.plane_value}
                    </div>
                  </div>
                  <PoincarePlot
                    points={poincareData.points}
                    variables={poincareData.remaining_variables}
                    analysis={poincareData.analysis}
                  />
                </div>
              )}

              {activeTab === 'scan' && scanData && (
                <div className="viz-panel">
                  <div className="viz-header">
                    <h3 className="viz-title">参数扫描结果</h3>
                  </div>
                  <ParameterScanPlot
                    scanData={scanData}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
