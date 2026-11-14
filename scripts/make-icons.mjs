// Bikin ikon PWA dari logo "aio." (design.md bagian 0): huruf jadi path vektor, bukan font.
// Jalankan: npm run icons  → nulis ke public/icons + public/favicon.svg
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'
import sharp from 'sharp'

const root = fileURLToPath(new URL('..', import.meta.url))
const fontFile = `${root}node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff`
const buf = readFileSync(fontFile)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

const BG = '#141410'
const FG = '#F3F2EE'
const LIME = '#C8F04A'
const EM = 100 // ukuran font dasar (unit bebas, nanti diskalakan)
const TRACKING = -0.065 * EM // letter-spacing rapat sesuai design.md
const DOT = 0.2 * EM // diameter titik
const DOT_GAP = 0.06 * EM

/** Path huruf "aio" + posisi titik, dalam koordinat dengan baseline y=0. */
function logoGeometry() {
  let x = 0
  const parts = []
  let top = 0
  let left = Infinity
  // Glyph diambil per huruf (tanpa fitur ligatur font; opentype.js belum dukung salah satu GSUB-nya, "aio" juga nggak butuh).
  const glyphs = [...'aio'].map((c) => font.charToGlyph(c))
  glyphs.forEach((g, i) => {
    const path = g.getPath(x, 0, EM)
    const bb = path.getBoundingBox()
    top = Math.min(top, bb.y1)
    left = Math.min(left, bb.x1)
    parts.push(path.toPathData(2))
    const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0
    // Sama kayak CSS letter-spacing: berlaku setelah TIAP huruf, termasuk yang terakhir (titik jadi nempel).
    x += ((g.advanceWidth + kern) / font.unitsPerEm) * EM + TRACKING
  })
  const dotCx = x + DOT_GAP + DOT / 2
  const right = dotCx + DOT / 2
  return { d: parts.join(' '), dotCx, dotCy: -DOT / 2, left, right, top, bottom: 0 }
}

/** SVG kotak `size` dengan logo selebar `widthRatio` dari kotak, di tengah. */
function iconSvg(size, { widthRatio, radius = 0, bg = BG }) {
  const g = logoGeometry()
  const w = g.right - g.left
  const h = g.bottom - g.top
  const scale = (size * widthRatio) / w
  const tx = (size - w * scale) / 2 - g.left * scale
  const ty = (size - h * scale) / 2 - g.top * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${g.d}" fill="${FG}"/>
    <circle cx="${g.dotCx.toFixed(2)}" cy="${g.dotCy.toFixed(2)}" r="${(DOT / 2).toFixed(2)}" fill="${LIME}"/>
  </g>
</svg>`
}

const out = `${root}public/icons`
mkdirSync(out, { recursive: true })
const png = (svg, file) => sharp(Buffer.from(svg)).png().toFile(`${out}/${file}`)

// "any": kotak membulat. Apple & maskable: kotak penuh (OS yang motong sudutnya).
await png(iconSvg(192, { widthRatio: 0.62, radius: 192 * 0.225 }), 'icon-192.png')
await png(iconSvg(512, { widthRatio: 0.62, radius: 512 * 0.225 }), 'icon-512.png')
await png(iconSvg(512, { widthRatio: 0.5 }), 'maskable-512.png') // aman di zona 80% tengah
await png(iconSvg(180, { widthRatio: 0.62 }), 'apple-touch-icon-180.png')
await png(iconSvg(32, { widthRatio: 0.78, radius: 7 }), 'favicon-32.png')
writeFileSync(`${out}/aio-mark.svg`, iconSvg(512, { widthRatio: 0.62, radius: 512 * 0.225 }))
writeFileSync(`${root}public/favicon.svg`, iconSvg(64, { widthRatio: 0.78, radius: 14 }))
console.log('Ikon dibuat di public/icons + public/favicon.svg')
