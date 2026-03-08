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
