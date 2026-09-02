<script setup lang="ts">
/**
 * AppLayout — общий каркас админки: хедер с логотипом+юзером+logout,
 * сайдбар с навигацией, <RouterView /> для контента.
 * Согласно skill — никакой layout не должен быть в App.vue,
 * иначе будет двойной рендер.
 */
import { computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

interface NavItem {
  to: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Дашборд', icon: '🏠' },
  { to: '/teams', label: 'Команды', icon: '👥' },
  { to: '/coaches', label: 'Тренеры', icon: '🧑‍🏫' },
  { to: '/tournaments', label: 'Турниры', icon: '🏆' },
  { to: '/players', label: 'Игроки', icon: '⚽' },
  { to: '/albums', label: 'Альбомы', icon: '📸' },
  { to: '/reviews', label: 'Отзывы', icon: '💬' },
  { to: '/leads', label: 'Заявки', icon: '📩' },
  { to: '/content', label: 'Контент', icon: '📝' },
  { to: '/contact', label: 'Контакты', icon: '📞' },
  { to: '/venues', label: 'Площадки', icon: '📍' },
]

const activeRoute = computed(() => route.path)

function logout(): void {
  auth.logout()
  router.replace('/login')
}

const expiresLabel = computed(() => {
  if (!auth.expiresAt) return ''
  const d = auth.expiresAt
  const days = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'истекает сегодня'
  return `${days} дн.`
})
</script>

<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__brand">
        <span class="layout__logo">⚽</span>
        <span class="layout__title">DFC Админка</span>
      </div>
      <div class="layout__user">
        <span class="layout__expires">сессия: {{ expiresLabel }}</span>
        <button class="layout__logout" @click="logout">Выйти</button>
      </div>
    </header>

    <aside class="layout__sidebar">
      <nav>
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="layout__nav-link"
          :class="{ 'layout__nav-link--active': activeRoute.startsWith(item.to) }"
        >
          <span class="layout__nav-icon">{{ item.icon }}</span>
          <span class="layout__nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.layout {
  display: grid;
  grid-template-columns: $sidebar-width 1fr;
  grid-template-rows: $header-height 1fr;
  grid-template-areas:
    'header header'
    'sidebar main';
  min-height: 100vh;
}

.layout__header {
  grid-area: header;
  background: $surface-card;
  border-bottom: 1px solid $surface-border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-5;
  box-shadow: $shadow-sm;
  z-index: $z-header;
}

.layout__brand {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.layout__logo {
  font-size: 24px;
}

.layout__title {
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

.layout__user {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.layout__expires {
  font-size: $font-size-xs;
  color: $text-muted;
}

.layout__logout {
  background: transparent;
  border: 1px solid $surface-border;
  padding: $space-1 $space-3;
  border-radius: $radius-md;
  color: $text-secondary;
  font-size: $font-size-sm;
  transition: all 0.15s;

  &:hover {
    background: $surface-bg;
    color: $text-primary;
  }
}

.layout__sidebar {
  grid-area: sidebar;
  background: $surface-card;
  border-right: 1px solid $surface-border;
  padding: $space-3 0;
  overflow-y: auto;
}

.layout__nav-link {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-5;
  color: $text-secondary;
  text-decoration: none;
  font-size: $font-size-sm;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: $surface-bg;
    text-decoration: none;
  }

  &--active {
    background: $brand-primary-light;
    color: $brand-primary;
    font-weight: $font-weight-medium;
    border-right: 3px solid $brand-primary;
  }
}

.layout__nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.layout__main {
  grid-area: main;
  padding: $space-5;
  overflow-x: auto;
}

// Мобильная адаптация — на узких экранах сайдбар превращается в горизонтальный скролл-бар
@media (max-width: $bp-mobile) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: $header-height auto 1fr;
    grid-template-areas:
      'header'
      'sidebar'
      'main';
  }
  .layout__sidebar {
    border-right: none;
    border-bottom: 1px solid $surface-border;
    padding: $space-2 0;
  }
  .layout__nav-link {
    display: inline-flex;
    width: auto;
    padding: $space-1 $space-3;
  }
  .layout__nav-label {
    display: none;
  }
  .layout__nav-link--active {
    border-right: none;
    border-bottom: 3px solid $brand-primary;
  }
}
</style>
