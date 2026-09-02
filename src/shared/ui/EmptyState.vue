<script setup lang="ts">
/**
 * EmptyState — пустое состояние (нет данных / нет результатов поиска).
 */
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="empty">
    <div class="empty__icon">{{ icon ?? '📭' }}</div>
    <div class="empty__title">{{ title }}</div>
    <div v-if="description" class="empty__desc">{{ description }}</div>
    <div v-if="$slots.action" class="empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.empty {
  background: $surface-card;
  border: 1px dashed $surface-border;
  border-radius: $radius-lg;
  padding: $space-8 $space-5;
  text-align: center;
}

.empty__icon {
  font-size: 48px;
  margin-bottom: $space-3;
}

.empty__title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  margin-bottom: $space-1;
}

.empty__desc {
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $space-3;
}

.empty__action {
  margin-top: $space-3;
}
</style>
