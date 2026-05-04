import React, { useCallback } from 'react';
import { useAppStore } from './store';
import { signalApi } from './api';

import SignalGenerator from './components/SignalGenerator';
import FilterControl from './components/FilterControl';
import STFTControl from './components/STFTControl';
import TimeDomainChart from './components/TimeDomainChart';
import FrequencyDomainChart from './components/FrequencyDomainChart';
import STFTChart from './components/STFTChart';
import SnapshotManager from './components/SnapshotManager';

function App() {
  const {
    signalParams,
    filterParams,
    performSTFT,
    stftWindowSize,
    stftOverlap,
    setSignalResponse,
    loading,
    setLoading,
    error,
    setError,
  } = useAppStore();

  const handleGenerateSignal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await signalApi.generateAndAnalyze({
        signal_params: signalParams,
        filter_params: filterParams.filter_type !== 'none' ? filterParams : undefined,
        perform_stft: performSTFT,
        stft_window_size: stftWindowSize,
        stft_overlap: stftOverlap,
      });

      setSignalResponse(response);
    } catch (err) {
      setError('生成信号失败，请检查后端服务是否启动');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    signalParams,
    filterParams,
    performSTFT,
    stftWindowSize,
    stftOverlap,
    setLoading,
    setError,
    setSignalResponse,
  ]);

  return (
    <div className="app-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <header className="app-header">
        <h1>傅里叶变换信号分析器</h1>
        <p>交互式信号生成、傅里叶变换分析与实时滤波演示</p>
      </header>

      <div className="main-content">
        <aside className="control-panel">
          {error && <div className="error-message">{error}</div>}

          <SignalGenerator />
          <FilterControl />
          <STFTControl />

          <div className="control-section">
            <div className="form-group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateSignal}
                disabled={loading}
              >
                生成信号并分析
              </button>
            </div>
          </div>

          <SnapshotManager />
        </aside>

        <main className="charts-container">
          <TimeDomainChart />
          <FrequencyDomainChart />
          <STFTChart />
        </main>
      </div>
    </div>
  );
}

export default App;
