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
          <SummaryCard label="Today" minutes={totals.day} featured />
          <SummaryCard label="This week" minutes={totals.week} />
          <SummaryCard label="This month" minutes={totals.month} />
        </div>
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
