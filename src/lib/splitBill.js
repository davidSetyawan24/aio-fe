/** Split bill: hitungan bagian per orang (HARUS sama persis dengan BE `split-math.ts`), teks WhatsApp, isi gambar. */
import { shortDate } from '@/lib/budget.js'
import { rp } from '@/lib/wallet.js'

/**
 * Item dibagi rata ke pemiliknya; diskon/service/pajak/biaya lain dibagi sesuai porsi item tiap orang (dibulatin ke rupiah);
 * sisa pembulatan masuk ke "Gue". Item yang belum ada pemiliknya dilewatin (lagi milih di langkah ③).
 */
export function computeShares(bill) {
  const subtotal = bill.items.reduce((s, it) => s + it.qty * it.price, 0)
  const total = subtotal - bill.discount + bill.service + bill.tax + bill.other
  const base = new Map(bill.people.map((p) => [p.id, 0]))
  const lines = new Map(bill.people.map((p) => [p.id, []]))
  for (const it of bill.items) {
    if (!it.who.length) continue
    const amount = (it.qty * it.price) / it.who.length
    for (const id of it.who) {
      base.set(id, (base.get(id) ?? 0) + amount)
      lines.get(id)?.push({ itemId: it.id, name: it.name, amount: Math.round(amount), split: it.who.length })
    }
  }
  const part = (x, b) => (subtotal ? Math.round((x * b) / subtotal) : 0)
  const shares = bill.people.map((p) => {
    const b = base.get(p.id) ?? 0
    const s = { discount: part(bill.discount, b), service: part(bill.service, b), tax: part(bill.tax, b), other: part(bill.other, b) }
    const itemsTotal = Math.round(b)
    return { personId: p.id, items: lines.get(p.id) ?? [], itemsTotal, ...s, rounding: 0, total: itemsTotal - s.discount + s.service + s.tax + s.other }
  })
  const me = shares.find((s) => bill.people.find((p) => p.id === s.personId)?.me)
  const leftover = total - shares.reduce((a, s) => a + s.total, 0)
  if (me && leftover) {
    me.rounding = leftover
    me.total += leftover
  }
  return { subtotal, total, shares }
}

const minus = (n) => (n ? `−${rp(n)}` : rp(0))
const itemLabel = (l) => (l.split > 1 ? `${l.name} (bagi ${l.split})` : l.name)

/** Baris biaya tambahan yang nggak nol: [{ key, label, emoji, amount }] (diskon udah minus). */
export function chargeRows(bill, share) {
  return [
    { key: 'discount', label: 'Diskon', emoji: '🏷️', on: bill.discount, amount: -share.discount },
    { key: 'service', label: 'Service', emoji: '🛎️', on: bill.service, amount: share.service },
    { key: 'tax', label: 'Pajak', emoji: '🧾', on: bill.tax, amount: share.tax },
    { key: 'other', label: 'Biaya lain', emoji: '➕', on: bill.other, amount: share.other },
  ].filter((r) => r.on)
}

export const money = (n) => (n < 0 ? minus(-n) : rp(n))

/** Teks tagihan WhatsApp buat satu orang (Gue nggak ditagih → string kosong). */
export function waText(bill, personId) {
  const person = bill.people.find((p) => p.id === personId)
  const share = bill.shares.find((s) => s.personId === personId)
  if (!person || person.me || !share) return ''
  const charges = chargeRows(bill, share)
  return [
    `Halo ${person.name} 👋`,
    `Split bill ${bill.place} (${shortDate(bill.spentOn)}):`,
    ...share.items.map((l) => `• ${itemLabel(l)} ${rp(l.amount)}`),
    ...(charges.length ? ['——', ...charges.map((c) => `• ${c.label} ${money(c.amount)}`)] : []),
    '',
    `Total lo: *${rp(share.total)}*`,
    'Transfer ke gue ya, makasih! 🙏',
  ].join('\n')
}

const PLACE_MAX = 32
const shorten = (text) => (text.length > PLACE_MAX ? `${text.slice(0, PLACE_MAX).trimEnd()}…` : text)

/** Isi gambar ringkasan (digambar di canvas): tiap orang + rincian item, pemisah, biaya, total. */
export function summaryRows(bill) {
  return {
    title: `${shorten(bill.place)} · ${shortDate(bill.spentOn)}`,
    total: rp(bill.total),
    people: bill.people.map((p) => {
      const share = bill.shares.find((s) => s.personId === p.id)
      const items = (share?.items ?? []).map((l) => ({ label: shorten(itemLabel(l)), amount: rp(l.amount) }))
      const extras = [
        ...(share ? chargeRows(bill, share).map((c) => ({ label: c.label, amount: money(c.amount) })) : []),
        ...(share?.rounding ? [{ label: 'Pembulatan', amount: money(share.rounding) }] : []),
      ]
      if (extras.length) extras[0] = { ...extras[0], sep: true }
      return { name: p.name, me: p.me, paid: p.paid, total: rp(share?.total ?? 0), lines: [...items, ...extras] }
    }),
  }
}

export { itemLabel }

/** Warna pastel avatar temen (urutan orang; "Gue" selalu hitam, nggak pakai ini). */
export const PERSON_TINTS = ['#FFE9D6', '#DCEBFF', '#F3E1FF', '#FFE0E6', '#D8F3EE', '#FFF3B8', '#E4F7C4']
export const tintOf = (index) => PERSON_TINTS[(index - 1 + PERSON_TINTS.length) % PERSON_TINTS.length]
export const initial = (name) => name.trim().charAt(0).toUpperCase()

/** Id pendek buat orang/item (awet pas split bill diubah, biar status lunas nggak ketuker). */
export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
