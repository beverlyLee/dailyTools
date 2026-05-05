import React, { useState } from 'react';
import { Card, Typography, Spin, Alert, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { SearchQuery as SearchQueryType } from '@/types';
import { SearchBar } from '@/components/SearchBar';
import { LogTable } from '@/components/LogTable';
import { logApi } from '@/services/api';
import type { LogEntry } from '@/types';

const { Title } = Typography;

export const SearchPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: SearchQueryType) => {
    setLoading(true);
    setError(null);

    try {
      const result = await logApi.searchLogs(query);
      setLogs(result.logs);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        日志查询
      </Title>

      {error && (
        <Alert
          message="搜索失败"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      <SearchBar onSearch={handleSearch} loading={loading} />

      <Card>
        <Spin spinning={loading}>
          {!hasSearched ? (
            <Empty
              image={
                <SearchOutlined
                  style={{ fontSize: 72, color: '#1890ff' }}
                />
              }
              description="请输入查询条件进行搜索"
            />
          ) : logs.length > 0 ? (
            <LogTable logs={logs} />
          ) : (
            <Empty
              description="未找到匹配的日志"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};
