import { useEffect, useRef, useState } from 'react'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || ''

const LOCATIONS = [
  'Stribling Swepco', 'Rogers Swepco', 'Fayetteville Swepco',
  'Springdale Swepco', 'Greenwood Swepco', 'Fayetteville BofA',
  'Springdale BofA', 'Rogers BofA', 'Fort Smith Merrill Lynch', 'CSL Plasma',
]

// ── Shared input class ────────────────────────────────────────────────────────

const INPUT = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors text-sm'
const LABEL = 'block text-gray-700 text-sm font-medium mb-1.5'

// ── Success ───────────────────────────────────────────────────────────────────

function AssetSuccess({ equipmentId, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl mb-4">✅</div>
      <h2 className="text-gray-900 font-bold text-xl mb-1">Equipment Logged</h2>
      <p className="text-gray-500 text-sm mb-2">
        Asset <span className="text-brand font-semibold">{equipmentId}</span> synced to Assets sheet.
      </p>
      <button
        onClick={onReset}
        className="mt-8 w-full max-w-xs bg-brand hover:bg-brand-dark text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        Scan Another Asset
      </button>
    </div>
  )
}

// ── Camera scanner ────────────────────────────────────────────────────────────

function CameraScanner({ onScan }) {
  const regionId  = 'qr-region'
  const scannerRef = useRef(null)

  useEffect(() => {
    let scanner
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      scanner = new Html5QrcodeScanner(
        regionId,
        { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true, aspectRatio: 1 },
        false,
      )
      scanner.render(
        (text) => { scanner.pause(); onScan(text.trim()) },
        (err) => { if (!String(err).includes('No MultiFormat Readers')) console.warn(err) },
      )
      scannerRef.current = scanner
    })
    return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}) }
  }, [onScan])

  return (
    <div>
      <style>{`
        #qr-region { border-radius: 10px; overflow: hidden; background: #f9fafb; }
        #qr-region video { border-radius: 6px; }
        #qr-region__header_message { display: none; }
      `}</style>
      <div id={regionId} className="w-full" />
    </div>
  )
}

// ── Asset form ────────────────────────────────────────────────────────────────

function AssetForm({ equipmentId, onRescan }) {
  const [location,        setLocation]        = useState('')
  const [condition,       setCondition]       = useState('')
  const [filterNeeded,    setFilterNeeded]    = useState(false)
  const [workingProperly, setWorkingProperly] = useState(true)
  const [notes,           setNotes]           = useState('')
  const [status,          setStatus]          = useState('idle')
  const [error,           setError]           = useState('')

  const conditionStyle = {
    Good: 'bg-green-500 border-green-500 text-white',
    Fair: 'bg-amber-400 border-amber-400 text-gray-900',
    Poor: 'bg-red-500 border-red-500 text-white',
  }
  const conditionInactive = 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'

  const canSubmit = !!location && !!condition

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) { setError('Select a location and condition.'); return }
    if (!WEBHOOK_URL) { setError('Webhook URL not configured.'); return }
    setStatus('loading'); setError('')
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'asset', timestamp: new Date().toISOString(),
          equipment_id: equipmentId, location, condition,
          filter_needed: filterNeeded, working_properly: workingProperly, notes }),
      })
      setTimeout(() => setStatus('success'), 1000)
    } catch { setError('Network error.'); setStatus('idle') }
  }

  if (status === 'success') return <AssetSuccess equipmentId={equipmentId} onReset={onRescan} />

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-12">

      {/* Scanned ID banner */}
      <div className="bg-brand-light border border-brand/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl select-none">🔍</span>
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs">Equipment ID</p>
          <p className="text-brand font-bold text-base tracking-wide">{equipmentId}</p>
        </div>
        <button type="button" onClick={onRescan}
          className="text-gray-400 hover:text-gray-600 text-xs border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">
          ↺ Rescan
        </button>
      </div>

      {/* Location */}
      <div>
        <label className={LABEL}>Location <span className="text-red-500">*</span></label>
        <div className="relative">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={INPUT + ' appearance-none pr-10 cursor-pointer'}>
            <option value="">— Select Location —</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</div>
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className={LABEL}>Overall Condition <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          {['Good', 'Fair', 'Poor'].map((c) => (
            <button key={c} type="button" onClick={() => setCondition(c)}
              className={`flex-1 py-3 rounded-lg border font-semibold text-sm transition-all active:scale-95 ${condition === c ? conditionStyle[c] : conditionInactive}`}>
              {c === 'Good' ? '✅ Good' : c === 'Fair' ? '⚠️ Fair' : '🔴 Poor'}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {/* Filter needed */}
        <div className="flex items-center gap-3 p-4">
          <span className="text-lg select-none">🔧</span>
          <div className="flex-1">
            <p className="text-gray-800 font-medium text-sm">New Filter Needed?</p>
            <p className="text-gray-400 text-xs">Flag for replacement on next visit</p>
          </div>
          <button type="button" role="switch" aria-checked={filterNeeded}
            onClick={() => setFilterNeeded((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${filterNeeded ? 'bg-amber-400' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${filterNeeded ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-semibold w-6 ${filterNeeded ? 'text-amber-600' : 'text-gray-400'}`}>{filterNeeded ? 'YES' : 'NO'}</span>
        </div>
        {/* Working properly */}
        <div className="flex items-center gap-3 p-4">
          <span className="text-lg select-none">⚡</span>
          <div className="flex-1">
            <p className="text-gray-800 font-medium text-sm">Working Properly?</p>
            <p className="text-gray-400 text-xs">Equipment functions as expected</p>
          </div>
          <button type="button" role="switch" aria-checked={workingProperly}
            onClick={() => setWorkingProperly((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${workingProperly ? 'bg-green-500' : 'bg-red-400'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${workingProperly ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-semibold w-6 ${workingProperly ? 'text-green-600' : 'text-red-500'}`}>{workingProperly ? 'YES' : 'NO'}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Serial number, issue description, context..."
          rows={3} className={INPUT + ' resize-none'} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">⚠️ {error}</div>}

      <button type="submit" disabled={status === 'loading' || !canSubmit}
        className={`w-full font-semibold py-4 rounded-xl text-sm transition-all ${
          status === 'loading' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
          canSubmit ? 'bg-brand hover:bg-brand-dark text-white shadow-sm active:scale-[0.98]' :
          'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
        {status === 'loading' ? 'Logging asset...' : 'Log Equipment'}
      </button>
    </form>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function QRScanner() {
  const [scannedId, setScannedId] = useState(null)
  const [manualId,  setManualId]  = useState('')
  const [mode,      setMode]      = useState('scan')

  const handleRescan = () => { setScannedId(null); setManualId(''); setMode('scan') }

  if (scannedId) {
    return <div className="max-w-lg mx-auto pt-4"><AssetForm equipmentId={scannedId} onRescan={handleRescan} /></div>
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-4">
      <div className="text-center py-2">
        <h2 className="text-gray-900 font-bold text-lg mb-1">QR Asset Tracker</h2>
        <p className="text-gray-500 text-sm">Scan an equipment QR code or enter the ID manually.</p>
      </div>

      {/* Mode switcher */}
      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
        {[['scan', '📷 Scan QR Code'], ['manual', '⌨️ Enter Manually']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMode(id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              mode === id ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'scan' ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <CameraScanner onScan={setScannedId} />
          <p className="text-gray-400 text-xs text-center mt-3">Point camera at the QR code on the equipment label.</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (manualId.trim()) setScannedId(manualId.trim()) }}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className={LABEL}>Equipment ID / Serial Number</label>
            <input type="text" value={manualId} onChange={(e) => setManualId(e.target.value)}
              placeholder="e.g. VAC-001, MOP-003..." autoFocus
              className={INPUT + ' uppercase'} />
          </div>
          <button type="submit" disabled={!manualId.trim()}
            className={`w-full font-semibold py-3.5 rounded-xl text-sm transition-colors ${
              manualId.trim() ? 'bg-brand hover:bg-brand-dark text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            Continue →
          </button>
        </form>
      )}
    </div>
  )
}
