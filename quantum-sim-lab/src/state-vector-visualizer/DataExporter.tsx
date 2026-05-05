import { useState } from 'react';
import { SimulationResult } from '../types';
import './DataExporter.css';

interface DataExporterProps {
  simulationResult: SimulationResult;
}

const DataExporter: React.FC<DataExporterProps> = ({ simulationResult }) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'text'>('json');
  const [showExported, setShowExported] = useState(false);

  const exportToJson = () => {
    const data = {
      timestamp: new Date().toISOString(),
      final_state: {
        amplitudes: simulationResult.final_state.amplitudes,
        probabilities: simulationResult.final_state.probabilities,
        bloch_spheres: simulationResult.final_state.bloch_spheres,
      },
      step_count: simulationResult.step_states.length,
      probability_distribution: simulationResult.probability_distribution,
      measurement_results: simulationResult.measurement_results,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'quantum-simulation-result.json');
  };

  const exportToCsv = () => {
    let csv = '状态,振幅(实部),振幅(虚部),概率\n';
    
    simulationResult.final_state.amplitudes.forEach((amp, index) => {
      const state = index
        .toString(2)
        .padStart(simulationResult.final_state.bloch_spheres.length, '0');
      csv += `|${state}⟩,${amp.real},${amp.imag},${simulationResult.final_state.probabilities[index]}\n`;
    });

    csv += '\n\n概率分布\n';
    csv += '状态,概率\n';
    Object.entries(simulationResult.probability_distribution).forEach(([state, prob]) => {
      csv += `${state},${prob}\n`;
    });

    if (simulationResult.measurement_results.length > 0) {
      csv += '\n\n测量结果\n';
      csv += '测量序号,结果\n';
      simulationResult.measurement_results.forEach((result, index) => {
        csv += `${index + 1},${result.join('')}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, 'quantum-simulation-result.csv');
  };

  const exportToText = () => {
    let text = '=== 量子计算模拟结果 ===\n';
    text += `生成时间: ${new Date().toLocaleString()}\n\n`;
    
    text += '--- 最终量子态 ---\n';
    simulationResult.final_state.amplitudes.forEach((amp, index) => {
      const state = index
        .toString(2)
        .padStart(simulationResult.final_state.bloch_spheres.length, '0');
      const prob = (simulationResult.final_state.probabilities[index] * 100).toFixed(2);
      text += `|${state}⟩: ${amp.real >= 0 ? '+' : ''}${amp.real.toFixed(4)}${
        amp.imag >= 0 ? '+' : ''
      }${amp.imag.toFixed(4)}i (${prob}%)\n`;
    });

    text += '\n--- 布洛赫球坐标 ---\n';
    simulationResult.final_state.bloch_spheres.forEach((sphere, index) => {
      text += `q${index}: (${sphere.x.toFixed(4)}, ${sphere.y.toFixed(4)}, ${sphere.z.toFixed(4)})\n`;
    });

    text += '\n--- 概率分布 ---\n';
    Object.entries(simulationResult.probability_distribution).forEach(([state, prob]) => {
      text += `${state}: ${(prob * 100).toFixed(2)}%\n`;
    });

    if (simulationResult.measurement_results.length > 0) {
      text += `\n--- 测量统计 (${simulationResult.measurement_results.length} 次) ---\n`;
      const counts: Record<string, number> = {};
      simulationResult.measurement_results.forEach((result) => {
        const key = result.join('');
        counts[key] = (counts[key] || 0) + 1;
      });
      Object.entries(counts).forEach(([state, count]) => {
        text += `${state}: ${count} 次 (${((count / simulationResult.measurement_results.length) * 100).toFixed(2)}%)\n`;
      });
    }

    const blob = new Blob([text], { type: 'text/plain' });
    downloadFile(blob, 'quantum-simulation-result.txt');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExported(true);
    setTimeout(() => setShowExported(false), 2000);
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'json':
        exportToJson();
        break;
      case 'csv':
        exportToCsv();
        break;
      case 'text':
        exportToText();
        break;
    }
  };

  return (
    <div className="data-exporter">
      <div className="exporter-controls">
        <div className="format-selector">
          <label>导出格式:</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'text')}
            className="format-select"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="text">纯文本</option>
          </select>
        </div>

        <button onClick={handleExport} className="btn btn-primary">
          导出数据
        </button>

        {showExported && (
          <span className="export-success">✓ 已导出</span>
        )}
      </div>

      <div className="export-preview">
        <h4>数据摘要</h4>
        <div className="preview-grid">
          <div className="preview-item">
            <span className="preview-label">量子比特数:</span>
            <span className="preview-value">
              {simulationResult.final_state.bloch_spheres.length}
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">状态数量:</span>
            <span className="preview-value">
              {simulationResult.final_state.amplitudes.length}
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">模拟步骤:</span>
            <span className="preview-value">
              {simulationResult.step_states.length}
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">测量次数:</span>
            <span className="preview-value">
              {simulationResult.measurement_results.length}
            </span>
          </div>
        </div>

        <div className="format-info">
          <h5>格式说明</h5>
          <ul>
            <li>
              <strong>JSON:</strong> 完整的结构化数据，包含所有振幅、概率和布洛赫球坐标
            </li>
            <li>
              <strong>CSV:</strong> 表格格式，适合导入 Excel 或其他数据分析工具
            </li>
            <li>
              <strong>纯文本:</strong> 人类可读的格式，包含统计摘要和详细信息
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataExporter;
