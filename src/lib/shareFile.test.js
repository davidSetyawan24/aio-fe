import { downloadFile, saveMode, shareOrDownload } from './shareFile.js'

const media = (coarse) => (window.matchMedia = vi.fn(() => ({ matches: coarse, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
const pdf = () => new File(['%PDF-1.3'], 'INV-DS-2026-11-001.pdf', { type: 'application/pdf' })

let clicked
beforeEach(() => {
  clicked = []
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { clicked.push({ href: this.href, download: this.download }) })
})
afterEach(() => {
  vi.restoreAllMocks()
  delete navigator.share
  delete navigator.canShare
})

describe('saveMode', () => {
  it('Mac (mouse) download, iPhone/iPad (sentuh) bagikan, browser nggak bisa share file -> download', () => {
    expect(saveMode({ touch: false, canShare: true })).toBe('download')
    expect(saveMode({ touch: true, canShare: true })).toBe('share')
    expect(saveMode({ touch: true, canShare: false })).toBe('download')
  })
})

describe('shareOrDownload', () => {
  it('layar sentuh + bisa share file -> menu Bagikan', async () => {
    media(true)
    navigator.canShare = vi.fn(() => true)
    navigator.share = vi.fn(async () => {})
    const file = pdf()
    expect(await shareOrDownload(file, 'Invoice INV/DS/2026/11/001')).toBe('shared')
    expect(navigator.share).toHaveBeenCalledWith({ files: [file], title: 'Invoice INV/DS/2026/11/001' })
    expect(clicked).toHaveLength(0)
  })

  it('menu Bagikan dibatalin (AbortError) -> cancelled, nggak download', async () => {
    media(true)
    navigator.canShare = vi.fn(() => true)
    navigator.share = vi.fn(async () => { throw Object.assign(new Error('batal'), { name: 'AbortError' }) })
    expect(await shareOrDownload(pdf(), 'x')).toBe('cancelled')
    expect(clicked).toHaveLength(0)
  })

  it('share gagal karena hal lain -> download aja', async () => {
    media(true)
    navigator.canShare = vi.fn(() => true)
    navigator.share = vi.fn(async () => { throw Object.assign(new Error('nope'), { name: 'NotAllowedError' }) })
    expect(await shareOrDownload(pdf(), 'x')).toBe('downloaded')
    expect(clicked).toEqual([{ href: 'blob:x', download: 'INV-DS-2026-11-001.pdf' }])
  })

  it('bukan layar sentuh -> download <a download> pakai nama file', async () => {
    media(false)
    navigator.canShare = vi.fn(() => true)
    navigator.share = vi.fn()
    expect(await shareOrDownload(pdf(), 'x')).toBe('downloaded')
    expect(navigator.share).not.toHaveBeenCalled()
    expect(clicked).toEqual([{ href: 'blob:x', download: 'INV-DS-2026-11-001.pdf' }])
  })
})

describe('downloadFile', () => {
  it('selalu download', () => {
    media(true)
    downloadFile(pdf())
    expect(clicked).toEqual([{ href: 'blob:x', download: 'INV-DS-2026-11-001.pdf' }])
  })
})
