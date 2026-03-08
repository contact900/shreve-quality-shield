export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">

        {/* Shield — brand blue accent */}
        <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center text-lg flex-shrink-0">
          🛡️
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-gray-900 font-bold text-base leading-tight">
            Shreve Quality Shield
          </h1>
          <p className="text-gray-400 text-xs truncate">NW Arkansas · Cleaning Inspections</p>
        </div>

        <LiveTime />
      </div>
    </header>
  )
}

function LiveTime() {
  const now  = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return (
    <div className="flex-shrink-0 text-right">
      <div className="text-gray-700 text-sm font-semibold tabular-nums">{time}</div>
      <div className="text-gray-400 text-xs">
        {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </div>
  )
}
