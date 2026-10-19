import React, { useEffect, useMemo, useState } from 'react'
import { readNotes, readShifts, STORAGE_KEYS, writeJson } from './utils/storage'
import {
  calendarWeekNumber,
  dateKey,
  dayPaidMinutes,
  daySegments,
  DISPLAY_LOCALE,
  durationMinutes,
  formatBreakMinutes,
  formatClock,
  formatDate,
  formatDuration,
  formatTime,
  intervalsOverlap,
  localDateTime,
  monthDays,
  shiftMinutes,
  shiftOverlapsExisting,
  startOfDay,
  totalForPeriod,
} from './utils/time'

function CalendarView({ view, shifts, notes, now, onEditNote }) {
  const today = startOfDay(now)
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  if (view === 'day') {
    const segments = daySegments(shifts, today, now.getTime())
    const paid = dayPaidMinutes(shifts, today)
    const currentPosition = (Math.min(now.getTime(), today.getTime() + 86400000) - today.getTime()) / 864000
    return (
      <div className="calendar-panel">
        <div className="calendar-panel-heading"><div><p className="eyebrow">Today</p><h3>{formatDate(now)}</h3></div><strong>{formatDuration(paid)}</strong></div>
        <div className="timeline-labels"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
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
          <div><p className="eyebrow">Calendar week {calendarWeekNumber(monday)}</p><h3>{isCurrentWeek ? 'This week' : rangeLabel}</h3></div>
          <div className="week-navigation">
            <button onClick={() => setWeekOffset((offset) => offset - 1)} aria-label="Previous week">←</button>
            {!isCurrentWeek && <button className="current-week-button" onClick={() => setWeekOffset(0)}>Current week</button>}
            <button onClick={() => setWeekOffset((offset) => offset + 1)} aria-label="Next week">→</button>
          </div>
          <div className="week-total"><span>Total paid hours</span><strong>{formatDuration(days.reduce((sum, day) => sum + dayPaidMinutes(shifts, day), 0))}</strong></div>
        </div>
        <div className="week-list">
          {days.map((day) => {
            const segments = daySegments(shifts, day, now.getTime())
            const note = notes[dateKey(day)]
            return <div className={`week-row${isCurrentWeek && day.getTime() === today.getTime() ? ' today' : ''}`} key={day.toISOString()} role="button" tabIndex="0" onClick={() => onEditNote(day)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onEditNote(day) } }} aria-label={`${formatDate(day)}${note ? ', note saved' : ', add note'}`}><span className="week-day"><span className="calendar-day-number">{new Intl.DateTimeFormat(DISPLAY_LOCALE, { weekday: 'short' }).format(day)}<small>{day.getDate()}</small></span>{note && <span className="note-indicator" aria-label="Note saved">▤</span>}</span><div className="week-shift">{segments.length > 0 && <div className="week-shift-times">{segments.map((segment) => <span key={segment.id}>{segment.label}</span>)}</div>}</div><strong>{dayPaidMinutes(shifts, day) ? `${(dayPaidMinutes(shifts, day) / 60).toFixed(1)}h` : '—'}</strong></div>
          })}
        </div>
      </div>
    )
  }

  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const isCurrentMonth = monthOffset === 0
  const monthLabel = new Intl.DateTimeFormat(DISPLAY_LOCALE, { month: 'long', year: 'numeric' }).format(month)
  return (
    <div className="calendar-panel">
      <div className="calendar-panel-heading month-calendar-heading">
        <div><h3>{monthLabel}</h3></div>
        <div className="month-navigation">
          <button onClick={() => setMonthOffset((offset) => offset - 1)} aria-label="Previous month">←</button>
          {!isCurrentMonth && <button className="current-month-button" onClick={() => setMonthOffset(0)}>Current month</button>}
          <button onClick={() => setMonthOffset((offset) => offset + 1)} aria-label="Next month">→</button>
        </div>
        <div className="week-total"><span>Total paid hours</span><strong>{formatDuration(daysInMonthTotal(shifts, month))}</strong></div>
      </div>
      <p className="calendar-instruction">Click day to add note</p>
      <div className="month-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="month-grid">{monthDays(month).map((day, index) => {
        if (!day) return <span className="month-day blank" key={`blank-${index}`} />
        const paidMinutes = dayPaidMinutes(shifts, day)
        const isToday = isCurrentMonth && day.getTime() === today.getTime()
        const note = notes[dateKey(day)]
        return <button type="button" className={`month-day${paidMinutes ? ' worked' : ''}${isToday ? ' today' : ''}`} key={day.toISOString()} onClick={() => onEditNote(day)} aria-label={`${formatDate(day)}${note ? ', note saved' : ', add note'}`}><b>{day.getDate()}</b>{paidMinutes ? <small>{(paidMinutes / 60).toFixed(1)} hrs</small> : null}{note && <span className="note-indicator" aria-label="Note saved">▤</span>}</button>
      })}</div>
      <p className="calendar-hint"><span className="orange-key" /> Shift registered <span className="note-key">▤</span> Note saved</p>
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
    breakMinutes: Math.round(Number(shift.breakMinutes) || 0),
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
    const saved = onSave({
      ...form,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      breakMinutes: Math.min(Math.round(breakMinutes), Math.round((end - start) / 60000)),
    })
    if (saved === false) setError('This shift overlaps another saved or active shift.')
  }

  return (
    <div className="modal-backdrop">
      <form className="editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="shift-editor-title" aria-describedby={error ? 'shift-form-error' : undefined}>
        <div className="editor-heading">
          <div><p className="eyebrow">Shift details</p><h2 id="shift-editor-title">{shift ? 'Edit shift' : 'Add a shift'}</h2></div>
          <button type="button" className="close-button" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <label htmlFor="shift-start">Start<input id="shift-start" aria-label="Shift start date and time" aria-invalid={Boolean(error)} type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label>
        <label htmlFor="shift-end">End<input id="shift-end" aria-label="Shift end date and time" aria-invalid={Boolean(error)} type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /></label>
        <label htmlFor="shift-break">Unpaid break <span className="muted">(minutes)</span><input id="shift-break" aria-label="Unpaid break duration in minutes" aria-invalid={Boolean(error)} type="number" min="0" step="1" value={form.breakMinutes} onChange={(event) => setForm({ ...form, breakMinutes: event.target.value })} /></label>
        {error && <p className="form-error" id="shift-form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit">Save shift</button>
      </form>
    </div>
  )
}

function NoteEditor({ date, note, onSave, onDelete, onCancel }) {
  const [value, setValue] = useState(note || '')
  const label = formatDate(date)

  function submit(event) {
    event.preventDefault()
    onSave(dateKey(date), value.trim())
  }

  return (
    <div className="modal-backdrop">
      <form className="editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="note-editor-title">
        <div className="editor-heading">
          <div><p className="eyebrow">Daily note</p><h2 id="note-editor-title">{label}</h2></div>
          <button type="button" className="close-button" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <label htmlFor="day-note">Note<textarea id="day-note" rows="5" maxLength="500" value={value} onChange={(event) => setValue(event.target.value)} /></label>
        <button className="primary-button" type="submit">Save note</button>
        {note && <button className="secondary-button" type="button" onClick={() => onDelete(dateKey(date))}>Delete note</button>}
      </form>
    </div>
  )
}

function SummaryCard({ label, minutes, featured }) {
  return <div className={`summary-card${featured ? ' featured' : ''}`}><span>{label}</span><strong>{formatDuration(minutes)}</strong></div>
}

export default function App() {
  const [shifts, setShifts] = useState(readShifts)
  const [activeStart, setActiveStart] = useState(() => localStorage.getItem(STORAGE_KEYS.activeStart))
  const [activeBreakStart, setActiveBreakStart] = useState(() => localStorage.getItem(STORAGE_KEYS.activeBreakStart))
  const [activeBreakMinutes, setActiveBreakMinutes] = useState(() => Number(localStorage.getItem(STORAGE_KEYS.activeBreakMinutes) || 0))
  const [notes, setNotes] = useState(readNotes)
  const [now, setNow] = useState(Date.now())
  const [editingShift, setEditingShift] = useState(null)
  const [editingNoteDate, setEditingNoteDate] = useState(null)
  const [notice, setNotice] = useState('')
  const [calendarView, setCalendarView] = useState('day')

  useEffect(() => writeJson(STORAGE_KEYS.shifts, shifts), [shifts])
  useEffect(() => writeJson(STORAGE_KEYS.notes, notes), [notes])
  useEffect(() => {
    if (activeStart) localStorage.setItem(STORAGE_KEYS.activeStart, activeStart)
    else localStorage.removeItem(STORAGE_KEYS.activeStart)
  }, [activeStart])
  useEffect(() => {
    if (activeBreakStart) localStorage.setItem(STORAGE_KEYS.activeBreakStart, activeBreakStart)
    else localStorage.removeItem(STORAGE_KEYS.activeBreakStart)
  }, [activeBreakStart])
  useEffect(() => {
    if (activeStart) localStorage.setItem(STORAGE_KEYS.activeBreakMinutes, String(activeBreakMinutes))
    else localStorage.removeItem(STORAGE_KEYS.activeBreakMinutes)
  }, [activeStart, activeBreakMinutes])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!['Note saved.', 'Note removed.'].includes(notice)) return undefined
    const timer = setTimeout(() => setNotice(''), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const orderedShifts = useMemo(() => [...shifts].sort((a, b) => new Date(b.start) - new Date(a.start)), [shifts])
  const recentShifts = orderedShifts.slice(0, 5)
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
      breakMinutes: Math.round(totalBreakMinutes),
    }, ...current])
    setActiveStart(null)
    setActiveBreakStart(null)
    setActiveBreakMinutes(0)
    setNotice('Shift saved.')
  }

  function saveShift(shift) {
    const activeShiftOverlaps = activeStart && intervalsOverlap(shift.start, shift.end, activeStart, new Date().toISOString())
    if (shiftOverlapsExisting(shift, shifts, shift.id) || activeShiftOverlaps) {
      setNotice('That shift overlaps another saved or active shift.')
      return false
    }
    setShifts((current) => shift.id
      ? current.map((item) => item.id === shift.id ? shift : item)
      : [{ ...shift, id: crypto.randomUUID() }, ...current])
    setEditingShift(null)
    setNotice('Shift saved.')
    return true
  }

  function deleteShift(id) {
    if (window.confirm('Delete this shift?')) setShifts((current) => current.filter((shift) => shift.id !== id))
  }

  function saveNote(key, value) {
    setNotes((current) => {
      const next = { ...current }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
    setEditingNoteDate(null)
    setNotice(value ? 'Note saved.' : 'Note removed.')
  }

  function deleteNote(key) {
    setNotes((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setEditingNoteDate(null)
    setNotice('Note removed.')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><span>M</span></div>
        <div><p className="eyebrow">Personal timesheet</p><h1>MyHours</h1></div>
        <span className="privacy-pill">On this device</span>
      </header>

      <section className={`clock-card${activeStart ? ' active' : ''}`}>
        <div className="status-line" role="status"><span className="status-dot" aria-hidden="true" />{activeBreakStart ? 'Currently on unpaid break' : activeStart ? 'Currently working' : 'Ready to clock in'}</div>
        <div className="time-display">
          <div className="live-clock"><span>Local time</span><strong>{formatClock(now)}</strong></div>
          <div className="elapsed-time"><span>{activeBreakStart ? 'Break time' : 'Work time'}</span><strong>{formatDuration(activeMinutes)}</strong></div>
        </div>
        <p>{activeBreakStart ? `Break started at ${formatTime(activeBreakStart)}` : activeStart ? `Started at ${formatTime(activeStart)}` : 'Keep an independent record of every shift.'}</p>
        {activeStart && <button className="break-button" onClick={toggleBreak} aria-label={activeBreakStart ? 'End unpaid break' : 'Start unpaid break'}>{activeBreakStart ? 'End break' : 'Start unpaid break'} <span aria-hidden="true">{activeBreakStart ? '▶' : 'Ⅱ'}</span></button>}
        <button className={`clock-button${activeStart ? ' stop' : ''}`} onClick={activeStart ? clockOut : clockIn} aria-label={activeStart ? 'Clock out and save shift' : 'Clock in'}>{activeStart ? 'Clock out' : 'Clock in'} <span aria-hidden="true">→</span></button>
      </section>

      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      <section className="summary-section">
        <div className="section-heading"><div><p className="eyebrow">Your hours</p><h2>At a glance</h2></div><span className="date-label">{formatDate(now)}</span></div>
        <div className="summary-grid">
          <button className={`summary-card${calendarView === 'day' ? ' featured' : ''}`} onClick={() => setCalendarView('day')} aria-pressed={calendarView === 'day'}><span>Today</span><strong>{formatDuration(totals.day)}</strong></button>
          <button className={`summary-card${calendarView === 'week' ? ' featured' : ''}`} onClick={() => setCalendarView('week')} aria-pressed={calendarView === 'week'}><span>This week</span><strong>{formatDuration(totals.week)}</strong></button>
          <button className={`summary-card${calendarView === 'month' ? ' featured' : ''}`} onClick={() => setCalendarView('month')} aria-pressed={calendarView === 'month'}><span>This month</span><strong>{formatDuration(totals.month)}</strong></button>
        </div>
        <CalendarView view={calendarView} shifts={displayShifts} notes={notes} now={new Date(now)} onEditNote={setEditingNoteDate} />
      </section>

      <section className="history-section">
        <div className="section-heading"><div><p className="eyebrow">History</p><h2>Recent shifts</h2></div><button className="add-button" onClick={() => setEditingShift({})}>+ Add shift</button></div>
        {orderedShifts.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">◷</div><h3>No shifts yet</h3><p>Clock in when your next workday starts, or add a previous shift.</p></div>
        ) : (
          <div className="shift-list">
            {recentShifts.map((shift) => (
              <article className="shift-row" key={shift.id}>
                <div className="shift-date"><strong>{formatDate(shift.start)}</strong><span>{formatTime(shift.start)} – {formatTime(shift.end)}{new Date(shift.start).toDateString() !== new Date(shift.end).toDateString() && ' · next day'}</span></div>
                <div className="shift-hours"><strong>{formatDuration(shiftMinutes(shift))}</strong><span>{shift.breakMinutes ? formatBreakMinutes(shift.breakMinutes) : 'No break'}</span></div>
                <div className="shift-actions"><button onClick={() => setEditingShift(shift)} aria-label={`Edit shift on ${formatDate(shift.start)}`}>Edit</button><button onClick={() => deleteShift(shift.id)} aria-label={`Delete shift on ${formatDate(shift.start)}`}>Delete</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editingShift && <ShiftForm shift={editingShift.id ? editingShift : null} onSave={saveShift} onCancel={() => setEditingShift(null)} />}
      {editingNoteDate && <NoteEditor date={editingNoteDate} note={notes[dateKey(editingNoteDate)]} onSave={saveNote} onDelete={deleteNote} onCancel={() => setEditingNoteDate(null)} />}
    </main>
  )
}
