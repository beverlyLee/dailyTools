import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetConfig, ChartDataPoint, ChartType } from '../types';
import { ChartComponent } from './ChartComponent';
import { Card, Button, Select, Space, message, Row, Col, Tag } from 'antd';
import { DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useLayout } from '../context/LayoutContext';

interface SortableWidgetProps {
  id: string;
  widget: WidgetConfig;
  data: ChartDataPoint[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WidgetConfig>) => void;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({
  id,
  widget,
  data,
  onRemove,
  onUpdate
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    height: '100%',
    padding: '8px'
  };

  const sizeToSpan: Record<WidgetConfig['size'], { xs: number; md: number; lg: number }> = {
    small: { xs: 24, md: 12, lg: 8 },
    medium: { xs: 24, md: 12, lg: 12 },
    large: { xs: 24, md: 24, lg: 24 }
  };

  const chartHeight: Record<WidgetConfig['size'], number> = {
    small: 200,
    medium: 300,
    large: 400
  };

  const chartTypeOptions = [
    { value: 'line' as ChartType, label: '折线图' },
    { value: 'bar' as ChartType, label: '柱状图' },
    { value: 'pie' as ChartType, label: '饼图' },
    { value: 'area' as ChartType, label: '面积图' }
  ];

  const sizeOptions = [
    { value: 'small' as const, label: '小' },
    { value: 'medium' as const, label: '中' },
    { value: 'large' as const, label: '大' }
  ];

  const span = sizeToSpan[widget.size];

  return (
    <Col
      ref={setNodeRef as React.Ref<HTMLDivElement>}
      xs={span.xs}
      md={span.md}
      lg={span.lg}
      style={style}
    >
      <Card
        style={{ height: '100%', borderRadius: 8 }}
        styles={{
          header: { padding: '12px 16px' },
          body: { padding: '12px', height: 'calc(100% - 57px)' }
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500 }}>{widget.title}</span>
              <Space size={[4]}>
                {widget.dataKeys.slice(0, 3).map((key, index) => (
                  <Tag key={key} color="blue" style={{ margin: 0, fontSize: 11 }}>
                    {key}
                  </Tag>
                ))}
                {widget.dataKeys.length > 3 && (
                  <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
                    +{widget.dataKeys.length - 3}
                  </Tag>
                )}
              </Space>
            </div>
            <Button
              type="text"
              icon={<DragOutlined />}
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', color: '#bfbfbf' }}
            />
          </div>
        }
        extra={
          <Space size="small" wrap>
            <Select
              value={widget.chartType}
              onChange={(value) => onUpdate(widget.id, { chartType: value })}
              options={chartTypeOptions}
              style={{ width: 80 }}
              size="small"
            />
            <Select
              value={widget.size}
              onChange={(value) => onUpdate(widget.id, { size: value })}
              options={sizeOptions}
              style={{ width: 60 }}
              size="small"
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onRemove(widget.id)}
              size="small"
            />
          </Space>
        }
      >
        <ChartComponent
          type={widget.chartType}
          data={data}
          dataKeys={widget.dataKeys}
          labelKey={widget.labelKey}
          height={chartHeight[widget.size]}
        />
      </Card>
    </Col>
  );
};

interface DashboardGridProps {
  data: ChartDataPoint[];
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ data }) => {
  const { config, removeWidget, updateWidget, reorderWidgets } = useLayout();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderWidgets(active.id as string, over.id as string);
    }
  };

  const widgetIds = config.widgets.map(w => w.id);

  const handleRemove = (id: string) => {
    removeWidget(id);
    message.success('组件已移除');
  };

  const handleUpdate = (id: string, updates: Partial<WidgetConfig>) => {
    updateWidget(id, updates);
  };

  if (config.widgets.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
          backgroundColor: '#fafafa',
          borderRadius: 8,
          border: '2px dashed #d9d9d9'
        }}
      >
        <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
          <p style={{ fontSize: 16, marginBottom: 8, color: '#595959' }}>暂无图表组件</p>
          <p style={{ fontSize: 14 }}>请点击顶部"添加图表"按钮创建可视化</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
        <Row gutter={[16, 16]}>
          {config.widgets.map((widget) => (
            <SortableWidget
              key={widget.id}
              id={widget.id}
              widget={widget}
              data={data}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
            />
          ))}
        </Row>
      </SortableContext>
    </DndContext>
  );
};
