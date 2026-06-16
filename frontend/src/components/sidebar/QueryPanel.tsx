import { useEffect } from 'react'
import { Plus, Trash2, Play, RotateCcw, Table, MapPin, X } from 'lucide-react'
import { useQueryStore, type FilterOp } from '@/stores/queryStore'
import { useMapStore } from '@/stores/mapStore'
import { useLayerFields, useLayerQueryMutation } from '@/hooks/useLayerQuery'
import { useLayers } from '@/hooks/useMeta'
import { clsx } from 'clsx'

const OPERATORS: { value: FilterOp; label: string; noValue?: boolean }[] = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '>', label: '>' },
  { value: '>=', label: '≥' },
  { value: '<', label: '<' },
  { value: '<=', label: '≤' },
  { value: 'like', label: 'contains' },
  { value: 'not_like', label: 'not contains' },
  { value: 'is_null', label: 'is empty', noValue: true },
  { value: 'is_not_null', label: 'is not empty', noValue: true },
]

export function QueryPanel() {
  const {
    selectedLayer,
    logic,
    conditions,
    limit,
    result,
    setSelectedLayer,
    setLogic,
    addCondition,
    updateCondition,
    removeCondition,
    clearConditions,
    setLimit,
    setResult,
    setResultWindowOpen,
  } = useQueryStore()

  const { setHighlightedIds, spatialFilter, setSpatialFilter } = useMapStore()
  const { data: layers = [] } = useLayers()
  const { data: fields = [], isFetching: loadingFields } = useLayerFields(selectedLayer)
  const { mutateAsync: runQuery, isPending: running } = useLayerQueryMutation()

  // Initialise selected layer to first layer with geometry
  useEffect(() => {
    if (!selectedLayer && layers.length > 0) {
      setSelectedLayer(layers[0].name)
    }
  }, [layers, selectedLayer, setSelectedLayer])

  const handleRun = async () => {
    if (!selectedLayer) return
    const activeConds = conditions.filter((c) => c.field)
    try {
      const result = await runQuery({ layerName: selectedLayer, conditions: activeConds, logic, limit, bbox: spatialFilter })
      setResult(result)
      setResultWindowOpen(true)
      // Highlight matching features on map
      const ids = result.rows
        .map((r) => r['objectid'] ?? r['ogc_fid'])
        .filter(Boolean) as (string | number)[]
      if (ids.length) setHighlightedIds(selectedLayer, ids)
    } catch (err) {
      console.error('Query failed', err)
    }
  }

  const selectedFields = fields.filter((f) => f.data_type !== 'geometry')

  return (
    <div className="flex flex-col gap-3 p-3 h-full bg-white text-gray-900">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-gray-900 flex-1">Query Builder</div>
        <button
          onClick={() => { clearConditions(); setResult(null) }}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title="Clear"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Layer selector */}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Layer</label>
        <select
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedLayer}
          onChange={(e) => { setSelectedLayer(e.target.value); clearConditions() }}
        >
          {layers.map((l) => (
            <option key={l.name} value={l.name}>{l.display_name}</option>
          ))}
        </select>
      </div>

      {/* Logic toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-700">Match</span>
        {(['AND', 'OR'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setLogic(v)}
            className={clsx(
              'text-xs px-2 py-1 rounded font-medium border',
              logic === v
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400',
            )}
          >
            {v}
          </button>
        ))}
        <span className="text-xs font-medium text-gray-700">conditions</span>
      </div>

      {/* Active spatial filter badge */}
      {spatialFilter && (
        <div className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
          <MapPin size={12} className="text-blue-500 shrink-0" />
          <span className="text-blue-700 font-medium flex-1">Spatial filter active</span>
          <button
            onClick={() => setSpatialFilter(null)}
            className="text-blue-400 hover:text-blue-700"
            title="Clear spatial filter"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Conditions */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
        {conditions.map((cond, idx) => {
          const op = OPERATORS.find((o) => o.value === cond.op)
          return (
            <div key={cond.id} className="bg-gray-50 rounded-lg p-2 border border-gray-200 flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 w-4 text-center font-medium">{idx + 1}</span>

                {/* Field */}
                <select
                  className="flex-1 text-xs text-gray-900 border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={cond.field}
                  onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
                >
                  <option value="">— field —</option>
                  {loadingFields
                    ? <option disabled>Loading…</option>
                    : selectedFields.map((f) => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                </select>

                <button
                  onClick={() => removeCondition(cond.id)}
                  className="p-1 text-gray-300 hover:text-red-500 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex items-center gap-1 pl-5">
                {/* Operator */}
                <select
                  className="text-xs text-gray-900 border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={cond.op}
                  onChange={(e) => updateCondition(cond.id, { op: e.target.value as FilterOp })}
                >
                  {OPERATORS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Value */}
                {!op?.noValue && (
                  <input
                    type="text"
                    className="flex-1 text-xs text-gray-900 placeholder-gray-400 border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="value"
                    value={cond.value}
                    onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                  />
                )}
              </div>
            </div>
          )
        })}

        <button
          onClick={addCondition}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
        >
          <Plus size={13} /> Add condition
        </button>
      </div>

      {/* Limit + Run */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1 text-xs text-gray-700 font-medium">
          <span>Limit</span>
          <input
            type="number"
            min={1}
            max={5000}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-16 text-gray-900 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={handleRun}
          disabled={!selectedLayer || running}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-md transition',
            running
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
          )}
        >
          {running ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <>
              <Play size={13} /> Run Query
            </>
          )}
        </button>
      </div>

      {/* Quick status */}
      {result && (
        <div className="flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 rounded-md overflow-hidden">
          <button
            onClick={() => setResultWindowOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100 flex-1"
          >
            <Table size={13} />
            {result.total} results — view table
          </button>
          <button
            onClick={() => { setResult(null); setResultWindowOpen(false) }}
            className="px-2 py-1.5 text-emerald-400 hover:text-red-500 hover:bg-red-50 border-l border-emerald-200"
            title="Clear results"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
