import { afterEach, describe, expect, it, vi } from 'vitest'
import { fitSize, inkBounds, makeTransparent, cropImageData, processPhotoPixels, shrinkToLimit, SIGNATURE_MAX_CHARS } from './signatureImage.js'

/** ImageData palsu: latar putih + persegi hitam (x0..x1, y0..y1 eksklusif di ujung). */
function photo(w, h, ink) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255)
  for (let y = ink.y0; y < ink.y1; y++)
    for (let x = ink.x0; x < ink.x1; x++) {
      const i = (y * w + x) * 4
      data[i] = data[i + 1] = data[i + 2] = 0
    }
  return { data, width: w, height: h }
}
const alphaAt = (img, x, y) => img.data[(y * img.width + x) * 4 + 3]

describe('fitSize', () => {
  it('nggak membesarkan gambar yang udah kecil', () => {
    expect(fitSize(300, 100)).toEqual({ width: 300, height: 100 })
  })
  it('mengecilkan sampai muat 600×200 dengan rasio tetap', () => {
    expect(fitSize(1200, 400)).toEqual({ width: 600, height: 200 })
    expect(fitSize(3000, 3000)).toEqual({ width: 200, height: 200 })
    const s = fitSize(4000, 1000)
    expect(s.width).toBeLessThanOrEqual(600)
    expect(s.height).toBeLessThanOrEqual(200)
  })
})

describe('makeTransparent', () => {
  it('piksel terang (luma > 200) jadi transparan, gelap tetap', () => {
    const img = photo(4, 4, { x0: 1, y0: 1, x1: 3, y1: 3 })
    makeTransparent(img)
    expect(alphaAt(img, 0, 0)).toBe(0)
    expect(alphaAt(img, 1, 1)).toBe(255)
  })
  it('abu terang juga hilang, biru tua tinta tetap', () => {
    const data = new Uint8ClampedArray([230, 230, 230, 255, 27, 42, 85, 255])
    const img = { data, width: 2, height: 1 }
    makeTransparent(img)
    expect(alphaAt(img, 0, 0)).toBe(0)
    expect(alphaAt(img, 1, 0)).toBe(255)
  })
})

describe('inkBounds & cropImageData', () => {
  it('kotak yang pas ngelilingin piksel yang kelihatan', () => {
    const img = photo(10, 8, { x0: 2, y0: 3, x1: 6, y1: 5 })
    makeTransparent(img)
    expect(inkBounds(img)).toEqual({ x: 2, y: 3, width: 4, height: 2 })
  })
  it('nggak ada tinta → null', () => {
    const img = photo(5, 5, { x0: 0, y0: 0, x1: 0, y1: 0 })
    makeTransparent(img)
    expect(inkBounds(img)).toBeNull()
  })
  it('crop ngambil area itu aja', () => {
    const img = photo(10, 8, { x0: 2, y0: 3, x1: 6, y1: 5 })
    makeTransparent(img)
    const out = cropImageData(img, inkBounds(img))
    expect(out.width).toBe(4)
    expect(out.height).toBe(2)
    expect(out.data.length).toBe(4 * 2 * 4)
    expect(alphaAt(out, 0, 0)).toBe(255)
  })
})

describe('processPhotoPixels', () => {
  it('gambar putih + coretan hitam → latar transparan, dipotong ke coretan', () => {
    const img = photo(100, 50, { x0: 20, y0: 10, x1: 60, y1: 30 })
    const out = processPhotoPixels(img)
    expect(out.width).toBe(40)
    expect(out.height).toBe(20)
    expect(alphaAt(out, 0, 0)).toBe(255)
  })
  it('foto kosong (nggak ada coretan) → null', () => {
    expect(processPhotoPixels(photo(10, 10, { x0: 0, y0: 0, x1: 0, y1: 0 }))).toBeNull()
  })
})

describe('shrinkToLimit', () => {
  afterEach(() => vi.restoreAllMocks())

  it('PNG kegedean → dikecilin lagi sampai ≤ 60.000 karakter', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() })
    // Ukuran "PNG" palsu: sebanding luas.
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      return `data:image/png;base64,${'A'.repeat(this.width * this.height)}`
    })
    const source = document.createElement('canvas')
    source.width = 600
    source.height = 200
    const url = shrinkToLimit(source)
    expect(SIGNATURE_MAX_CHARS).toBe(60000)
    expect(url.length).toBeLessThanOrEqual(60000)
    expect(url.startsWith('data:image/png')).toBe(true)
  })

  it('yang udah kecil langsung dipakai', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA')
    const source = document.createElement('canvas')
    source.width = 10
    source.height = 10
    expect(shrinkToLimit(source)).toBe('data:image/png;base64,AAAA')
  })
})
