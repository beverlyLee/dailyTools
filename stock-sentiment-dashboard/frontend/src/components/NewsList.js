import React from 'react';
import { List, Space, Tag } from 'antd';
import dayjs from 'dayjs';

const NewsList = ({ news }) => {
  if (!news || news.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无新闻数据</div>;
  }

  const getSentimentTag = (sentiment) => {
    switch (sentiment) {
      case '利好':
        return <Tag color="success" className="sentiment-positive">利好</Tag>;
      case '利空':
        return <Tag color="error" className="sentiment-negative">利空</Tag>;
      default:
        return <Tag color="default" className="sentiment-neutral">中性</Tag>;
    }
  };

  return (
    <List
      dataSource={news}
      renderItem={(item) => (
        <List.Item className="news-item">
          <div style={{ width: '100%' }}>
            <div className="news-title">
              <Space>
                {getSentimentTag(item.sentiment)}
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#1890ff', textDecoration: 'none' }}
                >
                  {item.title}
                </a>
              </Space>
            </div>
            {item.summary && (
              <div className="news-summary">{item.summary}</div>
            )}
            <div className="news-time">
              {item.published ? dayjs(item.published).format('YYYY-MM-DD HH:mm') : ''}
            </div>
          </div>
        </List.Item>
      )}
    />
  );
};

export default NewsList;
