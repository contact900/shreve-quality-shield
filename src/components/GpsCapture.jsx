export default function GpsCapture({ gps, onCapture }) {
  const { status, lat, lng, accuracy, error } = gps

  const btnClass = {
    idle:     'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand',
    loading:  'bg-gray-50 border-gray-200 text-gray-400 cursor-wait',
    captured: 'bg-green-50 border-green-400 text-green-700',
    error:    'bg-red-50 border-red-300 text-red-600',
  }[status]

  const btnLabel = {
    idle:     '📍 Capture GPS Location',
    loading:  '⏳ Acquiring signal...',
    captured: `✅ ${lat}, ${lng}`,
    error:    '❌ Location failed — tap to retry',
  }[status]

  return (
    <div>
      <label className="block text-gray-700 text-sm font-medium mb-1.5">
        GPS Verification
      </label>

      <button
        type="button"
        onClick={onCapture}
        disabled={status === 'loading'}
        className={`
          w-full py-3 px-4 rounded-lg border font-medium text-sm
          transition-colors leading-tight
          ${btnClass}
        `}
      >
        {btnLabel}
      </button>

      {status === 'captured' && accuracy && (
        <p className="text-xs text-gray-400 mt-1.5 text-center">Accuracy: ±{accuracy} meters</p>
      )}
      {status === 'error' && error && (
        <p className="text-xs text-red-500 mt-1.5 truncate">{error}</p>
      )}
    </div>
  )
}
