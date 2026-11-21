// Tampilan ringkasan / riwayat / detail sesi Gym (teks + tanggal WIB).
import { BLN, addDays, weekStart } from '@/lib/agenda.js'
import { dDay, dShort } from '@/lib/badanView.js'
import { PROGRAM_LABEL, kgText, wibDate, wibTime } from '@/lib/gym.js'

const WIB_MS = 7 * 3600 * 1000

/** "9–15 Nov" (lintas bulan: "26 Okt–1 Nov"). */
export function weekRange(start) {
  const end = addDays(start, 6)
  const m = (d) => Number(d.slice(5, 7)) - 1
  const from = `${Number(start.slice(8))}${m(start) !== m(end) ? ` ${BLN[m(start)]}` : ''}`
  return `${from}–${Number(end.slice(8))} ${BLN[m(end)]}`
}

/** Judul minggu di riwayat: Minggu ini / Minggu lalu / rentang tanggal. */
export function weekTitle(start, today) {
  const cur = weekStart(today)
  if (start === cur) return 'Minggu ini'
  if (start === addDays(cur, -7)) return 'Minggu lalu'
  return weekRange(start)
}

/** "Sen, 23 Nov · 18.05–19.17" (WIB). */
export const sessionDateLine = (startedAt, endedAt) => `${dDay(wibDate(startedAt))} · ${wibTime(startedAt)}–${wibTime(endedAt)}`

/** "Push 16 Nov". */
export const sessionName = (program, startedAt) => `${PROGRAM_LABEL[program]} ${dShort(wibDate(startedAt))}`

/** Chip perubahan volume: "+6% vs Push 16 Nov". null kalau nggak ada pembanding. `tone` up = lime, flat = netral. */
export function volChip(pct, vs) {
  if (pct == null || !vs) return null
  return { text: `${pct > 0 ? '+' : ''}${pct}% vs ${PROGRAM_LABEL[vs.program]} ${dShort(vs.on)}`, tone: pct > 0 ? 'up' : 'flat' }
}

/** Keterangan PR di daftar ringkasan. */
export const prText = (pr) => (pr.kind === 'beban' ? `beban terberat baru (sebelumnya ${kgText(pr.prev)} kg)` : `reps terbanyak di ${kgText(pr.set[0])} kg`)

/** Jam mulai / selesai (WIB, "HH:MM") buat <input type="time"> + tanggal WIB aslinya masing-masing. */
export function editTimes(startedAt, endedAt) {
  return {
    startDate: wibDate(startedAt),
    start: wibTime(startedAt).replace('.', ':'),
    endDate: wibDate(endedAt),
    end: wibTime(endedAt).replace('.', ':'),
  }
}

/** Tanggal WIB + "HH:MM" → ISO UTC. Jam kosong / ngaco → null. */
export function wibIso(date, hhmm) {
  if (!/^\d{2}:\d{2}$/.test(hhmm ?? '')) return null
  return new Date(new Date(`${date}T${hhmm}:00Z`).getTime() - WIB_MS).toISOString()
}
