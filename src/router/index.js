import { createRouter, createWebHistory } from '@ionic/vue-router'
import TabsLayout from '@/layouts/TabsLayout.vue'
import { useAuthStore } from '@/stores/auth.js'
import ChangePasswordPage from '@/views/ChangePasswordPage.vue'
import ComingSoon from '@/views/ComingSoon.vue'
import DevicePage from '@/views/DevicePage.vue'
import LoginPage from '@/views/LoginPage.vue'
import MenuPage from '@/views/MenuPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'
import { decideNavigation } from './guard.js'
import { buildTabRoutes } from './tabRoutes.js'

const routes = [
  { path: '/', redirect: '/tabs/home' },
  { path: '/login', component: LoginPage, meta: { public: true } },
  {
    path: '/tabs/',
    component: TabsLayout,
    children: buildTabRoutes({ ComingSoon, MenuPage, ProfilePage, ChangePasswordPage, DevicePage }),
  },
  { path: '/:pathMatch(.*)*', redirect: '/tabs/home' },
]

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.status === 'unknown') await auth.check()
  return decideNavigation(to, auth.status)
})
