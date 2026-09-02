/**
 * Router для админки.
 *
 * - /login — bare layout (LoginPage сама себя центрирует).
 * - Остальные — DefaultLayout = AppLayout с сайдбаром.
 * - Guard: если не auth.isAuthenticated → редирект на /login?next=<original>.
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/LoginPage.vue'),
    meta: { bare: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/',
    component: () => import('@/app/providers/AppLayout.vue'),
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
      },
      {
        path: 'teams',
        name: 'teams',
        component: () => import('@/pages/TeamsPage.vue'),
      },
      {
        path: 'coaches',
        name: 'coaches',
        component: () => import('@/pages/CoachesPage.vue'),
      },
      {
        path: 'tournaments',
        name: 'tournaments',
        component: () => import('@/pages/TournamentsPage.vue'),
      },
      {
        path: 'players',
        name: 'players',
        component: () => import('@/pages/PlayersPage.vue'),
      },
      {
        path: 'albums',
        name: 'albums',
        component: () => import('@/pages/AlbumsPage.vue'),
      },
      {
        path: 'reviews',
        name: 'reviews',
        component: () => import('@/pages/ReviewsPage.vue'),
      },
      {
        path: 'leads',
        name: 'leads',
        component: () => import('@/pages/LeadsPage.vue'),
      },
      {
        path: 'content',
        name: 'content',
        component: () => import('@/pages/ContentPage.vue'),
      },
      {
        path: 'contact',
        name: 'contact',
        component: () => import('@/pages/ContactPage.vue'),
      },
      {
        path: 'venues',
        name: 'venues',
        component: () => import('@/pages/VenuesPage.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { bare: true },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard: проверка auth перед входом на любую страницу кроме /login.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.name === 'login') {
    // Если уже залогинен и идёт на /login — отправим на дашборд.
    if (auth.isAuthenticated) {
      return { name: 'dashboard' }
    }
    return true
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { next: to.fullPath } }
  }
  return true
})
