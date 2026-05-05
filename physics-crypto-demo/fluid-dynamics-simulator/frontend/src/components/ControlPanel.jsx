import React, { useState } from 'react';
import {
  Form,
  InputNumber,
  Select,
  Button,
  Card,
  Row,
  Col,
  Space,
  Divider,
  Statistic,
  Tag
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  RedoOutlined,
  SaveOutlined,
  HistoryOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Option } = Select;

const ControlPanel = ({
  onInit,
  onStart,
  onPause,
  onReset,
  onSaveSnapshot,
  onShowHistory,
  isInitialized,
  isRunning,
  currentStep,
  simulationId
}) => {
  const [form] = Form.useForm();
  const [obstacleType, setObstacleType] = useState('circle');

  const handleObstacleTypeChange = (value) => {
    setObstacleType(value);
  };

  const handleInit = (values) => {
    onInit(values);
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card 
        title={
          <Space>
            <SettingOutlined />
            <span>模拟参数</span>
          </Space>
        }
        size="small"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            reynolds_number: 1000,
            inlet_velocity: 0.1,
            grid_width: 256,
            grid_height: 128,
            obstacle_type: 'circle',
            obstacle_x: 64,
            obstacle_y: 64,
            obstacle_radius: 16,
            obstacle_width: 32,
            obstacle_height: 32,
            steps_per_frame: 10,
            render_mode: 'vorticity',
            vector_density: 8
          }}
          onFinish={handleInit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="雷诺数 (Re)"
                name="reynolds_number"
                tooltip="控制流体流动的特性，值越大湍流越明显"
              >
                <InputNumber min={100} max={10000} step={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="入口速度"
                name="inlet_velocity"
                tooltip="流体入口处的速度"
              >
                <InputNumber min={0.01} max={0.5} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="网格宽度" name="grid_width">
                <InputNumber min={128} max={512} step={32} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="网格高度" name="grid_height">
                <InputNumber min={64} max={256} step={32} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>障碍物设置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="障碍物类型" name="obstacle_type">
                <Select onChange={handleObstacleTypeChange}>
                  <Option value="circle">圆形</Option>
                  <Option value="rectangle">矩形</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="中心 X" name="obstacle_x">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="中心 Y" name="obstacle_y">
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {obstacleType === 'circle' ? (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="半径" name="obstacle_radius">
                  <InputNumber min={5} step={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="宽度" name="obstacle_width">
                  <InputNumber min={10} step={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="高度" name="obstacle_height">
                  <InputNumber min={10} step={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Divider>渲染设置</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="渲染模式" name="render_mode">
                <Select>
                  <Option value="vorticity">涡量图</Option>
                  <Option value="velocity">速度矢量图</Option>
                  <Option value="both">两者都显示</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="每帧步数" name="steps_per_frame" tooltip="越大越快，越大越不流畅">
                <InputNumber min={1} max={100} step={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="矢量密度" name="vector_density" tooltip="间隔显示的网格数">
                <InputNumber min={4} max={32} step={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<RedoOutlined />} block>
              初始化模拟
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="控制按钮" size="small">
        <Row gutter={8}>
          <Col span={6}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={onStart}
              disabled={!isInitialized || isRunning}
              block
            >
              开始
            </Button>
          </Col>
          <Col span={6}>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={onPause}
              disabled={!isInitialized || !isRunning}
              block
            >
              暂停
            </Button>
          </Col>
          <Col span={6}>
            <Button
              danger
              icon={<RedoOutlined />}
              onClick={onReset}
              disabled={!isInitialized}
              block
            >
              重置
            </Button>
          </Col>
          <Col span={6}>
            <Button
              icon={<SaveOutlined />}
              onClick={onSaveSnapshot}
              disabled={!isInitialized}
              block
            >
              保存快照
            </Button>
          </Col>
        </Row>
        <Row gutter={8} style={{ marginTop: 8 }}>
          <Col span={24}>
            <Button
              icon={<HistoryOutlined />}
              onClick={onShowHistory}
              block
            >
              查看历史记录
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="状态信息" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="模拟 ID"
              value={simulationId || '-'}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="当前步数"
              value={currentStep}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>状态:</span>
              {!isInitialized ? (
                <Tag color="default">未初始化</Tag>
              ) : isRunning ? (
                <Tag color="green">运行中</Tag>
              ) : (
                <Tag color="orange">已暂停</Tag>
              )}
            </div>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};

export default ControlPanel;
