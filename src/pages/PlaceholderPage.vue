<script setup lang="ts">
/**
 * Placeholder-страницы для шага 3.1. На 3.2 будут заменены реальными списками.
 */
defineProps<{ title: string }>()
</script>

<template>
  <div class="page">
    <h1 class="page__title">{{ title }}</h1>
    <div class="placeholder">
      <div class="placeholder__icon">🚧</div>
      <p class="placeholder__text">
        Раздел появится на шаге <strong>3.2</strong> (списки по 6 группам).
      </p>
      <p class="placeholder__hint">
        Сейчас шаг 3.1: scaffold + login + рабочий дашборд.
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page__title {
  margin: 0 0 $space-5;
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
}

.placeholder {
  background: $surface-card;
  border: 1px dashed $surface-border;
  border-radius: $radius-lg;
  padding: $space-8 $space-5;
  text-align: center;
}

.placeholder__icon {
  font-size: 48px;
  margin-bottom: $space-3;
}

.placeholder__text {
  margin: 0 0 $space-2;
  color: $text-secondary;
}

.placeholder__hint {
  margin: 0;
  color: $text-muted;
  font-size: $font-size-sm;
}
</style>
