import { ref } from 'vue'
import { toastController } from '@ionic/vue'
import { ADDRESS_FIELDS, BIO_FIELDS, DOC_TYPES } from './personal.js'

/** Isian form Data Pribadi + cek sebelum kirim. Batas & pesannya KEMBAR sama server. */
export const MAX_VALUE = 100
export const MAX_LABEL = 40
export const MAX_STREET = 200
export const MAX_EXTRA = 20

const clone = (reminders) => reminders.map((r) => ({ n: r.n, unit: r.unit, time: r.time }))
const tooLong = (name, max) => `${name} maksimal ${max} karakter.`

export function blankDoc(type) {
  const t = DOC_TYPES[type]
  return { label: '', values: t.fields.map(() => ''), dates: t.dates.map((d) => ({ key: d.key, on: '', reminders: clone(d.reminders) })) }
}

/** Dokumen dari server → isian form (ubah). */
export function docToForm(doc) {
  return {
    label: doc.label ?? '',
    values: [...doc.values],
    // Satu kotak per tanggal jenis itu — tanggal opsional yang belum diisi tetap dapet kotak kosong.
    dates: DOC_TYPES[doc.type].dates.map((def) => {
      const d = doc.dates.find((x) => x.key === def.key)
      return d ? { key: d.key, on: d.on, reminders: clone(d.reminders) } : { key: def.key, on: '', reminders: clone(def.reminders) }
    }),
  }
}

export function docErrors(type, form) {
  const t = DOC_TYPES[type]
  const out = []
  const label = form.label.trim()
  if (t.custom && !label) out.push('Isi nama dokumennya dulu.')
  if (label.length > MAX_LABEL) out.push(tooLong(t.custom ? 'Nama dokumen' : 'Label', MAX_LABEL))
  t.fields.forEach((name, i) => {
    const v = (form.values[i] ?? '').trim()
    if (i === 0 && !v) out.push(`Isi ${name}-nya dulu.`)
    else if (v.length > MAX_VALUE) out.push(tooLong(name, MAX_VALUE))
  })
  t.dates.forEach((def, i) => {
    if (!def.optional && !form.dates[i]?.on) out.push(`Isi tanggal "${def.name}" dulu.`)
  })
  return out
}

export function docPayload(type, form) {
  const t = DOC_TYPES[type]
  const label = form.label.trim()
  const dates = t.dates.flatMap((def, i) => {
    const d = form.dates[i]
    if (!d?.on) return []
    return [{ key: def.key, on: d.on, reminders: clone(d.reminders).map((r) => ({ ...r, n: Number(r.n) })) }]
  })
  return { type, ...(label ? { label } : {}), values: form.values.map((v) => v.trim()), dates }
}

export const blankAddress = () => ({ name: '', ktp: false, domicile: false, ...Object.fromEntries(ADDRESS_FIELDS.map(([k]) => [k, ''])) })

export function addressErrors(form) {
  const name = form.name.trim()
  if (!name) return ['Kasih nama alamatnya dulu.']
  const out = []
  if (name.length > MAX_LABEL) out.push(tooLong('Nama alamat', MAX_LABEL))
  for (const [key, label] of ADDRESS_FIELDS) {
    const max = key === 'street' ? MAX_STREET : MAX_VALUE
    if (String(form[key] ?? '').trim().length > max) out.push(tooLong(label, max))
  }
  return out
}

export const blankBio = () => ({ fields: Object.fromEntries(BIO_FIELDS.map(([k]) => [k, ''])), extra: [] })

export function bioErrors(form) {
  const out = []
  for (const [key, label] of BIO_FIELDS) {
    if (String(form.fields[key] ?? '').trim().length > MAX_VALUE) out.push(tooLong(label, MAX_VALUE))
  }
  if (form.extra.length > MAX_EXTRA) out.push(`Maksimal ${MAX_EXTRA} data lain.`)
  for (const x of form.extra) {
    if (x.label.trim().length > MAX_LABEL) {
      out.push(tooLong('Label data lain', MAX_LABEL))
      break
    }
  }
  for (const x of form.extra) {
    if (x.value.trim().length > MAX_VALUE) {
      out.push(tooLong('Isi data lain', MAX_VALUE))
      break
    }
  }
  return out
}

/** Semua pesan error dari server (per field) — kalau nggak ada, pesan umumnya. */
export function errorLines(err) {
  const lines = Object.values(err?.fields ?? {}).flat().filter((m) => typeof m === 'string')
  return lines.length ? lines : [err?.message ?? 'Ada yang error. Coba lagi ya.']
}

/** Enter di kolom form → pindah ke kolom berikutnya (kolom terakhir: tutup keyboard). Tanpa ini Enter ngirim form. */
export function focusNext(e) {
  const fields = [...(e.target.closest('form')?.querySelectorAll('.pf-in, .bf-in') ?? [])]
  const next = fields[fields.indexOf(e.target) + 1]
  if (next) next.focus()
  else e.target.blur()
}

/** Toast di atas layar 1,8 dtk. Gagal tampil nggak dianggap masalah (dipakai abis aksi yang udah sukses). */
export async function showToast(message) {
  try {
    await (await toastController.create({ message, duration: 1800, position: 'top', cssClass: 'aio-toast' })).present()
  } catch {
    // toast gagal tampil bukan urusan penting
  }
}

/** Form goyang ±0,5 dtk pas ada error. Pasang `{ 'pf-shake': shake }` di <form>. */
export function useShake() {
  const shake = ref(false)
  function doShake() {
    shake.value = false
    requestAnimationFrame(() => {
      shake.value = true
      setTimeout(() => (shake.value = false), 500)
    })
  }
  return { shake, doShake }
}
