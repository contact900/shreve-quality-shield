import { useState, useCallback } from 'react'
import Header       from './components/Header'
import ScoreItem    from './components/ScoreItem'
import GpsCapture   from './components/GpsCapture'
import Toggle       from './components/Toggle'
import ScoreSummary from './components/ScoreSummary'
import QRScanner        from './components/QRScanner'
import Inventory        from './components/Inventory'
import ManagerDashboard from './components/ManagerDashboard'

// ── Constants ────────────────────────────────────────────────────────────────

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || ''

const LOCATIONS = [
  'Stribling Swepco',
  'Rogers Swepco',
  'Fayetteville Swepco',
  'Springdale Swepco',
  'Greenwood Swepco',
  'Fayetteville BofA',
  'Springdale BofA',
  'Rogers BofA',
  'Fort Smith Merrill Lynch',
  'CSL Plasma',
]

const SCORE_ITEMS = [
  { id: 'entry_lobby',  label: 'Entry / Lobby',    subtitle: 'First Impressions'      },
  { id: 'restrooms',    label: 'Restrooms',         subtitle: 'Sanitization & Odor'    },
  { id: 'breakroom',    label: 'Breakroom',         subtitle: 'Surfaces & Sinks'       },
  { id: 'high_touch',   label: 'High-Touch Points', subtitle: 'Light Switches / Knobs' },
  { id: 'floor_care',   label: 'Floor Care',        subtitle: 'Debris-free / Shine'    },
  { id: 'dusting',      label: 'Dusting',           subtitle: 'Horizontal & Vertical'  },
  { id: 'trash_liners', label: 'Trash / Liners',    subtitle: 'Emptied & Relined'      },
  { id: 'glass',        label: 'Glass',             subtitle: 'Streak-free Windows'    },
]

export const INVENTORY_ITEMS = [
  { id: 'multi_surface', label: 'Multi-Surface Cleaner', unit: 'bottles', min: 5  },
  { id: 'paper_towels',  label: 'Paper Towels',          unit: 'rolls',   min: 10 },
  { id: 'liners',        label: 'Liners',                unit: 'boxes',   min: 20 },
  { id: 'disinfectant',  label: 'Disinfectant',          unit: 'bottles', min: 3  },
]

const initialScores    = SCORE_ITEMS.reduce((acc, i)    => ({ ...acc, [i.id]: 0 }),    {})
const initialPhotos    = SCORE_ITEMS.reduce((acc, i)    => ({ ...acc, [i.id]: null }), {})
const initialInventory = INVENTORY_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: '' }),  {})

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getGrade(avg) {
  if (avg >= 4.5) return { letter: 'A', label: 'Excellent',  color: 'text-green-500'  }
  if (avg >= 3.5) return { letter: 'B', label: 'Good',       color: 'text-lime-500'   }
  if (avg >= 2.5) return { letter: 'C', label: 'Acceptable', color: 'text-amber-500'  }
  if (avg >= 1.5) return { letter: 'D', label: 'Poor',       color: 'text-orange-500' }
  return                 { letter: 'F', label: 'Critical',   color: 'text-red-500'    }
}

function getMondayOfCurrentWeek() {
  const d   = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = ({ target: { result } }) => {
      const img = new Image()
      img.onload = () => {
        const MAX    = 800
        const ratio  = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.65))
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  })
}

// ── Shared form styles ────────────────────────────────────────────────────────

const INPUT = 'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors text-sm'
const LABEL = 'block text-gray-700 text-sm font-medium mb-1.5'

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'inspection', label: 'Inspection', icon: '🛡️' },
  { id: 'equipment',  label: 'Equipment',  icon: '🔍' },
  { id: 'inventory',  label: 'Inventory',  icon: '📦' },
  { id: 'dashboard',  label: 'Dashboard',  icon: '📊' },
]

function TabBar({ active, onChange }) {
  return (
    <div className="sticky top-[57px] z-40 bg-white border-b border-gray-200">
      <div className="max-w-lg mx-auto flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold
              border-b-2 transition-colors
              ${active === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-400 hover:text-gray-600'}
            `}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

function SectionTitle({ children, meta }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-gray-900 font-semibold text-base">{children}</h2>
      {meta}
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

const GRADE_COLORS = { A: '#16a34a', B: '#65a30d', C: '#d97706', D: '#ea580c', F: '#dc2626' }

function SuccessScreen({ grade, totalScore, location, alerts, onReset }) {
  const pct      = Math.round((totalScore / 40) * 100)
  const barColor =
    pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-lime-500' :
    pct >= 50 ? 'bg-amber-400' : pct >= 30 ? 'bg-orange-400' : 'bg-red-500'
  const bgColor  = GRADE_COLORS[grade?.letter] || '#0047AB'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">

        {/* Grade badge */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl text-white font-black text-5xl mb-3"
            style={{ backgroundColor: bgColor }}
          >
            {grade?.letter}
          </div>
          <p className="text-gray-500 text-sm font-medium">{grade?.label}</p>
        </div>

        {/* Score card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 shadow-sm">
          <div className="text-center mb-4">
            <p className="text-gray-500 text-xs font-medium mb-1">
              {location} · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="text-gray-900 font-black text-5xl tabular-nums">
              {totalScore}
              <span className="text-gray-400 text-xl font-normal"> / 40</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0</span><span>40 pts</span></div>
        </div>

        {/* RED ALERT */}
        {alerts.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4">
            <p className="text-red-700 font-bold text-sm mb-1">🚨 Reorder Alerts Sent</p>
            {alerts.map((a) => (
              <p key={a.id} className="text-red-600 text-sm">
                • {a.label}: {a.count} {a.unit} (min {a.min})
              </p>
            ))}
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mb-6">
          Report emailed · Data synced to Google Sheets
        </p>

        <button onClick={onReset}
          className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-4 rounded-xl text-base transition-colors shadow-sm">
          Start New Inspection
        </button>
      </div>
    </div>
  )
}

// ── Inspection tab ────────────────────────────────────────────────────────────

function InspectionTab({ onSuccess }) {
  const [location,   setLocation]   = useState('')
  const [inspector,  setInspector]  = useState('Stacey')
  const [gps,        setGps]        = useState({ lat: null, lng: null, status: 'idle', error: '', accuracy: null })
  const [scores,     setScores]     = useState(initialScores)
  const [photos,     setPhotos]     = useState(initialPhotos)
  const [inventory,  setInventory]  = useState(initialInventory)
  const [upsells,    setUpsells]    = useState({ floor_scrub_wax: false, window_detail: false })
  const [notes,      setNotes]      = useState('')
  const [submission, setSubmission] = useState({ status: 'idle', message: '' })

  const scoredCount     = Object.values(scores).filter((s) => s > 0).length
  const photoCoveredIds = Object.entries(photos).filter(([, v]) => v !== null).map(([k]) => k)
  const missingPhotos   = SCORE_ITEMS.filter((i) => !photos[i.id])
  const allPhotosDone   = missingPhotos.length === 0
  const totalScore      = Object.values(scores).reduce((a, b) => a + b, 0)
  const fullAvg         = totalScore / 8
  const grade           = scoredCount === 8 ? getGrade(fullAvg) : null
  const canSubmit       = scoredCount === 8 && allPhotosDone && !!location

  const inventoryAlerts = INVENTORY_ITEMS.filter((item) => {
    const n = parseInt(inventory[item.id], 10)
    return !isNaN(n) && n < item.min
  }).map((item) => ({ ...item, count: parseInt(inventory[item.id], 10) }))

  const handleScore = useCallback((id, value) => setScores((p) => ({ ...p, [id]: value })), [])

  const handlePhoto = useCallback(async (itemId, file) => {
    if (!file) { setPhotos((p) => ({ ...p, [itemId]: null })); return }
    const base64 = await resizeImage(file)
    setPhotos((p) => ({ ...p, [itemId]: { base64, preview: base64 } }))
  }, [])

  const captureGps = useCallback(() => {
    if (!navigator.geolocation) { setGps((p) => ({ ...p, status: 'error', error: 'Geolocation not supported.' })); return }
    setGps({ lat: null, lng: null, status: 'loading', error: '', accuracy: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6), status: 'captured', error: '', accuracy: Math.round(pos.coords.accuracy) }),
      (err) => setGps({ lat: null, lng: null, status: 'error', error: err.message, accuracy: null }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!location)        { setSubmission({ status: 'error', message: 'Please select a location.' }); return }
    if (scoredCount < 8)  { setSubmission({ status: 'error', message: `Rate all 8 areas. ${8 - scoredCount} still need a score.` }); return }
    if (!allPhotosDone)   { setSubmission({ status: 'error', message: `Missing photos for: ${missingPhotos.map((i) => i.label).join(', ')}.` }); return }
    if (!WEBHOOK_URL)     { setSubmission({ status: 'error', message: 'Webhook URL not configured. Set VITE_WEBHOOK_URL in .env.' }); return }

    setSubmission({ status: 'loading', message: '' })

    const item_photos = SCORE_ITEMS.map((item) => ({
      item_id: item.id, item_label: item.label, base64: photos[item.id]?.base64 || null,
    })).filter((p) => p.base64)

    const payload = {
      type: 'inspection', timestamp: new Date().toISOString(), week_of: getMondayOfCurrentWeek(),
      location, inspector,
      gps_lat: gps.lat || 'Not captured', gps_lng: gps.lng || 'Not captured',
      gps_accuracy: gps.accuracy ? `±${gps.accuracy}m` : 'N/A',
      scores, total_score: totalScore, average_score: fullAvg.toFixed(2), grade: grade?.letter || 'N/A',
      upsells,
      inventory: INVENTORY_ITEMS.reduce((acc, item) => { acc[item.id] = parseInt(inventory[item.id], 10) || 0; return acc }, {}),
      inventory_alerts: inventoryAlerts.map((a) => ({ id: a.id, label: a.label, count: a.count, min: a.min })),
      notes, item_photos,
    }

    try {
      await fetch(WEBHOOK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
      setTimeout(() => { setSubmission({ status: 'success', message: '' }); onSuccess({ grade, totalScore, location, alerts: inventoryAlerts }) }, 1200)
    } catch {
      setSubmission({ status: 'error', message: 'Network error. Check your connection.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-4">

      <p className="text-center text-gray-400 text-xs py-1">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {/* ── Inspection Details ──────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
        <SectionTitle>Inspection Details</SectionTitle>

        <div>
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

        <div>
          <label className={LABEL}>Inspector</label>
          <input type="text" value={inspector} onChange={(e) => setInspector(e.target.value)}
            placeholder="Inspector name" className={INPUT} />
        </div>

        <GpsCapture gps={gps} onCapture={captureGps} />
      </section>

      {/* ── 8-Point Scorecard ──────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <SectionTitle
          meta={
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              allPhotosDone && scoredCount === 8
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-gray-50 text-gray-400 border-gray-200'
            }`}>
              {photoCoveredIds.length}/8 photos
            </span>
          }
        >
          8-Point Scorecard
        </SectionTitle>
        <p className="text-gray-400 text-xs mb-4 -mt-3">
          Rate each area 1–5 and capture one photo per area to unlock submission.
        </p>

        <div className="space-y-3">
          {SCORE_ITEMS.map((item, idx) => (
            <ScoreItem key={item.id} number={idx + 1} item={item}
              value={scores[item.id]} photo={photos[item.id]}
              onChange={(v) => handleScore(item.id, v)}
              onPhoto={(file) => handlePhoto(item.id, file)} />
          ))}
        </div>

        {scoredCount > 0 && <ScoreSummary totalScore={totalScore} scoredCount={scoredCount} grade={grade} maxScore={40} />}
      </section>

      {/* ── Supply Inventory ───────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-gray-900 font-semibold text-base">Supply Inventory</h2>
          <p className="text-gray-400 text-xs mt-0.5">Items below minimum will trigger a reorder alert.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {INVENTORY_ITEMS.map((item) => {
            const count   = parseInt(inventory[item.id], 10)
            const isAlert = !isNaN(count) && count < item.min
            return (
              <div key={item.id} className={`px-5 py-3.5 ${isAlert ? 'bg-red-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium text-sm">{item.label}</p>
                    <p className="text-gray-400 text-xs">Min: {item.min} {item.unit}</p>
                  </div>
                  {isAlert && (
                    <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                      🚨 LOW
                    </span>
                  )}
                  <input type="number" min="0" value={inventory[item.id]}
                    onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setInventory((p) => ({ ...p, [item.id]: v })) }}
                    placeholder="0"
                    className={`w-20 text-center bg-white border rounded-lg px-2 py-2 text-gray-900 font-semibold text-sm outline-none transition-colors ${
                      isAlert ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/20'}`} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Specialty Add-ons ──────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <SectionTitle>Specialty Add-ons</SectionTitle>
        <Toggle label="Floor Scrub / Wax Needed?" description="Add-on deep floor service" icon="🧹"
          checked={upsells.floor_scrub_wax} onChange={(v) => setUpsells((p) => ({ ...p, floor_scrub_wax: v }))} />
        <div className="border-t border-gray-100 my-1" />
        <Toggle label="Window Detail Needed?" description="Full interior/exterior window service" icon="🪟"
          checked={upsells.window_detail} onChange={(v) => setUpsells((p) => ({ ...p, window_detail: v }))} />
      </section>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <label className={LABEL}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Issues found, commendations, follow-up items..."
          rows={3} className={INPUT + ' resize-none'} />
      </section>

      {/* Photo reminder */}
      {!allPhotosDone && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">📷</span>
          <span>Photo required for: <strong>{missingPhotos.map((i) => i.label).join(', ')}</strong></span>
        </div>
      )}

      {/* Error */}
      {submission.status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>{submission.message}</span>
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={submission.status === 'loading' || !canSubmit}
        className={`
          w-full font-semibold py-4 rounded-xl text-base transition-all shadow-sm
          ${submission.status === 'loading'
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : canSubmit
              ? 'bg-brand hover:bg-brand-dark text-white active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
        `}
      >
        {submission.status === 'loading'
          ? 'Submitting report...'
          : canSubmit
            ? 'Submit Inspection Report'
            : `${8 - scoredCount > 0 ? `Score ${8 - scoredCount} more area${8 - scoredCount > 1 ? 's' : ''}` : `Add ${missingPhotos.length} more photo${missingPhotos.length > 1 ? 's' : ''}`} to unlock`
        }
      </button>

      <p className="text-center text-gray-400 text-xs pb-2">Shreve Cleaning Services · Quality Shield v2</p>
    </form>
  )
}

// ── Root app ──────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab,   setActiveTab]   = useState('inspection')
  const [successData, setSuccessData] = useState(null)

  const handleInspectionSuccess = useCallback((data) => setSuccessData(data), [])
  const handleReset             = useCallback(() => { setSuccessData(null); setActiveTab('inspection') }, [])

  if (successData) return <SuccessScreen {...successData} onReset={handleReset} />

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <TabBar active={activeTab} onChange={setActiveTab} />
      {activeTab === 'inspection' && <InspectionTab onSuccess={handleInspectionSuccess} />}
      {activeTab === 'equipment'  && <QRScanner />}
      {activeTab === 'inventory'  && <Inventory />}
      {activeTab === 'dashboard'  && <ManagerDashboard />}
    </div>
  )
}
