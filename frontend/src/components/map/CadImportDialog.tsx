import { useCallback, useRef, useState } from 'react'
import { FileCode2, X, Loader2, Upload, AlertCircle, Map, Monitor } from 'lucide-react'
import type { FeatureCollection } from 'geojson'
import { CRS_OPTIONS, parseDxf } from '@/utils/dxfToGeoJSON'
import { useCadStore } from '@/stores/cadStore'
import { useAuthStore } from '@/stores/authStore'
import { clsx } from 'clsx'

/**
 * Reproject all coordinates in a GeoJSON FeatureCollection from srcEpsg → WGS84.
 * Used for DWG-converted GeoJSON that arrives in the original drawing CRS.
 */
async function applyGeoJSONTransform(
  geojson: FeatureCollection,
  srcEpsg: string,
): Promise<FeatureCollection> {
  if (srcEpsg === 'EPSG:4326') return geojson

  const proj4 = (await import('proj4')).default
  const srcDef = CRS_OPTIONS.find(c => c.epsg === srcEpsg)?.proj4
  if (!srcDef) return geojson

  const wgs84 = '+proj=longlat +datum=WGS84 +no_defs'
  const forward = (xy: number[]) => proj4(srcDef, wgs84, xy) as number[]

  function transformCoords(coords: unknown): unknown {
    if (!Array.isArray(coords)) return coords
    if (typeof coords[0] === 'number') return forward(coords as number[])
    return coords.map(transformCoords)
  }

  return {
    ...geojson,
    features: geojson.features.map(f => ({
      ...f,
      geometry: f.geometry
        ? { ...f.geometry, coordinates: transformCoords((f.geometry as any).coordinates) as any }
        : f.geometry,
    })),
  }
}

interface Props {
  onClose: () => void
  /** Called when user wants to open a DWG in the floating CAD panel */
  onOpenDwg: (file: File) => void
}

type Status = 'idle' | 'parsing' | 'converting' | 'done' | 'error'

export function CadImportDialog({ onClose, onOpenDwg }: Props) {
  const { setOverlay, setImportError, importError } = useCadStore()
  const session = useAuthStore(s => s.session)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedEpsg, setSelectedEpsg] = useState('auto')
  const [isDragOver, setIsDragOver]     = useState(false)
  const [status, setStatus]             = useState<Status>('idle')
  const [statusMsg, setStatusMsg]       = useState('')
  const [preview, setPreview]           = useState<{ count: number; suggested: string; layers: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDwg = selectedFile?.name.toLowerCase().endsWith('.dwg') ?? false
  const busy  = status === 'parsing' || status === 'converting'

  const handleFile = useCallback(async (file: File) => {
    setSelectedFile(file)
    setPreview(null)
    setImportError(null)
    setStatus('idle')

    if (file.name.toLowerCase().endsWith('.dwg')) return

    // Quick-parse DXF for preview
    try {
      const text = await file.text()
      const result = await parseDxf(text, 'auto')
      setPreview({ count: result.entityCount, suggested: result.suggestedEpsg, layers: result.layerNames })
      if (selectedEpsg === 'auto') setSelectedEpsg(result.suggestedEpsg)
    } catch { /* ignore preview errors */ }
  }, [selectedEpsg, setImportError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  /** DXF → overlay directly in browser */
  const handleImportDxf = useCallback(async () => {
    if (!selectedFile || isDwg) return
    setStatus('parsing')
    setStatusMsg('Parsing DXF…')

    try {
      const text = await selectedFile.text()
      const epsg = selectedEpsg === 'auto' ? (preview?.suggested ?? 'EPSG:4326') : selectedEpsg
      const result = await parseDxf(text, epsg)

      if (result.entityCount === 0) {
        setImportError('No supported geometry found in this DXF file.')
        setStatus('error')
        return
      }

      setOverlay({
        fileName: selectedFile.name,
        epsg,
        geojson: result.geojson,
        layerNames: result.layerNames,
        visibleLayers: new Set(result.layerNames),
        opacity: 0.85,
      })
      setStatus('done')
      onClose()
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
      setStatus('error')
    }
  }, [selectedFile, selectedEpsg, preview, isDwg, setOverlay, setImportError, onClose])

  /** DWG → backend converts to GeoJSON via ezdxf → apply CRS transform → overlay */
  const handleConvertDwg = useCallback(async () => {
    if (!selectedFile) return
    setStatus('converting')
    setStatusMsg('Uploading DWG…')
    setImportError(null)

    try {
      const form = new FormData()
      form.append('file', selectedFile)

      setStatusMsg('Converting DWG on server…')
      const token = session?.access_token ?? ''
      const res = await fetch('/api/v1/cad/convert-geojson', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? `Server error ${res.status}`)
      }

      const rawGeoJSON = await res.json()

      if (!rawGeoJSON.features?.length) {
        throw new Error('Conversion succeeded but no geometry was found in this DWG file.')
      }

      setStatusMsg('Reprojecting coordinates…')

      // Apply CRS transform from the selected source EPSG to WGS84
      const epsg = selectedEpsg === 'auto' ? 'EPSG:32630' : selectedEpsg
      const transformedGeoJSON = await applyGeoJSONTransform(rawGeoJSON, epsg)
      const layerNames: string[] = rawGeoJSON.layerNames ?? []

      setOverlay({
        fileName: selectedFile.name,
        epsg,
        geojson: transformedGeoJSON,
        layerNames,
        visibleLayers: new Set(layerNames.length ? layerNames : ['default']),
        opacity: 0.85,
      })
      setStatus('done')
      onClose()
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Conversion failed')
      setStatus('error')
    }
  }, [selectedFile, selectedEpsg, session, setOverlay, setImportError, onClose])

  const handleOpenViewer = useCallback(() => {
    if (!selectedFile) return
    onOpenDwg(selectedFile)
    onClose()
  }, [selectedFile, onOpenDwg, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
          <FileCode2 size={18} className="text-blue-600" />
          <h2 className="font-bold text-gray-900 flex-1">Import CAD File</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition',
              isDragOver ? 'border-blue-400 bg-blue-50' :
              selectedFile ? 'border-green-400 bg-green-50' :
              'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf,.dwg"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
            />
            {selectedFile ? (
              <div>
                <FileCode2 size={28} className="text-green-600 mx-auto mb-1.5" />
                <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(0)} KB · click to change
                </p>
              </div>
            ) : (
              <div>
                <Upload size={28} className="text-gray-400 mx-auto mb-1.5" />
                <p className="font-medium text-gray-700">Drop DXF or DWG file here</p>
                <p className="text-xs text-gray-500 mt-0.5">or click to browse</p>
              </div>
            )}
          </div>

          {/* DXF: preview info */}
          {selectedFile && !isDwg && preview && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 space-y-0.5">
              <p><span className="font-semibold">{preview.count} features</span> found · {preview.layers.length} layer(s)</p>
              <p>Suggested CRS: <span className="font-semibold">{preview.suggested}</span></p>
            </div>
          )}

          {/* CRS selection (DXF always, DWG only when converting) */}
          {selectedFile && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                Coordinate System (CRS)
                {isDwg && <span className="font-normal text-gray-500 ml-1">— for map overlay</span>}
              </label>
              <select
                value={selectedEpsg}
                onChange={e => setSelectedEpsg(e.target.value)}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto-detect from file extents</option>
                {CRS_OPTIONS.map(c => (
                  <option key={c.epsg} value={c.epsg}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the coordinate system the CAD drawing was created in.
              </p>
            </div>
          )}

          {/* Status message while working */}
          {busy && (
            <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
              <Loader2 size={15} className="animate-spin shrink-0" />
              {statusMsg}
            </div>
          )}

          {/* Error */}
          {(status === 'error' || importError) && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {importError}
            </div>
          )}

          {/* DWG: two action buttons */}
          {isDwg && selectedFile && (
            <div className="grid grid-cols-2 gap-3">
              {/* Viewer */}
              <button
                onClick={handleOpenViewer}
                disabled={busy}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition disabled:opacity-50 group"
              >
                <Monitor size={24} className="text-gray-500 group-hover:text-blue-600" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800">Open in Viewer</p>
                  <p className="text-xs text-gray-500 mt-0.5">Floating CAD panel, full detail</p>
                </div>
              </button>
              {/* Convert & overlay */}
              <button
                onClick={handleConvertDwg}
                disabled={busy}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl transition disabled:opacity-50 group"
              >
                {busy && status === 'converting'
                  ? <Loader2 size={24} className="text-green-600 animate-spin" />
                  : <Map size={24} className="text-gray-500 group-hover:text-green-600" />
                }
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800">Overlay on Map</p>
                  <p className="text-xs text-gray-500 mt-0.5">Server converts → map layer</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer — DXF only */}
        {selectedFile && !isDwg && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 hover:bg-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImportDxf}
              disabled={busy}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Map size={14} />}
              {busy ? statusMsg : 'Overlay on map'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
