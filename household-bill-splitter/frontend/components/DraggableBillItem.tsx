'use client'

import { useDrag } from 'react-dnd'
import type { BillItem } from '@/lib/types'

interface DraggableBillItemProps {
  item: BillItem
  billId: number
}

const ItemTypes = {
  BILL_ITEM: 'bill_item',
}

export default function DraggableBillItem({ item, billId }: DraggableBillItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BILL_ITEM,
    item: {
      id: item.id,
      billId: billId,
      currentCategory: item.category,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const categoryColors: Record<string, string> = {
    usage: 'bg-blue-100 text-blue-800',
    fee: 'bg-green-100 text-green-800',
    surcharge: 'bg-yellow-100 text-yellow-800',
    tax: 'bg-red-100 text-red-800',
    discount: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800',
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
    <div
      ref={drag}
      className={`p-4 bg-white rounded-lg shadow-sm border border-gray-200 cursor-move transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md hover:border-primary-300'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{item.description}</p>
          {item.quantity && item.unit && (
            <p className="text-xs text-gray-500 mt-1">
              {item.quantity} {item.unit} × {item.unit_price?.toFixed(2)} 元
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">
            ¥{item.amount.toFixed(2)}
          </p>
          <span
            className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
              categoryColors[item.category] || categoryColors.other
            }`}
          >
            {categoryLabels[item.category] || item.category}
          </span>
        </div>
      </div>
    </div>
  )
}

export { ItemTypes }
