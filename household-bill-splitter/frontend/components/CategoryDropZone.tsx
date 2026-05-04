'use client'

import { useDrop } from 'react-dnd'
import { ItemTypes } from './DraggableBillItem'
import type { ReactNode } from 'react'

interface CategoryDropZoneProps {
  category: string
  categoryLabel: string
  onDrop: (itemId: number, billId: number, newCategory: string) => void
  children?: ReactNode
  isActive?: boolean
}

export default function CategoryDropZone({ 
  category, 
  categoryLabel, 
  onDrop, 
  children,
  isActive = false 
}: CategoryDropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BILL_ITEM,
    drop: (item: { id: number; billId: number; currentCategory: string }) => {
      if (item.currentCategory !== category) {
        onDrop(item.id, item.billId, category)
      }
      return undefined
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))

  const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
    usage: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800' },
    fee: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800' },
    surcharge: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800' },
    tax: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
    discount: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800' },
    other: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800' },
  }

  const colors = categoryColors[category] || categoryColors.other

  return (
    <div
      ref={drop}
      className={`p-4 rounded-xl border-2 transition-all min-h-[200px] ${
        isOver
          ? `${colors.bg} ${colors.border} shadow-inner`
          : canDrop
          ? `${colors.bg} ${colors.border} opacity-75`
          : `${colors.bg} ${colors.border}`
      } ${isActive ? 'ring-2 ring-primary-500' : ''}`}
    >
      <h3 className={`text-sm font-semibold mb-3 ${colors.text}`}>
        {categoryLabel}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
      {!children && (
        <p className="text-sm text-gray-400 text-center py-8">
          拖拽账单项目到这里
        </p>
      )}
    </div>
  )
}
