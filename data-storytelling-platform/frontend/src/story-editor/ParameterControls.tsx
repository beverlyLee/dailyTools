import React from 'react'
import { Slider, Select, Space, Typography } from 'antd'
import { Parameter } from '../types'

const { Text } = Typography

interface ParameterControlsProps {
  parameters: Parameter[]
  onChange: (parameterId: string, value: string | number) => void
}

const ParameterControls: React.FC<ParameterControlsProps> = ({ parameters, onChange }) => {
  if (parameters.length === 0) {
    return null
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {parameters.map((parameter) => (
        <div key={parameter.id}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {parameter.label}
          </Text>
          {parameter.type === 'slider' && (
            <Slider
              min={parameter.min || 0}
              max={parameter.max || 100}
              step={parameter.step || 1}
              value={typeof parameter.value === 'number' ? parameter.value : 0}
              onChange={(value) => onChange(parameter.id, value)}
              marks={{
                [parameter.min || 0]: `${parameter.min || 0}`,
                [parameter.max || 100]: `${parameter.max || 100}`,
              }}
            />
          )}
          {parameter.type === 'dropdown' && (
            <Select
              style={{ width: '100%' }}
              value={parameter.value}
              onChange={(value) => onChange(parameter.id, value)}
              options={parameter.options?.map((opt) => ({
                label: opt.label,
                value: opt.value,
              }))}
            />
          )}
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            当前值: {parameter.value}
          </Text>
        </div>
      ))}
    </Space>
  )
}

export default ParameterControls
