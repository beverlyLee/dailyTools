import React from 'react';
import Plot from 'react-plotly.js';
import { useAppStore } from '../store';

const FrequencyDomainChart: React.FC = () => {
  const { signalResponse } = useAppStore();

  if (!signalResponse) {
    return (
      <div className="chart-section">
        <h3>频域频谱</h3>
        <div className="chart-wrapper">
          <div className="empty-state">
            <p>生成信号后将显示频域频谱</p>
          </div>
        </div>
      </div>
    );
  }

  const traces: Partial<Plotly.Data>[] = [
    {
      x: signalResponse.frequency_domain.frequencies,
      y: signalResponse.frequency_domain.magnitude,
      type: 'scatter',
      mode: 'lines',
      name: '原始频谱',
      line: { color: '#667eea', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(102, 126, 234, 0.1)',
    },
  ];

  if (signalResponse.filtered_frequency_domain) {
    traces.push({
      x: signalResponse.filtered_frequency_domain.frequencies,
      y: signalResponse.filtered_frequency_domain.magnitude,
      type: 'scatter',
      mode: 'lines',
      name: '滤波后频谱',
      line: { color: '#f6ad55', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(246, 173, 85, 0.1)',
    });
  }

  const layout: Partial<Plotly.Layout> = {
    xaxis: {
      title: { text: '频率 (Hz)' },
      gridcolor: '#e2e8f0',
    },
    yaxis: {
      title: { text: '幅度' },
      gridcolor: '#e2e8f0',
    },
    legend: {
      orientation: 'h',
      xanchor: 'center',
      x: 0.5,
      y: 1.1,
    },
    margin: { t: 30, r: 20, l: 60, b: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
  };

  return (
    <div className="chart-section">
      <h3>频域频谱</h3>
      <div className="chart-wrapper">
        <Plot
          data={traces}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default FrequencyDomainChart;
