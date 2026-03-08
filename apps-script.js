// ═══════════════════════════════════════════════════════════════════════════════
//  SHREVE QUALITY SHIELD v2 — Google Apps Script Backend
//  Handles three payload types: inspection | asset | inventory
//
//  SETUP:
//  1. Go to https://script.google.com → New Project (or use Extensions → Apps Script
//     from inside your target Google Sheet for automatic binding)
//  2. Paste this entire file, replacing all default code
//  3. Fill in DRIVE_FOLDER_ID below (the ID from your Drive folder's URL)
//  4. Deploy → New Deployment
//       Type            : Web app
//       Execute as      : Me
//       Who has access  : Anyone
//  5. Authorize all permissions when prompted
//  6. Copy the Web App URL → paste into your Vercel env as VITE_WEBHOOK_URL
//
//  RE-DEPLOYING AFTER CHANGES:
//    Deploy → Manage Deployments → edit the existing deployment (don't create new)
//    to keep the same URL.
// ═══════════════════════════════════════════════════════════════════════════════


// ── CONFIG — fill these in before deploying ──────────────────────────────────

/** Google Drive folder ID for evidence photo storage.
 *  From the folder URL: https://drive.google.com/drive/folders/THIS_PART */
var DRIVE_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID'

/** Primary notification email */
var OWNER_EMAIL = 'contact@shrevecleaning.com'

/** Central America/Chicago timezone for NW Arkansas */
var SCRIPT_TZ = 'America/Chicago'


// ── Score category definitions (must match frontend SCORE_ITEMS) ─────────────

var SCORE_ITEMS = [
  { id: 'entry_lobby',  label: 'Entry / Lobby',    num: 1 },
  { id: 'restrooms',    label: 'Restrooms',         num: 2 },
  { id: 'breakroom',    label: 'Breakroom',         num: 3 },
  { id: 'high_touch',   label: 'High-Touch Points', num: 4 },
  { id: 'floor_care',   label: 'Floor Care',        num: 5 },
  { id: 'dusting',      label: 'Dusting',           num: 6 },
  { id: 'trash_liners', label: 'Trash / Liners',    num: 7 },
  { id: 'glass',        label: 'Glass',             num: 8 },
]

var SUPPLY_ITEMS = [
  { id: 'multi_surface', label: 'Multi-Surface Cleaner', unit: 'bottles', min: 5  },
  { id: 'paper_towels',  label: 'Paper Towels',          unit: 'rolls',   min: 10 },
  { id: 'liners',        label: 'Liners',                unit: 'boxes',   min: 20 },
  { id: 'disinfectant',  label: 'Disinfectant',          unit: 'bottles', min: 3  },
]


// ── Sheet names ───────────────────────────────────────────────────────────────

var SHEET_INSPECTIONS = 'Inspections'
var SHEET_ASSETS      = 'Assets'
var SHEET_INVENTORY   = 'Inventory'


// ── Entry point ───────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents)
    var type = data.type || 'inspection'

    if (type === 'inspection') {
      var driveResult = uploadPhotosToDrive(data)
      logInspectionToSheet(data, driveResult)
      sendInspectionEmail(data, driveResult)

    } else if (type === 'asset') {
      logAssetToSheet(data)
      sendAssetEmail(data)

    } else if (type === 'inventory') {
      logInventoryToSheet(data)
      sendInventoryEmail(data)
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON)

  } catch (err) {
    Logger.log('doPost error: ' + err.message)
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

/** Health check — paste the web app URL in a browser to verify it's live */
function doGet() {
  return ContentService
    .createTextOutput('Shreve Quality Shield v2 API is live.')
    .setMimeType(ContentService.MimeType.TEXT)
}


// ════════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — INSPECTION
// ════════════════════════════════════════════════════════════════════════════════

// ── Drive photo upload ────────────────────────────────────────────────────────

function uploadPhotosToDrive(data) {
  var photoMap  = {}
  var folderUrl = ''

  var itemPhotos = data.item_photos
  if (!itemPhotos || itemPhotos.length === 0) return { photoMap: photoMap, folderUrl: folderUrl }

  try {
    var root    = DriveApp.getFolderById(DRIVE_FOLDER_ID)
    var subName = 'QC_' + (data.location || 'Unknown').replace(/\s/g, '-')
      + '_' + formatDateShort(new Date(data.timestamp))
    var sub = root.createFolder(subName)
    sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
    folderUrl = sub.getUrl()

    for (var i = 0; i < itemPhotos.length; i++) {
      var p = itemPhotos[i]
      try {
        var raw      = p.base64.split(',')[1]
        var decoded  = Utilities.base64Decode(raw)
        var fileName = p.item_id + '_' + (data.location || 'loc').replace(/\s/g, '-') + '.jpg'
        var blob     = Utilities.newBlob(decoded, 'image/jpeg', fileName)
        var file     = sub.createFile(blob)
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
        photoMap[p.item_id] = file.getUrl()
      } catch (uploadErr) {
        photoMap[p.item_id] = 'Upload failed: ' + uploadErr.message
      }
    }
  } catch (folderErr) {
    Logger.log('Drive folder error: ' + folderErr.message)
  }

  return { photoMap: photoMap, folderUrl: folderUrl }
}


// ── Inspection → Sheet ────────────────────────────────────────────────────────

var INSPECTION_HEADERS = [
  'Timestamp', 'Date', 'Time', 'Week Of', 'Location', 'Inspector',
  'GPS Lat', 'GPS Lng', 'GPS Accuracy',
  '1. Entry/Lobby', '2. Restrooms', '3. Breakroom', '4. High-Touch',
  '5. Floor Care', '6. Dusting', '7. Trash/Liners', '8. Glass',
  'Total Score (/40)', 'Average Score (/5)', 'Grade',
  'Photo: Entry/Lobby', 'Photo: Restrooms', 'Photo: Breakroom', 'Photo: High-Touch',
  'Photo: Floor Care', 'Photo: Dusting', 'Photo: Trash/Liners', 'Photo: Glass',
  'Evidence Folder',
  'Multi-Surface Count', 'Paper Towels Count', 'Liners Count', 'Disinfectant Count',
  'Inventory Alerts',
  'Floor Scrub/Wax', 'Window Detail',
  'Notes', 'Email Sent',
]

function logInspectionToSheet(data, driveResult) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_INSPECTIONS) || ss.insertSheet(SHEET_INSPECTIONS)

  if (sheet.getLastRow() === 0) {
    initSheetHeaders(sheet, INSPECTION_HEADERS, '#1e40af')
  }

  var ts  = new Date(data.timestamp)
  var s   = data.scores    || {}
  var inv = data.inventory || {}
  var pm  = driveResult.photoMap

  var alertStr = (data.inventory_alerts || []).map(function(a) {
    return a.label + ': ' + a.count + ' (min ' + a.min + ')'
  }).join(' | ')

  var row = [
    data.timestamp,
    Utilities.formatDate(ts, SCRIPT_TZ, 'MM/dd/yyyy'),
    Utilities.formatDate(ts, SCRIPT_TZ, 'hh:mm a'),
    data.week_of || '',
    data.location,
    data.inspector,
    data.gps_lat,
    data.gps_lng,
    data.gps_accuracy,
    s.entry_lobby  || 0,
    s.restrooms    || 0,
    s.breakroom    || 0,
    s.high_touch   || 0,
    s.floor_care   || 0,
    s.dusting      || 0,
    s.trash_liners || 0,
    s.glass        || 0,
    data.total_score    || 0,
    data.average_score  || '0',
    data.grade          || 'N/A',
    pm['entry_lobby']   || '',
    pm['restrooms']     || '',
    pm['breakroom']     || '',
    pm['high_touch']    || '',
    pm['floor_care']    || '',
    pm['dusting']       || '',
    pm['trash_liners']  || '',
    pm['glass']         || '',
    driveResult.folderUrl || '',
    inv.multi_surface   || 0,
    inv.paper_towels    || 0,
    inv.liners          || 0,
    inv.disinfectant    || 0,
    alertStr,
    (data.upsells && data.upsells.floor_scrub_wax) ? 'YES' : 'No',
    (data.upsells && data.upsells.window_detail)   ? 'YES' : 'No',
    data.notes || '',
    'Sent to ' + OWNER_EMAIL,
  ]

  sheet.appendRow(row)
  colorGradeCell(sheet, data.grade)
}


// ── Inspection → Email ────────────────────────────────────────────────────────

function sendInspectionEmail(data, driveResult) {
  var grade      = data.grade || 'N/A'
  var gradeColor = getGradeColor(grade)
  var gradeLabel = getGradeLabel(grade)
  var alerts     = data.inventory_alerts || []
  var hasAlerts  = alerts.length > 0

  var submittedAt = formatTimestamp(data.timestamp)

  // ── RED ALERT block (top of email, prominent) ─────────────────────────────
  var alertBlock = ''
  if (hasAlerts) {
    var alertRows = alerts.map(function(a) {
      return '<tr>'
        + '<td style="padding:8px 16px;border-bottom:1px solid #7f1d1d;color:#fecaca;font-weight:bold;">' + a.label + '</td>'
        + '<td style="padding:8px 16px;border-bottom:1px solid #7f1d1d;color:#fca5a5;text-align:center;">' + a.count + ' ' + a.unit + '</td>'
        + '<td style="padding:8px 16px;border-bottom:1px solid #7f1d1d;color:#f87171;text-align:center;">Min: ' + a.min + '</td>'
        + '</tr>'
    }).join('')

    alertBlock = ''
      + '<div style="background:#450a0a;border:2px solid #dc2626;border-radius:10px;padding:20px;margin-bottom:20px;">'
      +   '<div style="color:#ef4444;font-size:18px;font-weight:900;margin-bottom:12px;">🚨 RED ALERT — REORDER NEEDED</div>'
      +   '<p style="color:#fca5a5;font-size:13px;margin:0 0 12px;">The following supplies are below minimum threshold. Order replacements immediately.</p>'
      +   '<table style="width:100%;border-collapse:collapse;">'
      +     '<thead><tr style="background:#7f1d1d;">'
      +       '<th style="padding:8px 16px;text-align:left;color:#fca5a5;font-size:12px;">Supply Item</th>'
      +       '<th style="padding:8px 16px;text-align:center;color:#fca5a5;font-size:12px;">In Stock</th>'
      +       '<th style="padding:8px 16px;text-align:center;color:#fca5a5;font-size:12px;">Minimum</th>'
      +     '</tr></thead>'
      +     '<tbody>' + alertRows + '</tbody>'
      +   '</table>'
      + '</div>'
  }

  // ── Score table rows ──────────────────────────────────────────────────────
  var scoreRows = SCORE_ITEMS.map(function(item) {
    var score    = (data.scores && data.scores[item.id]) || 0
    var photoUrl = driveResult.photoMap[item.id]
    var photoCell = photoUrl
      ? '<a href="' + photoUrl + '" style="color:#2563eb;font-weight:bold;text-decoration:none;">📷 View</a>'
      : '<span style="color:#d1d5db;">—</span>'
    var bg = score >= 4 ? '#dcfce7' : score >= 3 ? '#fef9c3' : score > 0 ? '#fee2e2' : '#f9fafb'
    var fg = score >= 4 ? '#14532d' : score >= 3 ? '#78350f' : score > 0 ? '#7f1d1d' : '#9ca3af'
    return '<tr>'
      + '<td style="padding:9px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;">' + item.num + '. ' + item.label + '</td>'
      + '<td style="padding:9px 16px;border-bottom:1px solid #f3f4f6;text-align:center;background:' + bg + ';color:' + fg + ';font-weight:bold;">' + (score > 0 ? score + '/5' : '—') + '</td>'
      + '<td style="padding:9px 16px;border-bottom:1px solid #f3f4f6;text-align:center;">' + photoCell + '</td>'
      + '</tr>'
  }).join('')

  // ── Upsell + notes ────────────────────────────────────────────────────────
  var upsellLines = []
  if (data.upsells && data.upsells.floor_scrub_wax) upsellLines.push('🧹 Floor Scrub / Wax')
  if (data.upsells && data.upsells.window_detail)   upsellLines.push('🪟 Window Detail')

  var upsellBlock = upsellLines.length > 0
    ? '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;margin-top:16px;">'
    +   '<strong style="color:#92400e;">💎 Upsell Opportunities</strong><br>'
    +   '<span style="color:#78350f;font-size:13px;">' + upsellLines.join(' · ') + '</span>'
    + '</div>'
    : ''

  var notesBlock = data.notes
    ? '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin-top:16px;">'
    +   '<strong style="color:#374151;">📝 Inspector Notes</strong><br>'
    +   '<span style="color:#4b5563;font-size:13px;">' + escapeHtml(data.notes) + '</span>'
    + '</div>'
    : ''

  var folderBlock = driveResult.folderUrl
    ? '<div style="text-align:center;margin-top:24px;">'
    +   '<a href="' + driveResult.folderUrl + '" style="display:inline-block;background:#1d4ed8;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">📁 View All Evidence Photos in Drive</a>'
    + '</div>'
    : ''

  var html = emailWrapper(
    alertBlock
    + '<div style="background:#fff;padding:20px 28px;border:1px solid #e5e7eb;">'
    +   '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
    +     '<tr><td style="padding:5px 0;color:#6b7280;width:130px;">📍 Location</td><td style="font-weight:bold;">' + data.location + '</td></tr>'
    +     '<tr><td style="padding:5px 0;color:#6b7280;">👤 Inspector</td><td>' + data.inspector + '</td></tr>'
    +     '<tr><td style="padding:5px 0;color:#6b7280;">🕐 Submitted</td><td style="font-size:13px;">' + submittedAt + '</td></tr>'
    +     '<tr><td style="padding:5px 0;color:#6b7280;">📡 GPS</td><td style="font-size:12px;color:#9ca3af;">' + data.gps_lat + ', ' + data.gps_lng + '</td></tr>'
    +   '</table>'
    + '</div>'
    + '<div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;text-align:center;">'
    +   '<div style="display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;background:' + gradeColor + ';color:#fff;font-size:42px;font-weight:900;">' + grade + '</div>'
    +   '<div style="color:#6b7280;font-size:13px;margin-top:6px;">' + gradeLabel + '</div>'
    +   '<div style="font-size:32px;font-weight:900;margin-top:6px;color:#111827;">' + data.total_score + '<span style="font-size:16px;font-weight:400;color:#9ca3af;"> / 40 pts</span></div>'
    +   '<div style="color:#6b7280;font-size:13px;">Average: ' + data.average_score + ' / 5.0</div>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-top:none;">'
    +   '<thead><tr style="background:#f8fafc;">'
    +     '<th style="padding:10px 16px;text-align:left;font-size:12px;color:#374151;border-bottom:2px solid #e5e7eb;">Category</th>'
    +     '<th style="padding:10px 16px;text-align:center;font-size:12px;color:#374151;border-bottom:2px solid #e5e7eb;">Score</th>'
    +     '<th style="padding:10px 16px;text-align:center;font-size:12px;color:#374151;border-bottom:2px solid #e5e7eb;">Evidence</th>'
    +   '</tr></thead>'
    +   '<tbody>' + scoreRows + '</tbody>'
    + '</table>'
    + upsellBlock
    + notesBlock
    + folderBlock
  )

  var subject = (hasAlerts ? '🚨 [REORDER] ' : '') + '[Shreve QC] '
    + data.location + ' · Grade ' + grade + ' (' + data.total_score + '/40) · '
    + Utilities.formatDate(new Date(data.timestamp), SCRIPT_TZ, 'M/d/yyyy')

  MailApp.sendEmail({ to: OWNER_EMAIL, subject: subject, htmlBody: html })
}


// ════════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — EQUIPMENT / ASSET TRACKING
// ════════════════════════════════════════════════════════════════════════════════

var ASSET_HEADERS = [
  'Timestamp', 'Date', 'Time', 'Equipment ID', 'Location',
  'Condition', 'Filter Needed', 'Working Properly', 'Notes', 'Email Sent',
]

function logAssetToSheet(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_ASSETS) || ss.insertSheet(SHEET_ASSETS)

  if (sheet.getLastRow() === 0) {
    initSheetHeaders(sheet, ASSET_HEADERS, '#065f46')
  }

  var ts = new Date(data.timestamp)
  sheet.appendRow([
    data.timestamp,
    Utilities.formatDate(ts, SCRIPT_TZ, 'MM/dd/yyyy'),
    Utilities.formatDate(ts, SCRIPT_TZ, 'hh:mm a'),
    data.equipment_id,
    data.location,
    data.condition,
    data.filter_needed     ? 'YES' : 'No',
    data.working_properly  ? 'YES' : 'No',
    data.notes || '',
    'Sent to ' + OWNER_EMAIL,
  ])
}

function sendAssetEmail(data) {
  var filterAlert  = data.filter_needed    ? '🔧 <strong style="color:#d97706;">Filter replacement needed!</strong>' : '✅ No filter needed'
  var workingAlert = data.working_properly ? '✅ Equipment functioning normally' : '❌ <strong style="color:#dc2626;">Equipment NOT working properly!</strong>'

  var conditionColor =
    data.condition === 'Good' ? '#14532d' :
    data.condition === 'Fair' ? '#78350f' : '#7f1d1d'

  var conditionBg =
    data.condition === 'Good' ? '#dcfce7' :
    data.condition === 'Fair' ? '#fef9c3' : '#fee2e2'

  var body = ''
    + '<div style="background:#fff;padding:20px 28px;border:1px solid #e5e7eb;">'
    +   '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
    +     '<tr><td style="padding:6px 0;color:#6b7280;width:140px;">🔍 Equipment ID</td><td style="font-weight:900;font-size:16px;color:#1d4ed8;">' + data.equipment_id + '</td></tr>'
    +     '<tr><td style="padding:6px 0;color:#6b7280;">📍 Location</td><td style="font-weight:bold;">' + data.location + '</td></tr>'
    +     '<tr><td style="padding:6px 0;color:#6b7280;">🕐 Logged</td><td style="font-size:13px;">' + formatTimestamp(data.timestamp) + '</td></tr>'
    +   '</table>'
    + '</div>'
    + '<div style="background:#fff;padding:20px 28px;border:1px solid #e5e7eb;border-top:none;">'
    +   '<div style="display:inline-block;background:' + conditionBg + ';color:' + conditionColor + ';font-weight:900;font-size:20px;padding:10px 24px;border-radius:8px;margin-bottom:16px;">'
    +     'Condition: ' + data.condition
    +   '</div>'
    +   '<p style="font-size:14px;margin:8px 0;color:#374151;">' + filterAlert + '</p>'
    +   '<p style="font-size:14px;margin:8px 0;color:#374151;">' + workingAlert + '</p>'
    +   (data.notes ? '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:13px;color:#4b5563;"><strong>Notes:</strong> ' + escapeHtml(data.notes) + '</div>' : '')
    + '</div>'

  var isUrgent = !data.working_properly || data.condition === 'Poor'
  var subject  = (isUrgent ? '⚠️ ' : '') + '[Shreve Asset] ' + data.equipment_id + ' — ' + data.condition + ' · ' + data.location

  MailApp.sendEmail({ to: OWNER_EMAIL, subject: subject, htmlBody: emailWrapper(body) })
}


// ════════════════════════════════════════════════════════════════════════════════
//  PHASE 3 — STANDALONE INVENTORY STOCK-TAKE
// ════════════════════════════════════════════════════════════════════════════════

var INVENTORY_HEADERS = [
  'Timestamp', 'Date', 'Time', 'Location',
  'Multi-Surface', 'Paper Towels', 'Liners', 'Disinfectant',
  'Alert Items', 'Notes', 'Email Sent',
]

function logInventoryToSheet(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_INVENTORY) || ss.insertSheet(SHEET_INVENTORY)

  if (sheet.getLastRow() === 0) {
    initSheetHeaders(sheet, INVENTORY_HEADERS, '#7c2d12')
  }

  var ts      = new Date(data.timestamp)
  var inv     = data.inventory || {}
  var alertStr = (data.inventory_alerts || []).map(function(a) {
    return a.label + ': ' + a.count + ' (min ' + a.min + ')'
  }).join(' | ')

  sheet.appendRow([
    data.timestamp,
    Utilities.formatDate(ts, SCRIPT_TZ, 'MM/dd/yyyy'),
    Utilities.formatDate(ts, SCRIPT_TZ, 'hh:mm a'),
    data.location,
    inv.multi_surface  || 0,
    inv.paper_towels   || 0,
    inv.liners         || 0,
    inv.disinfectant   || 0,
    alertStr,
    data.notes || '',
    'Sent to ' + OWNER_EMAIL,
  ])
}

function sendInventoryEmail(data) {
  var alerts    = data.inventory_alerts || []
  var hasAlerts = alerts.length > 0
  var inv       = data.inventory || {}

  // ── RED ALERT top block ───────────────────────────────────────────────────
  var alertBlock = ''
  if (hasAlerts) {
    var alertRows = alerts.map(function(a) {
      return '<tr>'
        + '<td style="padding:8px 16px;border-bottom:1px solid #7f1d1d;color:#fecaca;font-weight:bold;">' + a.label + '</td>'
        + '<td style="padding:8px 16px;border-bottom:1px solid #7f1d1d;color:#fca5a5;text-align:center;">' + a.count + ' ' + a.unit + '</td>'
        + '<td style="padding:8px 16px;border-bottom:1px solid #7f1d1d;color:#f87171;text-align:center;">Need ≥ ' + a.min + '</td>'
        + '</tr>'
    }).join('')

    alertBlock = ''
      + '<div style="background:#450a0a;border:2px solid #dc2626;border-radius:10px;padding:20px;margin-bottom:20px;">'
      +   '<div style="color:#ef4444;font-size:18px;font-weight:900;margin-bottom:12px;">🚨 RED ALERT — REORDER REQUIRED</div>'
      +   '<table style="width:100%;border-collapse:collapse;">'
      +     '<thead><tr style="background:#7f1d1d;">'
      +       '<th style="padding:8px 16px;text-align:left;color:#fca5a5;font-size:12px;">Supply Item</th>'
      +       '<th style="padding:8px 16px;text-align:center;color:#fca5a5;font-size:12px;">In Stock</th>'
      +       '<th style="padding:8px 16px;text-align:center;color:#fca5a5;font-size:12px;">Minimum</th>'
      +     '</tr></thead>'
      +     '<tbody>' + alertRows + '</tbody>'
      +   '</table>'
      + '</div>'
  }

  var supplyRows = SUPPLY_ITEMS.map(function(item) {
    var count = inv[item.id] || 0
    var isLow = count < item.min
    var bg    = isLow ? '#fee2e2' : count < item.min * 1.5 ? '#fef9c3' : '#dcfce7'
    var fg    = isLow ? '#7f1d1d' : count < item.min * 1.5 ? '#78350f' : '#14532d'
    return '<tr>'
      + '<td style="padding:9px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;">' + item.label + '</td>'
      + '<td style="padding:9px 16px;border-bottom:1px solid #f3f4f6;text-align:center;background:' + bg + ';color:' + fg + ';font-weight:bold;">' + count + ' ' + item.unit + '</td>'
      + '<td style="padding:9px 16px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280;font-size:12px;">Min: ' + item.min + '</td>'
      + '</tr>'
  }).join('')

  var body = alertBlock
    + '<div style="background:#fff;padding:20px 28px;border:1px solid #e5e7eb;">'
    +   '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
    +     '<tr><td style="padding:5px 0;color:#6b7280;width:120px;">📍 Location</td><td style="font-weight:bold;">' + data.location + '</td></tr>'
    +     '<tr><td style="padding:5px 0;color:#6b7280;">🕐 Logged</td><td style="font-size:13px;">' + formatTimestamp(data.timestamp) + '</td></tr>'
    +   '</table>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-top:none;">'
    +   '<thead><tr style="background:#f8fafc;">'
    +     '<th style="padding:10px 16px;text-align:left;font-size:12px;color:#374151;border-bottom:2px solid #e5e7eb;">Supply Item</th>'
    +     '<th style="padding:10px 16px;text-align:center;font-size:12px;color:#374151;border-bottom:2px solid #e5e7eb;">In-Stock Count</th>'
    +     '<th style="padding:10px 16px;text-align:center;font-size:12px;color:#374151;border-bottom:2px solid #e5e7eb;">Minimum</th>'
    +   '</tr></thead>'
    +   '<tbody>' + supplyRows + '</tbody>'
    + '</table>'
    + (data.notes ? '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin-top:16px;font-size:13px;color:#4b5563;"><strong>Notes:</strong> ' + escapeHtml(data.notes) + '</div>' : '')

  var subject = (hasAlerts ? '🚨 [REORDER ALERT] ' : '[Shreve Inventory] ')
    + data.location + ' Stock-Take — '
    + Utilities.formatDate(new Date(data.timestamp), SCRIPT_TZ, 'M/d/yyyy')

  MailApp.sendEmail({ to: OWNER_EMAIL, subject: subject, htmlBody: emailWrapper(body) })
}


// ════════════════════════════════════════════════════════════════════════════════
//  SHARED UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

function emailWrapper(body) {
  return '<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">'
    + '<div style="max-width:600px;margin:0 auto;">'
    + '<div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:#fff;padding:26px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:900;letter-spacing:-.3px;">🛡️ Shreve Quality Shield</div>'
    +   '<div style="opacity:.8;font-size:13px;margin-top:4px;">Northwest Arkansas Cleaning Services</div>'
    + '</div>'
    + body
    + '<div style="text-align:center;padding:20px;color:#9ca3af;font-size:11px;">'
    +   'Shreve Cleaning Services · Quality Shield v2 · Automated Report'
    + '</div>'
    + '</div></body></html>'
}

function initSheetHeaders(sheet, headers, bgColor) {
  var range = sheet.getRange(1, 1, 1, headers.length)
  range.setValues([headers])
       .setFontWeight('bold')
       .setBackground(bgColor || '#1e40af')
       .setFontColor('#ffffff')
       .setHorizontalAlignment('center')
       .setWrap(true)
  sheet.setFrozenRows(1)
  sheet.setRowHeight(1, 44)
}

function colorGradeCell(sheet, grade) {
  var lastRow  = sheet.getLastRow()
  var gradeCol = INSPECTION_HEADERS.indexOf('Grade') + 1
  var bg       = { A: '#14532d', B: '#3f6212', C: '#713f12', D: '#7c2d12', F: '#7f1d1d' }
  if (gradeCol > 0 && bg[grade]) {
    sheet.getRange(lastRow, gradeCol)
         .setBackground(bg[grade])
         .setFontColor('#ffffff')
         .setFontWeight('bold')
  }
}

function getGradeColor(grade) {
  return { A: '#14532d', B: '#3f6212', C: '#713f12', D: '#7c2d12', F: '#7f1d1d' }[grade] || '#1e3a8a'
}

function getGradeLabel(grade) {
  return { A: 'Excellent', B: 'Good', C: 'Acceptable', D: 'Poor', F: 'Critical' }[grade] || ''
}

function formatDateShort(d) {
  try { return Utilities.formatDate(d, SCRIPT_TZ, 'yyyy-MM-dd') }
  catch (_) { return d.toISOString().split('T')[0] }
}

function formatTimestamp(isoStr) {
  try { return new Date(isoStr).toLocaleString('en-US', { timeZone: SCRIPT_TZ }) }
  catch (_) { return isoStr }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}
