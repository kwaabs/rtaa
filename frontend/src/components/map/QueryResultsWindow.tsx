import { useState, useRef, useCallback } from 'react'
import { X, Minus, Maximize2, Minimize2, MapPin, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { useQueryStore } from '@/stores/queryStore'
import { useMapStore } from '@/stores/mapStore'
import { clsx } from 'clsx'

const DEFAULT_W = 680
const DEFAULT_H = 400
const MIN_W = 400
const MIN_H = 200

function copyToClipboard(val: unknown) {
  navigator.clipboard.writeText(String(val)).catch(() => {})
}

export function QueryResultsWindow() {
  const { result, resultWindowOpen, setResultWindowOpen, setResult } = useQueryStore()
  const { flyTo, clearHighlights } = useMapStore()

  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [pos, setPos] = useState({ x: 80, y: 80 })
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (maximized) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      setPos({
        x: Math.max(0, dragRef.current.origX + ev.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.origY + ev.clientY - dragRef.current.startY),
      })
    }
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [maximized, pos])

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h }
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      setSize({
        w: Math.max(MIN_W, resizeRef.current.origW + ev.clientX - resizeRef.current.startX),
        h: Math.max(MIN_H, resizeRef.current.origH + ev.clientY - resizeRef.current.startY),
      })
    }
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [size])

  if (!resultWindowOpen || !result) return null

  const allKeys = result.rows.length > 0
    ? Object.keys(result.rows[0]).filter((k) => !k.startsWith('_') && k !== 'the_geom')
    : []

  const filtered = result.rows.filter((row) =>
    !search || allKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const av = String(a[sortCol] ?? '')
        const bv = String(b[sortCol] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    : filtered

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const handleClose = () => {
    setResultWindowOpen(false)
    setResult(null)
    clearHighlights()
  }

  const windowStyle = maximized
    ? { position: 'fixed' as const, inset: 0, width: '100%', height: '100%', zIndex: 1200 }
    : {
        position: 'fixed' as const,
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? 'auto' : size.h,
        zIndex: 1200,
      }

  return (
    <div
      style={windowStyle}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden select-none"
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 cursor-grab active:cursor-grabbing"
        onMouseDown={onDragStart}
      >
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold truncate">
            {result.display_name} — Query Results
          </div>
          <div className="text-emerald-200 text-xs">
            {result.total} row{result.total !== 1 ? 's' : ''} returned
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setMinimized((v) => !v)} className="p-1 rounded hover:bg-emerald-800/50 text-white" title={minimized ? 'Restore' : 'Minimize'}>
            {minimized ? <ChevronUp size={14} /> : <Minus size={14} />}
          </button>
          <button onClick={() => setMaximized((v) => !v)} className="p-1 rounded hover:bg-emerald-800/50 text-white" title={maximized ? 'Restore' : 'Maximize'}>
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={handleClose} className="p-1 rounded hover:bg-red-500 text-white" title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Search + info bar */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter results…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {filtered.length} / {result.total}
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0">
            {allKeys.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No results</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-gray-500 font-medium border-b border-gray-200 w-8">#</th>
                    <th className="px-2 py-1.5 text-gray-500 font-medium border-b border-gray-200 w-8">📍</th>
                    {allKeys.map((k) => (
                      <th
                        key={k}
                        className="px-2 py-1.5 text-left text-gray-600 font-medium border-b border-gray-200 cursor-pointer hover:bg-gray-200 whitespace-nowrap"
                        onClick={() => handleSort(k)}
                      >
                        {k}
                        {sortCol === k && (
                          <span className="ml-1 text-emerald-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => (
                    <>
                      <tr
                        key={idx}
                        className={clsx(
                          'border-b border-gray-50 hover:bg-emerald-50 cursor-pointer transition-colors',
                          expandedRow === idx && 'bg-emerald-50',
                        )}
                        onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      >
                        <td className="px-2 py-1 text-gray-400">{idx + 1}</td>
                        <td className="px-2 py-1 text-center">
                          {row._lng != null && row._lat != null ? (
                            <button
                              className="text-emerald-500 hover:text-emerald-700"
                              title={`Fly to ${(row._lat as number).toFixed(5)}, ${(row._lng as number).toFixed(5)}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                flyTo(row._lng as number, row._lat as number, 16)
                              }}
                            >
                              <MapPin size={12} />
                            </button>
                          ) : (
                            <button
                              className="text-gray-300 cursor-not-allowed"
                              title="Location unavailable"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MapPin size={12} />
                            </button>
                          )}
                        </td>
                        {allKeys.map((k) => (
                          <td key={k} className="px-2 py-1 max-w-[200px] truncate text-gray-700">
                            {row[k] == null ? (
                              <span className="text-gray-300">null</span>
                            ) : (
                              String(row[k])
                            )}
                          </td>
                        ))}
                      </tr>

                      {expandedRow === idx && (
                        <tr key={`expanded-${idx}`} className="bg-emerald-50">
                          <td colSpan={allKeys.length + 2} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {allKeys.map((k) => (
                                <div key={k} className="flex gap-2 items-start text-xs">
                                  <span className="text-gray-500 font-medium min-w-[120px] shrink-0">{k}</span>
                                  <span className="text-gray-800 break-all flex-1">{row[k] == null ? '—' : String(row[k])}</span>
                                  <button
                                    onClick={() => copyToClipboard(row[k])}
                                    className="text-gray-300 hover:text-emerald-600 shrink-0"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Resize handle */}
          {!maximized && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={onResizeStart}
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="text-gray-300 w-full h-full">
                <path d="M11 3l2 2-8 8-2-2zm3 3l-8 8 2 2 8-8zm-8 9l2 2 2-2H6z" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  )
}
