import assert from 'node:assert/strict'
import test from 'node:test'
import { dayPaidMinutes, totalForPeriod } from './time.js'
import { readShifts, writeJson, STORAGE_KEYS } from './storage.js'

function localTimestamp(date, hours, minutes) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString()
}

function shiftForToday(startHour, startMinute, endHour, endMinute, breakMinutes) {
  const today = new Date()
  return {
    id: 'test-shift',
    start: localTimestamp(today, startHour, startMinute),
    end: localTimestamp(today, endHour, endMinute),
    breakMinutes,
  }
}

test('deducts unpaid break minutes from a shift total', () => {
  const shift = shiftForToday(9, 0, 17, 0, 30)

  assert.equal(dayPaidMinutes([shift], new Date()), 450)
})

test('distributes an overnight shift across both calendar days', () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const shift = {
    id: 'overnight-shift',
    start: localTimestamp(yesterday, 23, 30),
    end: localTimestamp(today, 15, 45),
    breakMinutes: 30,
  }

  const firstDayMinutes = dayPaidMinutes([shift], yesterday)
  const secondDayMinutes = dayPaidMinutes([shift], today)

  assert.ok(Math.abs(firstDayMinutes - 29.08) < 0.01)
  assert.ok(Math.abs(secondDayMinutes - 915.92) < 0.01)
  assert.ok(Math.abs(firstDayMinutes + secondDayMinutes - 945) < 0.01)
})

test('updates weekly and monthly totals when a shift is edited', () => {
  const originalShift = shiftForToday(9, 0, 17, 0, 30)
  const editedShift = { ...originalShift, end: localTimestamp(new Date(), 18, 0) }

  assert.equal(totalForPeriod([originalShift], 'week'), 450)
  assert.equal(totalForPeriod([originalShift], 'month'), 450)
  assert.equal(totalForPeriod([editedShift], 'week'), 510)
  assert.equal(totalForPeriod([editedShift], 'month'), 510)
})

test('persists shifts through the storage helpers', () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
  const shifts = [shiftForToday(9, 0, 17, 0, 30)]

  writeJson(STORAGE_KEYS.shifts, shifts)

  assert.deepEqual(readShifts(), shifts)
})
