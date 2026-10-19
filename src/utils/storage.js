export const STORAGE_KEYS = {
  shifts: 'myhours-shifts',
  activeStart: 'myhours-active-start',
  activeBreakStart: 'myhours-active-break-start',
  activeBreakMinutes: 'myhours-active-break-minutes',
  notes: 'myhours-day-notes',
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export function readShifts() {
  const stored = readJson(STORAGE_KEYS.shifts, [])
  return Array.isArray(stored) ? stored : []
}

export function readNotes() {
  const stored = readJson(STORAGE_KEYS.notes, {})
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
