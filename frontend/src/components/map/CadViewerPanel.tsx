import { useRef, useState, useCallback, useEffect } from 'react'
import {
  X, Minus, Maximize2, Minimize2,
  FolderOpen, Loader2, AlertCircle,
  FileCode2, Upload, MousePointer2,
} from 'lucide-react'
import { useCadViewer } from '@/hooks/useCadViewer'
import { clsx } from 'clsx'

interface Props {
  onClose: () => void
  /** DWG file to load automatically when the panel mounts */
  initialFile?: File | null
}

const INITIAL = { x: 80, y: 80, w: 800, h: 560 }

export function CadViewerPanel({ onClose, initialFile }: Props) {
  const cadContainerRef = useRef<HTMLDivElement>(null)
  const { status, fileName, error, openFile } = useCadViewer(cadContainerRef)
  const autoLoadedRef = useRef(false)

  // Once the engine is ready, auto-load the initialFile (if provided)
  useEffect(() => {
    if (initialFile && status === 'ready' && !autoLoadedRef.current) {
      autoLoadedRef.current = true
      openFile(initialFile)
    }
  }, [initialFile, status, openFile])

  // ── Window state ─────────────────────────────────────────────────────────
  const [pos, setPos] = useState({ x: INITIAL.x, y: INITIAL.y })
  const [size, setSize] = useState({ w: INITIAL.w, h: INITIAL.h })
  const [minimised, setMinimised] = useState(false)
  const [maximised, setMaximised] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 })

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (maximised) return
    e.preventDefault()
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [maximised, pos])

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent) => {
      setPos({
        x: Math.max(0, dragStart.current.px + e.clientX - dragStart.current.mx),
        y: Math.max(0, dragStart.current.py + e.clientY - dragStart.current.my),
      })
    }
    const up = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging])

  // ── Resize ───────────────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h }
  }, [size])

  useEffect(() => {
    if (!resizing) return
    const move = (e: MouseEvent) => {
      setSize({
        w: Math.max(500, resizeStart.current.w + e.clientX - resizeStart.current.mx),
        h: Math.max(320, resizeStart.current.h + e.clientY - resizeStart.current.my),
      })
    }
    const up = () => setResizing(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [resizing])

  // ── File drop ────────────────────────────────────────────────────────────
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) openFile(file)
  }, [openFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) openFile(file)
    e.target.value = ''
  }, [openFile])

  // ── Style ─────────────────────────────────────────────────────────────────
  const panelStyle = maximised
    ? { top: 0, left: 0, width: '100vw', height: '100vh' }
    : { top: pos.y, left: pos.x, width: size.w, height: minimised ? 'auto' : size.h }

  return (
    <div
      className={clsx(
        'absolute z-50 flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/10',
        'bg-gray-900 text-white',
        (dragging || resizing) && 'select-none',
      )}
      style={panelStyle}
    >
      {/* ── Title bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-white/10 cursor-move shrink-0"
        onMouseDown={onHeaderMouseDown}
      >
        <FileCode2 size={14} className="text-blue-400 shrink-0" />
        <span className="text-xs font-semibold flex-1 truncate">
          {fileName ?? 'CAD Viewer'}
          {fileName && (
            <span className="ml-2 text-gray-400 font-normal text-[10px] uppercase tracking-wider">
              temporary · not saved
            </span>
          )}
        </span>

        {/* Status badge */}
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0', {
          'bg-yellow-500/20 text-yellow-300': status === 'initialising',
          'bg-blue-500/20 text-blue-300':     status === 'loading',
          'bg-green-500/20 text-green-300':   status === 'ready' && fileName,
          'bg-red-500/20 text-red-300':       status === 'error',
        })}>
          {status === 'initialising' && 'Starting…'}
          {status === 'loading'      && 'Loading…'}
          {status === 'ready' && fileName && 'Loaded'}
          {status === 'error'        && 'Error'}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => setMinimised(m => !m)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
            {minimised ? <Maximize2 size={13} /> : <Minus size={13} />}
          </button>
          <button onClick={() => setMaximised(m => !m)} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
            {maximised ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-red-500/30 text-gray-400 hover:text-red-300">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      {!minimised && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-850 border-b border-white/10 shrink-0">
          {/* Open file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={status === 'initialising'}
            title="Open DWG / DXF file"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-40 transition"
          >
            <FolderOpen size={13} />
            Open file
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".dwg,.dxf"
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Navigation hint */}
          {fileName && (
            <span className="flex items-center gap-1 text-xs text-gray-500 ml-2 select-none">
              <MousePointer2 size={12} />
              Scroll to zoom · drag to pan
            </span>
          )}

          {status === 'initialising' && (
            <span className="flex items-center gap-1 text-xs text-yellow-400 ml-2">
              <Loader2 size={12} className="animate-spin" /> Initialising engine…
            </span>
          )}
          {status === 'loading' && (
            <span className="flex items-center gap-1 text-xs text-blue-400 ml-2">
              <Loader2 size={12} className="animate-spin" /> Parsing {fileName}…
            </span>
          )}
        </div>
      )}

      {/* ── CAD canvas area ───────────────────────────────────────────────── */}
      {!minimised && (
        <div
          className="flex-1 relative min-h-0"
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Drop overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-blue-600/30 border-2 border-dashed border-blue-400 rounded-b-xl pointer-events-none">
              <Upload size={28} className="text-blue-300 mb-2" />
              <p className="text-sm font-semibold text-blue-200">Drop DWG / DXF file here</p>
            </div>
          )}

          {/* Empty state */}
          {status !== 'error' && !fileName && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <FileCode2 size={40} className="text-gray-600 mb-3" />
              <p className="text-sm font-semibold text-gray-400">No file loaded</p>
              <p className="text-xs text-gray-600 mt-1">Click "Open file" or drag & drop a DWG / DXF file</p>
              <p className="text-xs text-gray-700 mt-1">Data is processed locally — nothing leaves your device</p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <AlertCircle size={32} className="text-red-400 mb-2" />
              <p className="text-sm font-semibold text-red-300">Failed to load file</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          )}

          {/* The mlightcad engine renders into this div */}
          <div
            ref={cadContainerRef}
            className="w-full h-full"
            style={{ minHeight: 200 }}
          />
        </div>
      )}

      {/* ── Resize handle ────────────────────────────────────────────────── */}
      {!minimised && !maximised && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={onResizeMouseDown}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.15) 50%)',
          }}
        />
      )}
    </div>
  )
}
