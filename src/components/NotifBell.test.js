import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationsStore } from '@/stores/notifications.js'
import NotifBell from './NotifBell.vue'

const ionRouter = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter }))

function mountBell(unread) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useNotificationsStore().unread = unread
  return mount(NotifBell, { global: { plugins: [pinia] } })
}

describe('NotifBell', () => {
  it('hides the badge when everything is read', () => {
    expect(mountBell(0).find('.badge').exists()).toBe(false)
  })

  it('shows the unread count, capped at 9+', () => {
    expect(mountBell(3).find('.badge').text()).toBe('3')
    expect(mountBell(12).find('.badge').text()).toBe('9+')
    expect(mountBell(12).attributes('aria-label')).toBe('Notifikasi, 12 belum dibaca')
  })

  it('opens the notifications page', async () => {
    await mountBell(1).trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/notifikasi')
  })
})
