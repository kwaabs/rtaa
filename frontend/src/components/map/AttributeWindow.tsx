import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Minus, Maximize2, Minimize2, Copy, Check, Search } from 'lucide-react'
import { usePopupStore } from '@/stores/popupStore'
import { useAttrs } from '@/hooks/useFeatures'
import { cn } from '@/lib/utils'

type Tab = 'key' | 'all' | 'cond'

const DEFAULT_W = 460
const DEFAULT_H = 400   // capped height — user can resize taller if needed
const MIN_W = 320
const MIN_H = 180

/** Fields that belong on the Condition tab */
function isConditionField(key: string): boolean {
  const k = key.toLowerCase()
  return k === 'condition' || k.includes('condition') || k.startsWith('cv_') || k.startsWith('cv')
}

export default function AttributeWindow() {
  const { popup, closePopup } = usePopupStore()

  const [pos, setPos] = useState({ x: 60, y: 80 })
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [tab, setTab] = useState<Tab>('key')
  const [search, setSearch] = useState('')

  // Reset position when a new feature opens
  const prevLayerRef = useRef<string | null>(null)
  useEffect(() => {
    if (popup && popup.layerName !== prevLayerRef.current) {
      prevLayerRef.current = popup.layerName
      setMinimized(false)
      setTab('key')
      setSearch('')
    }
  }, [popup?.layerName])

  if (!popup) return null

  return (
    <WindowShell
      popup={popup}
      pos={pos} setPos={setPos}
      size={size} setSize={setSize}
      minimized={minimized} setMinimized={setMinimized}
      maximized={maximized} setMaximized={setMaximized}
      onClose={closePopup}
    >
      {!minimized && (
        <WindowBody
          popup={popup}
          tab={tab} setTab={setTab}
          search={search} setSearch={setSearch}
          height={maximized ? undefined : size.h - 44}
        />
      )}
    </WindowShell>
  )
}

// ─── Shell (drag + resize + chrome) ──────────────────────────────────────────

interface ShellProps {
  popup: import('@/stores/popupStore').PopupInfo
  pos: { x: number; y: number }
  setPos: (p: { x: number; y: number }) => void
  size: { w: number; h: number }
  setSize: (s: { w: number; h: number }) => void
  minimized: boolean
  setMinimized: (v: boolean) => void
  maximized: boolean
  setMaximized: (v: boolean) => void
  onClose: () => void
  children: React.ReactNode
}

function WindowShell({
  popup, pos, setPos, size, setSize,
  minimized, setMinimized, maximized, setMaximized,
  onClose, children,
}: ShellProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)

  const onTitlePointerDown = useCallback((e: React.PointerEvent) => {
    if (maximized) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  }, [maximized, pos])

  const onTitlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
  }, [setPos])

  const onTitlePointerUp = useCallback(() => { dragRef.current = null }, [])

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h }
  }, [size])

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return
    const dw = e.clientX - resizeRef.current.startX
    const dh = e.clientY - resizeRef.current.startY
    setSize({
      w: Math.max(MIN_W, resizeRef.current.origW + dw),
      h: Math.max(MIN_H, resizeRef.current.origH + dh),
    })
  }, [setSize])

  const onResizePointerUp = useCallback(() => { resizeRef.current = null }, [])

  const color = popup.accentColor

  const style = maximized
    ? { inset: 8 }
    : { left: pos.x, top: pos.y, width: size.w, height: minimized ? 'auto' : size.h }

  return (
    <div
      className="absolute z-50 flex flex-col rounded-xl shadow-2xl shadow-black/60 border border-white/10 bg-[#0f1117] overflow-hidden select-none"
      style={style}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-move flex-shrink-0"
        style={{ borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
      >
        {/* Accent dot */}
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/20" style={{ background: color }} />

        {/* Title */}
        <span className="flex-1 text-white text-xs font-semibold truncate" title={popup.displayName}>
          {popup.displayName}
        </span>

        {/* Object ID chip */}
        {popup.properties['objectid'] != null && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/8 text-gray-400 flex-shrink-0">
            #{String(popup.properties['objectid'])}
          </span>
        )}

        {/* Window controls */}
        <div className="flex items-center gap-1 ml-1 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <WinBtn onClick={() => setMinimized((v) => !v)} title={minimized ? 'Restore' : 'Minimise'}>
            <Minus className="w-3 h-3" />
          </WinBtn>
          <WinBtn onClick={() => setMaximized((v) => !v)} title={maximized ? 'Restore' : 'Maximise'}>
            {maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </WinBtn>
          <WinBtn onClick={onClose} title="Close" danger>
            <X className="w-3 h-3" />
          </WinBtn>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={maximized ? { minHeight: 0 } : { height: size.h - 44 }}
        >
          {children}
        </div>
      )}

      {/* Resize handle */}
      {!minimized && !maximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        >
          <svg viewBox="0 0 10 10" className="w-3 h-3 absolute bottom-1 right-1 text-white/20">
            <path d="M9 1L1 9M5 1L1 5M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

function WinBtn({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-5 h-5 flex items-center justify-center rounded transition-colors',
        danger
          ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/15'
          : 'text-gray-500 hover:text-white hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

// ─── Body (tabs + content) ────────────────────────────────────────────────────

const SKIP_GEOM = new Set([
  'the_geom', 'geom', 'shape', 'geometry', 'wkb_geometry', 'gdb_geomattr_data',
  'shape_length', 'shape_area',
  'ogc_fid',
])

interface BodyProps {
  popup: import('@/stores/popupStore').PopupInfo
  tab: Tab
  setTab: (t: Tab) => void
  search: string
  setSearch: (s: string) => void
  height?: number
}

function WindowBody({ popup, tab, setTab, search, setSearch, height }: BodyProps) {
  const objectId = popup.properties['objectid'] ?? popup.properties['OBJECTID']
  const numericId = objectId != null ? Number(objectId) : null

  const { data: rows, isLoading } = useAttrs(popup.layerName, {
    ids: numericId != null ? [numericId] : undefined,
    enabled: numericId != null,
  })

  const fullProps: Record<string, unknown> =
    rows?.[0] ?? popup.properties

  const spec = popup.popupSpec as Record<string, string>
  const keyEntries: [string, string, unknown][] = Object.entries(spec)
    .map(([f, label]): [string, string, unknown] => [f, label, fullProps[f]])
    .filter(([, , v]) => v != null && v !== '')

  // Split entries: condition/cv fields → own tab; rest → All tab
  const rawEntries: [string, unknown][] = Object.entries(fullProps)
    .filter(([k, v]) => !SKIP_GEOM.has(k) && v != null && v !== '')

  const condEntries = rawEntries.filter(([k]) => isConditionField(k))
  const allEntries  = rawEntries.filter(([k]) => !isConditionField(k))

  const filtered = allEntries.filter(([k, v]) => {
    if (!search) return true
    const q = search.toLowerCase()
    return k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
  })

  const color = popup.accentColor

  const tabs: [Tab, string][] = [
    ['key',  'Key Fields'],
    ['all',  `All (${allEntries.length})`],
    ...(condEntries.length > 0 ? [['cond', `Condition (${condEntries.length})`] as [Tab, string]] : []),
  ]

  return (
    <>
      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 pt-2 flex-shrink-0 border-b border-white/6">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
              tab === t
                ? 'text-white border-current'
                : 'text-gray-500 border-transparent hover:text-gray-300',
            )}
            style={tab === t ? { borderColor: color } : {}}
          >
            {label}
          </button>
        ))}

        {/* Search box — only on All tab */}
        {tab === 'all' && (
          <div className="ml-auto flex items-center gap-1.5 mb-1">
            <Search className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              className="text-xs bg-white/6 border border-white/10 rounded px-2 py-0.5 text-white placeholder-gray-600 w-28 focus:outline-none focus:border-white/20"
            />
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="px-4 py-3 space-y-2">
          {[80, 60, 90, 50].map((w, i) => (
            <div key={i} className="h-3 rounded bg-white/6 animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {/* Key Fields tab */}
      {!isLoading && tab === 'key' && (
        <div className="flex-1 overflow-y-auto p-3">
          {keyEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-xs">No key fields configured for this layer.</p>
              <button onClick={() => setTab('all')} className="mt-2 text-xs underline" style={{ color }}>
                View all attributes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {keyEntries.map(([field, label, value]) => {
                const display = String(value)
                const wide = display.length > 20 || label.length > 16
                return (
                  <div
                    key={field}
                    className={cn('rounded-lg p-2.5 bg-white/[0.04] border border-white/8', wide && 'col-span-2')}
                  >
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color }}>
                      {label}
                    </p>
                    <p className="text-white text-sm font-medium leading-snug break-words">{display}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* All Attributes tab */}
      {!isLoading && tab === 'all' && (
        <AttributeTable rows={filtered} color={color} />
      )}

      {/* Condition / CV tab */}
      {!isLoading && tab === 'cond' && (
        <AttributeTable rows={condEntries} color={color} />
      )}
    </>
  )
}

function AttributeTable({ rows, color }: { rows: [string, unknown][]; color: string }) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-xs text-center py-6">No attributes</p>
  }
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0f1117]">
            <tr>
              <th className="text-left px-4 py-2 text-gray-500 font-medium text-[10px] uppercase tracking-wider border-b border-white/6 w-2/5">
                Attribute
              </th>
              <th className="text-left px-4 py-2 text-gray-500 font-medium text-[10px] uppercase tracking-wider border-b border-white/6">
                Value
              </th>
              <th className="w-8 border-b border-white/6" />
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, value], i) => (
              <TableRow key={key} field={key} value={value} even={i % 2 === 0} color={color} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableRow({ field, value, even, color }: {
  field: string; value: unknown; even: boolean; color: string
}) {
  const [copied, setCopied] = useState(false)
  const display = value == null ? '—' : String(value)
  const isSpec = field === 'objectid' || field === 'globalid'

  function copy() {
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <tr className={cn('group hover:bg-white/[0.04] transition-colors', even ? 'bg-transparent' : 'bg-white/[0.02]')}>
      <td className="px-4 py-2 align-top">
        <span
          className={cn('font-medium capitalize', isSpec ? 'font-mono' : '')}
          style={{ color: isSpec ? color : undefined }}
        >
          {isSpec ? field : field.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="px-4 py-2 text-gray-300 break-all align-top">
        {display}
      </td>
      <td className="px-2 py-2 align-top">
        <button
          onClick={copy}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy"
        >
          {copied
            ? <Check className="w-3 h-3 text-green-400" />
            : <Copy className="w-3 h-3 text-gray-500 hover:text-white" />}
        </button>
      </td>
    </tr>
  )
}
