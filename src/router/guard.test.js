import { GYM_LIVE_PATH, decideNavigation } from './guard.js'

const to = (fullPath, meta = {}) => {
  const [path, qs] = fullPath.split('?')
  return { path, fullPath, meta, query: Object.fromEntries(new URLSearchParams(qs ?? '')) }
}

describe('decideNavigation', () => {
  it('sends a guest to login and remembers where they were going', () => {
    expect(decideNavigation(to('/tabs/agenda'), 'guest')).toEqual({ path: '/login', query: { redirect: '/tabs/agenda' } })
  })
  it('lets a guest open the login page', () => {
    expect(decideNavigation(to('/login', { public: true }), 'guest')).toBe(true)
  })
  it('sends a logged-in user away from login to the remembered page', () => {
    expect(decideNavigation(to('/login?redirect=/tabs/agenda', { public: true }), 'authed')).toEqual({ path: '/tabs/agenda' })
  })
  it('ignores redirects outside the app', () => {
    expect(decideNavigation(to('/login?redirect=https://jahat.com', { public: true }), 'authed')).toEqual({ path: '/tabs/home' })
    expect(decideNavigation(to('/login?redirect=//jahat.com', { public: true }), 'authed')).toEqual({ path: '/tabs/home' })
  })
  it('lets a logged-in user through', () => {
    expect(decideNavigation(to('/tabs/duit'), 'authed')).toBe(true)
  })
  it('does not redirect while offline or unknown (the splash handles it)', () => {
    expect(decideNavigation(to('/tabs/duit'), 'offline')).toBe(true)
    expect(decideNavigation(to('/tabs/duit'), 'unknown')).toBe(true)
  })

  describe('offline + ada draf sesi Gym di HP', () => {
    it('buka app (navigasi pertama) → langsung ke sesi live', () => {
      expect(GYM_LIVE_PATH).toBe('/tabs/menu/gym/sesi')
      expect(decideNavigation(to('/tabs/home'), 'offline', { gymDraft: true, first: true })).toEqual({ path: GYM_LIVE_PATH })
    })
    it('udah di sesi live → lanjut', () => {
      expect(decideNavigation(to(GYM_LIVE_PATH), 'offline', { gymDraft: true, first: true })).toBe(true)
    })
    it('pindah halaman di tengah jalan → nggak dipaksa balik (App nampilin layar offline + tombol lanjut sesi)', () => {
      expect(decideNavigation(to('/tabs/menu/gym'), 'offline', { gymDraft: true, first: false })).toBe(true)
    })
    it('tanpa draf / udah login / belum login → aturan biasa', () => {
      expect(decideNavigation(to('/tabs/home'), 'offline', { gymDraft: false, first: true })).toBe(true)
      expect(decideNavigation(to('/tabs/home'), 'authed', { gymDraft: true, first: true })).toBe(true)
      expect(decideNavigation(to('/tabs/home'), 'guest', { gymDraft: true, first: true })).toEqual({ path: '/login', query: { redirect: '/tabs/home' } })
    })
  })
})
