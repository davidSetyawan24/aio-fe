import { createRouter, createWebHistory } from '@ionic/vue-router'
import TabsLayout from '@/layouts/TabsLayout.vue'
import AgendaFormPage from '@/views/AgendaFormPage.vue'
import AgendaPage from '@/views/AgendaPage.vue'
import BayarRutinFormPage from '@/views/BayarRutinFormPage.vue'
import BayarRutinPage from '@/views/BayarRutinPage.vue'
import { useAuthStore } from '@/stores/auth.js'
import BudgetPage from '@/views/BudgetPage.vue'
import CategoryFormPage from '@/views/CategoryFormPage.vue'
import InvoicePage from '@/views/InvoicePage.vue'
import InvoiceDetailPage from '@/views/InvoiceDetailPage.vue'
import InvoiceSettingsPage from '@/views/InvoiceSettingsPage.vue'
import SplitBillDetailPage from '@/views/SplitBillDetailPage.vue'
import SplitBillFormPage from '@/views/SplitBillFormPage.vue'
import SplitBillPage from '@/views/SplitBillPage.vue'
import UangPage from '@/views/UangPage.vue'
import CategoryPage from '@/views/CategoryPage.vue'
import ChangePasswordPage from '@/views/ChangePasswordPage.vue'
import ComingSoon from '@/views/ComingSoon.vue'
import DevicePage from '@/views/DevicePage.vue'
import DuitPage from '@/views/DuitPage.vue'
import ExpenseFormPage from '@/views/ExpenseFormPage.vue'
import LoginPage from '@/views/LoginPage.vue'
import MenuPage from '@/views/MenuPage.vue'
import NotificationSettingsPage from '@/views/NotificationSettingsPage.vue'
import NotificationsPage from '@/views/NotificationsPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'
import WalletFormPage from '@/views/WalletFormPage.vue'
import WalletPage from '@/views/WalletPage.vue'
import { decideNavigation } from './guard.js'
import { buildTabRoutes } from './tabRoutes.js'

const routes = [
  { path: '/', redirect: '/tabs/home' },
  { path: '/login', component: LoginPage, meta: { public: true } },
  {
    path: '/tabs/',
    component: TabsLayout,
    children: buildTabRoutes({
      ComingSoon, MenuPage, ProfilePage, ChangePasswordPage, DevicePage, NotificationsPage, NotificationSettingsPage, WalletPage, WalletFormPage,
      CategoryPage, CategoryFormPage, DuitPage, ExpenseFormPage, BudgetPage, SplitBillPage, SplitBillDetailPage, SplitBillFormPage, AgendaPage, AgendaFormPage, BayarRutinPage, BayarRutinFormPage, UangPage, InvoicePage, InvoiceDetailPage, InvoiceSettingsPage,
    }),
  },
  { path: '/:pathMatch(.*)*', redirect: '/tabs/home' },
]

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.status === 'unknown') await auth.check()
  return decideNavigation(to, auth.status)
})
