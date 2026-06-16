import { useState, useRef } from 'react'
import { Crosshair, CornerDownRight, X } from 'lucide-react'
import { useMapStore } from '@/stores/mapStore'

const SIDEBAR_WIDTH = 320 // must match --sidebar-width in index.css

const EARTH_CIRCUMFERENCE = 40_075_016.686

function metersPerPixel(zoom: number, latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180
  return (EARTH_CIRCUMFERENCE * Math.cos(latRad)) / (256 * Math.pow(2, zoom))
}

function scaleDenominator(mpp: number): number {
  return mpp / 0.000264583 // 96 dpi
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
          className="absolute z-50 rounded-lg border border-white/10 shadow-xl"
          style={{
            bottom: 36,
            left: sidebarOpen ? SIDEBAR_WIDTH + 8 : 8,
            background: 'rgba(10,12,18,0.95)',
            backdropFilter: 'blur(8px)',
            minWidth: 260,
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-brand-400" />
              Fly to coordinates
            </span>
            <button onClick={() => { setFlyOpen(false); setError('') }}
              className="text-gray-500 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <form onSubmit={handleFlySubmit} className="p-3 space-y-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setError('') }}
              placeholder="Lat, Lng  e.g. 5.6037, -0.1870"
              className="w-full text-xs bg-white/6 border border-white/10 rounded px-2.5 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50 font-mono"
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
          background: 'rgba(10,12,18,0.85)',
          backdropFilter: 'blur(4px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
        // pointer-events-auto so hovering the bar doesn't move coordinates
        onMouseEnter={() => useMapStore.getState().setMousePos(null)}
      >
        {/* Fly-to button */}
        <button
          onClick={() => { setFlyOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50) }}
          title="Fly to coordinates"
          className={`flex items-center justify-center w-5 h-5 rounded mr-2 flex-shrink-0 transition-colors
            ${flyOpen ? 'text-brand-400 bg-brand-500/15' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        {/* Coordinates */}
        <div className="flex items-center gap-1 min-w-[200px]">
          <Dot />
          <span className="text-[10px] font-mono text-gray-300 tabular-nums">
            {mousePos
              ? <>
                  <span className="text-gray-500">Lat </span>{fmtN(mousePos.lat)}
                  {'  '}
                  <span className="text-gray-500">Lng </span>{fmtN(mousePos.lng)}
                </>
              : <span className="text-gray-600 italic">hover map for coordinates</span>}
          </span>
        </div>

        <Sep />

        {/* CRS */}
        <div className="flex items-center gap-1.5">
          <Dot color="#38bdf8" />
          <span className="text-[10px] text-gray-400 font-medium">EPSG:4326</span>
        </div>

        <Sep />

        {/* Scale */}
        <div className="flex items-center gap-1.5">
          <Dot color="#a78bfa" />
          <span className="text-[10px] font-mono text-gray-300">{formatScale(scaleDenom)}</span>
          <span className="text-[10px] text-gray-600">({scaleLabel})</span>
        </div>

        <Sep />

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <Dot color="#34d399" />
          <span className="text-[10px] text-gray-500">Z</span>
          <span className="text-[10px] font-mono text-gray-300">{viewState.zoom.toFixed(1)}</span>
        </div>
      </div>
    </>
  )
}

function Sep() {
  return <div className="mx-2.5 h-3 w-px bg-white/10 flex-shrink-0" />
}

function Dot({ color = '#4b5563' }: { color?: string }) {
  return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
}
