import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { snapshotApi } from '../api';
import { SnapshotCreate, SnapshotListResponse, SnapshotResponse } from '../types';

const SnapshotManager: React.FC = () => {
  const {
    snapshots,
    setSnapshots,
    signalResponse,
    signalParams,
    filterParams,
    setSignalResponse,
    setSignalParam,
    setFilterParam,
    loading,
    setLoading,
    error,
    setError,
  } = useAppStore();

  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);

  const loadSnapshots = useCallback(async () => {
    try {
      const data = await snapshotApi.list();
      setSnapshots(data);
    } catch (err) {
      console.error('加载快照列表失败:', err);
    }
  }, [setSnapshots]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  };

  const handleSaveSnapshot = async () => {
    if (!signalResponse) {
      setError('请先生成信号才能保存快照');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const snapshotData: SnapshotCreate = {
        name: snapshotName || `快照 ${new Date().toLocaleString('zh-CN')}`,
        description: snapshotDescription || undefined,
        signal_params: signalParams,
        filter_params: filterParams,
        time_data: signalResponse.time,
        original_signal: signalResponse.original_signal,
        filtered_signal: signalResponse.filtered_signal,
        frequency_domain: signalResponse.frequency_domain.frequencies,
        magnitude: signalResponse.frequency_domain.magnitude,
        stft_data: signalResponse.stft_data,
      };

      await snapshotApi.create(snapshotData);
      await loadSnapshots();
      setSnapshotName('');
      setSnapshotDescription('');
    } catch (err) {
      setError('保存快照失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSnapshot = async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      const snapshot: SnapshotResponse = await snapshotApi.get(id);

      Object.entries(snapshot.signal_params).forEach(([key, value]) => {
        setSignalParam(key as keyof typeof signalParams, value as never);
      });

      if (snapshot.filter_params) {
        Object.entries(snapshot.filter_params).forEach(([key, value]) => {
          setFilterParam(key as keyof typeof filterParams, value as never);
        });
      }

      setSignalResponse({
        time: snapshot.time_data,
        original_signal: snapshot.original_signal,
        filtered_signal: snapshot.filtered_signal,
        frequency_domain: {
          frequencies: snapshot.frequency,
          magnitude: snapshot.magnitude,
        },
        signal_params: snapshot.signal_params,
        filter_params: snapshot.filter_params,
        stft_data: snapshot.stft_data,
      });

      setSelectedSnapshot(id);
    } catch (err) {
      setError('加载快照失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSnapshot = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      setLoading(true);
      await snapshotApi.delete(id);
      await loadSnapshots();
      if (selectedSnapshot === id) {
        setSelectedSnapshot(null);
      }
    } catch (err) {
      setError('删除快照失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="control-section">
      <h3>快照管理</h3>

      <div className="form-group">
        <label>快照名称</label>
        <input
          type="text"
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          placeholder="输入快照名称..."
        />
      </div>

      <div className="form-group">
        <label>描述</label>
        <textarea
          value={snapshotDescription}
          onChange={(e) => setSnapshotDescription(e.target.value)}
          placeholder="输入描述..."
          rows={2}
        />
      </div>

      <div className="form-group">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveSnapshot}
          disabled={!signalResponse || loading}
        >
          保存当前快照
        </button>
      </div>

      <div className="snapshot-list">
        {snapshots.length === 0 ? (
          <div className="info-panel">
            <h4>暂无快照</h4>
            <p>生成信号后可以保存快照，方便日后复盘查看</p>
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className={`snapshot-item ${selectedSnapshot === snapshot.id ? 'selected' : ''}`}
              onClick={() => handleLoadSnapshot(snapshot.id)}
            >
              <h4>{snapshot.name}</h4>
              {snapshot.description && <p>{snapshot.description}</p>}
              <div className="meta">
                <span className="type-badge">{snapshot.signal_type}</span>
                <span className="date">{formatDate(snapshot.created_at)}</span>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-small"
                style={{ marginTop: '8px' }}
                onClick={(e) => handleDeleteSnapshot(e, snapshot.id)}
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SnapshotManager;
