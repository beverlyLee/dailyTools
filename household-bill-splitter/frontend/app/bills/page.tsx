'use client'

import { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { billApi, userApi } from '@/lib/api'
import type { Bill, User, BillItem } from '@/lib/types'
import DraggableBillItem from '@/components/DraggableBillItem'
import CategoryDropZone from '@/components/CategoryDropZone'

const CATEGORIES = [
  { key: 'usage', label: '用量费' },
  { key: 'fee', label: '基本费' },
  { key: 'surcharge', label: '附加费' },
  { key: 'tax', label: '税费' },
  { key: 'discount', label: '优惠' },
  { key: 'other', label: '其他' },
]

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [updating, setUpdating] = useState(false)

  const [newBill, setNewBill] = useState({
    type: 'electricity',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    payer_id: 1,
    status: 'pending',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [billsData, usersData] = await Promise.all([
        billApi.getBills(),
        userApi.getUsers(),
      ])
      setBills(billsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBill = async () => {
    try {
      await billApi.createBill(newBill)
      setShowCreateModal(false)
      setNewBill({
        type: 'electricity',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        payer_id: 1,
        status: 'pending',
      })
      loadData()
    } catch (error) {
      console.error('Failed to create bill:', error)
    }
  }

  const handleDrop = async (itemId: number, billId: number, newCategory: string) => {
    setUpdating(true)
    try {
      await billApi.updateItemCategory(billId, itemId, newCategory)
      await loadData()
      if (selectedBill) {
        const updatedBills = await billApi.getBills()
        const updated = updatedBills.find(b => b.id === selectedBill.id)
        if (updated) {
          setSelectedBill(updated)
        }
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setUpdating(false)
    }
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
      split: { label: '已分摊', color: 'bg-blue-100 text-blue-800' },
      settled: { label: '已结算', color: 'bg-green-100 text-green-800' },
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">账单管理</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + 新建账单
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">账单列表</h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {bills.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    暂无账单数据
                  </div>
                ) : (
                  bills.map((bill) => (
                    <div
                      key={bill.id}
                      onClick={() => setSelectedBill(bill)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedBill?.id === bill.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getBillTypeLabel(bill.type)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {bill.description || new Date(bill.date).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ¥{bill.amount.toFixed(2)}
                          </p>
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                              getStatusLabel(bill.status).color
                            }`}
                          >
                            {getStatusLabel(bill.status).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedBill ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {getBillTypeLabel(selectedBill.type)} - 账单详情
                      </h2>
                      <p className="text-gray-500 mt-1">
                        日期: {new Date(selectedBill.date).toLocaleDateString('zh-CN')}
                      </p>
                      {selectedBill.description && (
                        <p className="text-gray-600 mt-2">{selectedBill.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ¥{selectedBill.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        付款人: {selectedBill.payer?.name || '未知'}
                      </p>
                    </div>
                  </div>
                </div>

                {updating && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center text-yellow-800">
                    正在更新分类...
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    账单项目（拖拽到对应分类）
                  </h3>
                  
                  {selectedBill.bill_items && selectedBill.bill_items.length > 0 ? (
                    <>
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">未分类项目</h4>
                        <div className="space-y-3">
                          {selectedBill.bill_items
                            .filter(item => !CATEGORIES.some(c => c.key === item.category))
                            .map((item) => (
                              <DraggableBillItem
                                key={item.id}
                                item={item}
                                billId={selectedBill.id}
                              />
                            ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CATEGORIES.map((category) => {
                          const categoryItems = selectedBill.bill_items?.filter(
                            item => item.category === category.key
                          ) || []
                          
                          return (
                            <CategoryDropZone
                              key={category.key}
                              category={category.key}
                              categoryLabel={category.label}
                              onDrop={handleDrop}
                            >
                              {categoryItems.map((item) => (
                                <DraggableBillItem
                                  key={item.id}
                                  item={item}
                                  billId={selectedBill.id}
                                />
                              ))}
                            </CategoryDropZone>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                      <p className="text-gray-500">该账单暂无明细项目</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500">点击左侧账单查看详情</p>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">新建账单</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    账单类型
                  </label>
                  <select
                    value={newBill.type}
                    onChange={(e) => setNewBill({ ...newBill, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="electricity">电费</option>
                    <option value="water">水费</option>
                    <option value="gas">燃气费</option>
                    <option value="internet">网费</option>
                    <option value="rent">房租</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    金额 (元)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBill.amount || ''}
                    onChange={(e) => setNewBill({ ...newBill, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    日期
                  </label>
                  <input
                    type="date"
                    value={newBill.date}
                    onChange={(e) => setNewBill({ ...newBill, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <input
                    type="text"
                    value={newBill.description}
                    onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="可选描述"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    付款人
                  </label>
                  <select
                    value={newBill.payer_id}
                    onChange={(e) => setNewBill({ ...newBill, payer_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateBill}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  )
}
