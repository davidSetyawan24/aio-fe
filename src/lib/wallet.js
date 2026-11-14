/** Kartu & Rekening: tampilan bank, format Rupiah, expired, hitung hari ke tanggal tagihan. */

/** Bank yang sering dipake (urutan pilihan cepat di form) + warna. Bank lain pakai warna netral. */
export const QUICK_BANKS = ['Jago', 'BCA', 'Mega', 'UOB', 'CIMB', 'BNI']
const LOOKS = {
  jago: { short: 'JG', tint: '#FFE3A3', grad: 'linear-gradient(135deg,#F2B33D,#E07A1F)' },
  bca: { short: 'BCA', tint: '#DCEBFF', grad: 'linear-gradient(135deg,#2F62D8,#173A8C)' },
  mega: { short: 'MG', tint: '#FFE0CC', grad: 'linear-gradient(135deg,#F08A3C,#C2531A)' },
  uob: { short: 'UOB', tint: '#E3E1FF', grad: 'linear-gradient(135deg,#3A3F8F,#1D2157)' },
  cimb: { short: 'CIMB', tint: '#FFE0E0', grad: 'linear-gradient(135deg,#D8434B,#8F1E28)' },
  bni: { short: 'BNI', tint: '#D8F3EE', grad: 'linear-gradient(135deg,#1E9C8A,#0E5E55)' },
}
export function bankLook(bank) {
  const look = LOOKS[(bank ?? '').toLowerCase()]
  if (look) return look
  return { short: (bank ?? '').slice(0, 3).toUpperCase() || '…', tint: '#ECEBE6', grad: 'linear-gradient(135deg,#6B6B66,#3A3A36)' }
}

/** Cash terpisah, sisanya dikelompokin per bank (urutan ikut server). */
export function groupSources(list) {
  const cash = list.find((s) => s.kind === 'cash') ?? null
  const banks = []
  for (const s of list) {
    if (s.kind === 'cash') continue
    let group = banks.find((g) => g.bank === s.bank)
    if (!group) banks.push((group = { bank: s.bank, debit: [], cc: [] }))
    group[s.kind === 'cc' ? 'cc' : 'debit'].push(s)
  }
  return { cash, banks }
}

export function summary(list) {
  const cc = list.filter((s) => s.kind === 'cc')
  return { debit: list.filter((s) => s.kind === 'debit').length, cc: cc.length, totalLimit: cc.reduce((sum, s) => sum + (s.creditLimit ?? 0), 0) }
}

export const rp = (n) => `Rp${Math.round(n).toLocaleString('id-ID')}`
/** Versi pendek: Rp462rb, Rp4,2jt, Rp20jt. */
export function rpShort(n) {
  const fmt = (v) => v.toLocaleString('id-ID', { maximumFractionDigits: 1 })
  if (n >= 1e9) return `Rp${fmt(n / 1e9)}M`
  if (n >= 1e6) return `Rp${fmt(n / 1e6)}jt`
  if (n >= 1e3) return `Rp${fmt(n / 1e3)}rb`
  return rp(n)
}

/** "08/28" → { expMonth: 8, expYear: 2028 }. Kosong → null-null. Format salah → undefined. */
export function parseExpiry(text) {
  if (!text) return { expMonth: null, expYear: null }
  const m = /^(\d{2})\/(\d{2})$/.exec(text)
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return undefined
  return { expMonth: Number(m[1]), expYear: 2000 + Number(m[2]) }
}
export const formatExpiry = (month, year) => (month && year ? `${String(month).padStart(2, '0')}/${String(year % 100).padStart(2, '0')}` : '')

const lastDay = (y, m) => new Date(y, m + 1, 0).getDate()
/** Berapa hari lagi ke tanggal `day` (bulan ini, atau bulan depan kalau udah lewat). Bulan pendek → tanggal terakhir. */
export function daysUntilDay(day, today = new Date()) {
  const y = today.getFullYear()
  const m = today.getMonth()
  const start = new Date(y, m, today.getDate())
  let target = new Date(y, m, Math.min(day, lastDay(y, m)))
  if (target < start) target = new Date(y, m + 1, Math.min(day, lastDay(y, m + 1)))
  return Math.round((target - start) / (24 * 60 * 60 * 1000))
}
