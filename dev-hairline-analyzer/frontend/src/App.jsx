import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HairlineChart from './components/HairlineChart';

function App() {
  const [stats, setStats] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [roast, setRoast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data.stats);
      setRanking(response.data.ranking);
      setError(null);
    } catch (err) {
      setError('获取数据失败，请检查后端服务是否启动');
      console.error('Error fetching stats:', err);
    }
  };

  const handleLanguageClick = async (language) => {
    setSelectedLanguage(language);
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/roast/${language}`);
      setRoast(response.data);
    } catch (err) {
      setError(`获取${language}劝退文案失败`);
      console.error('Error fetching roast:', err);
    }
    
    setLoading(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>💇‍♂️ 开发者发际线焦虑分析器</h1>
        <p>分析各编程语言开发者的发际线健康状况，珍爱头发，谨慎选型</p>
      </header>

      <div className="content">
        <div className="card">
          <h2>📊 发际线焦虑排行榜</h2>
          
          {error && !stats && (
            <div style={{ color: '#e74c3c', textAlign: 'center', padding: '20px' }}>
              {error}
            </div>
          )}
          
          <HairlineChart data={ranking} />
        </div>

        <div className="card">
          <h2>🎯 AI劝退指南</h2>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '0.95rem' }}>
            点击语言标签，获取专属劝退文案
          </p>
          
          <div className="language-buttons">
            {ranking.map((item) => (
              <button
                key={item.language}
                className={`lang-btn ${selectedLanguage === item.language ? 'active' : ''}`}
                onClick={() => handleLanguageClick(item.language)}
              >
                {item.language}
              </button>
            ))}
          </div>

          {loading && (
            <div className="loading">
              <span>●</span>
              <span>●</span>
              <span>●</span>
              &nbsp;正在生成劝退文案...
            </div>
          )}

          {roast && !loading && (
            <div className="roast-content">
              <h3>🚨 {roast.language} 劝退预警</h3>
              <div className="risk-score">
                ⚠️ 发际线风险: {roast.risk_score}%
              </div>
              <p>{roast.dissuasion}</p>
            </div>
          )}

          {!roast && !loading && (
            <div className="empty-state">
              <div className="emoji">👆</div>
              <p>选择上方编程语言标签<br />获取你的专属劝退指南</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
