<script setup lang="ts">
/**
 * VenuesPage — управление списком площадок.
 *
 * Шаг 3.4 (финал): read + add + remove + reorder. Сохранение через updateVenues
 * (заменяет весь список целиком — порядок важен).
 *
 * Только поля, которые реально есть в GraphQL type Venue:
 *  id, name, address, shortAddress, workingHours.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import { updateVenues } from '@/widgets/entities/mutations'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'
import type { Venue } from '@/shared/types/content'

const { items, loading, error, refetch } = useList<Venue>(
  'venues',
  async () => {
    const data = await gqlRequest<{ venues: Venue[] }>(`
      { venues { id name address shortAddress workingHours } }
    `)
    return data.venues
  },
)

// Локальный черновик — пользователь может добавлять/удалять/переставлять
// строки, и только при «Сохранить» целиком уходит updateVenues.
const draft = ref<Venue[]>([])
const dirty = ref(false)
const flash = ref<string | null>(null)
const saving = ref(false)
const confirming = ref<{ type: 'add' | 'remove' | 'save'; index?: number } | null>(null)

function syncFromItems(): void {
  draft.value = JSON.parse(JSON.stringify(items.value))
  dirty.value = false
}

function markDirty(): void {
  dirty.value = true
}

const columns = [
  { key: 'name', label: 'Площадка' },
  { key: 'shortAddress', label: 'Адрес (короткий)' },
  { key: 'workingHours', label: 'Часы работы' },
]

function addVenue(): void {
  confirming.value = { type: 'add' }
}

function confirmAdd(): void {
  const id = 'venue_' + Math.random().toString(36).slice(2, 10)
  draft.value.push({
    id,
    name: 'Новая площадка',
    address: '',
    shortAddress: '',
    workingHours: '',
  })
  markDirty()
  confirming.value = null
}

function removeVenue(i: number): void {
  confirming.value = { type: 'remove', index: i }
}

function confirmRemove(): void {
  if (confirming.value?.type !== 'remove') return
  draft.value.splice(confirming.value.index!, 1)
  markDirty()
  confirming.value = null
}

/** Применить новый порядок строк (из vue-draggable-plus) в черновик. */
function applyOrder(items: Venue[]): void {
  draft.value = [...items]
  markDirty()
}

async function saveAll(): Promise<void> {
  saving.value = true
  flash.value = null
  error.value = null
  try {
    const cleaned = draft.value
      .filter((v) => v.name.trim() || v.address.trim())
      .map((v) => ({ ...v }))
    const updated = await updateVenues(cleaned)
    draft.value = JSON.parse(JSON.stringify(updated))
    dirty.value = false
    flash.value = 'Список площадок сохранён'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  // Если useList уже успел загрузить — sync сразу. Иначе watch сделает это по завершении.
  if (items.value.length > 0) syncFromItems()
})

// watch следит за изменением items (useList async load → refetch) и обновляет draft,
// только если пользователь не внёс правок. При dirty черновик остаётся нетронутым.
watch(items, (newItems) => {
  if (!dirty.value) {
    draft.value = JSON.parse(JSON.stringify(newItems))
  }
})

const summary = computed(() => ({ total: draft.value.length }))
</script>

<template>
  <div>
    <PageHeader
      title="Площадки"
      :subtitle="`Всего: ${summary.total}. Порядок важен — отображается в шапке сайта.`"
    >
      <template #actions>
        <button class="btn btn--secondary" :disabled="loading" @click="refetch">↻ Обновить</button>
        <button class="btn btn--secondary" @click="addVenue">+ Добавить</button>
        <button
          class="btn btn--primary"
          :disabled="!dirty || saving"
          @click="saveAll"
        >
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="flash" class="alert alert--ok">{{ flash }}</div>

    <div class="hint muted">
      Список черновика: изменения подсвечены кнопкой «Сохранить».
      Перетаскивайте строки, чтобы изменить порядок.
    </div>

    <ResourceTable
      :items="draft"
      :columns="columns"
      :loading="loading && draft.length === 0"
      :draggable="true"
      drag-hint="Перетащите строку, чтобы изменить порядок"
      empty-title="Нет площадок"
      @reorder="applyOrder"
    >
      <template #cell-name="{ item }">
        <input
          v-model="(item as Venue).name"
          class="cell-input"
          type="text"
          @input="markDirty"
        />
      </template>
      <template #cell-shortAddress="{ item }">
        <input
          v-model="(item as Venue).shortAddress"
          class="cell-input"
          type="text"
          @input="markDirty"
        />
      </template>
      <template #cell-workingHours="{ item }">
        <input
          v-model="(item as Venue).workingHours"
          class="cell-input"
          type="text"
          @input="markDirty"
        />
      </template>
      <template #row-actions="{ item }">
        <button class="btn btn--sm btn--danger" @click="removeVenue(draft.indexOf(item as Venue))">
          Удалить
        </button>
      </template>
    </ResourceTable>

    <div v-if="dirty" class="dirty-hint">
      Есть несохранённые изменения.
      <button class="btn btn--sm btn--primary" @click="saveAll">Сохранить</button>
    </div>

    <ConfirmDialog
      :open="confirming !== null"
      :title="confirming?.type === 'remove' ? 'Удалить площадку?' : 'Добавить площадку?'"
      :message="confirming?.type === 'remove' ? 'Строка будет удалена из черновика. Сохраните, чтобы применить.' : 'В таблицу добавится новая пустая строка.'"
      :confirm-label="confirming?.type === 'remove' ? 'Удалить' : 'Добавить'"
      :variant="confirming?.type === 'remove' ? 'danger' : 'default'"
      @confirm="confirming?.type === 'remove' ? confirmRemove() : confirmAdd()"
      @cancel="confirming = null"
    />
  </div>
</template>

<style lang="scss" scoped>
.btn {
  padding: $space-1 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
  background: $surface-card; color: $text-primary; font-size: $font-size-sm; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &--sm { padding: 2px $space-2; font-size: $font-size-xs; }
  &--secondary {
    background: $brand-primary-light; color: $brand-primary; border-color: transparent;
    &:hover:not(:disabled) { background: $brand-primary; color: $text-on-brand; }
  }
  &--primary {
    background: $brand-primary; color: $text-on-brand; border-color: $brand-primary;
    &:hover:not(:disabled) { background: $brand-primary-dark; }
  }
  &--danger {
    color: $brand-danger; border-color: $brand-danger;
    &:hover:not(:disabled) { background: rgba(220,38,38,.1); }
  }
}
.muted { color: $text-muted; font-size: $font-size-sm; }
.alert {
  padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3;
  font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; }
}
.hint { margin-bottom: $space-3; }
.cell-input {
  width: 100%; padding: 4px 6px; border: 1px solid transparent;
  background: transparent; font-size: $font-size-sm; font-family: inherit;
  border-radius: $radius-sm;
  &:hover { border-color: $surface-border; }
  &:focus { border-color: $brand-primary; background: $surface-card; outline: none; }
}
.dirty-hint {
  position: sticky; bottom: 0; margin-top: $space-3;
  padding: $space-2 $space-3;
  background: rgba(217,119,6,.1); color: $brand-warning;
  border-radius: $radius-md; font-size: $font-size-sm;
  display: flex; align-items: center; justify-content: space-between; gap: $space-3;
}
</style>
