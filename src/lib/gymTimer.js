// Timer istirahat Gym. Disimpen sebagai jam selesai (`endAt`, epoch ms) → tetep bener walau app di-background / ditutup.
// `timer = { endAt, total (dtk), name, beeped }`

export const startTimer = (restSec, name, now) => ({ endAt: now + restSec * 1000, total: restSec, name, beeped: false })

/** Sisa dibulatin ke atas (kayak mockup); habis → `done` + berapa detik lewat. */
export function timerView(t, now) {
  const left = Math.ceil((t.endAt - now) / 1000)
  if (left > 0) return { state: 'run', left, over: 0, ratio: Math.min(1, left / t.total) }
  return { state: 'done', left: 0, over: 0 - left, ratio: 0 }
}

/** +30 dtk: jam selesai & total maju 30; boleh bunyi lagi. */
export const plus30 = (t) => ({ ...t, endAt: t.endAt + 30_000, total: t.total + 30, beeped: false })

export const mss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Timer dari draf HP yang bentuknya bener (selain itu dianggap nggak ada). */
export const validTimer = (t) =>
  !!t && Number.isFinite(t.endAt) && Number.isFinite(t.total) && t.total > 0 && typeof t.name === 'string'
