// Data palsu buat test halaman Ringkasan / Riwayat / Detail Gym.
const set = (id, exerciseId, weight, reps) => ({ id, clientId: `c${id}`, exerciseId, weight, reps, doneAt: '2026-11-23T11:30:00.000Z' })

/** Push 23 Nov 18.05–19.17 WIB, volume -9% vs Push 16 Nov, 2 PR, 1 gerakan dilewatin. */
export function makeReport(over = {}) {
  const base = {
    session: {
      id: 20, clientId: 'k20', program: 'push', planned: [1, 2, 3, 4, 5, 6],
      startedAt: '2026-11-23T11:05:00.000Z', endedAt: '2026-11-23T12:17:00.000Z',
      sets: [set(1, 1, 25, 8), set(2, 1, 25, 7), set(3, 2, 30, 9), set(4, 3, 40, 12), set(5, 4, 20, 10), set(6, 7, 10, 15)],
    },
    exercises: [
      { exerciseId: 1, name: 'Incline Dumbbell Press', sets: [set(1, 1, 25, 8), set(2, 1, 25, 7)], best: [25, 8], pr: { kind: 'beban', set: [25, 8], prev: 22.5 }, cmp: 'up', prevBest: [22.5, 10] },
      { exerciseId: 2, name: 'Shoulder Press', sets: [set(3, 2, 30, 9)], best: [30, 9], pr: { kind: 'reps', set: [30, 9], prev: 8 }, cmp: 'up', prevBest: [30, 8] },
      { exerciseId: 3, name: 'Pec Deck', sets: [set(4, 3, 40, 12)], best: [40, 12], pr: null, cmp: 'down', prevBest: [42.5, 10] },
      { exerciseId: 4, name: 'Cable Fly', sets: [set(5, 4, 20, 10)], best: [20, 10], pr: null, cmp: 'same', prevBest: [20, 10] },
      { exerciseId: 7, name: 'Lateral Raise', sets: [set(6, 7, 10, 15)], best: [10, 15], pr: null, cmp: 'new', prevBest: null },
    ],
    skipped: [{ exerciseId: 5, name: 'Triceps Pushdown' }],
    summary: { durationMin: 72, volume: 9120, volumeDeltaPct: -9, volumeVs: { sessionId: 11, program: 'push', on: '2026-11-16' }, sets: 6, prs: 2 },
  }
  return { ...base, ...over }
}

/** Satu minggu riwayat. */
export function makeWeek(start, ids, extra = {}) {
  return {
    start,
    count: ids.length,
    volume: 5642,
    sessions: ids.map((id, i) => ({ id, program: i % 2 ? 'pull' : 'push', startedAt: `${start}T03:00:00.000Z`, endedAt: `${start}T04:10:00.000Z`, sets: 18, volume: 2821, prs: i === 0 ? 2 : 0 })),
    ...extra,
  }
}
