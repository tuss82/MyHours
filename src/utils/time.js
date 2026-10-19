export const DISPLAY_LOCALE = 'en-GB'

const pad = (value) => String(value).padStart(2, '0')

export function dateKey(date) {
  const value = new Date(date)
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function localDateTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatTime(timestamp) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp))
}

export function formatDate(timestamp) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(timestamp))
}

export function formatClock(timestamp) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(timestamp))
}

export function formatTimelineTime(timestamp) {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function durationMinutes(start, end) {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

export function formatDuration(minutes) {
  const rounded = Math.max(0, Math.round(minutes))
  return `${Math.floor(rounded / 60)}h ${pad(rounded % 60)}m`
}

export function shiftMinutes(shift) {
  return Math.max(0, durationMinutes(shift.start, shift.end) - Number(shift.breakMinutes || 0))
}

export function formatBreakMinutes(minutes) {
  const rounded = Math.max(0, Math.round(Number(minutes) || 0))
  return `${rounded}m break`
}

export function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return new Date(firstStart).getTime() < new Date(secondEnd).getTime()
    && new Date(firstEnd).getTime() > new Date(secondStart).getTime()
}

export function shiftOverlapsExisting(candidate, shifts, ignoredId) {
  return shifts.some((shift) => {
    if (shift.id === ignoredId) return false
    return intervalsOverlap(candidate.start, candidate.end, shift.start, shift.end)
  })
}

function periodBounds(period) {
  const start = new Date()
  const end = new Date()
  if (period === 'day') {
    start.setHours(0, 0, 0, 0)
    end.setHours(24, 0, 0, 0)
  } else if (period === 'week') {
    const mondayOffset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - mondayOffset)
    start.setHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setDate(start.getDate() + 7)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(start.getMonth() + 1, 1)
    end.setHours(0, 0, 0, 0)
  }
  return [start.getTime(), end.getTime()]
}

function breakAdjustedMinutesInRange(shift, rangeStart, rangeEnd) {
  const shiftStart = new Date(shift.start).getTime()
  const shiftEnd = new Date(shift.end).getTime()
  const overlapStart = Math.max(shiftStart, rangeStart)
  const overlapEnd = Math.min(shiftEnd, rangeEnd)
  if (overlapEnd <= overlapStart) return 0

  const grossMinutes = (shiftEnd - shiftStart) / 60000
  const breakMinutes = Math.min(Number(shift.breakMinutes || 0), grossMinutes)
  // A break has no timestamp, so allocate it in proportion to each clipped day/range.
  return (overlapEnd - overlapStart) / 60000
    - breakMinutes * ((overlapEnd - overlapStart) / (shiftEnd - shiftStart))
}

export function totalForPeriod(shifts, period) {
  const [periodStart, periodEnd] = periodBounds(period)
  return shifts.reduce((total, shift) => total + breakAdjustedMinutesInRange(shift, periodStart, periodEnd), 0)
}

export function startOfDay(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function dayPaidMinutes(shifts, date) {
  const start = startOfDay(date).getTime()
  return shifts.reduce((total, shift) => total + breakAdjustedMinutesInRange(shift, start, start + 86400000), 0)
}

export function daySegments(shifts, date, now) {
  const start = startOfDay(date).getTime()
  const end = start + 86400000
  return shifts.map((shift) => {
    const shiftStart = new Date(shift.start).getTime()
    const shiftEnd = Math.min(new Date(shift.end).getTime(), now)
    const visibleStart = Math.max(start, shiftStart)
    const visibleEnd = Math.min(end, shiftEnd)
    if (visibleEnd <= visibleStart) return null
    // Avoid displaying midnight as 24:00 for a segment that ends at the day boundary.
    const displayEnd = visibleEnd === end ? end - 60000 : visibleEnd
    return {
      id: shift.id,
      left: ((visibleStart - start) / 86400000) * 100,
      width: ((visibleEnd - visibleStart) / 86400000) * 100,
      label: `${formatTimelineTime(visibleStart)} – ${formatTimelineTime(displayEnd)}`,
    }
  }).filter(Boolean)
}

export function monthDays(date) {
  const first = startOfDay(new Date(date.getFullYear(), date.getMonth(), 1))
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  return [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => new Date(date.getFullYear(), date.getMonth(), index + 1))]
}

export function calendarWeekNumber(date) {
  const thursday = new Date(date)
  thursday.setDate(thursday.getDate() + 4 - (thursday.getDay() || 7))
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  return Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7)
}
