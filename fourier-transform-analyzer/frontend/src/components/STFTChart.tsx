import React from 'react';
import Plot from 'react-plotly.js';
import { useAppStore } from '../store';

const STFTChart: React.FC = () => {
  const { signalResponse, performSTFT } = useAppStore();

  if (!performSTFT) {
    return null;
  }

  if (!signalResponse?.stft_data) {
    return (
      <div className="chart-section">
        <h3>STFT 时频图</h3>
        <div className="chart-wrapper">
          <div className="empty-state">
            <p>启用 STFT 并生成信号后将显示时频图</p>
          </div>
        </div>
      </div>
    );
  }

  const { stft_data } = signalResponse;

  const data: Partial<Plotly.Data>[] = [
    {
      z: stft_data.magnitude_db,
      x: stft_data.times,
      y: stft_data.frequencies,
      type: 'heatmap',
      colorscale: 'Viridis',
      colorbar: {
        title: {
          text: '幅度 (dB)',
          side: 'right',
        },
      },
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    xaxis: {
      title: { text: '时间 (s)' },
      gridcolor: '#e2e8f0',
    },
    yaxis: {
      title: { text: '频率 (Hz)' },
      gridcolor: '#e2e8f0',
    },
    margin: { t: 30, r: 80, l: 60, b: 50 },
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
      <h3>STFT 时频图</h3>
      <div className="chart-wrapper">
        <Plot
          data={data}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default STFTChart;
