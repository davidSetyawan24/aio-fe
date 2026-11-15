/** "Simpan jadi gambar": ringkasan split bill digambar sendiri di <canvas> (tanpa library), lalu di-download (Mac) / dibagiin (iPhone/iPad). */
import { summaryRows } from '@/lib/splitBill.js'

const W = 1080
const PAD = 72
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

const LINE = 40
const SEP = 26

/** Tinggi kartu satu orang: kepala + rincian (pemisah sebelum biaya & sebelum total) + total. */
const blockHeight = (p) => 112 + p.lines.length * LINE + p.lines.filter((l) => l.sep).length * SEP + SEP + 56

/** Teks dipotong pakai "…" kalau kepanjangan buat lebarnya. */
function fit(c, text, width) {
  if (c.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && c.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

function draw(bill) {
  const rows = summaryRows(bill)
  const H = 400 + rows.people.reduce((sum, p) => sum + blockHeight(p) + 28, 0) + 90
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  const box = (x, y, w, h, r) => {
    c.beginPath()
    if (c.roundRect) c.roundRect(x, y, w, h, r)
    else c.rect(x, y, w, h)
    c.fill()
  }
  const inner = W - PAD * 2
  // latar broken white + kartu hitam
  c.fillStyle = '#F3F2EE'
  c.fillRect(0, 0, W, H)
  c.fillStyle = '#141410'
  box(PAD - 24, PAD - 24, W - (PAD - 24) * 2, 290, 48)
  c.fillStyle = 'rgba(243,242,238,.6)'
  c.font = `600 34px ${FONT}`
  c.fillText(fit(c, `Split bill · ${rows.title}`, inner - 24), PAD + 12, PAD + 44)
  c.fillStyle = '#C8F04A'
  c.font = `800 104px ${FONT}`
  c.fillText(rows.total, PAD + 8, PAD + 166)
  c.fillStyle = 'rgba(243,242,238,.6)'
  c.font = `600 32px ${FONT}`
  c.fillText(`total struk · ${rows.people.length} orang`, PAD + 12, PAD + 222)
  // tiap orang
  let y = 400
  for (const p of rows.people) {
    const h = blockHeight(p)
    c.fillStyle = '#FFFFFF'
    box(PAD - 24, y - 24, W - (PAD - 24) * 2, h, 36)
    c.textAlign = 'left'
    c.fillStyle = '#141410'
    c.font = `700 42px ${FONT}`
    c.fillText(fit(c, p.name, inner - 360), PAD + 8, y + 26)
    c.fillStyle = p.me || p.paid ? '#2BA864' : '#C27C00'
    c.font = `600 28px ${FONT}`
    c.fillText(p.me ? 'yang bayarin' : p.paid ? 'udah bayar ✓' : 'belum bayar', PAD + 8, y + 62)
    c.fillStyle = '#141410'
    c.font = `800 50px ${FONT}`
    c.textAlign = 'right'
    c.fillText(p.total, W - PAD - 8, y + 40)
    let ly = y + 124
    const dash = () => {
      c.strokeStyle = 'rgba(20,20,15,.18)'
      c.setLineDash([10, 8])
      c.lineWidth = 2
      c.beginPath()
      // di tengah antara baris sebelumnya & baris sesudahnya
      c.moveTo(PAD + 8, ly - SEP - 15)
      c.lineTo(W - PAD - 8, ly - SEP - 15)
      c.stroke()
      c.setLineDash([])
    }
    c.font = `500 30px ${FONT}`
    for (const l of p.lines) {
      if (l.sep) {
        ly += SEP
        dash()
      }
      c.textAlign = 'left'
      c.fillStyle = '#6E6E66'
      c.fillText(fit(c, l.label, inner - 280), PAD + 8, ly)
      c.textAlign = 'right'
      c.fillStyle = l.amount.startsWith('−') ? '#2BA864' : '#141410'
      c.fillText(l.amount, W - PAD - 8, ly)
      ly += LINE
    }
    ly += SEP
    dash()
    c.font = `800 32px ${FONT}`
    c.fillStyle = '#141410'
    c.textAlign = 'left'
    c.fillText('Total', PAD + 8, ly)
    c.textAlign = 'right'
    c.fillText(p.total, W - PAD - 8, ly)
    c.textAlign = 'left'
    y += h + 28
  }
  c.fillStyle = '#8A8A82'
  c.font = `600 28px ${FONT}`
  c.fillText('dibikin pakai aio.', PAD, H - 50)
  return canvas
}

/**
 * Cara nyimpen (keputusan David 15/11): Mac (mouse) langsung download; iPhone/iPad (layar sentuh) pakai menu Bagikan,
 * karena download di iOS masuk app Files, bukan galeri Foto. Browser yang nggak bisa share file → download.
 */
export function saveMode({ touch, canShare }) {
  return touch && canShare ? 'share' : 'download'
}

const isTouch = () => Boolean(typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches)

/** Simpan gambar ringkasan: download (Mac) atau menu Bagikan (iPhone/iPad: Simpan Gambar / WhatsApp). */
export async function shareBillImage(bill) {
  const canvas = draw(bill)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Gambarnya gagal dibikin.')
  const file = new File([blob], `split-bill-${bill.id}.png`, { type: 'image/png' })
  if (saveMode({ touch: isTouch(), canShare: Boolean(navigator.canShare?.({ files: [file] })) }) === 'share') {
    try {
      await navigator.share({ files: [file], title: `Split bill ${bill.place}` })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  return 'downloaded'
}
