export default function Toggle({ label, description, icon, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xl flex-shrink-0 select-none">{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="text-gray-800 font-medium text-sm leading-tight">{label}</div>
        {description && (
          <div className="text-gray-400 text-xs mt-0.5">{description}</div>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-12 h-6 rounded-full flex-shrink-0
          transition-colors duration-200 focus:outline-none
          ${checked ? 'bg-amber-400' : 'bg-gray-200'}
        `}
      >
        <span className={`
          absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
          transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `} />
      </button>

      <span className={`text-xs font-semibold w-6 flex-shrink-0 ${checked ? 'text-amber-600' : 'text-gray-400'}`}>
        {checked ? 'YES' : 'NO'}
      </span>
    </div>
  )
}
