// Bantuan tampilan Evaluasi AI + Chat AI. Teks persis mockup `ai-chat.html`.
import { BULAN, BLN, HR, addDays, weekdayOf } from './agenda.js'
import { PROGRAM_LABEL } from './gym.js'
import { wibNow } from './home.js'
import { rp } from './wallet.js'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const bold = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
const LIST_ITEM = /^\s*(?:[-•]|\d+\.)\s+(.*)$/

/**
 * Teks jawaban AI → HTML aman: HTML mentah di-escape dulu, baru `**x**` → <b>,
 * baris `- ` / `• ` / `1. ` jadi daftar, baris lain jadi paragraf. Nggak ada tag lain yang lolos.
 */
export function renderAiText(text) {
  const out = []
  let list = null
  const flush = () => {
    if (list) out.push(`<ul>${list.join('')}</ul>`)
    list = null
  }
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const item = LIST_ITEM.exec(line)
    if (item) {
      list ??= []
      list.push(`<li>${bold(esc(item[1]))}</li>`)
      continue
    }
    flush()
    if (line.trim()) out.push(`<p>${bold(esc(line.trim()))}</p>`)
  }
  flush()
  return out.join('')
}

export const CTX_CHIP = { gym: '🏋️ Gym', badan: '⚖️ Badan' }

export const SUGG = {
  gym: ['Gerakan mana yang paling stuck sebulan ini?', 'Progres Push gue gimana dibanding bulan lalu?', 'Volume gue kebanyakan atau kurang?'],
  badan: ['Kenapa berat gue nggak turun-turun?', 'Target protein gue udah pas belum?', 'Tidur gue ngaruh nggak ke progres?'],
}

const programLabel = (program) => PROGRAM_LABEL[program] ?? program

/** Chip konteks di header chat. Obrolan evaluasi: `🏋️ Gym · Push 23 Nov` (dari `program` + `on`). */
export function chipFor(conv) {
  if (conv?.kind === 'eval' && conv.program) {
    const when = conv.on ? ` ${Number(conv.on.slice(8))} ${BLN[Number(conv.on.slice(5, 7)) - 1]}` : ''
    return `🏋️ Gym · ${programLabel(conv.program)}${when}`
  }
  return CTX_CHIP[conv?.context] ?? CTX_CHIP.gym
}

const wibDate = (iso) => wibNow(new Date(iso)).date
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
const mondayOf = (date) => addDays(date, -((weekdayOf(date) + 6) % 7))

function bucket(iso, today) {
  const date = wibDate(iso)
  const diff = daysBetween(date, today)
  if (diff <= 0) return 'Hari ini'
  if (diff === 1) return 'Kemarin'
  return date >= mondayOf(today) ? 'Minggu ini' : 'Lebih lama'
}

/** Kelompokin riwayat obrolan (WIB, minggu mulai Senin; "Kemarin" menang dari batas minggu). Kelompok kosong dibuang. */
export function groupConvs(items, now = new Date()) {
  const today = wibNow(now).date
  const order = ['Hari ini', 'Kemarin', 'Minggu ini', 'Lebih lama']
  const groups = order.map((label) => ({ label, items: [] }))
  for (const item of items ?? []) groups[order.indexOf(bucket(item.updatedAt, today))].items.push(item)
  return groups.filter((g) => g.items.length)
}

const pad = (n) => String(n).padStart(2, '0')

/** Hari ini / kemarin `19.40`, minggu ini `Kam`, lebih lama `17 Nov`. */
export function convTime(iso, now = new Date()) {
  const today = wibNow(now).date
  const b = bucket(iso, today)
  const wib = new Date(new Date(iso).getTime() + 7 * 3_600_000)
  if (b === 'Hari ini' || b === 'Kemarin') return `${pad(wib.getUTCHours())}.${pad(wib.getUTCMinutes())}`
  const date = wibDate(iso)
  if (b === 'Minggu ini') return HR[weekdayOf(date)]
  return `${Number(date.slice(8))} ${BLN[Number(date.slice(5, 7)) - 1]}`
}

/** Baris kecil di bawah judul obrolan. */
export function convSub(item) {
  if (item.kind === 'eval') return item.program ? `nempel ke sesi ${programLabel(item.program)}` : 'nempel ke sesi'
  return `${item.messages} pesan`
}

export const rupiah = rp

/** '2026-11' → 'November' */
export const monthLabel = (ym) => BULAN[Number(ym.slice(5, 7)) - 1]

/** Keadaan evaluasi satu sesi → buat milih tampilan. */
export function evalState(ev) {
  const status = ev?.status ?? 'none'
  const has = Boolean(ev?.content)
  if (status === 'jalan') return has ? 'rerunning' : 'running'
  if (status === 'jadi') return 'done'
  if (status === 'gagal') return has ? 'rerunFailed' : 'failed'
  return 'none'
}
