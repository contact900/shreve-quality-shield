import { useRef } from 'react'
import { resizeImage } from '../utils'

/**
 * Compact per-item photo upload strip that lives inside each ScoreItem row.
 * Shows a camera button when empty; a thumbnail + controls when a photo exists.
 */
export default function ItemPhotoUpload({ itemId, itemLabel, photo, onPhoto }) {
  const inputRef = useRef(null)

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await resizeImage(file)
    onPhoto({ base64, preview: base64 })
  }

  const handleRemove = () => {
    onPhoto(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mt-2 pt-2 border-t border-shreve-800/60">
      {/* Hidden file input — opens rear camera on mobile */}
      <input
        ref={inputRef}
        id={`item-photo-${itemId}`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {!photo ? (
        /* ── Empty state: camera prompt ── */
        <label
          htmlFor={`item-photo-${itemId}`}
          className="
            flex items-center gap-2 w-full
            text-shreve-500 hover:text-shreve-300
            hover:bg-shreve-800/40 active:bg-shreve-800/60
            rounded-lg px-2 py-1.5 cursor-pointer transition-colors
          "
        >
          <span className="text-base leading-none select-none">📷</span>
          <span className="text-xs">Add evidence photo</span>
        </label>
      ) : (
        /* ── Filled state: thumbnail + controls ── */
        <div className="flex items-center gap-2.5">
          {/* Thumbnail */}
          <img
            src={photo.preview}
            alt={`${itemLabel} evidence`}
            className="w-11 h-11 object-cover rounded-lg border-2 border-green-600 flex-shrink-0"
          />

          {/* Status */}
          <div className="flex-1 min-w-0">
            <p className="text-green-400 text-xs font-bold leading-tight">✅ Evidence captured</p>
            <p className="text-shreve-600 text-xs truncate">{itemLabel}</p>
          </div>

          {/* Retake */}
          <label
            htmlFor={`item-photo-${itemId}`}
            title="Retake photo"
            className="
              flex-shrink-0 text-shreve-400 hover:text-shreve-200
              text-xs px-2 py-1.5 rounded-lg cursor-pointer
              hover:bg-shreve-700/50 transition-colors select-none
            "
          >
            ↺
          </label>

          {/* Remove */}
          <button
            type="button"
            onClick={handleRemove}
            title="Remove photo"
            className="
              flex-shrink-0 text-red-500 hover:text-red-400
              text-xs px-2 py-1.5 rounded-lg
              hover:bg-red-950/40 transition-colors
            "
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
