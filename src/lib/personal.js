/** Data Pribadi: jenis dokumen, kolom & teks tampilan. Daftar jenis KEMBAR sama yang di server — ubah dua-duanya bareng. */

const rem = (n, unit) => ({ n, unit, time: '09:00' })

export const DOC_TYPES = {
  ktp: { name: 'KTP', emoji: '🪪', tint: '#DCEBFF', fields: ['NIK'], dates: [], note: 'Berlaku seumur hidup' },
  kk: { name: 'Kartu Keluarga', emoji: '👪', tint: '#FFE9D6', fields: ['Nomor KK'], dates: [] },
  npwp: { name: 'NPWP', emoji: '🧾', tint: '#E4F7C4', fields: ['Nomor NPWP'], dates: [] },
  bpjsk: { name: 'BPJS Kesehatan', emoji: '🏥', tint: '#D8F3EE', fields: ['Nomor kartu'], dates: [] },
  bpjstk: { name: 'BPJS Ketenagakerjaan', emoji: '👷', tint: '#FFF3B8', fields: ['Nomor KPJ'], dates: [] },
  sima: { name: 'SIM A', emoji: '🚗', tint: '#F3E1FF', fields: ['Nomor SIM'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', reminders: [rem(1, 'month'), rem(1, 'week')] }] },
  simc: { name: 'SIM C', emoji: '🛵', tint: '#FFE0E6', fields: ['Nomor SIM'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', reminders: [rem(1, 'month'), rem(1, 'week')] }] },
  paspor: { name: 'Paspor', emoji: '🛂', tint: '#DCEBFF', fields: ['Nomor paspor'], dates: [{ key: 'expiry', name: 'Berlaku s.d.', reminders: [rem(8, 'month'), rem(6, 'month')] }] },
  visa: {
    name: 'Visa', emoji: '✈️', tint: '#E9E4FF', fields: ['Nomor visa'], labelHint: 'Negara, mis. Jepang',
    dates: [{ key: 'expiry', name: 'Berlaku s.d.', reminders: [rem(1, 'month'), rem(2, 'week')] }],
  },
  stnk: {
    name: 'STNK', emoji: '🏍️', tint: '#ECEBE6', fields: ['Plat nomor', 'Nomor rangka', 'Nomor mesin'], labelHint: 'mis. Motor / Mobil',
    dates: [
      { key: 'tax', name: 'Pajak tahunan', reminders: [rem(1, 'month'), rem(1, 'week')] },
      { key: 'stnk', name: 'STNK 5 tahun', reminders: [rem(2, 'month')] },
    ],
  },
  lain: { name: 'Lainnya', emoji: '📎', tint: '#ECEBE6', fields: ['Nomor'], custom: true, dates: [{ key: 'expiry', name: 'Berlaku s.d.', optional: true, reminders: [rem(1, 'month')] }] },
}

export const DOC_TYPE_ORDER = ['ktp', 'kk', 'npwp', 'bpjsk', 'bpjstk', 'sima', 'simc', 'paspor', 'visa', 'stnk', 'lain']

export const BIO_FIELDS = [
  ['name', 'Nama lengkap'], ['birthPlace', 'Tempat lahir'], ['birthDate', 'Tanggal lahir'], ['gender', 'Jenis kelamin'],
  ['bloodType', 'Golongan darah'], ['religion', 'Agama'], ['maritalStatus', 'Status nikah'], ['occupation', 'Pekerjaan'],
  ['nationality', 'Kewarganegaraan'], ['motherName', 'Nama ibu kandung'], ['phone', 'No. HP'], ['email', 'Email'],
]

export const ADDRESS_FIELDS = [
  ['street', 'Jalan & nomor'], ['rtRw', 'RT / RW'], ['village', 'Kelurahan / Desa'], ['district', 'Kecamatan'],
  ['city', 'Kota / Kabupaten'], ['province', 'Provinsi'], ['postalCode', 'Kode pos'],
]

export const REMINDER_HOURS = ['09:00', '12:00', '15:00', '18:00', '21:00']
export const UNITS = [['day', 'hari'], ['week', 'minggu'], ['month', 'bulan']]
const UNIT_NAME = Object.fromEntries(UNITS)
const UNIT_RANGE = { day: [0, 730], week: [1, 104], month: [1, 24] }
export const MAX_REMINDERS = 3

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** '2027-07-24' → '24 Jul 2027'. */
export function formatDate(on) {
  const [y, m, d] = String(on).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** Yang disalin: isinya cuma angka + spasi/titik/strip → angka doang. Selainnya apa adanya. */
export function copyValue(v) {
  const s = String(v ?? '')
  return /^[\d\s.-]+$/.test(s) ? s.replace(/[\s.-]/g, '') : s
}

/** Tampilan di layar: angka 12+ digit dipisah per 4 biar gampang dibaca. */
export function displayNumber(v) {
  const s = String(v ?? '')
  return /^\d{12,}$/.test(s) ? s.replace(/(\d{4})(?=\d)/g, '$1 ') : s
}

export function stateText(date) {
  if (date.state === 'late') return `Udah lewat ${date.lateDays} hari`
  if (date.state === 'soon') {
    if (date.daysLeft <= 0) return 'Habis hari ini'
    return date.daysLeft <= 45 ? `Habis ${date.daysLeft} hari lagi` : `Habis ${Math.round(date.daysLeft / 30)} bulan lagi`
  }
  return `s.d. ${formatDate(date.on)}`
}

export function farText(daysLeft) {
  return daysLeft >= 365 ? `${Math.floor(daysLeft / 365)} tahun lagi` : `${Math.max(1, Math.round(daysLeft / 30))} bulan lagi`
}

const hourText = (time) => String(time).replace(':', '.')

export function reminderText(r) {
  if (r.unit === 'day' && Number(r.n) === 0) return `Hari H · ${hourText(r.time)}`
  return `${r.n} ${UNIT_NAME[r.unit]} sebelum · ${hourText(r.time)}`
}

export const docTitle = (doc) => (DOC_TYPES[doc.type].custom ? doc.label || 'Lainnya' : DOC_TYPES[doc.type].name)
export const docSub = (doc) => (DOC_TYPES[doc.type].custom ? '' : doc.label || '')

/** "Jalan, RT 003/RW 007, Kel. …, Kec. …, Kota, Provinsi 17411" — bagian kosong dilewat. */
export function addressLine(a) {
  const parts = []
  if (a.street) parts.push(a.street)
  const rtRw = String(a.rtRw ?? '').trim()
  if (rtRw) {
    const [rt, rw] = rtRw.split('/').map((x) => x.trim())
    parts.push(rw ? `RT ${rt}/RW ${rw}` : `RT ${rt}`)
  }
  if (a.village) parts.push(`Kel. ${a.village}`)
  if (a.district) parts.push(`Kec. ${a.district}`)
  if (a.city) parts.push(a.city)
  const last = [a.province, a.postalCode].filter(Boolean).join(' ')
  if (last) parts.push(last)
  return parts.join(', ')
}

const rank = (doc) => (doc.dates.some((d) => d.state === 'late') ? 0 : doc.dates.some((d) => d.state === 'soon') ? 1 : 2)

/** Merah dulu, lalu kuning, lalu urutan jenis. */
export function sortDocs(docs) {
  return [...docs].sort((a, b) => rank(a) - rank(b) || DOC_TYPE_ORDER.indexOf(a.type) - DOC_TYPE_ORDER.indexOf(b.type) || a.id - b.id)
}

function dueTitle(doc, date) {
  const base = date.key === 'tax' ? `Pajak ${docTitle(doc)}` : docTitle(doc)
  const sub = docSub(doc)
  return sub ? `${base} · ${sub}` : base
}

/** Tanggal yang udah lewat / masuk waktu pengingat: yang paling telat dulu, lalu yang paling mepet. */
export function dueList(docs) {
  const out = []
  for (const doc of docs) {
    for (const date of doc.dates) {
      if (date.state === 'ok') continue
      out.push({ doc, date, title: dueTitle(doc, date) })
    }
  }
  return out.sort((a, b) => b.date.lateDays - a.date.lateDays || a.date.daysLeft - b.date.daysLeft)
}

/** Pengingat baru `r` ke daftar `list` — pesan error, atau null kalau boleh. */
export function reminderError(list, r) {
  if (list.length >= MAX_REMINDERS) return `Maksimal ${MAX_REMINDERS} pengingat.`
  if (r.n === '' || r.n === null || r.n === undefined || !Number.isInteger(Number(r.n))) return 'Isi angkanya dulu.'
  if (!UNIT_RANGE[r.unit]) return 'Satuannya nggak dikenal.'
  if (!REMINDER_HOURS.includes(r.time)) return 'Jamnya nggak dikenal.'
  const n = Number(r.n)
  const [min, max] = UNIT_RANGE[r.unit]
  if (n < min) return `Minimal ${min} ${UNIT_NAME[r.unit]}.`
  if (n > max) return `Maksimal ${max} ${UNIT_NAME[r.unit]}.`
  if (list.some((x) => Number(x.n) === n && x.unit === r.unit && x.time === r.time)) return 'Pengingat itu udah ada.'
  return null
}
