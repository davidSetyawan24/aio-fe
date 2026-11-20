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
  ['name', 'Nama lengkap'], ['birthPlace', 'Tempat lahir'], ['birthDate', 'Tanggal lahir'], ['gender', 'Jenis kelamin'], ['height', 'Tinggi'],
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

const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
/** Nama bulan (huruf kecil) → nomor bulan: nama penuh, singkatan 3 huruf, plus singkatan yang suka dipakai. */
const MONTH_NO = Object.fromEntries([
  ...MONTHS_FULL.map((m, i) => [m.toLowerCase(), i + 1]),
  ...MONTHS.map((m, i) => [m.toLowerCase(), i + 1]),
  ['agt', 8], ['ags', 8], ['sept', 9],
])
export const GENDERS = ['Laki-laki', 'Perempuan']

const pad = (n) => String(n).padStart(2, '0')

/** Tanggal kalender beneran (bukan 31 Feb) → 'YYYY-MM-DD', selainnya null. */
function isoDate(y, m, d) {
  if (!(m >= 1 && m <= 12 && d >= 1)) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/** 'YYYY-MM-DD' yang tanggalnya ada & nggak lewat `today`. */
export function validBirthDate(text, today) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? ''))
  const iso = m && isoDate(Number(m[1]), Number(m[2]), Number(m[3]))
  return Boolean(iso) && iso <= today
}

/**
 * Tanggal lahir lama (dulu kolomnya teks bebas) → 'YYYY-MM-DD', atau null kalau nggak kebaca / ngaco / di masa depan.
 * Kebaca: '1995-06-24', '24/06/1995', '24-06-1995', '24 Juni 1995', '24 Jun 1995'. `today` = 'YYYY-MM-DD' hari ini WIB.
 */
export function parseOldBirthDate(text, today) {
  const s = String(text ?? '').trim()
  let y, mo, d
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (m) [y, mo, d] = [m[1], m[2], m[3]].map(Number)
  else if ((m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s))) [d, mo, y] = [m[1], m[2], m[3]].map(Number)
  else if ((m = /^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/i.exec(s))) {
    mo = MONTH_NO[m[2].toLowerCase()]
    if (!mo) return null
    ;[d, y] = [Number(m[1]), Number(m[3])]
  } else return null
  const iso = isoDate(y, mo, d)
  return iso && iso <= today ? iso : null
}

const MALE = new Set(['laki', 'laki-laki', 'laki laki', 'pria', 'l'])
const FEMALE = new Set(['perempuan', 'wanita', 'p'])

/** Jenis kelamin lama (teks bebas) → 'Laki-laki' | 'Perempuan' | '' (nggak kebaca). */
export function normGender(text) {
  const s = String(text ?? '').trim().toLowerCase()
  if (MALE.has(s)) return 'Laki-laki'
  if (FEMALE.has(s)) return 'Perempuan'
  return ''
}

/** '1995-06-24' → '24 Juni 1995'. Isi lama yang bukan format itu ditampilin apa adanya. */
export function birthDateLabel(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? ''))
  if (!m || !isoDate(Number(m[1]), Number(m[2]), Number(m[3]))) return String(text ?? '')
  return `${Number(m[3])} ${MONTHS_FULL[Number(m[2]) - 1]} ${m[1]}`
}

const GENDER_TEXT = { male: 'Laki-laki', female: 'Perempuan' }

/** Profil badan dari server ({ height, age, gender }) → satu baris pendek + apakah masih ada yang kosong. */
export function profileLine(profile) {
  const p = profile ?? {}
  const parts = []
  if (p.height != null) parts.push(`Tinggi ${p.height} cm`)
  if (p.age != null) parts.push(`${p.age} tahun`)
  if (GENDER_TEXT[p.gender]) parts.push(GENDER_TEXT[p.gender])
  if (!parts.length) return { text: 'Tinggi, umur & jenis kelamin belum diisi', incomplete: true }
  return { text: parts.join(' · '), incomplete: parts.length < 3 }
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
  if (daysLeft <= 0) return 'Hari ini'
  if (daysLeft < 30) return `${daysLeft} hari lagi`
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
