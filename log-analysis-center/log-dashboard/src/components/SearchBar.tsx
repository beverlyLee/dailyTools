import React, { useState } from 'react';
import { Input, Button, Select, DatePicker, Space, Card, Tag, Popover, Typography } from 'antd';
import { SearchOutlined, ClearOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { SearchQuery } from '@/types';
import { LUCENE_SYNTAX_EXAMPLES, LOG_LEVEL_LABELS } from '@/utils/constants';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

interface SearchBarProps {
  onSearch: (query: SearchQuery) => void;
  loading?: boolean;
  defaultQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  loading = false,
  defaultQuery = '',
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [service, setService] = useState<string | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs] | null>(null);

  const handleSearch = () => {
    const searchParams: SearchQuery = {
      query,
      level,
      service,
      limit: 100,
    };

    if (timeRange) {
      searchParams.from_time = timeRange[0].toISOString();
      searchParams.to_time = timeRange[1].toISOString();
    }

    onSearch(searchParams);
  };

  const handleClear = () => {
    setQuery('');
    setLevel(undefined);
    setService(undefined);
    setTimeRange(null);
    onSearch({ query: '', limit: 100 });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const syntaxHelpContent = (
    <div style={{ maxWidth: 400 }}>
      <Paragraph style={{ marginBottom: 12 }}>
        <Text strong>Lucene 语法示例:</Text>
      </Paragraph>
      {LUCENE_SYNTAX_EXAMPLES.map((example, index) => (
        <div key={index} style={{ marginBottom: 8 }}>
          <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => setQuery(example)}>
            {example}
          </Tag>
        </div>
      ))}
      <Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: 12, color: '#666' }}>
        点击示例可快速填充查询框
      </Paragraph>
    </div>
  );

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="输入查询条件 (支持 Lucene 语法，如: message:error, level:ERROR AND service:api)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            prefix={
              <Popover content={syntaxHelpContent} title="Lucene 语法帮助" trigger="click">
                <QuestionCircleOutlined style={{ color: '#1890ff', cursor: 'help' }} />
              </Popover>
            }
            suffix={
              query && (
                <ClearOutlined
                  style={{ cursor: 'pointer', color: '#999' }}
                  onClick={() => setQuery('')}
                />
              )
            }
            style={{ width: '100%' }}
            allowClear
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            搜索
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClear}>
            清除
          </Button>
        </Space.Compact>

        <Space wrap>
          <Select
            placeholder="按级别筛选"
            allowClear
            value={level}
            onChange={setLevel}
            style={{ width: 150 }}
            options={Object.keys(LOG_LEVEL_LABELS).map((lvl) => ({
              label: LOG_LEVEL_LABELS[lvl as keyof typeof LOG_LEVEL_LABELS],
              value: lvl,
            }))}
          />
          <Select
            placeholder="按服务筛选"
            allowClear
            value={service}
            onChange={setService}
            style={{ width: 150 }}
            mode="tags"
          />
          <RangePicker
            showTime
            placeholder={['开始时间', '结束时间']}
            value={timeRange}
            onChange={(dates) => setTimeRange(dates as [Dayjs, Dayjs] | null)}
            style={{ width: 350 }}
          />
        </Space>
      </Space>
    </Card>
  );
};
