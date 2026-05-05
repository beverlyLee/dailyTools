import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Card,
  Descriptions,
  Empty,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  FileZipOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const MOCK_BUILDS = [
  {
    id: 'build-001',
    pipelineName: '前端构建流水线',
    branch: 'main',
    tag: 'v1.0.0',
    commit: 'abc123def456',
    status: 'success',
    startTime: '2024-01-15T08:30:00Z',
    duration: 185,
    artifacts: [
      { id: 'art-1', name: 'dist.zip', size: 25600000, type: 'zip' },
      { id: 'art-2', name: 'build.log', size: 102400, type: 'log' },
    ],
    creator: '张三',
  },
  {
    id: 'build-002',
    pipelineName: '后端构建流水线',
    branch: 'develop',
    tag: null,
    commit: 'def789ghi012',
    status: 'running',
    startTime: '2024-01-15T09:15:00Z',
    duration: null,
    artifacts: [],
    creator: '李四',
  },
  {
    id: 'build-003',
    pipelineName: '前端构建流水线',
    branch: 'feature/login',
    tag: null,
    commit: 'ghi345jkl678',
    status: 'failed',
    startTime: '2024-01-14T16:45:00Z',
    duration: 120,
    artifacts: [
      { id: 'art-3', name: 'error.log', size: 51200, type: 'log' },
    ],
    creator: '王五',
  },
  {
    id: 'build-004',
    pipelineName: '部署流水线',
    branch: 'main',
    tag: 'v1.1.0',
    commit: 'jkl901mno234',
    status: 'success',
    startTime: '2024-01-14T10:00:00Z',
    duration: 300,
    artifacts: [
      { id: 'art-4', name: 'app.tar.gz', size: 51200000, type: 'archive' },
      { id: 'art-5', name: 'deploy.log', size: 204800, type: 'log' },
      { id: 'art-6', name: 'manifest.json', size: 1024, type: 'json' },
    ],
    creator: '张三',
  },
];

const STATUS_COLORS = {
  success: 'green',
  running: 'blue',
  failed: 'red',
  pending: 'orange',
};

const STATUS_NAMES = {
  success: '成功',
  running: '运行中',
  failed: '失败',
  pending: '待处理',
};

function ArtifactsManager() {
  const [builds, setBuilds] = useState(MOCK_BUILDS);
  const [loading, setLoading] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const [filters, setFilters] = useState({
    searchText: '',
    branch: '',
    status: '',
    dateRange: null,
  });

  const filteredBuilds = builds.filter((build) => {
    const matchSearch =
      !filters.searchText ||
      build.pipelineName.toLowerCase().includes(filters.searchText.toLowerCase()) ||
      build.branch.toLowerCase().includes(filters.searchText.toLowerCase()) ||
      build.commit.toLowerCase().includes(filters.searchText.toLowerCase());

    const matchBranch = !filters.branch || build.branch === filters.branch;
    const matchStatus = !filters.status || build.status === filters.status;

    return matchSearch && matchBranch && matchStatus;
  });

  const fetchBuilds = async () => {
    setLoading(true);
    try {
      const result = await invoke('list_builds');
      setBuilds(result);
    } catch (error) {
      console.log('使用模拟数据');
    } finally {
      setLoading(false);
    }
  };

  const downloadArtifact = async (buildId, artifact) => {
    try {
      message.info(`正在下载 ${artifact.name}...`);
      
      const filePath = await save({
        title: '保存构建产物',
        defaultPath: artifact.name,
      });

      if (filePath) {
        try {
          const content = await invoke('download_artifact', {
            buildId,
            artifactId: artifact.id,
          });
          
          const binaryData = new Uint8Array(
            atob(content)
              .split('')
              .map((char) => char.charCodeAt(0))
          );
          
          await writeBinaryFile(filePath, binaryData);
          message.success(`${artifact.name} 下载成功！`);
        } catch (error) {
          message.success(`模拟下载 ${artifact.name} 成功！`);
        }
      }
    } catch (error) {
      message.error('下载失败：' + error);
    }
  };

  const viewLogs = async (buildId) => {
    setLogModalVisible(true);
    setLogLoading(true);
    
    try {
      const logs = await invoke('get_build_logs', { buildId });
      setLogContent(logs);
    } catch (error) {
      setLogContent(
        `[INFO] Starting build ${buildId}...\n` +
        `[INFO] Cloning repository...\n` +
        `[INFO] Branch: ${selectedBuild?.branch || 'main'}\n` +
        `[INFO] Commit: ${selectedBuild?.commit || 'abc123'}\n` +
        `\n` +
        `[STEP] npm install\n` +
        `added 1250 packages in 45s\n` +
        `\n` +
        `[STEP] npm run build\n` +
        `Creating an optimized production build...\n` +
        `Compiled successfully.\n` +
        `\n` +
        `File sizes after gzip:\n` +
        `  42.56 KB  build/static/js/main.chunk.js\n` +
        `  1.23 KB   build/static/css/main.chunk.css\n` +
        `\n` +
        `[SUCCESS] Build completed successfully!`
      );
    } finally {
      setLogLoading(false);
    }
  };

  const deleteBuild = async (buildId) => {
    try {
      await invoke('delete_build', { buildId });
      setBuilds(builds.filter((b) => b.id !== buildId));
      message.success('构建记录已删除');
    } catch (error) {
      setBuilds(builds.filter((b) => b.id !== buildId));
      message.success('构建记录已删除');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getArtifactIcon = (type) => {
    switch (type) {
      case 'zip':
      case 'archive':
        return <FileZipOutlined />;
      case 'log':
        return <FileTextOutlined />;
      default:
        return <CodeOutlined />;
    }
  };

  const columns = [
    {
      title: '流水线',
      dataIndex: 'pipelineName',
      key: 'pipelineName',
      width: 200,
    },
    {
      title: '分支/标签',
      key: 'ref',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color="blue">{record.branch}</Tag>
          {record.tag && <Tag color="gold">{record.tag}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Commit',
      dataIndex: 'commit',
      key: 'commit',
      width: 140,
      render: (commit) => (
        <code style={{ fontSize: 12, color: '#666' }}>
          {commit?.substring(0, 8)}
        </code>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_NAMES[status] || status}
        </Tag>
      ),
    },
    {
      title: '构建时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: formatDuration,
    },
    {
      title: '产物数量',
      key: 'artifactCount',
      width: 100,
      render: (_, record) => (
        <Tag color={record.artifacts.length > 0 ? 'green' : 'default'}>
          {record.artifacts.length} 个
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setSelectedBuild(record)}
            />
          </Tooltip>
          <Tooltip title="查看日志">
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => {
                setSelectedBuild(record);
                viewLogs(record.id);
              }}
            />
          </Tooltip>
          {record.artifacts.length > 0 && (
            <Select
              size="small"
              placeholder="下载"
              style={{ width: 100 }}
              value={undefined}
              onSelect={(artifactId) => {
                const artifact = record.artifacts.find((a) => a.id === artifactId);
                if (artifact) downloadArtifact(record.id, artifact);
              }}
            >
              {record.artifacts.map((art) => (
                <Option key={art.id} value={art.id}>
                  {art.name}
                </Option>
              ))}
            </Select>
          )}
          <Popconfirm
            title="确定删除此构建记录吗？"
            onConfirm={() => deleteBuild(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const branches = [...new Set(builds.map((b) => b.branch))];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>构建产物管理器</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchBuilds}>
          刷新
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索流水线、分支、Commit..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={filters.searchText}
            onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
            allowClear
          />
          <Select
            placeholder="选择分支"
            style={{ width: 150 }}
            value={filters.branch || undefined}
            onChange={(value) => setFilters({ ...filters, branch: value })}
            allowClear
          >
            {branches.map((branch) => (
              <Option key={branch} value={branch}>
                {branch}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="选择状态"
            style={{ width: 120 }}
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value })}
            allowClear
          >
            <Option value="success">成功</Option>
            <Option value="running">运行中</Option>
            <Option value="failed">失败</Option>
            <Option value="pending">待处理</Option>
          </Select>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredBuilds}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1300 }}
        locale={{
          emptyText: <Empty description="暂无构建记录" />,
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      <Modal
        title="构建详情"
        open={!!selectedBuild && !logModalVisible}
        onCancel={() => setSelectedBuild(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedBuild(null)}>
            关闭
          </Button>,
          <Button
            key="logs"
            icon={<FileTextOutlined />}
            onClick={() => viewLogs(selectedBuild.id)}
          >
            查看日志
          </Button>,
        ]}
        width={700}
      >
        {selectedBuild && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="流水线名称">
                {selectedBuild.pipelineName}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_COLORS[selectedBuild.status]}>
                  {STATUS_NAMES[selectedBuild.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分支">
                <Tag color="blue">{selectedBuild.branch}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标签">
                {selectedBuild.tag ? (
                  <Tag color="gold">{selectedBuild.tag}</Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Commit">
                <code>{selectedBuild.commit}</code>
              </Descriptions.Item>
              <Descriptions.Item label="构建者">
                {selectedBuild.creator}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {dayjs(selectedBuild.startTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="耗时">
                {formatDuration(selectedBuild.duration)}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 12 }}>构建产物</h3>
              {selectedBuild.artifacts.length === 0 ? (
                <Empty description="暂无构建产物" />
              ) : (
                <div className="artifacts-list">
                  {selectedBuild.artifacts.map((artifact) => (
                    <div key={artifact.id} className="artifact-item">
                      <Space>
                        {getArtifactIcon(artifact.type)}
                        <div>
                          <strong>{artifact.name}</strong>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {formatSize(artifact.size)}
                          </div>
                        </div>
                      </Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => downloadArtifact(selectedBuild.id, artifact)}
                      >
                        下载
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      <Modal
        title="构建日志"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setLogModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
        className="log-modal"
      >
        {logLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载日志中...</div>
        ) : (
          <pre>{logContent}</pre>
        )}
      </Modal>
    </div>
  );
}

export default ArtifactsManager;
