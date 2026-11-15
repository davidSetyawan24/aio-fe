import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setPushApi, setPushEnv, usePushStore } from './push.js'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const subJson = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'p', auth: 'a' } }

/** Browser palsu: izin, langganan, service worker. */
function fakeEnv({ permission = 'default', subscribed = false, answer = 'granted' } = {}) {
  let current = subscribed ? makeSub() : null
  function makeSub() {
    return { toJSON: () => subJson, endpoint: subJson.endpoint, unsubscribe: vi.fn(async () => { current = null; return true }) }
  }
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => (current = makeSub())),
  }
  const Notification = { permission, requestPermission: vi.fn(async () => (Notification.permission = answer)) }
  return {
    pushManager,
    Notification,
    current: () => current,
    navigator: { userAgent: IPHONE, maxTouchPoints: 5, standalone: true, serviceWorker: { ready: Promise.resolve({ pushManager }) } },
    window: { PushManager: function PushManager() {}, Notification, matchMedia: () => ({ matches: true }) },
  }
}

let api
beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async () => ({ publicKey: 'AQID' })),
    put: vi.fn(async () => ({ subscribed: true })),
    del: vi.fn(async () => null),
    post: vi.fn(async () => ({ sent: 1 })),
  }
  setPushApi(api)
})

describe('push store', () => {
  it('init: belum nyala / nyala (sinkron ulang ke server) / server belum disetel / keblok', async () => {
    setPushEnv(fakeEnv())
    let store = usePushStore()
    await store.init()
    expect(store.state).toBe('off')
    expect(api.put).not.toHaveBeenCalled()

    setActivePinia(createPinia())
    setPushEnv(fakeEnv({ permission: 'granted', subscribed: true }))
    store = usePushStore()
    await store.init()
    expect(store.state).toBe('on')
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put).toHaveBeenCalledWith('/push/subscription', subJson)

    setActivePinia(createPinia())
    api.get.mockRejectedValueOnce(new ApiError('Notif di layar belum disetel di server.', 503))
    setPushEnv(fakeEnv())
    store = usePushStore()
    await store.init()
    expect(store.state).toBe('noserver')

    setActivePinia(createPinia())
    setPushEnv(fakeEnv({ permission: 'denied' }))
    store = usePushStore()
    await store.init()
    expect(store.state).toBe('blocked')
  })

  it('nyalain: minta izin → langganan → simpan ke server → nyala; tap dobel cuma sekali', async () => {
    const env = fakeEnv()
    setPushEnv(env)
    const store = usePushStore()
    await store.init()
    const a = store.enable()
    const b = store.enable()
    expect(store.state).toBe('asking')
    expect(await a).toBe(true)
    await b
    expect(env.Notification.requestPermission).toHaveBeenCalledTimes(1)
    expect(env.pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) })
    expect(api.put).toHaveBeenCalledWith('/push/subscription', subJson)
    expect(store.state).toBe('on')
  })

  it('izin ditolak → keblok tanpa simpan ke server; ditutup aja → balik belum nyala', async () => {
    setPushEnv(fakeEnv({ answer: 'denied' }))
    let store = usePushStore()
    await store.init()
    expect(await store.enable()).toBe(false)
    expect(store.state).toBe('blocked')
    expect(api.put).not.toHaveBeenCalled()

    setActivePinia(createPinia())
    setPushEnv(fakeEnv({ answer: 'default' }))
    store = usePushStore()
    await store.init()
    await store.enable()
    expect(store.state).toBe('off')
  })

  it('matiin: berhenti langganan + hapus di server', async () => {
    const env = fakeEnv({ permission: 'granted', subscribed: true })
    setPushEnv(env)
    const store = usePushStore()
    await store.init()
    await store.disable()
    expect(api.del).toHaveBeenCalledWith('/push/subscription', { endpoint: subJson.endpoint })
    expect(env.current()).toBeNull()
    expect(store.state).toBe('off')
  })

  it('kirim notif tes', async () => {
    setPushEnv(fakeEnv({ permission: 'granted', subscribed: true }))
    const store = usePushStore()
    await store.init()
    await store.sendTest()
    expect(api.post).toHaveBeenCalledWith('/push/test')
  })

  it('logout: berhenti langganan di browser; jaringan putus pun tetep beres', async () => {
    const env = fakeEnv({ permission: 'granted', subscribed: true })
    setPushEnv(env)
    api.del.mockRejectedValueOnce(new ApiError('Nggak bisa nyambung ke server.', 0))
    const store = usePushStore()
    await expect(store.forgetOnLogout()).resolves.toBeUndefined()
    expect(env.current()).toBeNull()
    expect(store.state).toBe('loading')
  })
})
