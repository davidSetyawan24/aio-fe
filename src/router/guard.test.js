import { decideNavigation } from './guard.js'

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
})
