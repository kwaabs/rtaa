import { useState, useRef } from 'react'
import { Crosshair, CornerDownRight, X } from 'lucide-react'
import { useMapStore } from '@/stores/mapStore'

const SIDEBAR_WIDTH = 320

const EARTH_CIRCUMFERENCE = 40_075_016.686

function metersPerPixel(zoom: number, latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180
  return (EARTH_CIRCUMFERENCE * Math.cos(latRad)) / (256 * Math.pow(2, zoom))
}

function scaleDenominator(mpp: number): number {
  return mpp / 0.000264583
}

function formatScale(denom: number): string {
  if (denom < 1_000) return `1 : ${Math.round(denom).toLocaleString()}`
  if (denom < 10_000) return `1 : ${(denom / 1_000).toFixed(1)} k`
  return `1 : ${Math.round(denom / 1_000).toLocaleString()} k`
}

function fmtN(v: number, decimals = 5): string {
  return v.toFixed(decimals)
}

export default function MapStatusBar() {
  const mousePos    = useMapStore((s) => s.mousePos)
  const viewState   = useMapStore((s) => s.viewState)
  const sidebarOpen = useMapStore((s) => s.sidebarOpen)
  const flyTo       = useMapStore((s) => s.flyTo)

  const [flyOpen, setFlyOpen] = useState(false)
  const [input, setInput]   = useState('')
  const [error, setError]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const mpp        = metersPerPixel(viewState.zoom, viewState.latitude)
  const scaleDenom = scaleDenominator(mpp)
  const scaleLabel =
    mpp < 1 ? `${(mpp * 100).toFixed(1)} cm/px`
    : mpp < 1000 ? `${mpp.toFixed(1)} m/px`
    : `${(mpp / 1000).toFixed(2)} km/px`

  function handleFlySubmit(e: React.FormEvent) {
    e.preventDefault()
    const parts = input.split(/[,\s]+/).filter(Boolean)
    if (parts.length < 2) { setError('Enter: lat, lng'); return }
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (isNaN(lat) || isNaN(lng)) { setError('Invalid numbers'); return }
    if (lat < -90 || lat > 90)   { setError('Lat must be −90 to 90'); return }
    if (lng < -180 || lng > 180) { setError('Lng must be −180 to 180'); return }
    flyTo(lng, lat)
    setFlyOpen(false)
    setInput('')
    setError('')
  }

  return (
    <>
      {/* Fly-to popover */}
      {flyOpen && (
        <div
          className="absolute z-50 rounded-lg shadow-xl"
          style={{
            bottom: 36,
            left: sidebarOpen ? SIDEBAR_WIDTH + 8 : 8,
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border-strong)',
            minWidth: 260,
          }}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--panel-text)' }}>
              <Crosshair className="w-3.5 h-3.5 text-brand-400" />
              Fly to coordinates
            </span>
            <button
              onClick={() => { setFlyOpen(false); setError('') }}
              style={{ color: 'var(--panel-muted)' }}
              className="transition-colors hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form onSubmit={handleFlySubmit} className="p-3 space-y-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setError('') }}
              placeholder="Lat, Lng  e.g. 5.6037, -0.1870"
              className="w-full text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400 font-mono"
              style={{
                background: 'var(--panel-input-bg)',
                border: '1px solid var(--panel-input-border)',
                color: 'var(--panel-input-text)',
              }}
              autoFocus
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              Fly there
            </button>
          </form>
        </div>
      )}

      {/* Status bar */}
      <div
        className="absolute bottom-0 right-0 h-7 flex items-center px-2 gap-0 z-40 transition-all duration-300"
        style={{
          left: sidebarOpen ? SIDEBAR_WIDTH : 0,
          background: 'var(--statusbar-bg)',
          borderTop: '1px solid var(--statusbar-border)',
        }}
        onMouseEnter={() => useMapStore.getState().setMousePos(null)}
      >
        {/* Fly-to button */}
        <button
          onClick={() => { setFlyOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50) }}
          title="Fly to coordinates"
          className="flex items-center justify-center w-5 h-5 rounded mr-2 flex-shrink-0 transition-colors"
          style={{ color: flyOpen ? '#0ea5e9' : 'var(--statusbar-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#0ea5e9' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = flyOpen ? '#0ea5e9' : 'var(--statusbar-muted)' }}
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        {/* Coordinates */}
        <div className="flex items-center gap-1 min-w-[200px]">
          <Dot />
          <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--statusbar-text)' }}>
            {mousePos
              ? <>
                  <span style={{ color: 'var(--statusbar-muted)' }}>Lat </span>{fmtN(mousePos.lat)}
                  {'  '}
                  <span style={{ color: 'var(--statusbar-muted)' }}>Lng </span>{fmtN(mousePos.lng)}
                </>
              : <span className="italic" style={{ color: 'var(--statusbar-muted)' }}>hover map for coordinates</span>}
          </span>
        </div>

        <Sep />

        <div className="flex items-center gap-1.5">
          <Dot color="#38bdf8" />
          <span className="text-[10px] font-medium" style={{ color: 'var(--statusbar-text)' }}>EPSG:4326</span>
        </div>

        <Sep />

        <div className="flex items-center gap-1.5">
          <Dot color="#a78bfa" />
          <span className="text-[10px] font-mono" style={{ color: 'var(--statusbar-text)' }}>{formatScale(scaleDenom)}</span>
          <span className="text-[10px]" style={{ color: 'var(--statusbar-muted)' }}>({scaleLabel})</span>
        </div>

        <Sep />

        <div className="flex items-center gap-1.5">
          <Dot color="#34d399" />
          <span className="text-[10px]" style={{ color: 'var(--statusbar-muted)' }}>Z</span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--statusbar-text)' }}>{viewState.zoom.toFixed(1)}</span>
        </div>
      </div>
    </>
  )
}

function Sep() {
  return <div className="mx-2.5 h-3 w-px flex-shrink-0" style={{ background: 'var(--statusbar-border)' }} />
}

function Dot({ color }: { color?: string }) {
  return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color ?? 'var(--statusbar-muted)' }} />
}
