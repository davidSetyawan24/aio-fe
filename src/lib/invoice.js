/** Invoice: hitungan (HARUS sama persis dengan BE `invoice-math.ts`), format, status, dan isi kertas (`sheetModel`). */

/** Subtotal = Σ jumlah × harga; dasar pajak = subtotal − diskon (min 0); PPN dibulatkan; total = dasar + PPN. */
export function totals({ items, discount, taxOn, taxPct }) {
  const sub = items.reduce((sum, it) => sum + it.qty * it.price, 0)
  const base = Math.max(0, sub - discount)
  const tax = taxOn ? Math.round((base * taxPct) / 100) : 0
  return { sub, disc: discount, tax, total: base + tax }
}

const ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']

function below1000(n) {
  const parts = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds === 1) parts.push('seratus')
  else if (hundreds > 1) parts.push(`${ONES[hundreds]} ratus`)
  if (rest === 10) parts.push('sepuluh')
  else if (rest === 11) parts.push('sebelas')
  else if (rest > 11 && rest < 20) parts.push(`${ONES[rest - 10]} belas`)
  else {
    const tens = Math.floor(rest / 10)
    if (tens > 1) parts.push(`${ONES[tens]} puluh`)
    if (rest % 10 > 0) parts.push(ONES[rest % 10])
  }
  return parts.join(' ')
}

const SCALES = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']]

/** Rupiah bulat → "dua puluh tujuh juta … rupiah" (huruf kecil). 0 → "nol rupiah". */
export function terbilang(n) {
  if (n === 0) return 'nol rupiah'
  let left = Math.floor(n)
  const parts = []
  for (const [size, name] of SCALES) {
    const chunk = Math.floor(left / size)
    left %= size
    if (chunk === 0) continue
    parts.push(size === 1e3 && chunk === 1 ? 'seribu' : `${below1000(chunk)} ${name}`)
  }
  if (left > 0) parts.push(below1000(left))
  return `${parts.join(' ')} rupiah`
}

/** 'INV/DS' + '2026-11' + 2 → 'INV/DS/2026/11/002' (seq ≥ 1000 apa adanya). */
export function formatNumber(prefix, month, seq) {
  const [year, mm] = month.split('-')
  return `${prefix}/${year}/${mm}/${String(seq).padStart(3, '0')}`
}

const dayNumber = (date) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86400000)

/** Lunas kalau ada tanggal diterima; telat kalau jatuh tempo sebelum hari ini. */
export function invoiceStatus(inv, today) {
  if (inv.paidOn) return { status: 'paid', lateDays: 0, daysLeft: 0 }
  const diff = dayNumber(inv.dueOn) - dayNumber(today)
  if (diff < 0) return { status: 'late', lateDays: -diff, daysLeft: 0 }
  return { status: 'open', lateDays: 0, daysLeft: diff }
}

/** Huruf depan 2 kata pertama, huruf kecil. */
export const initialsOf = (name) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]).join('').toLowerCase()

/* ---------- format ---------- */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const parts = (date) => date.split('-').map(Number)

export const rp = (n) => `Rp${Math.round(n).toLocaleString('id-ID')}`
export const rpPaper = (n) => `Rp ${Math.round(n).toLocaleString('id-ID')}`
export const monthName = (month) => `${BULAN[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`
export function fmtLong(date) { const [y, m, d] = parts(date); return `${d} ${BULAN[m - 1]} ${y}` }
export function fmtShort(date) { const [y, m, d] = parts(date); return `${d} ${BLN[m - 1]} ${y}` }
export function fmtDM(date) { const [, m, d] = parts(date); return `${d} ${BLN[m - 1]}` }
/** 'INV/DS/2026/11/001' → 'INV-DS-2026-11-001.pdf' */
export const fileName = (number) => `${number.replaceAll('/', '-')}.pdf`

/** Chip status di daftar & detail. */
export function statusChip(inv) {
  if (inv.status === 'paid') return { text: 'Lunas', tone: 'green' }
  if (inv.status === 'late') return { text: `Telat ${inv.lateDays} hari`, tone: 'red' }
  if (inv.daysLeft === 0) return { text: 'Hari ini', tone: 'amber' }
  if (inv.daysLeft === 1) return { text: 'Besok', tone: 'amber' }
  if (inv.daysLeft <= 3) return { text: `${inv.daysLeft} hari lagi`, tone: 'amber' }
  return { text: `Tempo ${fmtDM(inv.dueOn)}`, tone: 'soft' }
}

/** Satu-satunya sumber isi kertas: dipakai pratinjau HTML dan PDF (teks formal, uang pakai spasi). */
export function sheetModel(inv) {
  const c = inv.client ?? {}
  const t = totals(inv)
  const paid = Boolean(inv.paidOn)
  const rows = inv.items
    .filter((it) => it.desc || it.price)
    .map((it, i) => ({
      no: String(i + 1).padStart(2, '0'),
      desc: it.desc,
      detail: it.detail || '',
      qty: `${it.qty} ${it.unit}`,
      price: rpPaper(it.price),
      subtotal: rpPaper(it.qty * it.price),
    }))
  const extras = []
  if (t.disc || inv.taxOn) {
    extras.push({ label: 'Subtotal', value: rpPaper(t.sub) })
    if (t.disc) extras.push({ label: 'Diskon', value: `- ${rpPaper(t.disc)}` })
    if (inv.taxOn) extras.push({ label: `PPN ${inv.taxPct}%`, value: rpPaper(t.tax) })
  }
  return {
    number: inv.number,
    lh: inv.letterhead,
    client: { name: c.name || '', attn: c.attn || '', addressLines: c.address ? c.address.split('\n') : [], email: c.email || '' },
    issued: fmtLong(inv.issuedOn),
    due: fmtLong(inv.dueOn),
    dueShort: fmtShort(inv.dueOn),
    subject: inv.subject || '',
    opening: inv.letterhead?.opening ?? '',
    rows,
    extras,
    total: rpPaper(t.total),
    terbilang: `Terbilang: ${terbilang(t.total)}`,
    notes: inv.notes.filter((n) => n.trim()).map((n) => n.replaceAll('{klien}', c.name || 'klien')),
    closing: inv.letterhead?.closing ?? '',
    chip: paid ? { label: 'Status', text: 'Lunas' } : { label: 'Jatuh tempo', text: fmtShort(inv.dueOn) },
    stamp: paid ? `DITERIMA ${fmtShort(inv.paidOn).toUpperCase()}` : null,
  }
}
