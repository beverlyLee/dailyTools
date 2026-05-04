import React, { useState } from 'react';
import type { Bill } from '../types';

interface BillListProps {
  bills: Bill[];
  onUpdateCategory?: (billId: number, category: string) => void;
  onDelete?: (billId: number) => void;
}

const CATEGORIES = ['餐饮', '购物', '交通', '娱乐', '居住', '医疗', '教育', '其他'];

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatAmount = (amount: number, type: 'income' | 'expense'): string => {
  const prefix = type === 'income' ? '+' : '-';
  return `${prefix}¥${Math.abs(amount).toFixed(2)}`;
};

export const BillList: React.FC<BillListProps> = ({ 
  bills, 
  onUpdateCategory,
  onDelete 
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (bills.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        color: '#999' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 15 }}>📋</div>
        <div style={{ fontSize: '1.1rem' }}>暂无账单数据</div>
        <div style={{ fontSize: '0.9rem', marginTop: 5 }}>
          请上传微信/支付宝账单 CSV 文件或使用 OCR 识别小票
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>描述</th>
            <th>金额</th>
            <th>类型</th>
            <th>分类</th>
            <th>来源</th>
            {onUpdateCategory && <th>操作</th>}
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id}>
              <td>{formatDate(bill.date)}</td>
              <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bill.description}
              </td>
              <td style={{ 
                fontWeight: 600, 
                color: bill.type === 'income' ? '#27ae60' : '#e74c3c' 
              }}>
                {formatAmount(bill.amount, bill.type)}
              </td>
              <td>
                <span className={`category-badge category-${bill.category}`}>
                  {bill.type === 'income' ? '收入' : '支出'}
                </span>
              </td>
              <td>
                {editingId === bill.id ? (
                  <select
                    value={bill.category}
                    onChange={(e) => {
                      onUpdateCategory?.(bill.id, e.target.value);
                      setEditingId(null);
                    }}
                    onBlur={() => setEditingId(null)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #667eea',
                    }}
                    autoFocus
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`category-badge category-${bill.category}`}>
                    {bill.category}
                  </span>
                )}
              </td>
              <td>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: 4, 
                  fontSize: '0.85rem',
                  backgroundColor: bill.source === 'wechat' ? '#e3f2fd' : 
                                    bill.source === 'alipay' ? '#fff3e0' : '#f3e5f5',
                  color: bill.source === 'wechat' ? '#1565c0' : 
                         bill.source === 'alipay' ? '#e65100' : '#7b1fa2'
                }}>
                  {bill.source === 'wechat' ? '微信' : 
                   bill.source === 'alipay' ? '支付宝' : 'OCR识别'}
                </span>
              </td>
              {onUpdateCategory && (
                <td>
                  {editingId !== bill.id && (
                    <>
                      <button
                        onClick={() => setEditingId(bill.id)}
                        style={{
                          padding: '4px 12px',
                          marginRight: 5,
                          border: 'none',
                          borderRadius: 4,
                          backgroundColor: '#e3f2fd',
                          color: '#1565c0',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        编辑
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这条账单吗？')) {
                              onDelete(bill.id);
                            }
                          }}
                          style={{
                            padding: '4px 12px',
                            border: 'none',
                            borderRadius: 4,
                            backgroundColor: '#ffebee',
                            color: '#c62828',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          删除
                        </button>
                      )}
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
