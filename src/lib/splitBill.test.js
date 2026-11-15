import { computeShares, newId, summaryRows, waText } from './splitBill.js'

const people = [
  { id: 'me', name: 'Gue', me: true },
  { id: 'andi', name: 'Andi', me: false },
  { id: 'sinta', name: 'Sinta', me: false },
  { id: 'raka', name: 'Raka', me: false },
]
const all = people.map((p) => p.id)
/** Contoh kunci — sama persis dengan BE `split-math.spec.ts`. */
const sushi = {
  people,
  items: [
    { id: 'a', name: 'Salmon Sashimi', qty: 1, price: 68000, who: ['me'] },
    { id: 'b', name: 'Chicken Katsu Don', qty: 1, price: 55000, who: ['andi'] },
    { id: 'c', name: 'Ebi Tempura', qty: 2, price: 38000, who: ['sinta', 'raka'] },
    { id: 'd', name: 'Salmon Skin Roll', qty: 1, price: 72000, who: ['me', 'andi'] },
    { id: 'e', name: 'Ocha', qty: 4, price: 8000, who: all },
  ],
  discount: 30000, service: 14150, tax: 29715, other: 0,
}
const sum = (xs) => xs.reduce((a, b) => a + b, 0)

describe('computeShares (sama dengan BE)', () => {
  it('splits items, then discount/service/tax by how much each person ordered', () => {
    const r = computeShares(sushi)
    expect(r.subtotal).toBe(303000)
    expect(r.total).toBe(316865)
    expect(r.shares.map((s) => s.total)).toEqual([117125, 103530, 48105, 48105])
    expect(r.shares[1]).toMatchObject({ personId: 'andi', itemsTotal: 99000, discount: 9802, service: 4623, tax: 9709, other: 0, rounding: 0 })
  })

  it('gives the rounding leftover to "Gue"', () => {
    const r = computeShares({ people: people.slice(0, 3), items: [{ id: 'x', name: 'Pizza', qty: 1, price: 100000, who: ['me', 'andi', 'sinta'] }], discount: 0, service: 0, tax: 10000, other: 0 })
    expect(r.shares.map((s) => s.total)).toEqual([36668, 36666, 36666])
    expect(sum(r.shares.map((s) => s.total))).toBe(110000)
  })

  it('puts charges on "Gue" when every item is free, and spreads a negative other', () => {
    expect(computeShares({ people: people.slice(0, 2), items: [{ id: 'x', name: 'Air', qty: 2, price: 0, who: ['andi'] }], discount: 0, service: 5000, tax: 0, other: 0 }).shares.map((s) => s.total)).toEqual([5000, 0])
    const r = computeShares({
      people: people.slice(0, 2),
      items: [{ id: 'x', name: 'Nasi', qty: 1, price: 30000, who: ['me'] }, { id: 'y', name: 'Ayam', qty: 1, price: 10000, who: ['andi'] }],
      discount: 0, service: 0, tax: 0, other: -200,
    })
    expect(r.shares.map((s) => s.other)).toEqual([-150, -50])
  })

  it('ignores items nobody owns yet (still choosing in step 3)', () => {
    const r = computeShares({ ...sushi, items: sushi.items.map((it) => (it.id === 'b' ? { ...it, who: [] } : it)) })
    expect(r.shares[1].items.map((i) => i.itemId)).toEqual(['d', 'e'])
    expect(Number.isFinite(r.shares[0].total)).toBe(true)
  })
})

describe('waText', () => {
  const bill = { place: 'Sushi Tei', spentOn: '2026-11-14', ...sushi, ...computeShares(sushi) }

  it('writes the WhatsApp message with items, a separator, then the charges that are not zero', () => {
    expect(waText(bill, 'andi')).toBe(
      [
        'Halo Andi 👋',
        'Split bill Sushi Tei (14 Nov):',
        '• Chicken Katsu Don Rp55.000',
        '• Salmon Skin Roll (bagi 2) Rp36.000',
        '• Ocha (bagi 4) Rp8.000',
        '——',
        '• Diskon −Rp9.802',
        '• Service Rp4.623',
        '• Pajak Rp9.709',
        '',
        'Total lo: *Rp103.530*',
        'Transfer ke gue ya, makasih! 🙏',
      ].join('\n'),
    )
  })

  it('skips the charges block when there are none, and adds "Biaya lain"', () => {
    const plain = { ...bill, discount: 0, service: 0, tax: 0, other: 2000 }
    const text = waText({ ...plain, ...computeShares(plain) }, 'raka')
    expect(text).toContain('——\n• Biaya lain Rp')
    expect(text).not.toContain('Diskon')
  })
})

describe('summaryRows (buat gambar) — rincian', () => {
  it('carries each person\'s item and charge lines, and shortens a long place name', () => {
    const base = { place: 'Restoran Sunda Saung Kabayan Cabang Kelapa Gading Jakarta Utara', spentOn: '2026-11-14', ...sushi, ...computeShares(sushi), total: 316865, people: sushi.people.map((p) => ({ ...p, paid: p.me })) }
    const rows = summaryRows(base)
    expect(rows.title).toBe('Restoran Sunda Saung Kabayan Cab… · 14 Nov')
    expect(rows.people[1].lines).toEqual([
      { label: 'Chicken Katsu Don', amount: 'Rp55.000' },
      { label: 'Salmon Skin Roll (bagi 2)', amount: 'Rp36.000' },
      { label: 'Ocha (bagi 4)', amount: 'Rp8.000' },
      { label: 'Diskon', amount: '−Rp9.802', sep: true },
      { label: 'Service', amount: 'Rp4.623' },
      { label: 'Pajak', amount: 'Rp9.709' },
    ])
  })
})

describe('summaryRows (buat gambar)', () => {
  it('lists every person with their total and paid status', () => {
    const bill = { place: 'Sushi Tei', spentOn: '2026-11-14', ...sushi, ...computeShares(sushi), total: 316865, people: sushi.people.map((p) => ({ ...p, paid: p.me || p.id === 'andi' })) }
    const rows = summaryRows(bill)
    expect(rows.title).toBe('Sushi Tei · 14 Nov')
    expect(rows.total).toBe('Rp316.865')
    expect(rows.people.map((p) => [p.name, p.total, p.paid])).toEqual([
      ['Gue', 'Rp117.125', true],
      ['Andi', 'Rp103.530', true],
      ['Sinta', 'Rp48.105', false],
      ['Raka', 'Rp48.105', false],
    ])
  })
})

it('makes short unique ids', () => {
  const ids = new Set(Array.from({ length: 200 }, () => newId()))
  expect(ids.size).toBe(200)
  expect([...ids].every((id) => id.length <= 20)).toBe(true)
})
