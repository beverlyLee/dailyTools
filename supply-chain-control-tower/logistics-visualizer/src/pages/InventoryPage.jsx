import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Space, Button, Select, message, Row, Col, Statistic } from 'antd';
import { ReloadOutlined, InboxOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getInventory } from '../api/logistics';

const { Option } = Select;

const statusConfig = {
  normal: { color: 'green', text: '正常' },
  low: { color: 'orange', text: '库存偏低' },
  out_of_stock: { color: 'red', text: '缺货' },
  overstock: { color: 'blue', text: '库存积压' },
};

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await getInventory();
      setInventory(response.data);
    } catch (error) {
      message.error('加载库存数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = filterStatus === 'all'
    ? inventory
    : inventory.filter((item) => item.status === filterStatus);

  const stats = {
    total: inventory.length,
    normal: inventory.filter((i) => i.status === 'normal').length,
    low: inventory.filter((i) => i.status === 'low').length,
    outOfStock: inventory.filter((i) => i.status === 'out_of_stock').length,
    overstock: inventory.filter((i) => i.status === 'overstock').length,
  };

  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '仓库',
      dataIndex: 'warehouse',
      key: 'warehouse',
    },
    {
      title: '库位',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '库存状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusConfig[status] || statusConfig.normal;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: '正常', value: 'normal' },
        { text: '库存偏低', value: 'low' },
        { text: '缺货', value: 'out_of_stock' },
        { text: '库存积压', value: 'overstock' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (currentStock, record) => {
        const percentage = (currentStock / record.maxStockLevel) * 100;
        return (
          <div className="inventory-status">
            <div className="inventory-bar">
              <div
                className={`inventory-fill ${record.status}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span style={{ minWidth: 60, textAlign: 'right' }}>
              {currentStock}
            </span>
          </div>
        );
      },
    },
    {
      title: '安全线',
      dataIndex: 'minStockLevel',
      key: 'minStockLevel',
    },
    {
      title: '最大库存',
      dataIndex: 'maxStockLevel',
      key: 'maxStockLevel',
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总SKU数"
              value={stats.total}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正常库存"
              value={stats.normal}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存偏低"
              value={stats.low}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="缺货商品"
              value={stats.outOfStock}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="库存分布"
        extra={
          <Space>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="normal">正常</Option>
              <Option value="low">库存偏低</Option>
              <Option value="out_of_stock">缺货</Option>
              <Option value="overstock">库存积压</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchInventory}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Table
          columns={columns}
          dataSource={filteredInventory}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default InventoryPage;
