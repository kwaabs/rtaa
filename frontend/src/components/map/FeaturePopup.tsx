import { useState } from 'react'
import { Popup } from 'react-map-gl/maplibre'
import { X, Loader2, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { usePopupStore } from '@/stores/popupStore'
import { useSearch } from '@/hooks/useFeatures'
import { cn } from '@/lib/utils'

export default function FeaturePopup() {
  const { popup, closePopup } = usePopupStore()
  if (!popup) return null

  return (
    <Popup
      longitude={popup.longitude}
      latitude={popup.latitude}
      onClose={closePopup}
      closeOnClick={false}
      closeButton={false}
      maxWidth="420px"
      anchor="bottom"
      offset={12}
    >
      <PopupContent />
    </Popup>
  )
}

function PopupContent() {
  const { popup, closePopup } = usePopupStore()
  const [showAll, setShowAll] = useState(false)
  if (!popup) return null

  const objectId = popup.properties['objectid'] ?? popup.properties['OBJECTID']
  const numericId = objectId != null ? Number(objectId) : null

  const { data: fc, isLoading, isError, refetch } = useSearch(popup.layerName, {
    ids: numericId != null ? [numericId] : undefined,
    enabled: numericId != null,
  })

  const fullProps: Record<string, unknown> =
    fc?.features?.[0]?.properties ?? popup.properties

  const spec = popup.popupSpec as Record<string, string>
  const specFields = Object.keys(spec)

  const keyEntries: [string, string, unknown][] = specFields.length > 0
    ? specFields
        .map((field): [string, string, unknown] => [field, spec[field], fullProps[field]])
        .filter(([, , v]) => v != null && v !== '')
    : []

  const SKIP = new Set([
    ...specFields,
    'the_geom', 'geom', 'shape', 'shape_length', 'shape_area',
    'geometry', 'wkb_geometry', 'gdb_geomattr_data',
  ])
  const restEntries: [string, unknown][] = Object.entries(fullProps)
    .filter(([k, v]) => !SKIP.has(k) && v != null && v !== '' && v !== 0)
    .map(([k, v]) => [k, v])

  const PREVIEW_COUNT = 8
  const visibleRest = showAll ? restEntries : restEntries.slice(0, PREVIEW_COUNT)
  const hasMore = restEntries.length > PREVIEW_COUNT

  const color = popup.accentColor

  return (
    <div className="w-[380px]">
      {/* Accent bar + header */}
      <div
        className="rounded-t-[inherit] px-4 pt-3 pb-2.5"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {popup.displayName}
            </p>
            {numericId != null && (
              <p className="text-[10px] mt-0.5 font-mono" style={{ color }}>
                ID #{numericId}
              </p>
            )}
          </div>
          <button
            onClick={closePopup}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading bar */}
      {isLoading && (
        <div className="h-0.5 bg-white/5 overflow-hidden">
          <div className="h-full w-1/3 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full"
               style={{ background: color, opacity: 0.7 }} />
        </div>
      )}

      {isError && (
        <div className="mx-4 mb-2 flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
          <span className="text-amber-400 flex-1">Could not load full details</span>
          <button onClick={() => refetch()} className="text-amber-400 hover:text-amber-300 transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="px-4 pb-3 space-y-3">
        {/* Key fields — from popup_spec */}
        {keyEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {keyEntries.map(([field, label, value]) => (
              <KeyCard
                key={field}
                label={label}
                value={value}
                color={color}
                wide={String(value).length > 18}
              />
            ))}
          </div>
        )}

        {/* Divider */}
        {keyEntries.length > 0 && restEntries.length > 0 && (
          <div className="border-t border-white/6" />
        )}

        {/* All other attributes */}
        {restEntries.length > 0 && (
          <div>
            <dl className="space-y-0">
              {visibleRest.map(([key, value]) => (
                <AttrRow key={key} label={key} value={value} />
              ))}
            </dl>

            {hasMore && (
              <button
                onClick={() => setShowAll((s) => !s)}
                className="mt-2 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showAll
                  ? 'Show less'
                  : `${restEntries.length - PREVIEW_COUNT} more attributes`}
              </button>
            )}
          </div>
        )}

        {!isLoading && keyEntries.length === 0 && restEntries.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-2">No attributes available</p>
        )}
      </div>
    </div>
  )
}

/** Highlighted card for popup_spec fields */
function KeyCard({
  label, value, color, wide,
}: {
  label: string
  value: unknown
  color: string
  wide?: boolean
}) {
  const display = value == null ? '—' : String(value)
  return (
    <div
      className={cn(
        'rounded-md px-2.5 py-2 bg-white/[0.04] border border-white/8',
        wide && 'col-span-2',
      )}
    >
      <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5"
         style={{ color }}>
        {label}
      </p>
      <p className="text-white text-xs font-medium leading-snug break-words">{display}</p>
    </div>
  )
}

/** Plain row for other attributes with copy on hover */
function AttrRow({ label, value }: { label: string; value: unknown }) {
  const [copied, setCopied] = useState(false)
  const display = value == null ? '—' : String(value)

  function copy() {
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="group flex items-baseline gap-2 py-[3px] hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors">
      <dt className="flex-shrink-0 w-36 text-[10px] text-gray-500 truncate capitalize">
        {label.replace(/_/g, ' ')}
      </dt>
      <dd className="flex-1 flex items-center gap-1 min-w-0">
        <span className="text-[11px] text-gray-300 break-all leading-snug">{display}</span>
        <button
          onClick={copy}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
          title="Copy value"
        >
          {copied
            ? <Check className="w-2.5 h-2.5 text-green-400" />
            : <Copy className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />}
        </button>
      </dd>
    </div>
  )
}
