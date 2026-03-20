import { useState } from 'react'
import { LOCATIONS, LOCATION_SLACK_CHANNELS, SUPPLY_ITEMS } from '../utils'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || ''

const INPUT = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors text-sm'
const LABEL = 'block text-gray-700 text-sm font-medium mb-1.5'

const initialChecks = SUPPLY_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: true  }), {})
const initialNotes  = SUPPLY_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: ''    }), {})

// ── Success Banner ────────────────────────────────────────────────────────────

function SuccessBanner({ unchecked, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 ${unchecked.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
        {unchecked.length > 0 ? '🚨' : '✅'}
      </div>
      <h2 className="text-gray-900 font-bold text-xl mb-1">Supply Check Submitted</h2>
      <p className="text-gray-500 text-sm mb-6">Report sent to your location's Slack channel.</p>

      {unchecked.length > 0 && (
        <div className="w-full bg-red-50 border border-red-300 rounded-xl p-4 mb-6 text-left">
          <p className="text-red-700 font-bold text-sm mb-2">🚨 Items Needing Attention</p>
          {unchecked.map((item) => (
            <div key={item.id} className="mb-1">
              <p className="text-red-600 text-sm font-semibold">• {item.label}</p>
              {item.note && <p className="text-red-500 text-xs ml-3">Note: {item.note}</p>}
            </div>
          ))}
        </div>
      )}

      <button onClick={onReset}
        className="w-full max-w-xs bg-brand hover:bg-brand-dark text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
        New Supply Check
      </button>
    </div>
  )
}

// ── Supply Item Row ───────────────────────────────────────────────────────────

function SupplyRow({ item, checked, note, onCheck, onNote }) {
  const checkLabel = item.frequency === 'facility' ? 'Enough for facility' : 'Enough for a month'

  return (
    <div className={`px-4 py-4 transition-colors ${!checked ? 'bg-red-50' : ''}`}>
      {/* Label + checkbox */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${!checked ? 'text-red-700' : 'text-gray-900'}`}>
            {item.label}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">{checkLabel}</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 select-none mt-0.5">
          <span className={`text-xs font-medium ${checked ? 'text-green-600' : 'text-red-500'}`}>
            {checked ? 'Yes' : 'No'}
          </span>
          <div
            onClick={() => onCheck(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${checked ? 'bg-green-500' : 'bg-red-400'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </label>
      </div>

      {/* Note box — only shown when unchecked */}
      {!checked && (
        <div className="mt-3">
          <textarea
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder={`What's needed for ${item.label.toLowerCase()}?`}
            rows={2}
            className={`${INPUT} resize-none border-red-300 focus:border-red-400 focus:ring-red-200/50 bg-white`}
          />
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [location, setLocation] = useState('')
  const [checks,   setChecks]   = useState(initialChecks)
  const [notes,    setNotes]    = useState(initialNotes)
  const [status,   setStatus]   = useState('idle')
  const [error,    setError]    = useState('')
  const [unchecked, setUnchecked] = useState([])

  const uncheckedItems = SUPPLY_ITEMS.filter((item) => !checks[item.id])

  const handleCheck = (id, val) => setChecks((p) => ({ ...p, [id]: val }))
  const handleNote  = (id, val) => setNotes((p)  => ({ ...p, [id]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!location)    { setError('Please select a location.'); return }
    if (!WEBHOOK_URL) { setError('Webhook URL not configured.'); return }

    setStatus('loading'); setError('')

    const supplies = SUPPLY_ITEMS.reduce((acc, item) => {
      acc[item.id] = { checked: checks[item.id], note: notes[item.id] || '' }
      return acc
    }, {})

    const uncheckedList = SUPPLY_ITEMS
      .filter((item) => !checks[item.id])
      .map((item) => ({ id: item.id, label: item.label, note: notes[item.id] || '' }))

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          type: 'inventory',
          timestamp: new Date().toISOString(),
          location,
          slack_channel: LOCATION_SLACK_CHANNELS[location] || '#general',
          supplies,
          unchecked_items: uncheckedList,
        }),
      })
      setTimeout(() => { setUnchecked(uncheckedList); setStatus('success') }, 1000)
    } catch {
      setError('Network error. Check your connection.')
      setStatus('idle')
    }
  }

  const handleReset = () => {
    setLocation(''); setChecks(initialChecks); setNotes(initialNotes)
    setStatus('idle'); setError(''); setUnchecked([])
  }

  if (status === 'success') {
    return <div className="max-w-lg mx-auto"><SuccessBanner unchecked={unchecked} onReset={handleReset} /></div>
  }

  // Group items: regular supplies first, then consumables
  const regularItems    = SUPPLY_ITEMS.filter((i) => !i.consumable)
  const consumableItems = SUPPLY_ITEMS.filter((i) =>  i.consumable)

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-4">

      <div className="text-center py-2">
        <h2 className="text-gray-900 font-bold text-lg mb-1">Supply Check</h2>
        <p className="text-gray-500 text-sm">
          Toggle each item. Anything turned <span className="text-red-600 font-semibold">off</span> will be flagged in the dashboard.
        </p>
      </div>

      {/* Red alert preview */}
      {uncheckedItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <p className="text-red-700 font-bold text-sm mb-1">
            🚨 {uncheckedItems.length} item{uncheckedItems.length > 1 ? 's' : ''} will be flagged
          </p>
          {uncheckedItems.map((i) => (
            <p key={i.id} className="text-red-600 text-xs">• {i.label}</p>
          ))}
        </div>
      )}

      {/* Location */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className={LABEL}>Location <span className="text-red-500">*</span></label>
        <div className="relative">
          <select value={location} onChange={(e) => setLocation(e.target.value)}
            className={INPUT + ' appearance-none pr-10 cursor-pointer'}>
            <option value="">— Select Location —</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</div>
        </div>
      </div>

      {/* Supplies */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <h3 className="text-gray-900 font-semibold text-sm">Supplies</h3>
          <p className="text-gray-400 text-xs mt-0.5">Toggle off anything that is low or missing</p>
        </div>
        <div className="divide-y divide-gray-100">
          {regularItems.map((item) => (
            <SupplyRow key={item.id} item={item}
              checked={checks[item.id]} note={notes[item.id]}
              onCheck={(v) => handleCheck(item.id, v)}
              onNote={(v)  => handleNote(item.id, v)} />
          ))}
        </div>
      </section>

      {/* Consumables */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <h3 className="text-gray-900 font-semibold text-sm">Consumables</h3>
          <p className="text-gray-400 text-xs mt-0.5">Restroom & facility stock</p>
        </div>
        <div className="divide-y divide-gray-100">
          {consumableItems.map((item) => (
            <SupplyRow key={item.id} item={item}
              checked={checks[item.id]} note={notes[item.id]}
              onCheck={(v) => handleCheck(item.id, v)}
              onNote={(v)  => handleNote(item.id, v)} />
          ))}
        </div>
      </section>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">⚠️ {error}</div>}

      <button type="submit" disabled={status === 'loading' || !location}
        className={`w-full font-semibold py-4 rounded-xl text-sm transition-all shadow-sm ${
          status === 'loading' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
          location
            ? uncheckedItems.length > 0
              ? 'bg-red-600 hover:bg-red-700 text-white active:scale-[0.98]'
              : 'bg-brand hover:bg-brand-dark text-white active:scale-[0.98]'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}>
        {status === 'loading' ? 'Submitting...' :
         uncheckedItems.length > 0
           ? `Submit with ${uncheckedItems.length} Flag${uncheckedItems.length > 1 ? 's' : ''}`
           : 'Submit Supply Check'}
      </button>

      <p className="text-center text-gray-400 text-xs pb-2">Shreve Cleaning Services · Quality Shield v2</p>
    </form>
  )
}
