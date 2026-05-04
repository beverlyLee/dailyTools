'use client'

import { useState, useEffect } from 'react'
import { billApi, userApi, splitApi } from '@/lib/api'
import type { Bill, User, SplitShare } from '@/lib/types'

export default function SplitPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [strategies, setStrategies] = useState<{ name: string; description: string; params: string[] }[]>([])
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState('equal')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [ratios, setRatios] = useState<Record<number, number>>({})
  const [usages, setUsages] = useState<Record<number, number>>({})
  const [result, setResult] = useState<{ bill_id: number; strategy: string; total: number; shares: SplitShare[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [billsData, usersData, strategiesData] = await Promise.all([
        billApi.getBills(),
        userApi.getUsers(),
        splitApi.getStrategies(),
      ])
      setBills(billsData)
      setUsers(usersData)
      setStrategies(strategiesData)
      
      if (usersData.length > 0) {
        const defaultSelected = usersData.map(u => u.id)
        setSelectedUsers(defaultSelected)
        const defaultRatios: Record<number, number> = {}
        const defaultUsages: Record<number, number> = {}
        usersData.forEach(u => {
          defaultRatios[u.id] = 1
          defaultUsages[u.id] = 1
        })
        setRatios(defaultRatios)
        setUsages(defaultUsages)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      }
      return [...prev, userId]
    })
  }

  const handleRatioChange = (userId: number, value: string) => {
    setRatios(prev => ({
      ...prev,
      [userId]: parseFloat(value) || 0,
    }))
  }

  const handleUsageChange = (userId: number, value: string) => {
    setUsages(prev => ({
      ...prev,
      [userId]: parseFloat(value) || 0,
    }))
  }

  const handleCalculate = async () => {
    if (!selectedBill || selectedUsers.length === 0) return

    setLoading(true)
    setResult(null)

    try {
      const params: Record<string, any> = {}
      
      if (selectedStrategy === 'ratio') {
        const filteredRatios: Record<string, number> = {}
        selectedUsers.forEach(id => {
          filteredRatios[id.toString()] = ratios[id] || 1
        })
        params.ratios_str = JSON.stringify(filteredRatios)
      } else if (selectedStrategy === 'usage') {
        const filteredUsages: Record<string, number> = {}
        selectedUsers.forEach(id => {
          filteredUsages[id.toString()] = usages[id] || 1
        })
        params.usages_str = JSON.stringify(filteredUsages)
      }

      const response = await splitApi.calculate({
        bill_id: selectedBill.id,
        strategy: selectedStrategy,
        user_ids: selectedUsers,
        params,
      })
      setResult(response)
    } catch (error) {
      console.error('Failed to calculate split:', error)
      alert('计算失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return

    try {
      const params: Record<string, any> = {}
      
      if (selectedStrategy === 'ratio') {
        const filteredRatios: Record<string, number> = {}
        selectedUsers.forEach(id => {
          filteredRatios[id.toString()] = ratios[id] || 1
        })
        params.ratios_str = JSON.stringify(filteredRatios)
      } else if (selectedStrategy === 'usage') {
        const filteredUsages: Record<string, number> = {}
        selectedUsers.forEach(id => {
          filteredUsages[id.toString()] = usages[id] || 1
        })
        params.usages_str = JSON.stringify(filteredUsages)
      }

      await splitApi.save({
        bill_id: result.bill_id,
        strategy: result.strategy,
        user_ids: selectedUsers,
        params,
      })
      alert('分摊结果保存成功！')
      setResult(null)
    } catch (error) {
      console.error('Failed to save split:', error)
      alert('保存失败，请重试')
    }
  }

  const getStrategyLabel = (name: string) => {
    const labels: Record<string, string> = {
      equal: '平摊',
      ratio: '按比例',
      usage: '按用量',
    }
    return labels[name] || name
  }

  const getBillTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      electricity: '电费',
      water: '水费',
      gas: '燃气费',
      internet: '网费',
      rent: '房租',
      other: '其他',
    }
    return labels[type] || type
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">分摊计算</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">选择账单</h2>
            <select
              value={selectedBill?.id || ''}
              onChange={(e) => {
                const bill = bills.find(b => b.id === parseInt(e.target.value))
                setSelectedBill(bill || null)
                setResult(null)
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
            >
              <option value="">请选择账单</option>
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {getBillTypeLabel(bill.type)} - ¥{bill.amount.toFixed(2)}
                </option>
              ))}
            </select>
            
            {selectedBill && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{getBillTypeLabel(selectedBill.type)}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedBill.description || new Date(selectedBill.date).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary-600">
                    ¥{selectedBill.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">选择分摊策略</h2>
            <div className="space-y-3">
              {strategies.map((strategy) => (
                <label
                  key={strategy.name}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedStrategy === strategy.name
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.name}
                    checked={selectedStrategy === strategy.name}
                    onChange={(e) => {
                      setSelectedStrategy(e.target.value)
                      setResult(null)
                    }}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{getStrategyLabel(strategy.name)}</p>
                    <p className="text-sm text-gray-500 mt-1">{strategy.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">选择参与人</h2>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="space-y-2">
                  <label className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => {
                        handleUserToggle(user.id)
                        setResult(null)
                      }}
                      className="mr-3"
                    />
                    <span className="font-medium text-gray-900">{user.name}</span>
                    {user.email && (
                      <span className="text-sm text-gray-500 ml-2">({user.email})</span>
                    )}
                  </label>
                  
                  {selectedUsers.includes(user.id) && selectedStrategy === 'ratio' && (
                    <div className="flex items-center ml-8 py-2">
                      <span className="text-sm text-gray-600 mr-3">比例:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={ratios[user.id] || 1}
                        onChange={(e) => handleRatioChange(user.id, e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  )}

                  {selectedUsers.includes(user.id) && selectedStrategy === 'usage' && (
                    <div className="flex items-center ml-8 py-2">
                      <span className="text-sm text-gray-600 mr-3">用量:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={usages[user.id] || 1}
                        onChange={(e) => handleUsageChange(user.id, e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <span className="text-sm text-gray-500 ml-2">单位</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!selectedBill || selectedUsers.length === 0 || loading}
            className="w-full px-6 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
          >
            {loading ? '计算中...' : '计算分摊'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">计算结果</h2>
          
          {result ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-700">分摊策略</p>
                    <p className="font-medium text-green-900">{getStrategyLabel(result.strategy)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-700">总金额</p>
                    <p className="text-2xl font-bold text-green-600">¥{result.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">个人分摊明细</h3>
                <div className="space-y-3">
                  {result.shares.map((share) => {
                    const user = users.find(u => u.id === share.user_id)
                    return (
                      <div
                        key={share.user_id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{user?.name || '未知用户'}</p>
                          <p className="text-sm text-gray-500">
                            比例: {(share.ratio * 100).toFixed(1)}%
                          </p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          ¥{share.amount.toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  保存分摊结果
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg">选择账单和分摊策略后点击计算</p>
              <p className="text-sm mt-2">支持平摊、按比例、按用量三种方式</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
