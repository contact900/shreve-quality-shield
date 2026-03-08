import { useState } from 'react'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || ''

const LOCATIONS = [
  'Stribling Swepco', 'Rogers Swepco', 'Fayetteville Swepco',
  'Springdale Swepco', 'Greenwood Swepco', 'Fayetteville BofA',
  'Springdale BofA', 'Rogers BofA', 'Fort Smith Merrill Lynch', 'CSL Plasma',
]

const SUPPLY_ITEMS = [
  { id: 'multi_surface', label: 'Multi-Surface Cleaner', icon: '🧴', unit: 'bottles', min: 5  },
  { id: 'paper_towels',  label: 'Paper Towels',          icon: '🧻', unit: 'rolls',   min: 10 },
  { id: 'liners',        label: 'Liners',                icon: '🗑️', unit: 'boxes',   min: 20 },
  { id: 'disinfectant',  label: 'Disinfectant',          icon: '🦠', unit: 'bottles', min: 3  },
]

const initialCounts = SUPPLY_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: '' }), {})

const INPUT = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors text-sm'
const LABEL = 'block text-gray-700 text-sm font-medium mb-1.5'

function getStatus(item, rawVal) {
  if (rawVal === '' || rawVal === undefined) return 'unknown'
  const n = parseInt(rawVal, 10)
  if (isNaN(n)) return 'unknown'
  if (n < item.min) return 'alert'
  if (n < item.min * 1.5) return 'low'
  return 'ok'
}

// ── Success ───────────────────────────────────────────────────────────────────

function SuccessBanner({ alerts, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 ${alerts.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
        {alerts.length > 0 ? '🚨' : '✅'}
      </div>
      <h2 className="text-gray-900 font-bold text-xl mb-1">Stock-Take Submitted</h2>
      <p className="text-gray-500 text-sm mb-6">Inventory synced to Google Sheets.</p>

      {alerts.length > 0 && (
        <div className="w-full bg-red-50 border border-red-300 rounded-xl p-4 mb-6 text-left">
          <p className="text-red-700 font-bold text-sm mb-2">🚨 Reorder Alert Sent</p>
          {alerts.map((a) => (
            <p key={a.id} className="text-red-600 text-sm">
              • {a.label}: {a.count} {a.unit} in stock (min {a.min})
            </p>
          ))}
        </div>
      )}

      <button onClick={onReset}
        className="w-full max-w-xs bg-brand hover:bg-brand-dark text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
        New Stock-Take
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [location, setLocation] = useState('')
  const [counts,   setCounts]   = useState(initialCounts)
  const [notes,    setNotes]    = useState('')
  const [status,   setStatus]   = useState('idle')
  const [error,    setError]    = useState('')
  const [alerts,   setAlerts]   = useState([])

  const handleCount = (id, value) => {
    if (value === '' || /^\d+$/.test(value)) setCounts((p) => ({ ...p, [id]: value }))
  }

  const getAlerts = () =>
    SUPPLY_ITEMS.filter((item) => { const n = parseInt(counts[item.id], 10); return !isNaN(n) && n < item.min })
      .map((item) => ({ ...item, count: parseInt(counts[item.id], 10) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!location) { setError('Please select a location.'); return }
    if (!WEBHOOK_URL) { setError('Webhook URL not configured.'); return }
    setStatus('loading'); setError('')
    const inventoryAlerts = getAlerts()
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          type: 'inventory', timestamp: new Date().toISOString(), location,
          inventory: SUPPLY_ITEMS.reduce((acc, item) => { acc[item.id] = parseInt(counts[item.id], 10) || 0; return acc }, {}),
          inventory_alerts: inventoryAlerts.map((a) => ({ id: a.id, label: a.label, count: a.count, min: a.min, unit: a.unit })),
          notes,
        }),
      })
      setTimeout(() => { setAlerts(inventoryAlerts); setStatus('success') }, 1000)
    } catch { setError('Network error.'); setStatus('idle') }
  }

  const handleReset = () => { setLocation(''); setCounts(initialCounts); setNotes(''); setStatus('idle'); setError(''); setAlerts([]) }

  if (status === 'success') return <div className="max-w-lg mx-auto"><SuccessBanner alerts={alerts} onReset={handleReset} /></div>

  const currentAlerts = getAlerts()

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-4">

      <div className="text-center py-2">
        <h2 className="text-gray-900 font-bold text-lg mb-1">Smart Inventory Stock-Take</h2>
        <p className="text-gray-500 text-sm">
          Items below the minimum threshold trigger a <span className="text-red-600 font-semibold">🚨 Red Alert</span> email.
        </p>
      </div>

      {/* RED ALERT live preview */}
      {currentAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <p className="text-red-700 font-bold text-sm mb-1">
            🚨 {currentAlerts.length} item{currentAlerts.length > 1 ? 's' : ''} will trigger reorder alert
          </p>
          {currentAlerts.map((a) => (
            <p key={a.id} className="text-red-600 text-xs">
              • {a.label}: {a.count} {a.unit} (need ≥ {a.min})
            </p>
          ))}
        </div>
      )}

      {/* Location */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className={LABEL}>Location <span className="text-red-500">*</span></label>
        <div className="relative">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={INPUT + ' appearance-none pr-10 cursor-pointer'}>
            <option value="">— Select Location —</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</div>
        </div>
      </div>

      {/* Supply items */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <h3 className="text-gray-900 font-semibold text-sm">Supply Counts</h3>
          <div className="flex justify-between text-gray-400 text-xs mt-0.5">
            <span>Item</span><span>In-Stock Count</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {SUPPLY_ITEMS.map((item) => {
            const st = getStatus(item, counts[item.id])
            const n  = parseInt(counts[item.id], 10)
            return (
              <div key={item.id} className={`px-4 py-3.5 transition-colors ${st === 'alert' ? 'bg-red-50' : st === 'low' ? 'bg-amber-50/50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl select-none flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium text-sm leading-tight">{item.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-gray-400 text-xs">Min: {item.min} {item.unit}</p>
                      {st === 'alert' && <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full">🚨 LOW</span>}
                      {st === 'low'   && <span className="text-xs font-semibold text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">⚠️ LOW</span>}
                      {st === 'ok'    && <span className="text-xs font-semibold text-green-600 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">✓ OK</span>}
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button type="button" onClick={() => { const c = parseInt(counts[item.id], 10) || 0; if (c > 0) handleCount(item.id, String(c - 1)) }}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-base flex items-center justify-center transition-colors active:scale-90">
                      −
                    </button>
                    <input type="number" min="0" value={counts[item.id]} onChange={(e) => handleCount(item.id, e.target.value)} placeholder="0"
                      className={`w-14 text-center bg-white font-bold text-sm outline-none rounded-lg px-1 py-2 border transition-colors ${
                        st === 'alert' ? 'border-red-400 text-red-700 focus:ring-2 focus:ring-red-200' :
                        st === 'low'   ? 'border-amber-400 text-amber-700 focus:ring-2 focus:ring-amber-200' :
                        st === 'ok'    ? 'border-green-400 text-green-700 focus:ring-2 focus:ring-green-200' :
                        'border-gray-300 text-gray-900 focus:border-brand focus:ring-2 focus:ring-brand/20'}`} />
                    <button type="button" onClick={() => { const c = parseInt(counts[item.id], 10) || 0; handleCount(item.id, String(c + 1)) }}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-base flex items-center justify-center transition-colors active:scale-90">
                      +
                    </button>
                  </div>
                </div>

                {/* Threshold bar */}
                {counts[item.id] !== '' && !isNaN(n) && (
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
                    <div className={`h-1 rounded-full transition-all duration-300 ${st === 'alert' ? 'bg-red-500' : st === 'low' ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((n / (item.min * 2)) * 100, 100)}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className={LABEL}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery expected, items running low, etc..."
          rows={2} className={INPUT + ' resize-none'} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">⚠️ {error}</div>}

      <button type="submit" disabled={status === 'loading' || !location}
        className={`w-full font-semibold py-4 rounded-xl text-sm transition-all shadow-sm ${
          status === 'loading' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
          location
            ? currentAlerts.length > 0
              ? 'bg-red-600 hover:bg-red-700 text-white active:scale-[0.98]'
              : 'bg-brand hover:bg-brand-dark text-white active:scale-[0.98]'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}>
        {status === 'loading' ? 'Submitting...' :
         currentAlerts.length > 0 ? `Submit with ${currentAlerts.length} Alert${currentAlerts.length > 1 ? 's' : ''}` :
         'Submit Stock-Take'}
      </button>

      <p className="text-center text-gray-400 text-xs pb-2">Shreve Cleaning Services · Quality Shield v2</p>
    </form>
  )
}
