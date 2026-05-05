import React, { useRef, useEffect, useState } from 'react'
import { Card, Space, Typography, Empty } from 'antd'
import * as Plot from '@observablehq/plot'
import { Slide, Parameter, ChartData } from '../types'
import ParameterControls from './ParameterControls'

const { Title, Text } = Typography

interface SlidePreviewProps {
  slide: Slide
  onParameterChange: (parameterId: string, value: string | number) => void
}

const SlidePreview: React.FC<SlidePreviewProps> = ({ slide, onParameterChange }) => {
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [chartData, setChartData] = useState<Record<string, ChartData[]>>({})

  useEffect(() => {
    const sampleData: Record<string, ChartData[]> = {
      sales_data: [
        { month: 'Q1', sales: 120, target: 100 },
        { month: 'Q2', sales: 150, target: 130 },
        { month: 'Q3', sales: 180, target: 160 },
        { month: 'Q4', sales: 200, target: 180 },
      ],
      category_data: [
        { category: '电子产品', value: 35 },
        { category: '服装', value: 25 },
        { category: '食品', value: 20 },
        { category: '家居', value: 15 },
        { category: '其他', value: 5 },
      ],
      quarterly_sales: [
        { quarter: 'Q1', revenue: 125000, expenses: 85000 },
        { quarter: 'Q2', revenue: 150000, expenses: 95000 },
        { quarter: 'Q3', revenue: 180000, expenses: 110000 },
        { quarter: 'Q4', revenue: 220000, expenses: 130000 },
      ],
      category_distribution: [
        { name: '电子产品', percentage: 35 },
        { name: '服装', percentage: 25 },
        { name: '食品', percentage: 20 },
        { name: '家居', percentage: 15 },
        { name: '其他', percentage: 5 },
      ],
    }
    setChartData(sampleData)
  }, [])

  useEffect(() => {
    slide.elements.forEach((element) => {
      if (element.type === 'chart' && chartRefs.current[element.id]) {
        const container = chartRefs.current[element.id]
        if (!container) return

        while (container.firstChild) {
          container.removeChild(container.firstChild)
        }

        let plot: SVGElement | HTMLElement | null = null
        const dataSource = element.dataSource || 'sales_data'
        const data = chartData[dataSource] || []

        const params: Record<string, string | number> = {}
        slide.parameters.forEach((p) => {
          params[p.name] = p.value
        })

        if (dataSource === 'sales_data' || dataSource === 'quarterly_sales') {
          const xField = dataSource === 'sales_data' ? 'month' : 'quarter'
          const yField = dataSource === 'sales_data' ? 'sales' : 'revenue'
          
          plot = Plot.plot({
            title: element.content || '销售数据',
            marks: [
              Plot.barY(data, { x: xField, y: yField, fill: '#1890ff' }),
              Plot.ruleY([0]),
            ],
            width: container.clientWidth - 40,
            height: 300,
            style: {
              backgroundColor: '#fff',
            },
          })
        } else if (dataSource === 'category_data' || dataSource === 'category_distribution') {
          const nameField = dataSource === 'category_data' ? 'category' : 'name'
          const valueField = dataSource === 'category_data' ? 'value' : 'percentage'
          
          plot = Plot.plot({
            title: element.content || '类别分布',
            marks: [
              Plot.barX(data, { y: nameField, x: valueField, fill: '#52c41a', sort: { y: 'x', reverse: true } }),
              Plot.ruleX([0]),
            ],
            width: container.clientWidth - 40,
            height: 300,
            style: {
              backgroundColor: '#fff',
            },
          })
        }

        if (plot) {
          container.appendChild(plot)
        }
      }
    })
  }, [slide, chartData])

  const renderElement = (element: { id: string; type: string; content: string; style: Record<string, unknown> }) => {
    switch (element.type) {
      case 'text':
        return (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, lineHeight: 1.8 }}>{element.content}</Text>
          </Card>
        )
      case 'image':
        return (
          <Card size="small" style={{ marginBottom: 16 }}>
            <img
              src={element.content}
              alt="图片"
              style={{
                maxWidth: '100%',
                maxHeight: 400,
                objectFit: 'contain',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden">
              <Empty description="图片无法显示" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          </Card>
        )
      case 'chart':
        return (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div
              ref={(el) => {
                chartRefs.current[element.id] = el
              }}
              style={{ minHeight: 300 }}
            />
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div>
      {slide.parameters.length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }} title="参数控件">
          <ParameterControls parameters={slide.parameters} onChange={onParameterChange} />
        </Card>
      )}

      <div style={{ padding: 24, background: '#fff', borderRadius: 8, minHeight: 400 }}>
        <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>
          {slide.title}
        </Title>

        {slide.elements.length === 0 ? (
          <Empty description="暂无元素，请添加元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          slide.elements.map((element) => (
            <div key={element.id}>{renderElement(element)}</div>
          ))
        )}
      </div>
    </div>
  )
}

export default SlidePreview
