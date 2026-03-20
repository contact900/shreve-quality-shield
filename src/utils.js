// ── Shared constants ──────────────────────────────────────────────────────────

export const LOCATIONS = [
  'Stribling Swepco', 'Rogers Swepco', 'Fayetteville Swepco',
  'Springdale Swepco', 'Greenwood Swepco', 'Fayetteville BofA',
  'Springdale BofA', 'Rogers BofA', 'Fort Smith Merrill Lynch', 'CSL Plasma',
]

export const LOCATION_SLACK_CHANNELS = {
  'Stribling Swepco':         '#red-river-sanitors-496',
  'Rogers Swepco':            '#red-river-sanitors-415',
  'Fayetteville Swepco':      '#red-river-sanitors-fayetteville-location',
  'Springdale Swepco':        '#red-river-sanitors-springdale-location',
  'Greenwood Swepco':         '#red-river-sanitors-greenwood',
  'Fayetteville BofA':        '#boa-fayetteville',
  'Springdale BofA':          '#boa-springdale',
  'Rogers BofA':              '#boa-rogers',
  'Fort Smith Merrill Lynch': '#boa-fortsmith',
  'CSL Plasma':               '#cslplasma-fortsmith',
}

// frequency: 'month' → "Enough for a month?", 'facility' → "Enough for facility?"
// consumable: true → grouped label "Consumable" in UI
export const SUPPLY_ITEMS = [
  { id: 'multi_surface_cleaner', label: 'Multi Surface Cleaner Bottle', frequency: 'month'    },
  { id: 'blue_microfibers',      label: 'Blue Microfibers',             frequency: 'month'    },
  { id: 'red_microfibers',       label: 'Red Microfibers',              frequency: 'month'    },
  { id: 'toilet_cleaner',        label: 'Toilet Cleaner',               frequency: 'month'    },
  { id: 'vacuums',               label: 'Vacuums',                      frequency: 'facility' },
  { id: 'clean_mop_heads',       label: 'Clean Mop Heads',              frequency: 'month'    },
  { id: 'mop_buckets_handles',   label: 'Mop Buckets and Handles',      frequency: 'facility' },
  { id: 'paper_towels',          label: 'Paper Towels',                 frequency: 'month',    consumable: true },
  { id: 'toilet_paper',          label: 'Toilet Paper',                 frequency: 'month',    consumable: true },
  { id: 'soap',                  label: 'Soap',                         frequency: 'month',    consumable: true },
  { id: 'trash_liners',          label: 'Trash Liner',                  frequency: 'month',    consumable: true },
]

// ── Image helpers ─────────────────────────────────────────────────────────────

/**
 * Resize and compress an image File to a base64 JPEG.
 * @param {File}   file     - Source image file
 * @param {number} maxPx    - Max width or height in pixels (default 700)
 * @param {number} quality  - JPEG quality 0–1 (default 0.60)
 * @returns {Promise<string>} base64 data URI
 */
export function resizeImage(file, maxPx = 700, quality = 0.60) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = ({ target: { result } }) => {
      const img = new Image()
      img.onload = () => {
        const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Return the ISO date string (YYYY-MM-DD) for the Monday of the current week.
 */
export function getMondayOfCurrentWeek() {
  const d   = new Date()
  const day = d.getDay()                          // 0 = Sun … 6 = Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)  // roll back to Monday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
