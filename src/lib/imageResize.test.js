import { resizeForUpload, resizeToWidth } from './imageResize.js'

it('sends the original photo when the browser cannot resize it', async () => {
  const file = new File(['x'], 'struk.heic', { type: 'image/heic' })
  expect(await resizeForUpload(file)).toBe(file)
})

describe('resizeToWidth', () => {
  const realBitmap = globalThis.createImageBitmap
  afterEach(() => {
    globalThis.createImageBitmap = realBitmap
    vi.restoreAllMocks()
  })
  function fakeCanvas() {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb) => cb(new Blob(['j'], { type: 'image/jpeg' })) }
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    return canvas
  }
  it('scales by WIDTH to 1080 (1290x3855 -> 1080x3227)', async () => {
    globalThis.createImageBitmap = vi.fn(async () => ({ width: 1290, height: 3855, close: vi.fn() }))
    const canvas = fakeCanvas()
    const out = await resizeToWidth(new File(['x'], 'z.jpg'))
    expect([canvas.width, canvas.height]).toEqual([1080, 3227])
    expect(out.type).toBe('image/jpeg')
  })
  it('never enlarges a narrower image', async () => {
    globalThis.createImageBitmap = vi.fn(async () => ({ width: 800, height: 2000 }))
    const canvas = fakeCanvas()
    await resizeToWidth(new File(['x'], 'z.jpg'))
    expect([canvas.width, canvas.height]).toEqual([800, 2000])
  })
  it('falls back to the original file', async () => {
    globalThis.createImageBitmap = vi.fn(async () => { throw new Error('x') })
    const file = new File(['x'], 'z.heic')
    expect(await resizeToWidth(file)).toBe(file)
  })
})
