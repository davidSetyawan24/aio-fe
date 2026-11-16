import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import PDFDocument from 'pdfkit'
import { buildInvoicePdf } from './invoicePdf.js'

/** Font dibaca langsung dari node_modules (di browser lewat fetch). Uint8Array dibikin di realm test biar dikenali pdfkit. */
const FONTS = resolve(process.cwd(), 'node_modules/@fontsource/plus-jakarta-sans/files')
const loadFont = async (weight, style) => new Uint8Array(readFileSync(`${FONTS}/plus-jakarta-sans-latin-${weight}-${style}.woff`))

const letterhead = {
  name: 'David Setyawan', phone: '0812-0000-0000', email: 'david@contoh.id', initial: 'ds', bank: 'Bank Central Asia (BCA)', accountNo: '1234567890',
  accountName: 'David Setyawan', opening: 'Dengan hormat, berikut saya sampaikan tagihan atas pekerjaan dan biaya di bawah ini.',
  closing: 'Terima kasih atas kepercayaan dan kerja samanya.', signature: null,
}
const longDetail = 'Web host management (aaPanel, Nginx, deploy) · SSL/HTTPS · Virtual Private Network (VPN) · Database PostgreSQL · Keamanan server (firewall, Fail2Ban) · '
  + 'Integrasi MQTT · Email notifikasi (SMTP) · Modul Peta Lokasi GeoTIFF, Pump Matrix & penggambaran jalur selang · Lisensi tools pengembangan'
const aps = (over = {}) => ({
  id: 1, number: 'INV/DS/2026/11/001', letterhead, paidOn: null,
  client: { name: 'PT Artha Puncak Semesta Indonesia', attn: 'Bagian Keuangan', address: 'Ruko Cibubur Indah Blok F No. 8, Jl. Raya Lapangan Tembak\nKel. Cibubur, Kec. Ciracas, Jakarta Timur, DKI Jakarta 13720', email: '' },
  issuedOn: '2026-11-11', dueOn: '2026-11-18', subject: 'Pembuatan POC Aplikasi Pump Fleet Management System',
  items: [
    { desc: 'Jasa Pembuatan POC Aplikasi Pump Fleet Management System', detail: 'Pengerjaan 4 minggu', qty: 1, unit: 'Paket', price: 15000000 },
    { desc: 'Cloud Development', detail: '', qty: 2, unit: 'Bulan', price: 850000 },
    { desc: 'Cloud Production', detail: '', qty: 1, unit: 'Bulan', price: 1250000 },
    { desc: 'Setup Server, Infrastruktur & Pengembangan Modul', detail: longDetail, qty: 2, unit: 'Bulan', price: 4471000 },
    { desc: 'Domain projectcoredataq.com', detail: '', qty: 1, unit: 'Tahun', price: 300000 },
  ],
  discount: 0, taxOn: false, taxPct: 11,
  notes: [
    'Harga di atas merupakan harga khusus tahap Proof of Concept (POC) dan tidak berlaku sebagai acuan harga tahap produksi. Penawaran untuk tahap produksi akan disampaikan secara terpisah.',
    'Nilai tagihan di atas adalah nilai bersih (nett). Pajak yang timbul (jika ada) ditanggung oleh {klien}.',
    'Biaya transfer ditanggung pengirim.',
  ],
  ...over,
})

const bytes = async (blob) => new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()))
const pageCount = (raw) => (raw.match(/\/Type \/Page\b(?!s)/g) ?? []).length

afterEach(() => vi.restoreAllMocks())

describe('buildInvoicePdf', () => {
  it('invoice APS: PDF A4 satu halaman', async () => {
    const blob = await buildInvoicePdf(aps(), { loadFont })
    expect(blob.type).toBe('application/pdf')
    const raw = await bytes(blob)
    expect(raw.startsWith('%PDF')).toBe(true)
    expect(pageCount(raw)).toBe(1)
    expect(raw).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/)
  })

  it('+ diskon + PPN + cap LUNAS + tanda tangan: tetep satu halaman', async () => {
    const signature = `data:image/png;base64,${readFileSync(resolve(process.cwd(), 'public/icons/favicon-32.png')).toString('base64')}`
    const inv = aps({ discount: 1000000, taxOn: true, paidOn: '2026-11-17', letterhead: { ...letterhead, signature } })
    const raw = await bytes(await buildInvoicePdf(inv, { loadFont }))
    expect(pageCount(raw)).toBe(1)
    expect(raw).toContain('/Subtype /Image')
  })

  it('30 item: pindah halaman sendiri', async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ desc: `Item ke-${i + 1}`, detail: i % 3 ? '' : 'Detail kecil', qty: 1, unit: 'Paket', price: 100000 }))
    const raw = await bytes(await buildInvoicePdf(aps({ items }), { loadFont }))
    expect(pageCount(raw)).toBeGreaterThanOrEqual(2)
  })

  it('teks kertas dari sheetModel: nomor, total, terbilang, Hal x/y', async () => {
    const text = vi.spyOn(PDFDocument.prototype, 'text')
    await buildInvoicePdf(aps(), { loadFont })
    const all = text.mock.calls.map((c) => c[0]).join(' ')
    expect(all).toContain('INV/DS/2026/11/001')
    expect(all).toContain('Rp 27.192.000')
    expect(all).toContain('dua puluh tujuh juta seratus sembilan puluh dua ribu rupiah')
    expect(all).toContain('Hal 1/1')
    expect(all).toContain('PT Artha Puncak Semesta Indonesia')
    expect(all).toContain('ditanggung oleh PT Artha Puncak Semesta Indonesia.')
    expect(all).toContain('PEMBAYARAN DITRANSFER KE')
    expect(all).not.toContain('LUNAS')
  })

  it('30 item: header tabel diulang + Hal 1/2 & 2/2', async () => {
    const text = vi.spyOn(PDFDocument.prototype, 'text')
    const items = Array.from({ length: 30 }, (_, i) => ({ desc: `Item ke-${i + 1}`, detail: '', qty: 1, unit: 'Paket', price: 100000 }))
    const raw = await bytes(await buildInvoicePdf(aps({ items }), { loadFont }))
    const n = pageCount(raw)
    const all = text.mock.calls.map((c) => c[0])
    expect(all.filter((t) => t === 'KETERANGAN')).toHaveLength(n)
    for (let i = 1; i <= n; i++) expect(all.join('\n')).toContain(`Hal ${i}/${n}`)
  })

  it('lunas: cap LUNAS + DITERIMA', async () => {
    const text = vi.spyOn(PDFDocument.prototype, 'text')
    await buildInvoicePdf(aps({ paidOn: '2026-11-17' }), { loadFont })
    const all = text.mock.calls.map((c) => c[0])
    expect(all).toContain('LUNAS')
    expect(all).toContain('DITERIMA 17 NOV 2026')
  })

  it('isian minim (tanpa U.p., alamat, perihal, catatan, telp/email) tetep jadi', async () => {
    const inv = aps({ client: { name: 'Budi', attn: '', address: '', email: '' }, subject: '', notes: [], letterhead: { ...letterhead, phone: '', email: '', opening: '', closing: '' } })
    const raw = await bytes(await buildInvoicePdf(inv, { loadFont }))
    expect(pageCount(raw)).toBe(1)
  })
})
