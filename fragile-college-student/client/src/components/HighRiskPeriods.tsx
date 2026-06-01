import React from 'react';
import type { HighRiskPeriod } from '../types';

interface HighRiskPeriodsProps {
  periods: HighRiskPeriod[];
}

const HighRiskPeriods: React.FC<HighRiskPeriodsProps> = ({ periods }) => {
  if (periods.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">高风险预警时段</h3>
        <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
          当前无高风险时段
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">高风险预警时段</h3>
      </div>
      <div className="high-risk-list">
        {periods.slice(0, 5).map((period, index) => (
          <div key={index} className="high-risk-item">
            <div className="high-risk-item-header">
              <span className="high-risk-illness">{period.illness}</span>
              <span className="high-risk-dates">
                {period.start_date} ~ {period.end_date}
              </span>
            </div>
            <div className="high-risk-meta">
              <span>持续 {period.duration_days} 天</span>
              <span>平均风险: {(period.avg_risk * 100).toFixed(1)}%</span>
              <span>峰值风险: {(period.peak_risk * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HighRiskPeriods;
