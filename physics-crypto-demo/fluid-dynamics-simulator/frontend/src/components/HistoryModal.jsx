import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  message,
  Descriptions,
  Divider,
  Empty
} from 'antd';
import { EyeOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { simulationApi } from '../services/api';

const HistoryModal = ({ visible, onClose, onLoadSnapshot }) => {
  const [simulations, setSimulations] = useState([]);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSimulations();
    }
  }, [visible]);

  const loadSimulations = async () => {
    setLoading(true);
    try {
      const response = await simulationApi.getSimulations();
      if (response.success) {
        setSimulations(response.simulations);
      }
    } catch (error) {
      message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulationClick = async (record) => {
    setSelectedSimulation(record);
    try {
      const response = await simulationApi.getSimulation(record.id);
      if (response.success) {
        setSnapshots(response.snapshots);
      }
    } catch (error) {
      message.error('加载快照列表失败');
    }
  };

  const handleDeleteSimulation = async (id, e) => {
    e.stopPropagation();
    try {
      await simulationApi.deleteSimulation(id);
      message.success('删除成功');
      loadSimulations();
      setSelectedSimulation(null);
      setSnapshots([]);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleLoadSnapshot = async (snapshotId) => {
    try {
      const gridWidth = selectedSimulation?.grid_width || 256;
      const gridHeight = selectedSimulation?.grid_height || 128;
      const response = await simulationApi.getSnapshot(snapshotId, gridWidth, gridHeight);
      if (response.success) {
        onLoadSnapshot({
          ...response,
          simulation: selectedSimulation
        });
        onClose();
        message.success('快照加载成功');
      }
    } catch (error) {
      message.error('加载快照失败');
    }
  };

  const simulationColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => text || '-'
    },
    {
      title: '雷诺数',
      dataIndex: 'reynolds_number',
      key: 'reynolds_number',
      width: 100
    },
    {
      title: '网格',
      key: 'grid',
      width: 100,
      render: (_, record) => `${record.grid_width}×${record.grid_height}`
    },
    {
      title: '障碍物',
      dataIndex: 'obstacle_type',
      key: 'obstacle_type',
      width: 80,
      render: (type) => (
        <Tag color={type === 'circle' ? 'blue' : 'green'}>
          {type === 'circle' ? '圆形' : '矩形'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleSimulationClick(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => handleDeleteSimulation(record.id, e)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const snapshotColumns = [
    {
      title: '快照 ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '步数',
      dataIndex: 'step',
      key: 'step',
      width: 100
    },
    {
      title: '时间',
      dataIndex: 'time_stamp',
      key: 'time_stamp',
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => handleLoadSnapshot(record.id)}
        >
          加载此快照
        </Button>
      )
    }
  ];

  return (
    <Modal
      title="历史记录"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <div>
        <h4 style={{ marginBottom: 16 }}>模拟记录列表</h4>
        <Table
          columns={simulationColumns}
          dataSource={simulations}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 5 }}
          onRow={(record) => ({
            onClick: () => handleSimulationClick(record),
            style: { cursor: 'pointer' }
          })}
          locale={{ emptyText: <Empty description="暂无模拟记录" /> }}
        />

        {selectedSimulation && (
          <>
            <Divider />
            <div>
              <h4 style={{ marginBottom: 16 }}>
                模拟 #{selectedSimulation.id} 的详细信息
              </h4>
              <Descriptions size="small" bordered column={2}>
                <Descriptions.Item label="雷诺数">
                  {selectedSimulation.reynolds_number}
                </Descriptions.Item>
                <Descriptions.Item label="入口速度">
                  {selectedSimulation.inlet_velocity}
                </Descriptions.Item>
                <Descriptions.Item label="网格尺寸">
                  {selectedSimulation.grid_width} × {selectedSimulation.grid_height}
                </Descriptions.Item>
                <Descriptions.Item label="障碍物类型">
                  {selectedSimulation.obstacle_type === 'circle' ? '圆形' : '矩形'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间" span={2}>
                  {selectedSimulation.created_at ? new Date(selectedSimulation.created_at).toLocaleString() : '-'}
                </Descriptions.Item>
              </Descriptions>

              <Divider>快照列表</Divider>
              <Table
                columns={snapshotColumns}
                dataSource={snapshots}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 5 }}
                locale={{ emptyText: <Empty description="暂无快照" /> }}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default HistoryModal;
