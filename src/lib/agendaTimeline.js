/** Posisi acara di tampilan jam-jaman Agenda (PC): menit mulai/selesai, jejer kalau tabrakan, potongan acara berhari-hari. */

const DAY = 24 * 60
/** Scroll awal: jam 07.00, atau 30 menit sebelum acara pertama kalau lebih pagi. */
const DEFAULT_SCROLL = 7 * 60

export const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}.00`)

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Menit mulai/selesai di hari ini — null kalau acaranya masuk baris "Seharian". */
function spanOf(e) {
  if (e.allDay) return null
  if (e.dayCount > 1) {
    if (e.dayIndex === 1) return [toMinutes(e.startTime), DAY]
    if (e.dayIndex === e.dayCount) return [0, toMinutes(e.endTime)]
    return null // hari tengah acara berhari-hari
  }
  const start = toMinutes(e.startTime)
  const end = toMinutes(e.endTime)
  return [start, end > start ? end : Math.min(start + 30, DAY)]
}

/**
 * Acara satu hari → { allDay, timed }. `timed[i]` = { event, start, end, col, cols }:
 * acara yang saling tabrakan (nyambung berantai) satu kelompok; tiap acara dapet kolom pertama yang udah kosong,
 * `cols` = jumlah kolom kelompoknya (lebar blok = 1/cols).
 */
export function dayPieces(events) {
  const allDay = []
  const pieces = []
  for (const event of events) {
    const span = spanOf(event)
    if (!span) allDay.push(event)
    else pieces.push({ event, start: span[0], end: span[1], col: 0, cols: 1 })
  }
  pieces.sort((a, b) => a.start - b.start || b.end - a.end)

  let group = []
  let groupEnd = -1
  let colEnds = []
  const closeGroup = () => {
    for (const p of group) p.cols = colEnds.length
    group = []
    colEnds = []
  }
  for (const p of pieces) {
    if (p.start >= groupEnd) closeGroup()
    let col = colEnds.findIndex((end) => end <= p.start)
    if (col === -1) col = colEnds.push(0) - 1
    colEnds[col] = p.end
    p.col = col
    group.push(p)
    groupEnd = Math.max(groupEnd, p.end)
  }
  closeGroup()
  return { allDay, timed: pieces }
}

/** Menit buat scroll awal area jam (satu hari atau seminggu: kirim daftar `timed` tiap hari). */
export function firstScrollMinute(timedLists) {
  const starts = timedLists.flat().map((p) => p.start)
  if (!starts.length) return DEFAULT_SCROLL
  return Math.max(0, Math.min(DEFAULT_SCROLL, Math.min(...starts) - 30))
}
