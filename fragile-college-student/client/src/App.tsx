import React, { useState, useEffect } from 'react';
import CalendarHeatmap from './components/CalendarHeatmap';
import MonthlyIllnessList from './components/MonthlyIllnessList';
import HighRiskPeriods from './components/HighRiskPeriods';
import SocialMediaTrends from './components/SocialMediaTrends';
import { getDashboard, getMonthlySummary, getValidate, getCalendarHeatmap } from './api';
import type { DashboardData, ValidationResult, MonthlySummary as MonthlySummaryType } from './types';

const MONTHS = [
  { value: 0, label: '全年' },
  { value: 1, label: '1月' },
  { value: 2, label: '2月' },
  { value: 3, label: '3月' },
  { value: 4, label: '4月' },
  { value: 5, label: '5月' },
  { value: 6, label: '6月' },
  { value: 7, label: '7月' },
  { value: 8, label: '8月' },
  { value: 9, label: '9月' },
  { value: 10, label: '10月' },
  { value: 11, label: '11月' },
  { value: 12, label: '12月' },
];

const App: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryType | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [selectedIllness, setSelectedIllness] = useState('甲流');
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedCollege, setSelectedCollege] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [illnessHeatmapCache, setIllnessHeatmapCache] = useState<Record<string, [string, number][]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboard, validate] = await Promise.all([
          getDashboard(),
          getValidate(),
        ]);
        setDashboardData(dashboard);
        setIllnessHeatmapCache(dashboard.heatmaps || {});
        setValidation(validate);
        setMonthlySummary(dashboard.monthly_summary);
      } catch (err) {
        setError('数据加载失败，请确保后端服务已启动');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchIllnessHeatmap = async () => {
      const cacheKey = `${selectedIllness}_${selectedCollege || 'all'}`;

      if (illnessHeatmapCache[cacheKey]) {
        return;
      }

      if (!selectedCollege) {
        const dashboardData = illnessHeatmapCache[selectedIllness];
        if (dashboardData && dashboardData.length > 0) {
          return;
        }
      }

      try {
        const college = selectedCollege || undefined;
        const result = await getCalendarHeatmap(selectedIllness, college);
        if (result.data && result.data.length > 0) {
          setIllnessHeatmapCache(prev => ({
            ...prev,
            [cacheKey]: result.data,
          }));
        }
      } catch (err) {
        console.error(`获取 ${selectedIllness} 热力图数据失败`, err);
      }
    };

    if (dashboardData) {
      fetchIllnessHeatmap();
    }
  }, [selectedIllness, selectedCollege, dashboardData, illnessHeatmapCache]);

  useEffect(() => {
    const fetchMonthlySummary = async () => {
      try {
        const college = selectedCollege || undefined;
        const month = selectedMonth === 0 ? 9 : selectedMonth;
        const summary = await getMonthlySummary(month, college);
        setMonthlySummary(summary);
      } catch (err) {
        console.error('月度摘要加载失败', err);
      }
    };

    if (dashboardData) {
      fetchMonthlySummary();
    }
  }, [selectedMonth, selectedCollege, dashboardData]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleCollegeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCollege(e.target.value);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error || !dashboardData || !validation || !monthlySummary) {
    return (
      <div className="app-container">
        <div className="error">{error || '数据加载失败'}</div>
      </div>
    );
  }

  const illnesses = Object.keys(dashboardData.illnesses);
  const colleges = dashboardData.colleges;

  const cacheKey = `${selectedIllness}_${selectedCollege || 'all'}`;
  const cachedData = illnessHeatmapCache[cacheKey] || illnessHeatmapCache[selectedIllness] || [];

  const fullYearData = cachedData;

  const heatmapData = selectedMonth === 0
    ? fullYearData
    : fullYearData.filter(([date]) => {
        const month = parseInt(date.split('-')[1]);
        return month === selectedMonth;
      });

  const displayData = selectedMonth === 0 ? fullYearData : heatmapData;

  const avgRiskForMonth = displayData.length > 0
    ? displayData.reduce((sum, [, risk]) => sum + risk, 0) / displayData.length
    : 0;

  const monthLabel = selectedMonth === 0
    ? '全年'
    : `${selectedMonth}月`;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🏥 校园健康预警系统</h1>
        <p>2025年度高校疾病风险分析与预警平台</p>
        <div className="validation-status">
          <div className={`validation-item ${validation.autumn_influenza ? 'validation-pass' : 'validation-fail'}`}>
            <span>{validation.autumn_influenza ? '✓' : '✗'}</span>
            <span>秋季甲流高发</span>
          </div>
          <div className={`validation-item ${validation.autumn_conjunctivitis ? 'validation-pass' : 'validation-fail'}`}>
            <span>{validation.autumn_conjunctivitis ? '✓' : '✗'}</span>
            <span>秋季结膜炎高发</span>
          </div>
          <div className={`validation-item ${validation.winter_southern_flu ? 'validation-pass' : 'validation-fail'}`}>
            <span>{validation.winter_southern_flu ? '✓' : '✗'}</span>
            <span>冬季南方流感高风险</span>
          </div>
        </div>
      </header>

      <div className="content-grid">
        <main className="main-content">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {selectedMonth === 0 ? '全年' : `${selectedMonth}月`}健康风险日历热力图
              </h2>
              <div className="selector-group">
                <select value={selectedMonth} onChange={handleMonthChange}>
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select value={selectedCollege} onChange={handleCollegeChange}>
                  <option value="">全部高校</option>
                  {colleges.map((college) => (
                    <option key={college.name} value={college.name}>
                      {college.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="illness-tabs">
              {illnesses.map((illness) => (
                <button
                  key={illness}
                  className={`illness-tab ${selectedIllness === illness ? 'active' : ''}`}
                  onClick={() => setSelectedIllness(illness)}
                >
                  {illness}
                </button>
              ))}
            </div>

            <CalendarHeatmap
              data={heatmapData}
              illness={selectedIllness}
              year={2025}
              month={selectedMonth === 0 ? undefined : selectedMonth}
            />

            <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ marginBottom: '12px', fontWeight: 600 }}>
                {monthLabel} {selectedIllness} 风险分析
              </p>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                {dashboardData.illnesses[selectedIllness]?.description}
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: '#888', fontSize: '13px' }}>数据点数量:</span>
                  <span style={{ fontWeight: 600, marginLeft: '8px' }}>{displayData.length} 天</span>
                </div>
                <div>
                  <span style={{ color: '#888', fontSize: '13px' }}>平均风险:</span>
                  <strong style={{ 
                    color: avgRiskForMonth >= 0.3 ? '#dc2626' : avgRiskForMonth >= 0.15 ? '#d97706' : '#059669',
                    marginLeft: '8px'
                  }}>
                    {(avgRiskForMonth * 100).toFixed(2)}%
                  </strong>
                </div>
                {displayData.length > 0 && (
                  <>
                    <div>
                      <span style={{ color: '#888', fontSize: '13px' }}>最高风险:</span>
                      <strong style={{ 
                        color: Math.max(...displayData.map(([, r]) => r)) >= 0.3 ? '#dc2626' : '#d97706',
                        marginLeft: '8px'
                      }}>
                        {(Math.max(...displayData.map(([, r]) => r)) * 100).toFixed(2)}%
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#888', fontSize: '13px' }}>最低风险:</span>
                      <strong style={{ color: '#059669', marginLeft: '8px' }}>
                        {(Math.min(...displayData.map(([, r]) => r)) * 100).toFixed(2)}%
                      </strong>
                    </div>
                  </>
                )}
                <div>
                  <span style={{ color: '#888', fontSize: '13px' }}>风险等级:</span>
                  <span className={`risk-badge ${avgRiskForMonth >= 0.3 ? 'high' : avgRiskForMonth >= 0.15 ? 'medium' : 'low'}`} style={{ marginLeft: '8px' }}>
                    {avgRiskForMonth >= 0.3 ? '高风险' : avgRiskForMonth >= 0.15 ? '中风险' : '低风险'}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>常见症状:</p>
                <div className="illness-symptoms">
                  {dashboardData.illnesses[selectedIllness]?.symptoms.map((symptom: string) => (
                    <span key={symptom} className="symptom-tag">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <MonthlyIllnessList
              illnesses={monthlySummary.illnesses}
              monthName={monthlySummary.month_name}
            />
          </div>
        </main>

        <aside className="sidebar">
          <HighRiskPeriods periods={dashboardData.high_risk_periods} />
          <SocialMediaTrends trends={dashboardData.social_trends} />

          <div className="card">
            <h3 className="card-title">高校列表</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {colleges.map((college) => (
                <div
                  key={college.name}
                  style={{
                    padding: '10px 12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{college.name}</span>
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    {college.region === 'north' ? '北方' :
                     college.region === 'south' ? '南方' :
                     college.region === 'central' ? '中部' :
                     college.region === 'northwest' ? '西北' : '西南'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;
