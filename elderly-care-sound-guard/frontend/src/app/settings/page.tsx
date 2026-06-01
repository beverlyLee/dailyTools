'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Phone, Mail, Save, Check, X, Plus, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Contact, AppSettings } from '@/types';

const relationLabels: Record<string, string> = {
  primary: '主要联系人',
  secondary: '次要联系人',
  emergency: '紧急联系人',
};

const relationColors: Record<string, string> = {
  primary: 'bg-green-900 text-green-300 border-green-700',
  secondary: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  emergency: 'bg-red-900 text-red-300 border-red-700',
};

export default function SettingsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [enableAutoNotification, setEnableAutoNotification] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await api.getContacts();
      setContacts(response.contacts);
    } catch (err) {
      console.error('加载联系人失败:', err);
    }
  };

  const handleAddContact = () => {
    const newContact: Contact = {
      name: '',
      phone: '',
      email: '',
      relation: 'primary',
    };
    setContacts([...contacts, newContact]);
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length <= 1) return;
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleUpdateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const validContacts = contacts.filter(c => c.name && c.phone);
      if (validContacts.length === 0) {
        alert('请至少添加一个有效的联系人');
        setSaving(false);
        return;
      }
      const settings: AppSettings = {
        contacts: validContacts,
        sensitivity,
        enable_auto_notification: enableAutoNotification,
      };
      await api.updateContacts(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testConnection();
      setTestResult({
        ok: result.status === 'ok',
        message: result.api_configured ? `${result.message}（AI 模型已配置）` : `${result.message}（AI 模型未配置，将使用关键词检测）`,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message: '无法连接到后端服务，请检查后端是否已启动',
      });
    } finally {
      setTesting(false);
    }
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
            <h1 className="text-xl font-bold text-white">系统设置</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                保存设置
              </>
            )}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            连接状态
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
            >
              {testing ? '测试中...' : '测试后端连接'}
            </button>
            {testResult && (
              <div className={`px-6 py-3 rounded-xl flex items-center gap-2 ${testResult.ok ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                {testResult.ok ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                {testResult.message}
              </div>
            )}
          </div>
        </section>

        <section className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-green-400" />
              紧急联系人
            </h2>
            <button
              onClick={handleAddContact}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              添加联系人
            </button>
          </div>
          <div className="space-y-4">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${relationColors[contact.relation]}`}>
                    {relationLabels[contact.relation]}
                  </span>
                  {contacts.length > 1 && (
                    <button
                      onClick={() => handleRemoveContact(index)}
                      className="p-2 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">姓名</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => handleUpdateContact(index, 'name', e.target.value)}
                      placeholder="请输入姓名"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      电话
                    </label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)}
                      placeholder="请输入电话号码"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      邮箱（可选）
                    </label>
                    <input
                      type="email"
                      value={contact.email || ''}
                      onChange={(e) => handleUpdateContact(index, 'email', e.target.value)}
                      placeholder="请输入邮箱"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-2">关系级别</label>
                  <select
                    value={contact.relation}
                    onChange={(e) => handleUpdateContact(index, 'relation', e.target.value)}
                    className="w-full md:w-auto px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-green-500 focus:outline-none transition-colors"
                  >
                    <option value="primary">主要联系人（低/中/高/紧急告警）</option>
                    <option value="secondary">次要联系人（中/高/紧急告警）</option>
                    <option value="emergency">紧急联系人（仅紧急告警）</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-300">
              <p className="font-semibold mb-1">告警级别说明：</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-200">
                <li><strong>主要联系人</strong>：接收所有级别告警</li>
                <li><strong>次要联系人</strong>：接收中、高、紧急级别告警</li>
                <li><strong>紧急联系人</strong>：仅接收最高级别的紧急告警</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-400" />
            告警设置
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-lg text-gray-300 mb-3">检测灵敏度</label>
              <div className="grid grid-cols-3 gap-4">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setSensitivity(level)}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      sensitivity === level
                        ? 'border-green-500 bg-green-900/30'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <p className="text-lg font-semibold text-white">
                      {level === 'low' ? '低' : level === 'medium' ? '中' : '高'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {level === 'low'
                        ? '减少误报，可能漏报'
                        : level === 'medium'
                        ? '平衡模式（推荐）'
                        : '减少漏报，可能误报'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-2xl">
              <div>
                <p className="text-lg font-semibold text-white">自动通知联系人</p>
                <p className="text-sm text-gray-400">检测到异常时自动发送告警通知</p>
              </div>
              <button
                onClick={() => setEnableAutoNotification(!enableAutoNotification)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  enableAutoNotification ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform ${
                    enableAutoNotification ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
