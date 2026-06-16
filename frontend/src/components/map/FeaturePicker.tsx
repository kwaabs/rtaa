import { Popup } from 'react-map-gl/maplibre'
import { ChevronRight, MapPin, X } from 'lucide-react'
import { usePopupStore, type PickerCandidate } from '@/stores/popupStore'

const TYPE_LABEL: Record<string, string> = {
  fill: 'Area', line: 'Line', circle: 'Point', symbol: 'Label',
  heatmap: 'Heat', 'fill-extrusion': '3D',
}

function shortLabel(props: Record<string, unknown>): string {
  for (const k of ['substation_name', 'name', 'district', 'region', 'meter_number', 'feeder_name', 'objectid']) {
    const v = props[k]
    if (v != null && String(v).trim() !== '' && String(v) !== '0') return String(v)
  }
  return '—'
}

export default function FeaturePicker() {
  const { picker, closePicker, setPopup } = usePopupStore()
  if (!picker) return null

  function select(c: PickerCandidate) {
    setPopup({
      longitude: picker!.longitude,
      latitude: picker!.latitude,
      layerName: c.layerName,
      displayName: c.displayName,
      layerType: c.layerType,
      accentColor: c.accentColor,
      properties: c.properties,
      popupSpec: c.popupSpec,
    })
  }

  return (
    <Popup
      longitude={picker.longitude}
      latitude={picker.latitude}
      onClose={closePicker}
      closeOnClick={false}
      closeButton={false}
      maxWidth="300px"
      anchor="bottom"
    >
      <div className="w-[268px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-none">Multiple features</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Select one to inspect</p>
            </div>
          </div>
          <button
            onClick={closePicker}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Candidate list */}
        <ul className="py-1.5 max-h-64 overflow-y-auto">
          {picker.candidates.map((c, i) => (
            <li key={i}>
              <button
                onClick={() => select(c)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/8 transition-colors group text-left"
              >
                {/* Color dot */}
                <span
                  className="flex-shrink-0 w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                  style={{ background: c.accentColor }}
                />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate group-hover:text-brand-300 transition-colors">
                    {c.displayName}
                  </p>
                  <p className="text-gray-500 text-[10px] truncate mt-0.5">{shortLabel(c.properties)}</p>
                </div>

                {/* Type badge + chevron */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/8 text-gray-400">
                    {TYPE_LABEL[c.layerType] ?? c.layerType}
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-brand-400 transition-colors" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Popup>
  )
}
