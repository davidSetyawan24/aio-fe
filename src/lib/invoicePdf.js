/**
 * PDF invoice (desain D) dibikin di browser pakai pdfkit. Isi kertas SEMUA dari `sheetModel` + `PAPER` (sama dengan
 * pratinjau HTML `InvoiceSheet.vue`). Ukuran ditulis dalam px kertas HTML (794 × 1123) lalu dikali 0,75 jadi pt A4.
 */
import f400 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff?url'
import f400i from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-italic.woff?url'
import f500 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff?url'
import f600 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff?url'
import f700 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff?url'
import f800 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff?url'
import { PAPER, sheetModel } from '@/lib/invoice.js'

const FONTS = [
  ['400', 'normal', f400],
  ['400', 'italic', f400i],
  ['500', 'normal', f500],
  ['600', 'normal', f600],
  ['700', 'normal', f700],
  ['800', 'normal', f800],
]
const fontKey = (weight, style) => (style === 'italic' ? `${weight}i` : weight)

async function fetchFont(weight, style) {
  const url = FONTS.find(([w, s]) => w === weight && s === style)[2]
  const res = await fetch(url)
  if (!res.ok) throw new Error('Font PDF gagal dimuat.')
  return res.arrayBuffer()
}

/* ---------- ukuran & warna (px kertas HTML) ---------- */
const K = 0.75
const W = 794
const H = 1123
const X0 = 60
const X1 = 734
const TOP = 56
const C = {
  ink: '#141410', text: '#23231F', muted: '#8A8A82', hair: '#E6E5DF', lime: '#C8F04A', bw: '#F3F2EE', green: '#2BA864', note: '#5E5D57',
  onLime: '#61761E', // rgba(28,36,0,.6) di atas lime
  markText: '#F3F2EE',
}
// Metrik Plus Jakarta Sans (typo, em): baris "normal" = ascent + descent dibulatin per bagian, kayak Chrome.
const ASC = 1.038
const DESC = 0.222
const rAsc = (size) => Math.round(ASC * size)
const normalLh = (size) => rAsc(size) + Math.round(DESC * size)

const LBL = { size: 9.5, w: '700', ls: 0.16, color: C.muted, upper: true }

/* ---------- teks ---------- */
function setFont(doc, o) {
  doc.font(o.w ?? '400').fontSize(o.size * K)
}
// Ligatur dimatiin kayak di Chrome (letter-spacing ≠ 0 → nggak ada ligatur "fi").
// letter-spacing bawaan kertas = -0.01em dari 16px (diwarisin sebagai -0.16px, bukan per ukuran huruf); `o.ls` = em ukuran sendiri.
const lsPx = (o) => (o.ls != null ? o.ls * o.size : -0.16)
const pdfOpts = (o) => ({ characterSpacing: lsPx(o) * K, features: o.tnum ? { liga: false, tnum: true } : { liga: false } })
const prep = (str, o) => (o.upper ? str.toUpperCase() : str)

/** Lebar ala CSS (letter-spacing ikut dihitung sesudah huruf terakhir). */
function widthOf(doc, str, o) {
  setFont(doc, o)
  const s = prep(str, o)
  return doc.widthOfString(s, pdfOpts(o)) / K + lsPx(o)
}

/** y pdfkit (atas ascender) buat baris CSS yang mulai di `top` dengan tinggi baris `lh`. */
const yFor = (top, o, lh) => top + (lh - normalLh(o.size)) / 2 + rAsc(o.size) - ASC * o.size

/** Satu baris tanpa bungkus. `align` right/center pakai `x` sebagai tepi kanan / tengah. */
function line(doc, str, x, top, o) {
  const s = prep(str, o)
  if (!s) return
  const lh = o.lh ?? normalLh(o.size)
  let left = x
  if (o.align === 'right') left = x - widthOf(doc, s, o)
  else if (o.align === 'center') left = x - widthOf(doc, s, o) / 2
  setFont(doc, o)
  doc.fillColor(o.color ?? C.text).text(s, left * K, yFor(top, o, lh) * K, { ...pdfOpts(o), lineBreak: false })
}

/**
 * Pecah teks jadi baris selebar `width`, aturan kayak browser: spasi di ujung baris nggak dihitung, putus di spasi
 * (atau sesudah "-"), kata yang kepanjangan dipotong per huruf. `o.pre` = baris baru dipertahanin (white-space: pre-line).
 */
function wrap(doc, str, width, o) {
  const text = prep(str, o)
  const paras = o.pre ? text.split('\n') : [text.replace(/\s+/g, ' ')]
  const out = []
  for (const p of paras) {
    const words = p.trim().split(' ').filter(Boolean).flatMap((w) => w.split(/(?<=[^\s\d-]-)(?=[^\s\d-])/))
    let cur = ''
    let joint = ''
    const fits = (t) => widthOf(doc, t, o) <= width + 0.01
    for (const w of words) {
      const next = cur ? `${cur}${joint}${w}` : w
      if (!cur || fits(next)) {
        cur = next
      } else {
        out.push(cur)
        cur = w
      }
      // potong kata yang lebih lebar dari kolom
      while (!fits(cur) && cur.length > 1) {
        let n = cur.length - 1
        while (n > 1 && !fits(cur.slice(0, n))) n--
        out.push(cur.slice(0, n))
        cur = cur.slice(n)
      }
      joint = w.endsWith('-') ? '' : ' '
    }
    if (cur || o.pre) out.push(cur)
  }
  return out
}

/** Paragraf dibungkus selebar `width`; balikin tingginya (px). `o.align` center pakai tengah kolom. */
function para(doc, str, x, top, width, o) {
  if (!str) return 0
  const lh = o.lh ?? normalLh(o.size)
  const lines = wrap(doc, str, width, o)
  lines.forEach((l, i) => line(doc, l, o.align === 'center' ? x + width / 2 : x, top + i * lh, { ...o, upper: false }))
  return lines.length * lh
}
const paraHeight = (doc, str, width, o) => (str ? wrap(doc, str, width, o).length * (o.lh ?? normalLh(o.size)) : 0)

/* ---------- bentuk ---------- */
const box = (doc, x, y, w, h, r, color) => doc.roundedRect(x * K, y * K, w * K, h * K, r * K).fill(color)
const rect = (doc, x, y, w, h, color) => doc.rect(x * K, y * K, w * K, h * K).fill(color)
const dot = (doc, x, y, d, color) => doc.circle((x + d / 2) * K, (y + d / 2) * K, (d / 2) * K).fill(color)
/** Garis lime 3px di kiri kotak rekening (pojok kanan bulat 3px). */
function limeBar(doc, x, y, h) {
  const [l, t, r, b] = [x * K, y * K, (x + 3) * K, (y + h) * K]
  const rr = 3 * K
  doc.moveTo(l, t).lineTo(r - rr, t).quadraticCurveTo(r, t, r, t + rr).lineTo(r, b - rr).quadraticCurveTo(r, b, r - rr, b).lineTo(l, b).closePath().fill(C.lime)
}
function hline(doc, x0, x1, y, width, color) {
  doc.save().moveTo(x0 * K, y * K).lineTo(x1 * K, y * K).lineWidth(width * K).strokeColor(color).stroke().restore()
}

/* ---------- bagian kertas ---------- */
function header(doc, m) {
  // kanan: "Invoice." + nomor
  const ttl = { size: 40, w: '800', ls: -0.05, color: C.ink }
  const ttlW = widthOf(doc, PAPER.title, ttl)
  line(doc, PAPER.title, X1 - 12 - ttlW, TOP, { ...ttl, lh: 36 })
  dot(doc, X1 - 9, TOP + 25.5, 9, C.lime)
  line(doc, m.number, X1, 103, { size: 11.5, w: '700', ls: 0.02, color: C.muted, tnum: true, align: 'right' })

  // kiri: monogram + nama + kontak (kolom teks di tengah tinggi monogram)
  const textW = X1 - Math.max(ttlW + 12, widthOf(doc, m.number, { size: 11.5, w: '700', ls: 0.02 })) - 24 - 120
  const nm = { size: 17, w: '800', ls: -0.03, color: C.ink }
  const ct = { size: 11, w: '500', color: C.muted }
  const contact = [m.lh.phone, m.lh.email].filter(Boolean).join(' · ')
  const nmH = paraHeight(doc, m.lh.name || ' ', textW, nm)
  const colH = nmH + (contact ? 3 + paraHeight(doc, contact, textW, ct) : 0)
  const brandH = Math.max(46, colH)
  const markTop = TOP + (brandH - 46) / 2
  box(doc, X0, markTop, 46, 46, 13, C.ink)
  const mk = { size: 22, w: '800', ls: -0.065, color: C.markText }
  const mkW = widthOf(doc, m.lh.initial, mk)
  const mkLeft = X0 + (46 - (mkW + 7)) / 2
  // baris teks mulai 9px dari atas, tinggi baris = 22px; titik lime nempel di garis dasar
  line(doc, m.lh.initial, mkLeft, markTop + 9, { ...mk, lh: 22 })
  const base = markTop + 9 + (22 - normalLh(22)) / 2 + rAsc(22)
  dot(doc, mkLeft + mkW + 2, base - 5, 5, C.lime)
  const colTop = TOP + (brandH - colH) / 2
  para(doc, m.lh.name, 120, colTop, textW, nm)
  if (contact) para(doc, contact, 120, colTop + nmH + 3, textW, ct)
  return Math.max(TOP + brandH, 118)
}

/** Kepada + tanggal (kiri) & kotak lime total (kanan). */
function topBlock(doc, m, y) {
  const LW = 378
  line(doc, PAPER.to, X0, y, LBL)
  let ly = y + 12 + 8
  ly += para(doc, m.client.name, X0, ly, LW, { size: 15, w: '800', ls: -0.02, color: C.ink })
  if (m.client.attn) ly += 4 + para(doc, `${PAPER.attn} ${m.client.attn}`, X0, ly + 4, LW, { size: 11.5, w: '600', color: C.text })
  ly += 6
  const addr = { size: 11, lh: 17.6, color: C.muted }
  for (const a of [...m.client.addressLines, ...(m.client.email ? [m.client.email] : [])]) {
    ly += a.trim() ? para(doc, a, X0, ly, LW, addr) : 17.6
  }
  ly += 14
  // label sebaris sama strut 16px (garis dasar +17), nilainya di bawah
  const val = { size: 11.5, w: '700', color: C.ink }
  const col2 = X0 + Math.max(widthOf(doc, PAPER.issued, LBL), widthOf(doc, m.issued, val)) + 26
  for (const [x, label, v] of [[X0, PAPER.issued, m.issued], [col2, PAPER.due, m.due]]) {
    line(doc, label, x, ly + 17 - rAsc(LBL.size), LBL)
    line(doc, v, x, ly + 25, val)
  }
  const leftH = ly + 40 - y

  const sx = 466
  const h = Math.max(leftH, 135)
  box(doc, sx, y, 268, h, 18, C.lime)
  line(doc, PAPER.total, sx + 22, y + 20, { ...LBL, color: C.onLime })
  const amt = { size: 27, w: '800', ls: -0.04, color: C.ink, tnum: true }
  const amtW = widthOf(doc, m.total, amt)
  line(doc, m.total, sx + 22, y + 40, amtW > 224 ? { ...amt, size: (27 * 224) / amtW, lh: 34 } : amt)
  const dueTop = y + h - 43
  line(doc, m.chip.label, sx + 22, dueTop + 5, { size: 11, w: '600', color: C.onLime })
  const chip = { size: 11, w: '800', color: m.stamp ? '#FFFFFF' : C.lime }
  const chipW = widthOf(doc, m.chip.text, chip) + 20
  box(doc, sx + 246 - chipW, dueTop, chipW, 23, 11.5, m.stamp ? C.green : C.ink)
  line(doc, m.chip.text, sx + 246 - chipW + 10, dueTop + 5, chip)
  return y + h
}

/** Perihal + kalimat pembuka; balikin y atas tabel. */
function intro(doc, m, y) {
  y += 26
  if (m.subject) {
    const lblW = widthOf(doc, PAPER.subject, LBL)
    line(doc, PAPER.subject, X0, y + rAsc(12) - rAsc(LBL.size), LBL)
    y += para(doc, m.subject, X0 + lblW + 10, y, X1 - X0 - lblW - 10, { size: 12, w: '700', color: C.ink })
  }
  y += 4
  y += para(doc, m.opening, X0, y, X1 - X0, { size: 11, color: C.muted })
  return y + 14
}

const COLS = { no: X0, desc: 88, qty: 436, priceR: 622, subR: X1 }
const DESC_W = 330
const CELL = { size: 11.5, tnum: true }
const DESC_O = { ...CELL, w: '700', color: C.ink }
const DETAIL_O = { size: 10, w: '500', lh: 15, color: C.muted, tnum: true, pre: true }

/** Header tabel; balikin garis batas header (tengah garis hitam). */
function tableHead(doc, y) {
  const th = { ...LBL, ls: 0.14 }
  const [no, desc, qty, price, sub] = PAPER.cols
  line(doc, no, COLS.no, y, th)
  line(doc, desc, COLS.desc, y, th)
  line(doc, qty, COLS.qty, y, th)
  line(doc, price, COLS.priceR, y, { ...th, align: 'right' })
  line(doc, sub, COLS.subR, y, { ...th, align: 'right' })
  hline(doc, X0, X1, y + 22.5, 1.5, C.ink)
  return y + 22.5
}

function rowHeight(doc, r) {
  const d = r.desc ? paraHeight(doc, r.desc, DESC_W, DESC_O) : 15
  return Math.max(15, d + (r.detail ? 3 + paraHeight(doc, r.detail, DESC_W, DETAIL_O) : 0))
}

function row(doc, r, top) {
  line(doc, r.no, COLS.no, top, { ...CELL, w: '600', color: C.muted })
  const d = r.desc ? para(doc, r.desc, COLS.desc, top, DESC_W, DESC_O) : 15
  if (r.detail) para(doc, r.detail, COLS.desc, top + d + 3, DESC_W, DETAIL_O)
  line(doc, r.qty, COLS.qty, top, { ...CELL, color: C.text })
  line(doc, r.price, COLS.priceR, top, { ...CELL, color: C.text, align: 'right' })
  line(doc, r.subtotal, COLS.subR, top, { ...CELL, w: '700', color: C.ink, align: 'right' })
}

/* ---------- total, rekening + ttd, catatan ---------- */
const TERB = { size: 10.5, w: '400i', lh: 15.75, color: C.muted }

function totalsHeight(doc, m) {
  return Math.max(m.extras.length * 21 + 4 + 39.5, paraHeight(doc, m.terbilang, 300, TERB) + 4)
}

function totals(doc, m, y, h) {
  const boxH = m.extras.length * 21 + 4 + 39.5
  let by = y + h - boxH
  for (const e of m.extras) {
    line(doc, e.label, 434, by + 3, { size: 11.5, w: '600', color: C.muted, tnum: true })
    line(doc, e.value, X1, by + 3, { size: 11.5, w: '700', color: C.ink, tnum: true, align: 'right' })
    by += 21
  }
  by += 4
  hline(doc, 434, X1, by + 0.75, 1.5, C.ink)
  const base = by + 1.5 + 10 + rAsc(22)
  line(doc, PAPER.grand, 434, base - rAsc(11), { size: 11, w: '800', ls: 0.14, color: C.ink, upper: true })
  line(doc, m.total, X1, base - rAsc(22), { size: 22, w: '800', ls: -0.04, color: C.ink, tnum: true, align: 'right' })
  const tH = paraHeight(doc, m.terbilang, 300, TERB)
  para(doc, m.terbilang, X0, y + h - 4 - tH, 300, TERB)
}

const KV_W = 428 - 36 - 92
const KV_VAL = { size: 11.5, w: '700', color: C.ink, tnum: true }
const SIGN_NAME = { size: 11.5, w: '800', color: C.ink, align: 'center' }
/** Tinggi ruang tanda tangan (px kertas, ±3,2 cm): muat buat tempel materai + tanda tangan basah. Sama kayak `.s-ttd` di InvoiceSheet. */
export const SIGN_SPACE = 120

function bottomHeights(doc, m) {
  const vals = [m.lh.bank, m.lh.accountNo, m.lh.accountName]
  const kvH = vals.reduce((sum, v) => sum + Math.max(15, v ? paraHeight(doc, v, KV_W, KV_VAL) : 15), 0) + 10
  const bankH = 16 + 12 + 10 + kvH + 16
  const signH = SIGN_SPACE + 29 + Math.max(15, paraHeight(doc, m.lh.name || ' ', 210, SIGN_NAME))
  return { bankH, signH, h: Math.max(bankH, signH) }
}

function bottom(doc, m, y, { bankH, signH, h }) {
  // rekening: kotaknya setinggi kolom ttd, isinya di tengah (biar kanan nggak keliatan nggantung)
  box(doc, X0, y, 428, h, 16, C.bw)
  limeBar(doc, X0, y + 16, h - 32)
  const bt = y + (h - bankH) / 2
  line(doc, PAPER.bank, 78, bt + 16, LBL)
  let ky = bt + 16 + 12 + 10
  PAPER.bankRows.forEach((label, i) => {
    const v = [m.lh.bank, m.lh.accountNo, m.lh.accountName][i]
    line(doc, label, 78, ky, { size: 11.5, w: '500', color: C.muted })
    const vh = v ? para(doc, v, 170, ky, KV_W, KV_VAL) : 15
    ky += Math.max(15, vh) + 5
  })

  // tanda tangan (rata bawah)
  const st = y + h - signH
  const cx = 524 + 105
  line(doc, PAPER.sign, cx, st, { size: 11.5, color: C.text, align: 'center' })
  if (m.lh.signature) {
    try {
      doc.image(m.lh.signature, 524 * K, (st + 17 + (SIGN_SPACE - 52) / 2) * K, { fit: [210 * K, 52 * K], align: 'center', valign: 'center' })
    } catch {
      // gambar rusak: kertas tetep jadi, cuma tanpa coretan
    }
  }
  hline(doc, 524, X1, st + SIGN_SPACE + 21.5, 1, C.ink)
  para(doc, m.lh.name, 524, st + SIGN_SPACE + 29, 210, SIGN_NAME)

  if (m.stamp) stamp(doc, m, st)
}

/** Cap LUNAS miring -9° di kiri tanda tangan (kanannya 150px dari tepi kanan kolom ttd, naik 14px). */
function stamp(doc, m, signTop) {
  const big = { size: 30, w: '800', ls: 0.14, color: C.green }
  const small = { size: 10, w: '700', ls: 0.08, color: C.green }
  const w = Math.max(widthOf(doc, PAPER.stamp, big), widthOf(doc, m.stamp, small)) + 42
  const h = 66
  const x = X1 - 150 - w
  const y = signTop - 14
  doc.save()
  doc.rotate(-9, { origin: [(x + w / 2) * K, (y + h / 2) * K] })
  const outline = () => doc.roundedRect((x + 1.5) * K, (y + 1.5) * K, (w - 3) * K, (h - 3) * K, 12.5 * K)
  outline()
  doc.fillColor('#FFFFFF', 0.75).fill()
  doc.fillOpacity(1)
  outline()
  doc.lineWidth(3 * K).strokeColor(C.green).stroke()
  const cx = x + w / 2
  line(doc, PAPER.stamp, cx, y + 11, { ...big, lh: 30, align: 'center' })
  // baris kecil ikut strut 11,5px (garis dasar +12 dari atas baris)
  line(doc, m.stamp, cx, y + 41 + rAsc(11.5) - rAsc(10), { ...small, align: 'center' })
  doc.restore()
}

const NOTE = { size: 10.5, lh: 16.8, color: C.note }
const NOTE_W = X1 - X0 - 20

/* ---------- footer tiap halaman ---------- */
const FT = { size: 10, w: '600', color: C.muted }

function footerLayout(doc, m, pages) {
  const right = (i) => [m.number, ` · ${PAPER.page} ${i}/${pages}`]
  const [a, b] = right(pages)
  const rightW = widthOf(doc, a, { ...FT, w: '700' }) + widthOf(doc, b, FT)
  const leftW = X1 - X0 - rightW - 24
  const h = Math.max(12, m.closing ? paraHeight(doc, m.closing, leftW, FT) : 12)
  return { right, leftW, top: H - 30 - h, h }
}

function footer(doc, m, f, i) {
  if (m.closing) para(doc, m.closing, X0, f.top, f.leftW, FT)
  const [a, b] = f.right(i)
  const bW = widthOf(doc, b, FT)
  const rt = f.top + (f.h - 12) / 2
  line(doc, a, X1 - bW, rt, { ...FT, w: '700', color: C.ink, align: 'right' })
  line(doc, b, X1, rt, { ...FT, align: 'right' })
  rect(doc, 0, H - 8, W, 8, C.ink)
  rect(doc, 0, H - 8, W * 0.34, 8, C.lime)
}

/* ---------- susun halaman ---------- */
function layout(doc, m) {
  // Perkiraan footer (jumlah halaman belum tau; lebarnya beda tipis doang) → batas bawah isi.
  const limit = footerLayout(doc, m, 99).top - 20
  let y = header(doc, m) + 34
  y = topBlock(doc, m, y)
  y = intro(doc, m, y)

  const newPage = () => {
    doc.addPage()
    return TOP
  }

  // tabel: baris yang nggak muat pindah halaman, header tabel diulang
  let b = tableHead(doc, y)
  let first = true
  for (const r of m.rows) {
    const ch = rowHeight(doc, r)
    let top = b + (first ? 0.75 : 0.5) + 9
    if (top + ch + 9.5 > limit && !first) {
      b = tableHead(doc, newPage())
      top = b + 0.75 + 9
    }
    row(doc, r, top)
    b = top + ch + 9.5
    hline(doc, X0, X1, b - 0.5, 1, C.hair)
    first = false
  }
  y = b + 0.5

  // total, rekening + ttd: pindah halaman utuh kalau nggak muat
  const tH = totalsHeight(doc, m)
  if (y + 10 + tH > limit) y = newPage() - 10
  totals(doc, m, y + 10, tH)
  y += 10 + tH

  const bh = bottomHeights(doc, m)
  // cap LUNAS nongol 14px di atas kolom ttd
  if (y + 22 + bh.h > limit) y = newPage() - 22 + (m.stamp ? 14 : 0)
  bottom(doc, m, y + 22, bh)
  y += 22 + bh.h

  // catatan: label nempel sama catatan pertama; tiap catatan utuh
  if (m.notes.length) {
    y += 18
    const heights = m.notes.map((n) => paraHeight(doc, n, NOTE_W, NOTE))
    if (y + 18 + heights[0] > limit) y = newPage()
    line(doc, PAPER.notes, X0, y, LBL)
    y += 18
    const space = widthOf(doc, ' ', NOTE)
    m.notes.forEach((n, i) => {
      if (i > 0 && y + heights[i] > limit) y = newPage()
      line(doc, `${i + 1}.`, X0 + 16 - space, y, { ...NOTE, align: 'right' })
      para(doc, n, X0 + 20, y, NOTE_W, NOTE)
      y += heights[i]
    })
  }
}

/**
 * Bikin PDF invoice → Blob `application/pdf`. pdfkit baru dimuat di sini (chunk sendiri, nggak ikut bundle utama).
 * `loadFont(weight, style)` → ArrayBuffer/Uint8Array file .woff (bawaan: fetch dari aset app).
 */
export async function buildInvoicePdf(invoice, { loadFont = fetchFont } = {}) {
  const m = sheetModel(invoice)
  const [{ default: PDFDocument }, fonts] = await Promise.all([
    import('pdfkit'),
    Promise.all(FONTS.map(([w, s]) => loadFont(w, s))),
  ])
  const doc = new PDFDocument({
    size: 'A4', margin: 0, bufferPages: true, font: null, lang: 'id',
    info: { Title: `Invoice ${m.number}`, Author: m.lh.name || '' },
  })
  FONTS.forEach(([w, s], i) => doc.registerFont(fontKey(w, s), fonts[i]))
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)
  })

  layout(doc, m)
  const { start, count } = doc.bufferedPageRange()
  const f = footerLayout(doc, m, count)
  for (let i = 0; i < count; i++) {
    doc.switchToPage(start + i)
    footer(doc, m, f, i + 1)
  }
  doc.end()
  await done
  return new Blob(chunks, { type: 'application/pdf' })
}
