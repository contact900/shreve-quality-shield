import { useState, useCallback } from 'react'
import Header       from './components/Header'
import ScoreItem    from './components/ScoreItem'
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
  { id: 'trash_liners', label: 'Consumables Filled?', subtitle: 'Emptied & Relined'      },
  { id: 'glass',        label: 'Glass',             subtitle: 'Streak-free Windows'    },
]

export const INVENTORY_ITEMS = [
  { id: 'multi_surface', label: 'Multi-Surface Cleaner', unit: 'bottles', min: 5  },
  { id: 'paper_towels',  label: 'Paper Towels',          unit: 'rolls',   min: 10 },
  { id: 'liners',        label: 'Liners',                unit: 'boxes',   min: 20 },
  { id: 'disinfectant',  label: 'Disinfectant',          unit: 'bottles', min: 3  },
]

const LOCATION_SLACK_CHANNELS = {
  'Stribling Swepco':         '#stribling-swepco',
  'Rogers Swepco':            '#rogers-swepco',
  'Fayetteville Swepco':      '#fayetteville-swepco',
  'Springdale Swepco':        '#springdale-swepco',
  'Greenwood Swepco':         '#greenwood-swepco',
  'Fayetteville BofA':        '#fayetteville-bofa',
  'Springdale BofA':          '#springdale-bofa',
  'Rogers BofA':              '#rogers-bofa',
  'Fort Smith Merrill Lynch':  '#fort-smith-merrill-lynch',
  'CSL Plasma':               '#csl-plasma',
}

const initialScores    = SCORE_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: 0 }),    {})
const initialPhotos    = SCORE_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: null }), {})
const initialItemNotes = SCORE_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: '' }),   {})
const initialInventory = INVENTORY_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: '' }), {})

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
  const [location,     setLocation]     = useState('')
  const [inspector,    setInspector]    = useState('Stacey')
  const [scores,       setScores]       = useState(initialScores)
  const [photos,       setPhotos]       = useState(initialPhotos)
  const [itemNotes,    setItemNotes]    = useState(initialItemNotes)
  const [upsells,      setUpsells]      = useState({ floor_scrub_wax: false, window_detail: false })
  const [upsellPhotos, setUpsellPhotos] = useState({ floor_scrub_wax: null, window_detail: null })
  const [notes,        setNotes]        = useState('')
  const [submission,   setSubmission]   = useState({ status: 'idle', message: '' })

  const scoredCount      = Object.values(scores).filter((s) => s > 0).length
  const photoCoveredIds  = Object.entries(photos).filter(([, v]) => v !== null).map(([k]) => k)
  const missingPhotos    = SCORE_ITEMS.filter((i) => !photos[i.id])
  const allPhotosDone    = missingPhotos.length === 0
  const totalScore       = Object.values(scores).reduce((a, b) => a + b, 0)
  const fullAvg          = totalScore / 8
  const grade            = scoredCount === 8 ? getGrade(fullAvg) : null
  const upsellPhotosValid = (!upsells.floor_scrub_wax || !!upsellPhotos.floor_scrub_wax) &&
                            (!upsells.window_detail   || !!upsellPhotos.window_detail)
  const canSubmit        = scoredCount === 8 && allPhotosDone && !!location && upsellPhotosValid

  const handleScore    = useCallback((id, value) => setScores((p)    => ({ ...p, [id]: value })), [])
  const handleItemNote = useCallback((id, text)  => setItemNotes((p) => ({ ...p, [id]: text })),  [])

  const handlePhoto = useCallback(async (itemId, file) => {
    if (!file) { setPhotos((p) => ({ ...p, [itemId]: null })); return }
    const base64 = await resizeImage(file)
    setPhotos((p) => ({ ...p, [itemId]: { base64, preview: base64 } }))
  }, [])

  const handleUpsellPhoto = useCallback(async (key, file) => {
    if (!file) { setUpsellPhotos((p) => ({ ...p, [key]: null })); return }
    const base64 = await resizeImage(file)
    setUpsellPhotos((p) => ({ ...p, [key]: { base64, preview: base64 } }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!location)         { setSubmission({ status: 'error', message: 'Please select a location.' }); return }
    if (scoredCount < 8)   { setSubmission({ status: 'error', message: `Rate all 8 areas. ${8 - scoredCount} still need a score.` }); return }
    if (!allPhotosDone)    { setSubmission({ status: 'error', message: `Missing photos for: ${missingPhotos.map((i) => i.label).join(', ')}.` }); return }
    if (!upsellPhotosValid){ setSubmission({ status: 'error', message: 'A photo is required for each selected specialty add-on.' }); return }
    if (!WEBHOOK_URL)      { setSubmission({ status: 'error', message: 'Webhook URL not configured. Set VITE_WEBHOOK_URL in .env.' }); return }

    setSubmission({ status: 'loading', message: '' })

    const item_photos = SCORE_ITEMS.map((item) => ({
      item_id: item.id, item_label: item.label,
      base64: photos[item.id]?.base64 || null,
      note: itemNotes[item.id] || '',
    })).filter((p) => p.base64)

    const payload = {
      type: 'inspection', timestamp: new Date().toISOString(), week_of: getMondayOfCurrentWeek(),
      location, inspector,
      slack_channel: LOCATION_SLACK_CHANNELS[location] || '#general',
      scores, total_score: totalScore, average_score: fullAvg.toFixed(2), grade: grade?.letter || 'N/A',
      upsells,
      upsell_photos: {
        floor_scrub_wax: upsellPhotos.floor_scrub_wax?.base64 || null,
        window_detail:   upsellPhotos.window_detail?.base64   || null,
      },
      notes, item_photos,
    }

    try {
      await fetch(WEBHOOK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
      setTimeout(() => { setSubmission({ status: 'success', message: '' }); onSuccess({ grade, totalScore, location, alerts: [] }) }, 1200)
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
              value={scores[item.id]} photo={photos[item.id]} note={itemNotes[item.id]}
              onChange={(v) => handleScore(item.id, v)}
              onPhoto={(file) => handlePhoto(item.id, file)}
              onNote={(text) => handleItemNote(item.id, text)} />
          ))}
        </div>

        {scoredCount > 0 && <ScoreSummary totalScore={totalScore} scoredCount={scoredCount} grade={grade} maxScore={40} />}
      </section>

      {/* ── Specialty Add-ons ──────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <SectionTitle>Specialty Add-ons</SectionTitle>

        <Toggle label="Floor Scrub / Wax Needed?" description="Add-on deep floor service" icon="🧹"
          checked={upsells.floor_scrub_wax} onChange={(v) => { setUpsells((p) => ({ ...p, floor_scrub_wax: v })); if (!v) setUpsellPhotos((p) => ({ ...p, floor_scrub_wax: null })) }} />
        {upsells.floor_scrub_wax && (
          <div className="mt-2 ml-1 pl-3 border-l-2 border-amber-200">
            <input id="upsell-photo-floor" type="file" accept="image/*" capture="environment"
              onChange={(e) => handleUpsellPhoto('floor_scrub_wax', e.target.files?.[0] || null)}
              className="hidden" />
            {!upsellPhotos.floor_scrub_wax ? (
              <label htmlFor="upsell-photo-floor"
                className="flex items-center gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-1.5 cursor-pointer transition-colors">
                <span className="text-base leading-none select-none">📷</span>
                <span className="text-xs font-medium">Add required photo for floor service</span>
              </label>
            ) : (
              <div className="flex items-center gap-2.5">
                <img src={upsellPhotos.floor_scrub_wax.preview} alt="Floor service evidence"
                  className="w-11 h-11 object-cover rounded-lg border border-green-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-600 text-xs font-semibold leading-tight">Photo captured</p>
                  <p className="text-gray-400 text-xs">Floor Scrub / Wax</p>
                </div>
                <label htmlFor="upsell-photo-floor"
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xs px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors select-none">
                  ↺ Retake
                </label>
                <button type="button" onClick={() => setUpsellPhotos((p) => ({ ...p, floor_scrub_wax: null }))}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 my-2" />

        <Toggle label="Window Detail Needed?" description="Full interior/exterior window service" icon="🪟"
          checked={upsells.window_detail} onChange={(v) => { setUpsells((p) => ({ ...p, window_detail: v })); if (!v) setUpsellPhotos((p) => ({ ...p, window_detail: null })) }} />
        {upsells.window_detail && (
          <div className="mt-2 ml-1 pl-3 border-l-2 border-amber-200">
            <input id="upsell-photo-window" type="file" accept="image/*" capture="environment"
              onChange={(e) => handleUpsellPhoto('window_detail', e.target.files?.[0] || null)}
              className="hidden" />
            {!upsellPhotos.window_detail ? (
              <label htmlFor="upsell-photo-window"
                className="flex items-center gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-1.5 cursor-pointer transition-colors">
                <span className="text-base leading-none select-none">📷</span>
                <span className="text-xs font-medium">Add required photo for window detail</span>
              </label>
            ) : (
              <div className="flex items-center gap-2.5">
                <img src={upsellPhotos.window_detail.preview} alt="Window detail evidence"
                  className="w-11 h-11 object-cover rounded-lg border border-green-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-600 text-xs font-semibold leading-tight">Photo captured</p>
                  <p className="text-gray-400 text-xs">Window Detail</p>
                </div>
                <label htmlFor="upsell-photo-window"
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xs px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors select-none">
                  ↺ Retake
                </label>
                <button type="button" onClick={() => setUpsellPhotos((p) => ({ ...p, window_detail: null }))}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
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
