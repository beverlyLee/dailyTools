import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Input, Select, Space, Badge } from 'antd';
import { EyeOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { LogEntry } from '@/types';
import { formatRelativeTime, truncateText, jsonToPrettyString, getLogLevelBadgeColor } from '@/utils/helpers';
import { LOG_LEVEL_LABELS, LOG_LEVEL_COLORS } from '@/utils/constants';

interface LogTableProps {
  logs: LogEntry[];
  loading?: boolean;
  showDetail?: boolean;
}

export const LogTable: React.FC<LogTableProps> = ({ 
  logs, 
  loading = false,
  showDetail = true 
}) => {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
  const [serviceFilter, setServiceFilter] = useState<string | undefined>(undefined);

  const uniqueServices = Array.from(
    new Set(logs.map((log) => log.service).filter(Boolean) as string[])
  );

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      searchText === '' ||
      log.message.toLowerCase().includes(searchText.toLowerCase()) ||
      (log.service && log.service.toLowerCase().includes(searchText.toLowerCase())) ||
      log.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));

    const matchesLevel = !levelFilter || log.level === levelFilter;
    const matchesService = !serviceFilter || log.service === serviceFilter;

    return matchesSearch && matchesLevel && matchesService;
  });

  const showLogDetail = (log: LogEntry) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };

  const columns: ColumnsType<LogEntry> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (time: string) => (
        <span style={{ fontSize: 12 }}>{formatRelativeTime(time)}</span>
      ),
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => (
        <Tag color={getLogLevelBadgeColor(level)} style={{ margin: 0 }}>
          {LOG_LEVEL_LABELS[level as keyof typeof LOG_LEVEL_LABELS] || level}
        </Tag>
      ),
      filters: Object.keys(LOG_LEVEL_LABELS).map((level) => ({
        text: LOG_LEVEL_LABELS[level as keyof typeof LOG_LEVEL_LABELS],
        value: level,
      })),
      onFilter: (value, record) => record.level === value,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {truncateText(message, 100)}
        </span>
      ),
    },
    {
      title: '服务',
      dataIndex: 'service',
      key: 'service',
      width: 120,
      render: (service?: string) => (
        service ? (
          <Tag color="blue">{service}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
      filters: uniqueServices.map((service) => ({
        text: service,
        value: service,
      })),
      onFilter: (value, record) => record.service === value,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => (
        <Tag>{source}</Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags.slice(0, 3).map((tag, index) => (
            <Tag key={index} size="small">{tag}</Tag>
          ))}
          {tags.length > 3 && (
            <Tag size="small" color="default">+{tags.length - 3}</Tag>
          )}
        </Space>
      ),
    },
  ];

  if (showDetail) {
    columns.push({
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => showLogDetail(record)}
        >
          详情
        </Button>
      ),
    });
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="搜索日志消息、服务或标签..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          placeholder="按级别筛选"
          allowClear
          value={levelFilter}
          onChange={setLevelFilter}
          style={{ width: 150 }}
          options={Object.keys(LOG_LEVEL_LABELS).map((level) => ({
            label: LOG_LEVEL_LABELS[level as keyof typeof LOG_LEVEL_LABELS],
            value: level,
          }))}
        />
        <Select
          placeholder="按服务筛选"
          allowClear
          value={serviceFilter}
          onChange={setServiceFilter}
          style={{ width: 150 }}
          options={uniqueServices.map((service) => ({
            label: service,
            value: service,
          }))}
        />
        <span style={{ marginLeft: 'auto', color: '#666' }}>
          共 {filteredLogs.length} 条日志
        </span>
      </div>

      <Table
        columns={columns}
        dataSource={filteredLogs}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          defaultPageSize: 10,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedLog && (
          <div style={{ fontFamily: 'monospace' }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: '#666', marginRight: 8 }}>ID:</span>
                <code>{selectedLog.id}</code>
              </div>
              <div>
                <span style={{ color: '#666', marginRight: 8 }}>时间:</span>
                {selectedLog.timestamp}
              </div>
              <div>
                <span style={{ color: '#666', marginRight: 8 }}>级别:</span>
                <Tag color={getLogLevelBadgeColor(selectedLog.level)}>
                  {LOG_LEVEL_LABELS[selectedLog.level as keyof typeof LOG_LEVEL_LABELS] || selectedLog.level}
                </Tag>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8, color: '#666' }}>消息</h4>
              <div
                style={{
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {selectedLog.message}
              </div>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
              <div>
                <span style={{ color: '#666', marginRight: 8 }}>来源:</span>
                <Tag>{selectedLog.source}</Tag>
              </div>
              {selectedLog.service && (
                <div>
                  <span style={{ color: '#666', marginRight: 8 }}>服务:</span>
                  <Tag color="blue">{selectedLog.service}</Tag>
                </div>
              )}
              {selectedLog.hostname && (
                <div>
                  <span style={{ color: '#666', marginRight: 8 }}>主机:</span>
                  <code>{selectedLog.hostname}</code>
                </div>
              )}
            </div>

            {selectedLog.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8, color: '#666' }}>标签</h4>
                <Space size={[0, 4]} wrap>
                  {selectedLog.tags.map((tag, index) => (
                    <Tag key={index}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}

            {Object.keys(selectedLog.fields).length > 0 && (
              <div>
                <h4 style={{ marginBottom: 8, color: '#666' }}>额外字段</h4>
                <pre
                  style={{
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 4,
                    overflow: 'auto',
                    maxHeight: 200,
                    margin: 0,
                  }}
                >
                  {jsonToPrettyString(selectedLog.fields)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
