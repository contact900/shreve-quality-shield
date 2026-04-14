import { useState, useEffect, useCallback } from 'react'
import { SUPPLY_ITEMS } from '../utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || ''

const STATUS = {
  red:     { label: 'Needs Attention', dot: 'bg-red-500',    ring: 'ring-red-200',    badge: 'bg-red-50 text-red-700 border-red-200'       },
  yellow:  { label: 'Minor Issues',    dot: 'bg-yellow-400', ring: 'ring-yellow-200', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  green:   { label: 'All Good',        dot: 'bg-green-500',  ring: 'ring-green-200',  badge: 'bg-green-50 text-green-700 border-green-200'   },
  unknown: { label: 'No Data',         dot: 'bg-gray-300',   ring: 'ring-gray-200',   badge: 'bg-gray-50 text-gray-500 border-gray-200'      },
}

const CONDITION_COLORS = {
  Good: { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  Fair: { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  Poor: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status, size = 'md' }) {
  const cfg = STATUS[status] || STATUS.unknown
  const sz = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  return <span className={`inline-block ${sz} rounded-full ${cfg.dot} flex-shrink-0`} />
}

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.unknown
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
      <StatusDot status={status} size="sm" />
      {cfg.label}
    </span>
  )
}

// ── Inventory Snapshot ────────────────────────────────────────────────────────

function InventorySnapshot({ supplies, date }) {
  // `supplies` is a map of id -> { checked, note } from the new format
  const hasData = supplies && Object.keys(supplies).length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-gray-800 font-semibold text-sm">Supply Check</h4>
        {date && <span className="text-gray-400 text-xs">Last logged {date}</span>}
      </div>

      {!hasData ? (
        <p className="text-gray-400 text-sm italic py-2">No supply data recorded yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {SUPPLY_ITEMS.map((item) => {
            const entry   = supplies[item.id]
            const checked = entry ? entry.checked : true
            const note    = entry ? entry.note    : ''
            return (
              <div key={item.id} className={`px-4 py-3 ${!checked ? 'bg-red-50' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!checked ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className={`text-sm font-medium truncate ${!checked ? 'text-red-700 font-bold' : 'text-gray-800'}`}>
                      {item.label}
                    </span>
                  </div>
                  {!checked
                    ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">NEEDED</span>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline whitespace-nowrap">
                            Order →
                          </a>
                        )}
                      </div>
                    )
                    : <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex-shrink-0">OK</span>
                  }
                </div>
                {!checked && note && (
                  <p className="text-red-500 text-xs mt-1.5 ml-3.5 italic">{note}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Equipment Health Log ──────────────────────────────────────────────────────

function EquipmentLog({ equipment }) {
  if (!equipment || equipment.length === 0) {
    return (
      <div>
        <h4 className="text-gray-800 font-semibold text-sm mb-3">Equipment Health</h4>
        <p className="text-gray-400 text-sm italic py-2">No equipment scanned for this location.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-gray-800 font-semibold text-sm">Equipment Health</h4>
        <span className="text-gray-400 text-xs">{equipment.length} unit{equipment.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {equipment.map((eq) => {
          const condCfg = CONDITION_COLORS[eq.condition] || CONDITION_COLORS.Fair
          const needsRepair = !eq.workingProperly
          return (
            <div key={eq.id} className={`rounded-lg border px-4 py-3 ${needsRepair ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {eq.id}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${condCfg.bg} ${condCfg.text} ${condCfg.border}`}>
                      {eq.condition}
                    </span>
                    {needsRepair && (
                      <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded">
                        Needs Repair
                      </span>
                    )}
                    {eq.filterNeeded && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Filter Needed
                      </span>
                    )}
                  </div>
                  {eq.notes && (
                    <p className="text-gray-500 text-xs mt-1.5 truncate">{eq.notes}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 text-xs">Last scanned</p>
                  <p className="text-gray-700 text-xs font-semibold">{eq.lastInspected || '—'}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Facility Detail Panel ─────────────────────────────────────────────────────

function FacilityDetail({ facility, onClose }) {
  const { location, status, lastInspection, supplies, inventory, equipment, inventoryDate } = facility

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot status={status} />
          <div className="min-w-0">
            <h3 className="text-gray-900 font-bold text-sm truncate">{location}</h3>
            {lastInspection && (
              <p className="text-gray-400 text-xs">
                Last inspected {lastInspection.date} · Grade{' '}
                <span className="font-bold text-gray-700">{lastInspection.grade}</span>
                {' '}({lastInspection.totalScore}/40)
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-3 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 text-sm font-bold transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Panel body */}
      <div className="p-5 space-y-6">
        <InventorySnapshot
          supplies={supplies || inventory}
          date={inventoryDate}
        />
        <div className="border-t border-gray-100 pt-5">
          <EquipmentLog equipment={equipment} />
        </div>
      </div>
    </div>
  )
}

// ── Facility Row ──────────────────────────────────────────────────────────────

function FacilityRow({ facility, isSelected, onClick }) {
  const { location, status, lastInspection, supplies, inventory, equipment } = facility
  const supplyData  = supplies || {}
  const alertCount  = Object.values(supplyData).filter(v => v && v.checked === false).length
  const repairCount = (equipment || []).filter(e => !e.workingProperly).length

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-gray-50 focus:outline-none focus:bg-gray-50
        ${isSelected ? 'bg-blue-50 border-l-2 border-brand' : 'border-l-2 border-transparent'}`}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <StatusDot status={status} />

        {/* Location name */}
        <span className={`flex-1 text-sm font-semibold min-w-0 truncate ${isSelected ? 'text-brand' : 'text-gray-900'}`}>
          {location}
        </span>

        {/* Alert pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {alertCount > 0 && (
            <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
              {alertCount} low
            </span>
          )}
          {repairCount > 0 && (
            <span className="text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full">
              {repairCount} repair
            </span>
          )}
          {alertCount === 0 && repairCount === 0 && status !== 'unknown' && (
            <span className="text-xs text-gray-400">OK</span>
          )}
        </div>

        {/* Last inspection grade */}
        {lastInspection?.grade && (
          <span className="text-xs font-bold text-gray-500 flex-shrink-0 w-6 text-center">
            {lastInspection.grade}
          </span>
        )}

        {/* Chevron */}
        <span className={`text-gray-300 text-xs flex-shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`}>▶</span>
      </div>
    </button>
  )
}

// ── Summary Stats Bar ─────────────────────────────────────────────────────────

function SummaryBar({ facilities }) {
  const total   = facilities.length
  const red     = facilities.filter(f => f.status === 'red').length
  const yellow  = facilities.filter(f => f.status === 'yellow').length
  const green   = facilities.filter(f => f.status === 'green').length

  return (
    <div className="grid grid-cols-3 divide-x divide-gray-200 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
      {[
        { count: green,  label: 'All Good',       color: 'text-green-600',  bg: '' },
        { count: yellow, label: 'Minor Issues',   color: 'text-yellow-600', bg: '' },
        { count: red,    label: 'Needs Attention', color: 'text-red-600',    bg: red > 0 ? 'bg-red-50' : '' },
      ].map(({ count, label, color, bg }) => (
        <div key={label} className={`flex flex-col items-center py-3.5 px-2 ${bg}`}>
          <span className={`text-2xl font-black tabular-nums ${color}`}>{count}</span>
          <span className="text-gray-500 text-xs font-medium text-center leading-tight mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const [data,         setData]         = useState(null)
  const [loadState,    setLoadState]    = useState('idle') // idle | loading | success | error
  const [errorMsg,     setErrorMsg]     = useState('')
  const [selectedLoc,  setSelectedLoc]  = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)

  const fetchDashboard = useCallback(async () => {
    if (!WEBHOOK_URL) {
      setLoadState('error')
      setErrorMsg('VITE_WEBHOOK_URL is not configured. Set it in your .env file to connect to Google Sheets.')
      return
    }

    setLoadState('loading')
    setErrorMsg('')

    try {
      const url = `${WEBHOOK_URL}?action=dashboard`
      const res = await fetch(url, { method: 'GET', redirect: 'follow' })

      if (!res.ok) throw new Error(`Server returned ${res.status}`)

      const json = await res.json()

      if (json.error) throw new Error(json.error)

      setData(json)
      setLastUpdated(new Date())
      setLoadState('success')
    } catch (err) {
      setLoadState('error')
      setErrorMsg(err.message || 'Failed to load dashboard data.')
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleFacilityClick = (location) => {
    setSelectedLoc(prev => (prev === location ? null : location))
  }

  const selectedFacility = data?.facilities?.find(f => f.location === selectedLoc)

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-4">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-black text-lg tracking-tight">Command Center</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
              : 'All NW Arkansas Facilities'}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loadState === 'loading'}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand bg-blue-50 hover:bg-blue-100 border border-brand/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={loadState === 'loading' ? 'animate-spin inline-block' : ''}>↻</span>
          {loadState === 'loading' ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {loadState === 'loading' && !data && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Error state ────────────────────────────────────────────── */}
      {loadState === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-700 font-semibold text-sm mb-1">Unable to load dashboard</p>
          <p className="text-red-500 text-xs mb-4">{errorMsg}</p>
          <button
            onClick={fetchDashboard}
            className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Dashboard content ──────────────────────────────────────── */}
      {data && (
        <>
          {/* Summary stats */}
          <SummaryBar facilities={data.facilities} />

          {/* Legend */}
          <div className="flex items-center gap-4 px-1">
            {[['green', 'Stocked / Good'], ['yellow', 'Low Stock / Minor Issue'], ['red', 'Immediate Attention']].map(([s, lbl]) => (
              <div key={s} className="flex items-center gap-1.5">
                <StatusDot status={s} size="sm" />
                <span className="text-gray-500 text-xs">{lbl}</span>
              </div>
            ))}
          </div>

          {/* Facility grid */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Facility</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {data.facilities.map((facility) => (
                <div key={facility.location}>
                  <FacilityRow
                    facility={facility}
                    isSelected={selectedLoc === facility.location}
                    onClick={() => handleFacilityClick(facility.location)}
                  />
                  {/* Inline expanded detail on mobile */}
                  {selectedLoc === facility.location && selectedFacility && (
                    <div className="px-3 pb-3">
                      <FacilityDetail
                        facility={selectedFacility}
                        onClose={() => setSelectedLoc(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-gray-400 text-xs pb-2">
            Tap any facility to view inventory &amp; equipment details
          </p>
        </>
      )}
    </div>
  )
}
