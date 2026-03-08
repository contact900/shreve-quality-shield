import { useRef } from 'react'

const SCORE_CONFIG = [
  null,
  { active: 'bg-red-500 border-red-500 text-white',          label: 'Critical'    },
  { active: 'bg-orange-400 border-orange-400 text-white',    label: 'Poor'        },
  { active: 'bg-amber-400 border-amber-400 text-gray-900',   label: 'Acceptable'  },
  { active: 'bg-green-500 border-green-500 text-white',      label: 'Good'        },
  { active: 'bg-green-700 border-green-700 text-white',      label: 'Excellent'   },
]

const INACTIVE = 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'

export default function ScoreItem({ number, item, value, photo, onChange, onPhoto }) {
  const inputRef = useRef(null)
  const hasPhoto = !!photo

  const handlePress    = (n) => onChange(n === value ? 0 : n)
  const selectedConfig = value > 0 ? SCORE_CONFIG[value] : null

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    onPhoto(file || null)
  }

  const handleRemovePhoto = () => {
    onPhoto(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Card border state
  const cardBorder =
    value > 0 && hasPhoto ? 'border-green-300 bg-green-50/30' :
    value > 0              ? 'border-blue-200 bg-blue-50/20' :
                             'border-gray-200 bg-white'

  return (
    <div className={`rounded-xl p-3.5 border transition-colors ${cardBorder}`}>

      {/* Header row */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-gray-400 text-xs font-medium w-5 flex-shrink-0 tabular-nums">{number}.</span>
        <div className="flex-1 min-w-0">
          <div className="text-gray-900 font-semibold text-sm leading-tight">{item.label}</div>
          <div className="text-gray-400 text-xs">{item.subtitle}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Photo badge */}
          {hasPhoto ? (
            <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              📷 ✓
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              📷 req
            </span>
          )}
          {/* Score label */}
          {selectedConfig && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${selectedConfig.active}`}>
              {selectedConfig.label}
            </span>
          )}
        </div>
      </div>

      {/* Score buttons 1–5 */}
      <div className="flex gap-1.5 mb-2.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handlePress(n)}
            aria-label={`Score ${n} — ${SCORE_CONFIG[n].label}`}
            className={`
              flex-1 h-11 rounded-lg border font-bold text-base
              transition-all duration-100 active:scale-95
              ${value === n ? SCORE_CONFIG[n].active : INACTIVE}
            `}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Per-item photo upload */}
      <div className="pt-2 border-t border-gray-100">
        <input
          ref={inputRef}
          id={`item-photo-${item.id}`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!hasPhoto ? (
          <label
            htmlFor={`item-photo-${item.id}`}
            className="flex items-center gap-2 w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-1.5 cursor-pointer transition-colors"
          >
            <span className="text-base leading-none select-none">📷</span>
            <span className="text-xs font-medium">Add required evidence photo</span>
          </label>
        ) : (
          <div className="flex items-center gap-2.5">
            <img
              src={photo.preview}
              alt={`${item.label} evidence`}
              className="w-11 h-11 object-cover rounded-lg border border-green-300 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-green-600 text-xs font-semibold leading-tight">Evidence captured</p>
              <p className="text-gray-400 text-xs truncate">{item.label}</p>
            </div>
            <label
              htmlFor={`item-photo-${item.id}`}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xs px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors select-none"
            >
              ↺ Retake
            </label>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="flex-shrink-0 text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
