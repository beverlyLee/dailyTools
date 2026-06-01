import React from 'react';
import type { MonthlyIllness } from '../types';

interface MonthlyIllnessListProps {
  illnesses: MonthlyIllness[];
  monthName: string;
}

const MonthlyIllnessList: React.FC<MonthlyIllnessListProps> = ({
  illnesses,
  monthName,
}) => {
  return (
    <div>
      <h3 className="card-title">{monthName}疾病风险排行</h3>
      <div className="monthly-illness-list">
        {illnesses.map((illness) => (
          <div
            key={illness.name}
            className={`monthly-illness-item ${illness.risk_level}`}
          >
            <div className="illness-name-row">
              <span className="illness-name">{illness.name}</span>
              <span className={`risk-badge ${illness.risk_level}`}>
                {illness.risk_level === 'high'
                  ? '高风险'
                  : illness.risk_level === 'medium'
                  ? '中风险'
                  : '低风险'}
              </span>
            </div>
            <div className="illness-stats">
              <span>风险值: {(illness.avg_risk * 100).toFixed(1)}%</span>
              <span>日均病例: {illness.avg_daily_cases}</span>
              <span>月累计: {illness.total_cases}</span>
            </div>
            <div className="illness-symptoms">
              {illness.symptoms.map((symptom) => (
                <span key={symptom} className="symptom-tag">
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyIllnessList;
