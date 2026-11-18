import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { centralWallToIso, defaultChapterLunchInputs, formatEventRange, formatEventWhen, parseEventInstant, sameCentralDay, toCentralInput, upcomingCentral } from '../src/shared/central'

describe('Central event times', () => {
  it('converts a Central wall clock to UTC, including daylight time', () => {
    // January is CST (UTC−6). July is CDT (UTC−5).
    assert.equal(centralWallToIso(2027, 1, 13, 11, 30), '2027-01-13T17:30:00.000Z')
    assert.equal(centralWallToIso(2027, 7, 14, 11, 30), '2027-07-14T16:30:00.000Z')
    assert.equal(centralWallToIso(2027, 1, 13, 13, 0), '2027-01-13T19:00:00.000Z')
  })

  it('labels the displayed clock time as Central', () => {
    assert.equal(formatEventWhen('2027-01-13T17:30:00.000Z'), 'Wed, Jan 13, 2027, 11:30 AM CT')
    assert.equal(
      formatEventRange('2027-01-13T17:30:00.000Z', '2027-01-13T19:00:00.000Z'),
      'Wed, Jan 13, 2027, 11:30 AM – 1:00 PM CT',
    )
    assert.equal(formatEventWhen('2027-07-14T16:30:00.000Z'), 'Wed, Jul 14, 2027, 11:30 AM CT')
    assert.equal(toCentralInput('2027-01-13T17:30:00.000Z'), '2027-01-13T11:30')
  })

  it('reads a zone-less admin or CSV value as Central and keeps a zoned instant', () => {
    assert.equal(parseEventInstant('2027-01-13T11:30'), '2027-01-13T17:30:00.000Z')
    assert.equal(parseEventInstant('2027-01-13'), '2027-01-13T18:00:00.000Z')
    assert.equal(parseEventInstant('2027-01-13T17:30:00.000Z'), '2027-01-13T17:30:00.000Z')
    assert.equal(parseEventInstant('2027-07-14T11:30:00-05:00'), '2027-07-14T16:30:00.000Z')
  })

  it('places sample lunches at noon Central and outside June and December', () => {
    const from = new Date('2026-11-18T18:00:00.000Z')
    const lunch = upcomingCentral({ weekday: 3, hour: 12, minute: 0, minDaysAhead: 7, skipMonths: [6, 12], from })
    assert.equal(formatEventWhen(lunch), 'Wed, Nov 25, 2026, 12:00 PM CT')
    assert.equal(formatEventWhen(sameCentralDay(lunch, 13, 0)), 'Wed, Nov 25, 2026, 1:00 PM CT')
    assert.deepEqual(defaultChapterLunchInputs(from), { startsAt: '2026-11-25T12:00', endsAt: '2026-11-25T13:00' })

    const conference = upcomingCentral({ weekday: 4, hour: 8, minute: 30, minDaysAhead: 50, skipMonths: [6, 12], from })
    const workshop = upcomingCentral({ weekday: 2, hour: 9, minute: 0, minDaysAhead: 28, skipMonths: [6, 12], from })
    for (const when of [formatEventWhen(lunch), formatEventWhen(conference), formatEventWhen(workshop)]) {
      assert.equal(/Jun|Dec/.test(when), false, when)
    }
    assert.match(formatEventWhen(conference), /8:30 AM CT$/)
    assert.match(formatEventWhen(workshop), /9:00 AM CT$/)
  })
})