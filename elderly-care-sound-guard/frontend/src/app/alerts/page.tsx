'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, CheckCircle, AlertTriangle, Users, Clock, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert } from '@/types';

const levelColors: Record<string, string> = {
  low: 'bg-blue-900/50 text-blue-300 border-blue-700',
  medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  high: 'bg-orange-900/50 text-orange-300 border-orange-700',
  critical: 'bg-red-900/50 text-red-300 border-red-700',
};

const levelLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

const soundLabels: Record<string, string> = {
  fall: '跌倒',
  cry: '哭泣',
  scream: '呼救',
  unknown: '未知',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.getAlerts();
      setAlerts(response.alerts);
    } catch (err) {
      console.error('加载告警历史失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (alertId: string) => {
    try {
      await api.resolveAlert(alertId);
      loadAlerts();
    } catch (err) {
      console.error('标记已解决失败:', err);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-400" />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-yellow-400" />
              告警历史
            </h1>
          </div>
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="p-2 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-6 h-6 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {alerts.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-800 rounded-full mb-6">
              <Bell className="w-12 h-12 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">暂无告警记录</h2>
            <p className="text-gray-400 mb-8">系统尚未检测到任何异常声音事件</p>
            <Link
              href="/kiosk"
              className="inline-block px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
            >
              启动安全监护
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.alert_id}
                className={`bg-gray-900 rounded-2xl border ${alert.resolved ? 'border-gray-700 opacity-70' : 'border-gray-800'}`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border ${levelColors[alert.level]}`}>
                        {alert.resolved ? (
                          <CheckCircle className="w-8 h-8" />
                        ) : (
                          <AlertTriangle className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{alert.message}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${levelColors[alert.level]}`}>
                            {levelLabels[alert.level]}级别
                          </span>
                          {alert.resolved && (
                            <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm font-semibold">
                              已处理
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-gray-400">
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatTime(alert.timestamp)}
                          </span>
                          <span>声音类型: {soundLabels[alert.sound_type]}</span>
                          {alert.confidence && (
                            <span>置信度: {Math.round(alert.confidence * 100)}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <button
                        onClick={() => handleResolve(alert.alert_id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        标记已处理
                      </button>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      通知的联系人:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {alert.contacts.map((contact, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 bg-gray-800 rounded-xl"
                        >
                          <span className="font-semibold text-white">{contact.name}</span>
                          <span className="text-gray-400 ml-2">{contact.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
