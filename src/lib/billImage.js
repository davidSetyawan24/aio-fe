/** "Simpan jadi gambar": ringkasan split bill digambar sendiri di <canvas> (tanpa library), lalu dibagiin lewat menu Bagikan bawaan. */
import { summaryRows } from '@/lib/splitBill.js'

const W = 1080
const PAD = 72
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

function draw(bill) {
  const rows = summaryRows(bill)
  const rowH = 112
  const H = 420 + rows.people.length * rowH + 140
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  // latar broken white + kartu hitam di atas
  c.fillStyle = '#F3F2EE'
  c.fillRect(0, 0, W, H)
  c.fillStyle = '#141410'
  c.beginPath()
  c.roundRect(PAD - 24, PAD - 24, W - (PAD - 24) * 2, 300, 48)
  c.fill()
  c.fillStyle = 'rgba(243,242,238,.6)'
  c.font = `600 34px ${FONT}`
  c.fillText(`🍕 Split bill · ${rows.title}`, PAD + 12, PAD + 44)
  c.fillStyle = '#C8F04A'
  c.font = `800 104px ${FONT}`
  c.fillText(rows.total, PAD + 8, PAD + 170)
  c.fillStyle = 'rgba(243,242,238,.6)'
  c.font = `600 32px ${FONT}`
  c.fillText(`total struk · ${rows.people.length} orang`, PAD + 12, PAD + 230)
  // tiap orang
  let y = 420
  for (const p of rows.people) {
    c.fillStyle = '#FFFFFF'
    c.beginPath()
    c.roundRect(PAD - 24, y - 70, W - (PAD - 24) * 2, rowH - 16, 32)
    c.fill()
    c.fillStyle = '#141410'
    c.font = `700 40px ${FONT}`
    c.fillText(p.name, PAD + 8, y)
    c.fillStyle = p.me || p.paid ? '#2BA864' : '#C27C00'
    c.font = `600 28px ${FONT}`
    c.fillText(p.me ? 'yang bayarin' : p.paid ? 'udah bayar ✓' : 'belum bayar', PAD + 8, y + 34)
    c.fillStyle = '#141410'
    c.font = `800 48px ${FONT}`
    c.textAlign = 'right'
    c.fillText(p.total, W - PAD - 8, y + 14)
    c.textAlign = 'left'
    y += rowH
  }
  c.fillStyle = '#8A8A82'
  c.font = `600 28px ${FONT}`
  c.fillText('dibikin pakai aio.', PAD, H - 56)
  return canvas
}

/** Bagikan gambar (iPhone: Simpan Gambar / WhatsApp). Browser yang nggak bisa share file → download PNG. */
export async function shareBillImage(bill) {
  const canvas = draw(bill)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const file = new File([blob], `split-bill-${bill.id}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
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
