import React, { useEffect, useMemo, useState } from 'react'

const SHIFTS_KEY = 'myhours-shifts'
const ACTIVE_KEY = 'myhours-active-start'
const ACTIVE_BREAK_KEY = 'myhours-active-break-start'
const ACTIVE_BREAK_MINUTES_KEY = 'myhours-active-break-minutes'

const pad = (value) => String(value).padStart(2, '0')

function readShifts() {
  try {
    const stored = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function localDateTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp))
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(timestamp))
}

function formatClock(timestamp) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(timestamp))
}

function durationMinutes(start, end) {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

function formatDuration(minutes) {
  const rounded = Math.max(0, Math.round(minutes))
  return `${Math.floor(rounded / 60)}h ${pad(rounded % 60)}m`
}

function shiftMinutes(shift) {
  return Math.max(0, durationMinutes(shift.start, shift.end) - Number(shift.breakMinutes || 0))
}

function overlaps(candidate, shifts, ignoredId) {
  const start = new Date(candidate.start).getTime()
  const end = new Date(candidate.end).getTime()
  return shifts.some((shift) => {
    if (shift.id === ignoredId) return false
    return start < new Date(shift.end).getTime() && end > new Date(shift.start).getTime()
  })
}

function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return new Date(firstStart).getTime() < new Date(secondEnd).getTime()
    && new Date(firstEnd).getTime() > new Date(secondStart).getTime()
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

function totalForPeriod(shifts, period) {
  const [periodStart, periodEnd] = periodBounds(period)
  return shifts.reduce((total, shift) => {
    const start = Math.max(new Date(shift.start).getTime(), periodStart)
    const end = Math.min(new Date(shift.end).getTime(), periodEnd)
    if (end <= start) return total
    const gross = new Date(shift.end).getTime() - new Date(shift.start).getTime()
    const breakMinutes = Math.min(Number(shift.breakMinutes || 0), gross / 60000)
    return total + (end - start) / 60000 - breakMinutes * ((end - start) / gross)
  }, 0)
}

function startOfDay(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function paidMinutesInRange(shift, rangeStart, rangeEnd) {
  const shiftStart = new Date(shift.start).getTime()
  const shiftEnd = new Date(shift.end).getTime()
  const overlapStart = Math.max(shiftStart, rangeStart)
  const overlapEnd = Math.min(shiftEnd, rangeEnd)
  if (overlapEnd <= overlapStart) return 0
  const grossMinutes = shiftEnd - shiftStart
  const breakMinutes = Math.min(Number(shift.breakMinutes || 0), grossMinutes / 60000)
  return (overlapEnd - overlapStart) / 60000 - breakMinutes * ((overlapEnd - overlapStart) / grossMinutes)
}

function dayPaidMinutes(shifts, date) {
  const start = startOfDay(date).getTime()
  return shifts.reduce((total, shift) => total + paidMinutesInRange(shift, start, start + 86400000), 0)
}

function daySegments(shifts, date, now) {
  const start = startOfDay(date).getTime()
  const end = start + 86400000
  return shifts
    .map((shift) => {
      const shiftStart = new Date(shift.start).getTime()
      const shiftEnd = Math.min(new Date(shift.end).getTime(), now)
      const visibleStart = Math.max(start, shiftStart)
      const visibleEnd = Math.min(end, shiftEnd)
      if (visibleEnd <= visibleStart) return null
      return {
        id: shift.id,
        left: ((visibleStart - start) / 86400000) * 100,
        width: ((visibleEnd - visibleStart) / 86400000) * 100,
        label: `${formatTime(shift.start)} – ${formatTime(shift.end)}`,
      }
    })
    .filter(Boolean)
}

function monthDays(date) {
  const first = startOfDay(new Date(date.getFullYear(), date.getMonth(), 1))
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  return [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => new Date(date.getFullYear(), date.getMonth(), index + 1))]
}

function CalendarView({ view, shifts, now }) {
  const today = startOfDay(now)
  const [weekOffset, setWeekOffset] = useState(0)
  if (view === 'day') {
    const segments = daySegments(shifts, today, now.getTime())
    const paid = dayPaidMinutes(shifts, today)
    const currentPosition = (Math.min(now.getTime(), today.getTime() + 86400000) - today.getTime()) / 864000
    return (
      <div className="calendar-panel">
        <div className="calendar-panel-heading"><div><p className="eyebrow">Today</p><h3>{formatDate(now)}</h3></div><strong>{formatDuration(paid)}</strong></div>
        <div className="timeline-labels"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div>
        <div className="timeline">
          {segments.map((segment) => <span className="timeline-segment" key={segment.id} style={{ left: `${segment.left}%`, width: `${segment.width}%` }} />)}
          <span className="current-marker" style={{ left: `${currentPosition}%` }} />
        </div>
        <p className="calendar-hint">{segments.length ? 'Your shift and current time are shown on the timeline.' : 'No working time registered today.'}</p>
      </div>
    )
  }

  if (view === 'week') {
    const monday = new Date(today)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7)
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return date
    })
    const isCurrentWeek = weekOffset === 0
    const rangeLabel = `${formatDate(days[0])} – ${formatDate(days[6])}`
    return (
      <div className="calendar-panel">
        <div className="calendar-panel-heading">
          <div><p className="eyebrow">Monday – Sunday</p><h3>{isCurrentWeek ? 'This week' : rangeLabel}</h3></div>
          <div className="week-navigation">
            <button onClick={() => setWeekOffset((offset) => offset - 1)} aria-label="Previous week">←</button>
            {!isCurrentWeek && <button className="current-week-button" onClick={() => setWeekOffset(0)}>Current week</button>}
            <button onClick={() => setWeekOffset((offset) => offset + 1)} aria-label="Next week">→</button>
          </div>
          <div className="week-total"><span>Total hours</span><strong>{formatDuration(days.reduce((sum, day) => sum + dayPaidMinutes(shifts, day), 0))}</strong></div>
        </div>
        <div className="week-list">
          {days.map((day) => {
            const segments = daySegments(shifts, day, now.getTime())
            return <div className={`week-row${isCurrentWeek && day.getTime() === today.getTime() ? ' today' : ''}`} key={day.toISOString()}><span className="week-day">{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day)}<small>{day.getDate()}</small></span><div className="week-shift">{segments.length > 0 && <div className="week-shift-times">{segments.map((segment) => <span key={segment.id}>{segment.label}</span>)}</div>}</div><strong>{dayPaidMinutes(shifts, day) ? `${(dayPaidMinutes(shifts, day) / 60).toFixed(1)}h` : '—'}</strong></div>
          })}
        </div>
      </div>
    )
  }

  const month = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)
  return (
    <div className="calendar-panel">
      <div className="calendar-panel-heading"><div><p className="eyebrow">Paid hours</p><h3>{monthLabel}</h3></div><div className="week-total"><span>Total hours</span><strong>{formatDuration(daysInMonthTotal(shifts, month))}</strong></div></div>
      <div className="month-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="month-grid">{monthDays(month).map((day, index) => {
        if (!day) return <span className="month-day blank" key={`blank-${index}`} />
        const paid = dayPaidMinutes(shifts, day)
        const isToday = day.getTime() === today.getTime()
        return <span className={`month-day${paid ? ' worked' : ''}${isToday ? ' today' : ''}`} key={day.toISOString()}><b>{day.getDate()}</b>{paid ? <small>{(paid / 60).toFixed(1)} hrs</small> : null}</span>
      })}</div>
      <p className="calendar-hint"><span className="orange-key" /> Shift registered</p>
    </div>
  )
}

function daysInMonthTotal(shifts, month) {
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => dayPaidMinutes(shifts, new Date(month.getFullYear(), month.getMonth(), index + 1))).reduce((sum, value) => sum + value, 0)
}

function ShiftForm({ shift, onSave, onCancel }) {
  const [form, setForm] = useState(shift ? {
    ...shift,
    start: localDateTime(shift.start),
    end: localDateTime(shift.end),
  } : {
    start: localDateTime(Date.now() - 8 * 3600000),
    end: localDateTime(Date.now()),
    breakMinutes: 30,
  })
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const start = new Date(form.start).getTime()
    const end = new Date(form.end).getTime()
    const breakMinutes = Number(form.breakMinutes)
    if (!form.start || !form.end || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      setError('End time must be after the start time.')
      return
    }
    if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes > (end - start) / 60000) {
      setError('Break must be between 0 and the shift length.')
      return
    }
    onSave({
      ...form,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      breakMinutes,
    })
  }

  return (
    <div className="modal-backdrop">
      <form className="editor" onSubmit={submit}>
        <div className="editor-heading">
          <div><p className="eyebrow">Shift details</p><h2>{shift ? 'Edit shift' : 'Add a shift'}</h2></div>
          <button type="button" className="close-button" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <label>Start<input type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label>
        <label>End<input type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /></label>
        <label>Unpaid break <span className="muted">(minutes)</span><input type="number" min="0" step="1" value={form.breakMinutes} onChange={(event) => setForm({ ...form, breakMinutes: event.target.value })} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit">Save shift</button>
      </form>
    </div>
  )
}

function SummaryCard({ label, minutes, featured }) {
  return <div className={`summary-card${featured ? ' featured' : ''}`}><span>{label}</span><strong>{formatDuration(minutes)}</strong></div>
}

export default function App() {
  const [shifts, setShifts] = useState(readShifts)
  const [activeStart, setActiveStart] = useState(() => localStorage.getItem(ACTIVE_KEY))
  const [activeBreakStart, setActiveBreakStart] = useState(() => localStorage.getItem(ACTIVE_BREAK_KEY))
  const [activeBreakMinutes, setActiveBreakMinutes] = useState(() => Number(localStorage.getItem(ACTIVE_BREAK_MINUTES_KEY) || 0))
  const [now, setNow] = useState(Date.now())
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')
  const [calendarView, setCalendarView] = useState('day')

  useEffect(() => localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts)), [shifts])
  useEffect(() => {
    if (activeStart) localStorage.setItem(ACTIVE_KEY, activeStart)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [activeStart])
  useEffect(() => {
    if (activeBreakStart) localStorage.setItem(ACTIVE_BREAK_KEY, activeBreakStart)
    else localStorage.removeItem(ACTIVE_BREAK_KEY)
  }, [activeBreakStart])
  useEffect(() => {
    if (activeStart) localStorage.setItem(ACTIVE_BREAK_MINUTES_KEY, String(activeBreakMinutes))
    else localStorage.removeItem(ACTIVE_BREAK_MINUTES_KEY)
  }, [activeStart, activeBreakMinutes])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const orderedShifts = useMemo(() => [...shifts].sort((a, b) => new Date(b.start) - new Date(a.start)), [shifts])
  const currentBreakMinutes = activeBreakStart ? durationMinutes(activeBreakStart, now) : 0
  const activeMinutes = activeStart
    ? Math.max(0, durationMinutes(activeStart, now) - activeBreakMinutes - currentBreakMinutes)
    : 0
  const displayShifts = useMemo(() => activeStart
    ? [...shifts, {
      id: 'active-shift',
      start: activeStart,
      end: new Date(now).toISOString(),
      breakMinutes: activeBreakMinutes + currentBreakMinutes,
    }]
    : shifts, [shifts, activeStart, activeBreakMinutes, currentBreakMinutes, now])
  const totals = {
    day: totalForPeriod(shifts, 'day') + activeMinutes,
    week: totalForPeriod(shifts, 'week') + activeMinutes,
    month: totalForPeriod(shifts, 'month') + activeMinutes,
  }

  function clockIn() {
    if (activeStart) return
    const start = new Date().toISOString()
    if (shifts.some((shift) => intervalsOverlap(start, new Date().toISOString(), shift.start, shift.end))) {
      setNotice('You already have a saved shift at this time.')
      return
    }
    setActiveStart(start)
    setActiveBreakStart(null)
    setActiveBreakMinutes(0)
    setNotice('Clocked in. Your time is being recorded.')
  }

  function toggleBreak() {
    if (!activeStart) return
    if (activeBreakStart) {
      setActiveBreakMinutes((minutes) => minutes + durationMinutes(activeBreakStart, new Date()))
      setActiveBreakStart(null)
      setNotice('Break ended. Your work timer is running again.')
    } else {
      setActiveBreakStart(new Date().toISOString())
      setNotice('Unpaid break started. Your work timer is paused.')
    }
  }

  function clockOut() {
    if (!activeStart) return
    const end = new Date()
    const totalBreakMinutes = activeBreakMinutes
      + (activeBreakStart ? durationMinutes(activeBreakStart, end) : 0)
    setShifts((current) => [{
      id: crypto.randomUUID(),
      start: activeStart,
      end: end.toISOString(),
      breakMinutes: totalBreakMinutes,
    }, ...current])
    setActiveStart(null)
    setActiveBreakStart(null)
    setActiveBreakMinutes(0)
    setNotice('Shift saved.')
  }

  function saveShift(shift) {
    const overlapsActive = activeStart && intervalsOverlap(shift.start, shift.end, activeStart, new Date().toISOString())
    if (overlaps(shift, shifts, shift.id) || overlapsActive) {
      setNotice('That shift overlaps another saved shift.')
      return
    }
    setShifts((current) => shift.id
      ? current.map((item) => item.id === shift.id ? shift : item)
      : [{ ...shift, id: crypto.randomUUID() }, ...current])
    setEditing(null)
    setNotice('Shift saved.')
  }

  function deleteShift(id) {
    if (window.confirm('Delete this shift?')) setShifts((current) => current.filter((shift) => shift.id !== id))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">M</div>
        <div><p className="eyebrow">Personal timesheet</p><h1>MyHours</h1></div>
        <span className="privacy-pill">On this device</span>
      </header>

      <section className={`clock-card${activeStart ? ' active' : ''}`}>
        <div className="status-line"><span className="status-dot" />{activeBreakStart ? 'Currently on unpaid break' : activeStart ? 'Currently working' : 'Ready to clock in'}</div>
        <div className="time-display">
          <div className="live-clock"><span>Local time</span><strong>{formatClock(now)}</strong></div>
          <div className="elapsed-time"><span>{activeBreakStart ? 'Break time' : 'Work time'}</span><strong>{formatDuration(activeMinutes)}</strong></div>
        </div>
        <p>{activeBreakStart ? `Break started at ${formatTime(activeBreakStart)}` : activeStart ? `Started at ${formatTime(activeStart)}` : 'Keep an independent record of every shift.'}</p>
        {activeStart && <button className="break-button" onClick={toggleBreak}>{activeBreakStart ? 'End break' : 'Start unpaid break'} <span>{activeBreakStart ? '▶' : 'Ⅱ'}</span></button>}
        <button className={`clock-button${activeStart ? ' stop' : ''}`} onClick={activeStart ? clockOut : clockIn}>{activeStart ? 'Clock out' : 'Clock in'} <span>→</span></button>
      </section>

      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      <section className="summary-section">
        <div className="section-heading"><div><p className="eyebrow">Your hours</p><h2>At a glance</h2></div><span className="date-label">{formatDate(now)}</span></div>
        <div className="summary-grid">
          <button className={`summary-card${calendarView === 'day' ? ' featured' : ''}`} onClick={() => setCalendarView('day')}><span>Today</span><strong>{formatDuration(totals.day)}</strong></button>
          <button className={`summary-card${calendarView === 'week' ? ' featured' : ''}`} onClick={() => setCalendarView('week')}><span>This week</span><strong>{formatDuration(totals.week)}</strong></button>
          <button className={`summary-card${calendarView === 'month' ? ' featured' : ''}`} onClick={() => setCalendarView('month')}><span>This month</span><strong>{formatDuration(totals.month)}</strong></button>
        </div>
        <CalendarView view={calendarView} shifts={displayShifts} now={new Date(now)} />
      </section>

      <section className="history-section">
        <div className="section-heading"><div><p className="eyebrow">History</p><h2>Recent shifts</h2></div><button className="add-button" onClick={() => setEditing({})}>+ Add shift</button></div>
        {orderedShifts.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">◷</div><h3>No shifts yet</h3><p>Clock in when your next workday starts, or add a previous shift.</p></div>
        ) : (
          <div className="shift-list">
            {orderedShifts.map((shift) => (
              <article className="shift-row" key={shift.id}>
                <div className="shift-date"><strong>{formatDate(shift.start)}</strong><span>{formatTime(shift.start)} – {formatTime(shift.end)}{new Date(shift.start).toDateString() !== new Date(shift.end).toDateString() && ' · next day'}</span></div>
                <div className="shift-hours"><strong>{formatDuration(shiftMinutes(shift))}</strong><span>{shift.breakMinutes ? `${shift.breakMinutes}m break` : 'No break'}</span></div>
                <div className="shift-actions"><button onClick={() => setEditing(shift)}>Edit</button><button onClick={() => deleteShift(shift.id)}>Delete</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && <ShiftForm shift={editing.id ? editing : null} onSave={saveShift} onCancel={() => setEditing(null)} />}
    </main>
  )
}
