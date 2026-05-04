'use client'

import { useState, useEffect } from 'react'
import { settlementApi, userApi } from '@/lib/api'
import type { Balance, Transfer, Settlement, User } from '@/lib/types'

export default function SettlementPage() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [billIds, setBillIds] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [settlementsData, usersData] = await Promise.all([
        settlementApi.getSettlements(),
        userApi.getUsers(),
      ])
      setSettlements(settlementsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleCalculate = async () => {
    setLoading(true)
    try {
      const result = await settlementApi.calculateAll()
      setBalances(result.balances)
      setTransfers(result.transfers)
      setBillIds(result.bill_ids)
    } catch (error) {
      console.error('Failed to calculate settlement:', error)
      alert('计算失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (transfers.length === 0) return

    setSaving(true)
    try {
      await settlementApi.save({
        transfers: transfers,
        bill_ids: billIds.map(id => parseInt(id)),
      })
      alert('清算方案保存成功！')
      await loadData()
      setBalances([])
      setTransfers([])
      setBillIds([])
    } catch (error) {
      console.error('Failed to save settlement:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (id: number) => {
    try {
      await settlementApi.markPaid(id)
      await loadData()
    } catch (error) {
      console.error('Failed to mark as paid:', error)
      alert('操作失败，请重试')
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: '已付款', color: 'bg-green-100 text-green-800' },
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
  }

  const getUserById = (id: number) => {
    return users.find(u => u.id === id)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">债务清算</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">最小现金流算法</h2>
            <p className="text-sm text-gray-500 mt-1">
              自动计算最优转账方案，确保最少的转账次数
            </p>
          </div>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? '计算中...' : '计算清算方案'}
          </button>
        </div>
      </div>

      {balances.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">债务余额</h2>
            <div className="space-y-3">
              {balances.map((balance, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-4 rounded-lg ${
                    balance.amount > 0
                      ? 'bg-green-50 border border-green-200'
                      : balance.amount < 0
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        balance.amount > 0
                          ? 'bg-green-200 text-green-800'
                          : balance.amount < 0
                          ? 'bg-red-200 text-red-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {balance.amount > 0 ? '+' : balance.amount < 0 ? '-' : '='}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {balance.user_name || getUserById(balance.user_id)?.name || '未知用户'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {balance.amount > 0
                          ? '应收款'
                          : balance.amount < 0
                          ? '应付款'
                          : '已结清'}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      balance.amount > 0
                        ? 'text-green-600'
                        : balance.amount < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {balance.amount > 0 ? '+' : ''}¥{Math.abs(balance.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">最优转账方案</h2>
              <span className="text-sm text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                {transfers.length} 次转账
              </span>
            </div>
            
            {transfers.length > 0 ? (
              <div className="space-y-4">
                {transfers.map((transfer, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-center">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-red-600 font-medium">出</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            {transfer.from_user_name || getUserById(transfer.from_user_id)?.name || '未知用户'}
                          </p>
                        </div>
                        
                        <div className="mx-6 text-center">
                          <div className="text-2xl font-bold text-primary-600">
                            ¥{transfer.amount.toFixed(2)}
                          </div>
                          <div className="flex items-center justify-center mt-1">
                            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-green-600 font-medium">入</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            {transfer.to_user_name || getUserById(transfer.to_user_id)?.name || '未知用户'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {saving ? '保存中...' : '保存清算方案'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>无需转账，所有债务已结清</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">历史清算记录</h2>
        
        {settlements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">转出人</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">转入人</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">金额</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">状态</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">创建时间</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">
                        {settlement.from_user?.name || getUserById(settlement.from_user_id)?.name || '未知用户'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">
                        {settlement.to_user?.name || getUserById(settlement.to_user_id)?.name || '未知用户'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-lg font-bold text-gray-900">
                        ¥{settlement.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                          getStatusLabel(settlement.status).color
                        }`}
                      >
                        {getStatusLabel(settlement.status).label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(settlement.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-3 px-4">
                      {settlement.status === 'pending' && (
                        <button
                          onClick={() => handleMarkPaid(settlement.id)}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          标记已付款
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>暂无清算记录</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">算法说明</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>最小现金流算法</strong>：该算法的核心思想是每次选择最大的债务人和最大的债权人进行转账，
            直到所有债务结清。这样可以确保转账次数最少（N-1次，其中N是不同余额的人数）。
          </p>
          <p>
            <strong>举例说明</strong>：如果有3个人，A欠B 100元，B欠C 100元，C欠A 100元。
            传统方式需要3次转账，但使用最小现金流算法可以发现所有债务相互抵消，无需任何转账。
          </p>
        </div>
      </div>
    </div>
  )
}
