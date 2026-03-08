import { useRef } from 'react'

export default function PhotoUpload({ photo, onPhoto }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onPhoto(file)
  }

  const handleRemove = () => {
    onPhoto(null)
    // Reset the file input so the same file can be re-selected if needed
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-shreve-300 text-sm font-semibold mb-1.5">
        Quality Issue Photo
        <span className="text-shreve-600 font-normal ml-1">(optional)</span>
      </label>

      {/* Hidden file input — opens camera on mobile */}
      <input
        ref={inputRef}
        id="photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {!photo.preview ? (
        /* Upload trigger */
        <label
          htmlFor="photo-input"
          className="
            flex flex-col items-center justify-center w-full h-28
            bg-shreve-800 border-2 border-dashed border-shreve-700
            hover:border-blue-500 active:border-blue-600
            rounded-xl cursor-pointer transition-colors
          "
        >
          <span className="text-4xl mb-1.5 select-none">📷</span>
          <span className="text-shreve-400 text-sm">Tap to photograph a quality issue</span>
        </label>
      ) : (
        /* Photo preview */
        <div className="relative rounded-xl overflow-hidden border-2 border-green-600">
          <img
            src={photo.preview}
            alt="Quality issue evidence"
            className="w-full h-40 object-cover"
          />

          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove photo"
            className="
              absolute top-2 right-2 w-8 h-8
              bg-red-700 hover:bg-red-600 text-white
              rounded-full flex items-center justify-center
              text-sm font-black shadow-lg transition-colors
            "
          >
            ✕
          </button>

          {/* Retake label */}
          <label
            htmlFor="photo-input"
            className="
              absolute bottom-2 left-2
              bg-shreve-900/85 text-shreve-300 text-xs
              px-2.5 py-1 rounded-lg cursor-pointer
              hover:bg-shreve-800 transition-colors
            "
          >
            📷 Retake
          </label>

          {/* Captured badge */}
          <div className="absolute bottom-2 right-2 bg-green-800/80 text-green-200 text-xs px-2 py-1 rounded-lg">
            ✅ Captured
          </div>
        </div>
      )}
    </div>
  )
}
