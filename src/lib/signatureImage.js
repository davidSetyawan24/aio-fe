/**
 * Tanda tangan: coretan / foto → PNG transparan yang dipotong ke area tinta (maks 600×200, ≤ 60.000 karakter, sama kayak batas BE).
 * Logika piksel murni (ImageData-like `{ data, width, height }`) dipisah dari sentuhan DOM (canvas).
 */
export const SIGNATURE_MAX_W = 600
export const SIGNATURE_MAX_H = 200
export const SIGNATURE_MAX_CHARS = 60000
const LIGHT = 200

/** Kecilin biar muat kotak max (rasio tetap); yang udah kecil nggak dibesarin. */
export function fitSize(width, height, maxW = SIGNATURE_MAX_W, maxH = SIGNATURE_MAX_H) {
  const scale = Math.min(1, maxW / width, maxH / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Piksel terang (luma > 200) jadi transparan — kertas putih hilang, tinta tinggal. Ngubah gambarnya langsung. */
export function makeTransparent(img, light = LIGHT) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    if (luma > light) d[i + 3] = 0
  }
  return img
}

/** Kotak yang pas ngelilingin piksel yang kelihatan (alpha > 0), null kalau kosong. */
export function inkBounds(img) {
  const { data, width, height } = img
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

export function cropImageData(img, box) {
  const data = new Uint8ClampedArray(box.width * box.height * 4)
  for (let y = 0; y < box.height; y++) {
    const from = ((box.y + y) * img.width + box.x) * 4
    data.set(img.data.subarray(from, from + box.width * 4), y * box.width * 4)
  }
  return { data, width: box.width, height: box.height }
}

/** Foto tanda tangan: terang → transparan, dipotong ke coretan. Nggak ada coretan → null. */
export function processPhotoPixels(img) {
  makeTransparent(img)
  const box = inkBounds(img)
  return box ? cropImageData(img, box) : null
}

/* ---------- sentuhan DOM (tipis) ---------- */

const newCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height })

/** Potong canvas ke area tinta. Kosong → null. */
export function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  const box = inkBounds(ctx.getImageData(0, 0, canvas.width, canvas.height))
  if (!box) return null
  const out = newCanvas(box.width, box.height)
  out.getContext('2d').drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height)
  return out
}

/** PNG data URL; kegedean → dikecilin bertahap sampai ≤ batas BE. */
export function shrinkToLimit(canvas) {
  let current = canvas
  let url = current.toDataURL('image/png')
  while (url.length > SIGNATURE_MAX_CHARS && current.width > 40) {
    const next = newCanvas(Math.round(current.width * 0.8), Math.max(1, Math.round(current.height * 0.8)))
    next.getContext('2d').drawImage(current, 0, 0, next.width, next.height)
    current = next
    url = current.toDataURL('image/png')
  }
  return url
}

/** Canvas coretan → potong ke tinta → muat 600×200 → PNG kecil. Kosong → null. */
export function canvasToSignature(canvas) {
  const trimmed = trimCanvas(canvas)
  if (!trimmed) return null
  const size = fitSize(trimmed.width, trimmed.height)
  const out = newCanvas(size.width, size.height)
  out.getContext('2d').drawImage(trimmed, 0, 0, size.width, size.height)
  return shrinkToLimit(out)
}

/** Foto tanda tangan di kertas putih → PNG transparan. Lempar Error kalau nggak kebaca / nggak ada coretan. */
export async function fromPhoto(file) {
  if (typeof createImageBitmap !== 'function') throw new Error('Browsernya belum bisa baca foto ini.')
  const bmp = await createImageBitmap(file)
  const size = fitSize(bmp.width, bmp.height, SIGNATURE_MAX_W * 2, SIGNATURE_MAX_H * 2)
  const canvas = newCanvas(size.width, size.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.drawImage(bmp, 0, 0, size.width, size.height)
  bmp.close?.()
  const px = processPhotoPixels(ctx.getImageData(0, 0, size.width, size.height))
  if (!px) throw new Error('Nggak ada coretan yang kebaca di foto itu.')
  const ink = newCanvas(px.width, px.height)
  ink.getContext('2d').putImageData(new ImageData(px.data, px.width, px.height), 0, 0)
  const fit = fitSize(px.width, px.height)
  const out = newCanvas(fit.width, fit.height)
  out.getContext('2d').drawImage(ink, 0, 0, fit.width, fit.height)
  return shrinkToLimit(out)
}
