import { FURNITURE_CATALOG, type FurnitureType } from './types'

interface Props {
  onClear?: () => void
}

export default function FurnitureSidebar({ onClear }: Props) {
  const types = Object.keys(FURNITURE_CATALOG) as FurnitureType[]

  return (
    <aside className="w-64 shrink-0 bg-slate-800 border-r border-slate-700 text-slate-100 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-semibold tracking-wide">3D 户型编辑器</h1>
        <p className="text-xs text-slate-400 mt-1">点击地板画墙，拖拽家具放置</p>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
          家具库
        </div>
        <div className="grid grid-cols-2 gap-3">
          {types.map((t) => {
            const cat = FURNITURE_CATALOG[t]
            return (
              <div
                key={t}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('furniture-type', t)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                className="group cursor-grab active:cursor-grabbing rounded-md border border-slate-700 bg-slate-900 hover:border-blue-400 hover:bg-slate-950 transition-colors p-3"
              >
                <div
                  className="w-full h-10 rounded mb-2 shadow-inner"
                  style={{ background: cat.color }}
                />
                <div className="text-sm text-center text-slate-200 group-hover:text-blue-300">
                  {cat.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => {
            if (window.confirm('确认清空当前所有墙体与家具？')) {
              onClear?.()
            }
          }}
          className="w-full py-2 rounded-md bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium"
        >
          清空场景
        </button>
      </div>
    </aside>
  )
}
