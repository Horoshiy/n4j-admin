<script setup lang="ts" generic="T extends { id: string | number }">
/**
 * ResourceTable — общая таблица для списков сущностей.
 *
 * columns: [{ key, label, render? }]
 * - key — поле в item
 * - label — заголовок столбца
 * - render: (item) => string — формат (для простых полей)
 * - иначе значение берётся как item[key]
 *
 * Слот row-actions для действий в строке (Кнопка «Скрыть» / «Удалить»).
 *
 * rowClassName — функция для подсветки (например, !visible → muted).
 *
 * draggable=true включает drag-and-drop через vue-draggable-plus.
 * При drop эмитится reorder с НОВЫМ массивом (родитель делает mutation + rollback при ошибке).
 */
import EmptyState from './EmptyState.vue'
import { VueDraggable } from 'vue-draggable-plus'

const props = defineProps<{
  items: T[]
  columns: Array<{
    key: string
    label: string
    width?: string
    render?: (item: T) => string
  }>
  rowClassName?: (item: T) => string | undefined
  loading?: boolean
  emptyTitle?: string
  draggable?: boolean
  /** Текст-подсказка над перетаскиваемой таблицей. */
  dragHint?: string
}>()

const emit = defineEmits<{
  (e: 'rowClick', item: T): void
  /** Новый порядок после drop. */
  (e: 'reorder', items: T[]): void
}>()

// v-model для VueDraggable — при drag'е мутирует массив локально,
// на @end эмитим наружу для mutation.
function onEnd() {
  // props.items — это ref родителя, vue-draggable мутирует его через v-model.
  emit('reorder', props.items)
}
</script>

<template>
  <div class="rt">
    <div v-if="loading && items.length === 0" class="rt__loading">Загрузка…</div>
    <EmptyState
      v-else-if="items.length === 0"
      icon="📭"
      :title="emptyTitle ?? 'Ничего не найдено'"
      description="Попробуйте обновить страницу или проверьте фильтры."
    />
    <div v-else>
      <div v-if="draggable && dragHint" class="rt__drag-hint">↕ {{ dragHint }}</div>
      <VueDraggable
        v-if="draggable"
        v-model="props.items"
        :animation="180"
        handle=".rt__drag-handle"
        class="rt__draggable"
        @end="onEnd"
      >
        <table class="rt__table">
          <thead>
            <tr>
              <th v-if="draggable" class="rt__th rt__th--drag" />
              <th
                v-for="col in columns"
                :key="col.key"
                :style="col.width ? { width: col.width } : undefined"
                class="rt__th"
              >
                {{ col.label }}
              </th>
              <th v-if="$slots['row-actions']" class="rt__th rt__th--actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="String(item.id)"
              class="rt__tr"
              :class="[rowClassName ? rowClassName(item) : undefined, draggable ? 'rt__tr--draggable' : undefined]"
            >
              <td v-if="draggable" class="rt__td rt__td--drag">
                <span class="rt__drag-handle" aria-label="Перетащить">⋮⋮</span>
              </td>
              <td v-for="col in columns" :key="col.key" class="rt__td">
                <slot :name="`cell-${col.key}`" :item="item" :value="(item as Record<string, unknown>)[col.key]">
                  {{ col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '') }}
                </slot>
              </td>
              <td v-if="$slots['row-actions']" class="rt__td rt__td--actions">
                <slot name="row-actions" :item="item" />
              </td>
            </tr>
          </tbody>
        </table>
      </VueDraggable>
      <table v-else class="rt__table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="col.width ? { width: col.width } : undefined"
              class="rt__th"
            >
              {{ col.label }}
            </th>
            <th v-if="$slots['row-actions']" class="rt__th rt__th--actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="String(item.id)"
            class="rt__tr"
            :class="rowClassName ? rowClassName(item) : undefined"
          >
            <td v-for="col in columns" :key="col.key" class="rt__td">
              <slot :name="`cell-${col.key}`" :item="item" :value="(item as Record<string, unknown>)[col.key]">
                {{ col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '') }}
              </slot>
            </td>
            <td v-if="$slots['row-actions']" class="rt__td rt__td--actions">
              <slot name="row-actions" :item="item" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.rt {
  background: $surface-card;
  border: 1px solid $surface-border;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.rt__drag-hint {
  padding: $space-2 $space-3;
  font-size: $font-size-xs;
  color: $text-muted;
  background: $surface-bg;
  border-bottom: 1px solid $surface-border;
}

.rt__loading {
  padding: $space-5;
  text-align: center;
  color: $text-muted;
}

.rt__draggable {
  // VueDraggable оборачивает <table>, но трогать layout нельзя — оставляем прозрачным.
  display: block;
}

.rt__table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;
}

.rt__th {
  text-align: left;
  padding: $space-2 $space-3;
  background: $surface-bg;
  border-bottom: 1px solid $surface-border;
  font-weight: $font-weight-semibold;
  color: $text-secondary;
  white-space: nowrap;

  &--actions {
    text-align: right;
  }

  &--drag {
    width: 32px;
    padding: $space-2 $space-1;
  }
}

.rt__tr {
  transition: background 0.1s;

  &:hover {
    background: $brand-primary-light;
  }

  &.rt__tr--muted {
    opacity: 0.55;
    .rt__td {
      text-decoration: line-through;
      text-decoration-color: $text-muted;
    }
  }

  &--draggable {
    .rt__drag-handle {
      cursor: grab;
      user-select: none;
      display: inline-block;
      color: $text-muted;
      font-size: 14px;
      line-height: 1;
      padding: 2px 4px;

      &:hover {
        color: $text-primary;
      }
      &:active {
        cursor: grabbing;
      }
    }

    // Подсветка строки при drag (Sortable.js добавляет класс .sortable-chosen)
    &:global(.sortable-chosen) {
      background: $brand-primary-light;
    }
    &:global(.sortable-ghost) {
      opacity: 0.4;
      background: $brand-primary-light;
    }
    &:global(.sortable-drag) {
      background: $surface-card;
      box-shadow: $shadow-md;
    }
  }
}

.rt__td {
  padding: $space-2 $space-3;
  border-bottom: 1px solid $surface-border;
  vertical-align: middle;

  &--actions {
    text-align: right;
    white-space: nowrap;
  }

  &--drag {
    padding: $space-2 $space-1;
    text-align: center;
  }
}

.rt__tr:last-child .rt__td {
  border-bottom: none;
}
</style>
