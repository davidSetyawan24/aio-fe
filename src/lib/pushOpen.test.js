import { listenPushOpen } from './pushOpen.js'

const fakeSw = () => {
  const handlers = []
  return { addEventListener: (type, fn) => type === 'message' && handlers.push(fn), emit: (data) => handlers.forEach((fn) => fn({ data })) }
}
const cachesWith = (url) => {
  let stored = url ? new Response(url) : undefined
  return { open: async () => ({ match: async () => stored, delete: async () => (stored = undefined) }) }
}

describe('listenPushOpen', () => {
  it('app udah kebuka: service worker ngabarin → pindah ke layar notif', async () => {
    const sw = fakeSw()
    const navigate = vi.fn()
    await listenPushOpen({ serviceWorker: sw, caches: cachesWith(null), navigate })
    sw.emit({ type: 'aio-open', url: 'https://aio.davidsetyawan.com/tabs/agenda?tanggal=2026-11-16&n=4' })
    sw.emit({ type: 'lain', url: '/x' })
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith('/tabs/agenda?tanggal=2026-11-16&n=4')
  })

  it('app dibuka dari notif (iOS buka halaman awal) → alamat yang ketunda dipake sekali', async () => {
    const navigate = vi.fn()
    const caches = cachesWith('https://aio.davidsetyawan.com/tabs/profil?n=9')
    await listenPushOpen({ serviceWorker: fakeSw(), caches, navigate })
    expect(navigate).toHaveBeenCalledWith('/tabs/profil?n=9')
    await listenPushOpen({ serviceWorker: fakeSw(), caches, navigate })
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('browser tanpa service worker / Cache API → diem', async () => {
    const navigate = vi.fn()
    await expect(listenPushOpen({ serviceWorker: undefined, caches: undefined, navigate })).resolves.toBeUndefined()
    expect(navigate).not.toHaveBeenCalled()
  })
})
