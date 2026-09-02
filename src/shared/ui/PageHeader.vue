<script setup lang="ts">
/**
 * PageHeader — единый заголовок для всех страниц.
 * Слот для action-кнопок справа.
 */
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__left">
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $space-3;
  margin-bottom: $space-5;
}

.page-header__left {
  min-width: 0;
}

.page-header__title {
  margin: 0;
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

.page-header__subtitle {
  margin: $space-1 0 0;
  font-size: $font-size-sm;
  color: $text-secondary;
}

.page-header__actions {
  display: flex;
  gap: $space-2;
  flex-shrink: 0;
}
</style>
