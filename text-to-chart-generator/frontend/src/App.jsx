import React, { useState, useEffect, useRef } from 'react';
import ChartRenderer from './components/ChartRenderer';
import DataTable from './components/DataTable';
import './App.css';

const App = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedChartType, setSelectedChartType] = useState(null);
  const [showSQL, setShowSQL] = useState(false);

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '查询失败');
      }

      const data = await response.json();
      setResult(data);
      
      if (data.chart_recommendation?.recommended) {
        setSelectedChartType(data.chart_recommendation.recommended.type);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const exampleQueries = [
    '显示过去一年各季度的营收和利润',
    '展示腾讯控股2024年各季度的净利润趋势',
    '对比各公司2024年第2季度的营业收入',
    '显示阿里巴巴过去8个季度的总资产变化',
    '展示2024年各行业的平均利润分布'
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>智能财报图表生成器</h1>
        <p className="subtitle">用自然语言查询财务数据，自动生成专业图表</p>
      </header>

      <main className="app-main">
        <section className="query-section">
          <div className="query-container">
            <textarea
              className="query-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入自然语言查询，例如：显示过去一年各季度的营收和利润..."
              rows={2}
            />
            <button
              className="query-button"
              onClick={handleQuery}
              disabled={loading || !query.trim()}
            >
              {loading ? '查询中...' : '生成图表'}
            </button>
          </div>

          <div className="examples">
            <span className="examples-label">示例查询：</span>
            <div className="example-queries">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  className="example-button"
                  onClick={() => setQuery(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="error-message">
            <strong>错误：</strong> {error}
          </div>
        )}

        {result && (
          <section className="result-section">
            {result.sql && (
              <div className="sql-panel">
                <div className="sql-header" onClick={() => setShowSQL(!showSQL)}>
                  <span>SQL 查询语句</span>
                  <span className="toggle-icon">{showSQL ? '▼' : '▶'}</span>
                </div>
                {showSQL && (
                  <pre className="sql-content">{result.sql}</pre>
                )}
              </div>
            )}

            {result.chart_recommendation && (
              <div className="chart-recommendation">
                <h3>图表推荐</h3>
                <div className="chart-options">
                  {result.chart_recommendation.recommendations.map((rec, index) => (
                    <button
                      key={index}
                      className={`chart-option ${selectedChartType === rec.type ? 'active' : ''}`}
                      onClick={() => setSelectedChartType(rec.type)}
                    >
                      <div className="chart-name">{rec.name}</div>
                      <div className="chart-confidence">
                        置信度: {(rec.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="chart-reason">{rec.reason}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="chart-section">
              <div className="chart-header">
                <h3>图表展示</h3>
                <button
                  className="export-button"
                  onClick={() => {
                    const chartConfig = {
                      type: selectedChartType,
                      data: result.data,
                      columns: result.columns,
                      analysis: result.chart_recommendation?.analysis
                    };
                    const blob = new Blob([JSON.stringify(chartConfig, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'chart-config.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  导出配置 JSON
                </button>
              </div>
              <ChartRenderer
                chartType={selectedChartType}
                data={result.data}
                columns={result.columns}
                analysis={result.chart_recommendation?.analysis}
              />
            </div>

            <div className="data-section">
              <h3>数据详情</h3>
              <DataTable data={result.data} columns={result.columns} />
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>智能财报图表生成器 - 基于 React + AntV G2Plot + FastAPI + LangChain</p>
      </footer>
    </div>
  );
};

export default App;
