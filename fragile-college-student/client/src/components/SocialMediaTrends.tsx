import React from 'react';
import type { SocialMediaTrend } from '../types';

interface SocialMediaTrendsProps {
  trends: SocialMediaTrend[];
}

const SocialMediaTrends: React.FC<SocialMediaTrendsProps> = ({ trends }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">社交媒体热议话题</h3>
      </div>
      <div className="trend-list">
        {trends.slice(0, 7).map((trend, index) => (
          <div key={index} className="trend-item">
            <div className="trend-date">{trend.date}</div>
            <div className="trend-topics">
              {trend.topics.map((topic) => (
                <span key={topic.illness} className="trend-topic">
                  {topic.illness}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialMediaTrends;
