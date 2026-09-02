<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="not-found__card">
      <div class="not-found__code">404</div>
      <h1 class="not-found__title">Страница не найдена</h1>
      <p class="not-found__text">
        Адрес <code>{{ $route.fullPath }}</code> не существует.
      </p>
      <button class="not-found__btn" @click="router.replace('/dashboard')">
        На дашборд
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-4;
  background: $surface-bg;
}

.not-found__card {
  background: $surface-card;
  padding: $space-6;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  text-align: center;
  max-width: 400px;
}

.not-found__code {
  font-size: 64px;
  font-weight: $font-weight-bold;
  color: $brand-primary;
  line-height: 1;
  margin-bottom: $space-2;
}

.not-found__title {
  margin: 0 0 $space-2;
  font-size: $font-size-xl;
}

.not-found__text {
  margin: 0 0 $space-4;
  color: $text-secondary;

  code {
    font-family: $font-mono;
    background: $surface-bg;
    padding: 2px 6px;
    border-radius: $radius-sm;
  }
}

.not-found__btn {
  background: $brand-primary;
  color: $text-on-brand;
  border: none;
  padding: $space-2 $space-5;
  border-radius: $radius-md;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: $brand-primary-dark;
  }
}
</style>
