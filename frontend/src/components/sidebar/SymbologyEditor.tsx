/**
 * SymbologyEditor — per-layer visual classification.
 *
 * Modes:
 *  • Simple   — single flat colour/size for all features
 *  • Classify — data-driven: pick a field, assign a colour per unique value
 *
 * The resulting MapLibre paint expression is written to mapStore.layerPaintOverrides
 * and applied by DataLayer without any DB round-trip.
 */
import { useState, useEffect } from 'react'
import { X, RefreshCw, RotateCcw, Palette } from 'lucide-react'
import { clsx } from 'clsx'
import { useMapStore } from '@/stores/mapStore'
import { useLayerFields } from '@/hooks/useLayerQuery'
import type { LayerConfig } from '@/types/meta'
import { api } from '@/lib/api'

// Predefined colour palettes
const PALETTES: Record<string, string[]> = {
  Vibrant:  ['#e63946','#f4a261','#2a9d8f','#457b9d','#a8dadc','#e9c46a','#6a4c93','#f77f00'],
  Pastel:   ['#ffadad','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#bdb2ff','#ffc6ff'],
  Earthy:   ['#7f4f24','#936639','#a68a64','#b6ad90','#c2c5aa','#a4ac86','#656d4a','#414833'],
  Bold:     ['#e63946','#2196f3','#4caf50','#ff9800','#9c27b0','#00bcd4','#f44336','#8bc34a'],
  Monochrome: ['#111827','#374151','#6b7280','#9ca3af','#d1d5db','#e5e7eb','#f3f4f6','#ffffff'],
}

interface ClassEntry {
  value: string
  colour: string
}

interface SymbologyEditorProps {
  layer: LayerConfig
  onClose: () => void
}

export function SymbologyEditor({ layer, onClose }: SymbologyEditorProps) {
  const { setLayerPaintOverride, clearLayerPaintOverride } = useMapStore()
  const { data: fields = [] } = useLayerFields(layer.name)

  const [mode, setMode] = useState<'simple' | 'classify'>('simple')
  const [simpleColor, setSimpleColor] = useState('#3b82f6')
  const [simpleOpacity, setSimpleOpacity] = useState(0.7)
  const [classifyField, setClassifyField] = useState('')
  const [palette, setPalette] = useState<keyof typeof PALETTES>('Vibrant')
  const [classes, setClasses] = useState<ClassEntry[]>([])
  const [loadingValues, setLoadingValues] = useState(false)

  const nonGeomFields = fields.filter((f) => f.data_type !== 'geometry')

  // Fetch distinct values for the classify field
  const loadDistinctValues = async (fieldName: string) => {
    if (!fieldName) return
    setLoadingValues(true)
    try {
      const result = await api.post<{ rows: Record<string, unknown>[]; total: number }>(
        `/api/v1/layers/${layer.name}/query`,
        { conditions: [{ field: fieldName, op: 'is_not_null', value: '' }], logic: 'AND', limit: 5000 },
      )
      const colours = PALETTES[palette]
      const unique = [...new Set(result.rows.map((r) => String(r[fieldName] ?? '')))]
        .filter(Boolean)
        .slice(0, 50)
      setClasses(unique.map((v, i) => ({ value: v, colour: colours[i % colours.length] })))
    } catch (err) {
      console.error('Failed to load distinct values', err)
    } finally {
      setLoadingValues(false)
    }
  }

  useEffect(() => {
    if (mode === 'classify' && classifyField) loadDistinctValues(classifyField)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classifyField, palette, mode])

  const applyPaint = () => {
    let paint: Record<string, unknown>

    // Use layer_type (MapLibre type) to determine correct paint props
    const isPoint  = layer.layer_type === 'circle'
    const isLine   = layer.layer_type === 'line'

    if (mode === 'simple') {
      if (isPoint) {
        paint = { 'circle-color': simpleColor, 'circle-radius': 5, 'circle-opacity': simpleOpacity }
      } else if (isLine) {
        paint = { 'line-color': simpleColor, 'line-width': 2, 'line-opacity': simpleOpacity }
      } else {
        paint = { 'fill-color': simpleColor, 'fill-opacity': simpleOpacity * 0.6, 'fill-outline-color': simpleColor }
      }
    } else {
      if (classes.length === 0) return
      const expr: unknown[] = ['match', ['get', classifyField]]
      classes.forEach(({ value, colour }) => expr.push(value, colour))
      expr.push('#cccccc') // fallback

      if (isPoint) {
        paint = { 'circle-color': expr, 'circle-radius': 5, 'circle-opacity': simpleOpacity }
      } else if (isLine) {
        paint = { 'line-color': expr, 'line-width': 2, 'line-opacity': simpleOpacity }
      } else {
        paint = { 'fill-color': expr, 'fill-opacity': simpleOpacity * 0.6, 'fill-outline-color': expr }
      }
    }

    setLayerPaintOverride(layer.name, paint)
  }

  const resetPaint = () => {
    clearLayerPaintOverride(layer.name)
  }

  const updateClass = (idx: number, patch: Partial<ClassEntry>) => {
    setClasses((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <Palette size={15} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{layer.display_name}</div>
          <div className="text-xs text-purple-200">Symbology</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-purple-800/40">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Mode tabs */}
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          {(['simple', 'classify'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                'flex-1 text-xs py-1.5 rounded-md font-medium transition',
                mode === m ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {m === 'simple' ? 'Simple' : 'Classify by field'}
            </button>
          ))}
        </div>

        {mode === 'simple' ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={simpleColor}
                  onChange={(e) => setSimpleColor(e.target.value)}
                  className="h-8 w-16 rounded cursor-pointer border border-gray-200"
                />
                <span className="text-xs text-gray-500 font-mono">{simpleColor}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Opacity — {Math.round(simpleOpacity * 100)}%</label>
              <input
                type="range" min={0} max={1} step={0.05}
                value={simpleOpacity}
                onChange={(e) => setSimpleOpacity(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Field picker */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Classify by</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={classifyField}
                onChange={(e) => setClassifyField(e.target.value)}
              >
                <option value="">— choose field —</option>
                {nonGeomFields.map((f) => (
                  <option key={f.name} value={f.name}>{f.name} ({f.data_type})</option>
                ))}
              </select>
            </div>

            {/* Palette */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Colour palette</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(PALETTES).map(([name, colours]) => (
                  <button
                    key={name}
                    title={name}
                    onClick={() => setPalette(name as keyof typeof PALETTES)}
                    className={clsx(
                      'flex gap-0.5 rounded px-1 py-0.5 border transition',
                      palette === name ? 'border-purple-500 shadow-sm' : 'border-transparent hover:border-gray-300',
                    )}
                  >
                    {colours.slice(0, 5).map((c, i) => (
                      <span key={i} className="inline-block w-3 h-5 rounded-sm" style={{ background: c }} />
                    ))}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Opacity — {Math.round(simpleOpacity * 100)}%</label>
              <input
                type="range" min={0} max={1} step={0.05}
                value={simpleOpacity}
                onChange={(e) => setSimpleOpacity(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            {/* Class entries */}
            {loadingValues ? (
              <div className="text-xs text-gray-400 text-center py-4 animate-pulse">Loading values…</div>
            ) : classes.length > 0 ? (
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto border border-gray-100 rounded-lg p-2">
                {classes.map((cls, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cls.colour}
                      onChange={(e) => updateClass(idx, { colour: e.target.value })}
                      className="h-6 w-8 rounded cursor-pointer border border-gray-200 shrink-0"
                    />
                    <span className="text-xs text-gray-700 flex-1 truncate">{cls.value || '(empty)'}</span>
                  </div>
                ))}
                {classes.length === 50 && (
                  <div className="text-xs text-amber-500 text-center py-1">Showing top 50 unique values</div>
                )}
              </div>
            ) : classifyField ? (
              <div className="text-xs text-gray-400 text-center py-4">
                <RefreshCw size={14} className="inline mr-1" />
                Select a field to load values
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={resetPaint}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded border border-gray-200 hover:border-gray-300"
        >
          <RotateCcw size={13} /> Reset
        </button>
        <button
          onClick={applyPaint}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 py-1.5 rounded-md"
        >
          <Palette size={13} /> Apply Style
        </button>
      </div>
    </div>
  )
}
