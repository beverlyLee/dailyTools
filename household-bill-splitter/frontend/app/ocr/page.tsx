'use client'

import { useState, useRef } from 'react'
import { ocrApi, billApi, userApi } from '@/lib/api'
import type { OCRResult, User } from '@/lib/types'

export default function OCRPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [showCreateBill, setShowCreateBill] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useState(() => {
    userApi.getUsers().then(setUsers).catch(console.error)
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRecognize = async () => {
    if (!selectedFile) return
    
    setLoading(true)
    try {
      const response = await ocrApi.uploadImage(selectedFile)
      setResult(response.result)
    } catch (error) {
      console.error('OCR recognition failed:', error)
      alert('识别失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBill = async () => {
    if (!result) return
    
    try {
      const bill = await billApi.createBill({
        type: result.bill_type,
        amount: result.total_amount,
        date: new Date().toISOString().split('T')[0],
        description: `OCR识别: ${result.bill_type}账单`,
        payer_id: users[0]?.id || 1,
        status: 'pending',
        bill_items: result.items.map((item, index) => ({
          id: index,
          bill_id: 0,
          category: item.category,
          description: item.description,
          amount: item.amount,
          created_at: '',
          updated_at: '',
        })),
      })
      setShowCreateBill(false)
      alert('账单创建成功！')
    } catch (error) {
      console.error('Failed to create bill:', error)
      alert('创建账单失败')
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

  const categoryLabels: Record<string, string> = {
    usage: '用量费',
    fee: '基本费',
    surcharge: '附加费',
    tax: '税费',
    discount: '优惠',
    other: '其他',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">OCR 账单识别</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">上传账单图片</h2>
          
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
          >
            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg object-contain"
                />
                <p className="text-sm text-gray-500">点击更换图片</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-700 font-medium">点击上传账单图片</p>
                  <p className="text-sm text-gray-500 mt-1">支持 JPG、PNG 格式</p>
                </div>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="mt-6">
            <button
              onClick={handleRecognize}
              disabled={!selectedFile || loading}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  识别中...
                </span>
              ) : (
                '开始识别'
              )}
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 上传水电煤账单的清晰图片</li>
              <li>• 系统将自动识别账单类型和金额</li>
              <li>• 识别结果可直接创建为账单</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">识别结果</h2>
          
          {result ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">账单类型</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {getBillTypeLabel(result.bill_type)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-500">总金额</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ¥{result.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              {result.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">明细项目</h3>
                  <div className="space-y-2">
                    {result.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <span className="text-xs text-gray-500">
                            {categoryLabels[item.category] || item.category}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ¥{item.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleCreateBill}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  创建账单
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">识别结果将显示在这里</p>
              <p className="text-sm mt-2">上传图片并点击开始识别</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">支持的账单类型</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { type: 'electricity', label: '电费', icon: '⚡' },
            { type: 'water', label: '水费', icon: '💧' },
            { type: 'gas', label: '燃气费', icon: '🔥' },
            { type: 'internet', label: '网费', icon: '📶' },
            { type: 'rent', label: '房租', icon: '🏠' },
            { type: 'other', label: '其他', icon: '📄' },
          ].map((item) => (
            <div
              key={item.type}
              className="p-4 bg-gray-50 rounded-lg text-center"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="text-sm font-medium text-gray-700 mt-2">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
