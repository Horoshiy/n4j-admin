<script setup lang="ts">
/**
 * AlbumsPage — список альбомов + CRUD + soft-delete + reorder.
 *
 * При hard-delete каскадно удаляются все фото альбома (см. deleteEntity в content-ops.ts).
 */
import { ref } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import {
  setEntityVisible,
  deleteEntity,
  reorderAlbums,
  upsertAlbum,
  type AlbumInput,
} from '@/widgets/entities/mutations'
import { useReorder } from '@/shared/composables/useReorder'
import { useCrud } from '@/shared/composables/useCrud'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'
import EntityEditDialog from '@/shared/ui/EntityEditDialog.vue'

interface Album {
  id: string
  title: string
  description: string
  coverUrl: string
  date: string
  category: string
  photosCount: number
  visible: boolean
}

const CATEGORIES: Record<string, string> = {
  training: 'тренировки',
  matches: 'матчи',
  tournaments: 'турниры',
  events: 'события',
  lifestyle: 'lifestyle',
}

const { items, loading, error, refetch } = useList<Album>(
  'albumsAdmin',
  async () => {
    const data = await gqlRequest<{ albumsAdmin: Album[] }>(`
      { albumsAdmin { id title description coverUrl date category photosCount visible } }
    `)
    return data.albumsAdmin
  },
)

const confirming = ref<{ id: string; nextVisible: boolean; title: string } | null>(null)
const flash = ref<string | null>(null)

function ask(a: Album): void {
  confirming.value = { id: a.id, nextVisible: !a.visible, title: a.title }
}
async function confirm(): Promise<void> {
  if (!confirming.value) return
  const { id, nextVisible, title } = confirming.value
  confirming.value = null
  try {
    await setEntityVisible('album', id, nextVisible)
    await refetch()
    flash.value = `${title}: ${nextVisible ? 'показан' : 'скрыт'}`
  } catch (e) {
    flash.value = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
  }
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const columns = [
  { key: 'title', label: 'Альбом' },
  { key: 'category', label: 'Категория', render: (a: Album) => CATEGORIES[a.category] ?? a.category },
  { key: 'date', label: 'Дата', render: (a: Album) => fmtDate(a.date) },
  { key: 'photosCount', label: 'Фото' },
  { key: 'visible', label: 'Видимость' },
]

const { save: saveReorder } = useReorder<Album>({
  items,
  getId: (a) => a.id,
  mutate: reorderAlbums,
  onError: (e) => {
    flash.value = `Не удалось сохранить порядок: ${e instanceof Error ? e.message : String(e)}`
  },
})

// ─── CRUD ────────────────────────────────────────────────────────────
const crud = useCrud<Album>({ entity: 'album', onRefresh: refetch, labels: { singular: 'альбом', plural: 'альбомы' } })

const form = ref<AlbumInput>(emptyForm())
const formError = ref<string | null>(null)
const formSaving = ref(false)

function emptyForm(): AlbumInput {
  return {
    id: null,
    title: '',
    description: '',
    coverUrl: '',
    date: new Date().toISOString().slice(0, 10),
    visible: true,
  }
}

function onCreate(): void { form.value = emptyForm(); crud.openCreate() }
function onEdit(a: Album): void {
  form.value = {
    id: a.id,
    title: a.title,
    description: a.description,
    coverUrl: a.coverUrl,
    date: a.date.slice(0, 10),
    visible: a.visible,
  }
  crud.openEdit(a)
}

async function onSubmitForm(): Promise<void> {
  if (formSaving.value) return
  formError.value = null
  formSaving.value = true
  try {
    await upsertAlbum({
      ...form.value,
      title: form.value.title.trim(),
      date: new Date(form.value.date).toISOString(),
    })
    crud.closeDialog()
    await refetch()
    flash.value = form.value.id ? 'Альбом обновлён' : 'Альбом создан'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    formSaving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Альбомы">
      <template #actions>
        <button class="btn btn--secondary" @click="refetch">↻ Обновить</button>
        <button class="btn btn--primary" @click="onCreate">+ Создать</button>
      </template>
    </PageHeader>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="flash" class="alert alert--ok">{{ flash }}</div>

    <ResourceTable
      :items="items"
      :columns="columns"
      :loading="loading"
      :draggable="true"
      drag-hint="Перетащите строку, чтобы изменить порядок альбомов"
      empty-title="Нет альбомов"
      @reorder="saveReorder"
    >
      <template #cell-visible="{ item }">
        <span :class="['badge', (item as Album).visible ? 'badge--ok' : 'badge--muted']">
          {{ (item as Album).visible ? 'виден' : 'скрыт' }}
        </span>
      </template>
      <template #row-actions="{ item }">
        <button class="btn btn--sm" :class="(item as Album).visible ? 'btn--warning' : 'btn--success'" @click="ask(item as Album)">
          {{ (item as Album).visible ? 'Скрыть' : 'Показать' }}
        </button>
        <button class="btn btn--sm btn--secondary" @click="onEdit(item as Album)">✎</button>
        <button class="btn btn--sm btn--danger" @click="crud.askHardDelete(item as Album)">🗑</button>
      </template>
    </ResourceTable>

    <ConfirmDialog
      :open="confirming !== null"
      :title="confirming?.nextVisible ? 'Показать альбом?' : 'Скрыть альбом?'"
      :message="confirming ? `«${confirming.title}» будет ${confirming.nextVisible ? 'виден' : 'скрыт'} на сайте.` : ''"
      :confirm-label="confirming?.nextVisible ? 'Показать' : 'Скрыть'"
      :variant="confirming?.nextVisible ? 'default' : 'danger'"
      @confirm="confirm"
      @cancel="confirming = null"
    />

    <ConfirmDialog
      :open="crud.confirmOpen.value && crud.pendingAction.value?.kind === 'hard'"
      title="Удалить альбом безвозвратно?"
      :message="crud.pendingAction.value ? `«${crud.pendingAction.value.item.title}» и все его фото будут удалены из БД. Действие необратимо.` : ''"
      confirm-label="Удалить навсегда"
      variant="danger"
      @confirm="crud.confirmAction"
      @cancel="crud.cancelAction"
    />

    <EntityEditDialog
      :open="crud.dialog.value.open"
      :title="crud.dialog.value.mode === 'edit' ? 'Редактировать альбом' : 'Новый альбом'"
      :saving="formSaving"
      :error="formError"
      size="md"
      :submit-label="form.id ? 'Сохранить' : 'Создать'"
      @submit="onSubmitForm"
      @cancel="crud.closeDialog"
    >
      <label>Название<input v-model="form.title" type="text" required maxlength="120" /></label>
      <label>Описание<textarea v-model="form.description" rows="2" /></label>
      <label>URL обложки<input v-model="form.coverUrl" type="text" placeholder="https://..." /></label>
      <label>Дата<input v-model="form.date" type="date" /></label>
      <label class="form__check">
        <input v-model="form.visible" type="checkbox" />
        Видим на сайте
      </label>
    </EntityEditDialog>
  </div>
</template>

<style lang="scss" scoped>
.btn {
  padding: $space-1 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
  background: $surface-card; color: $text-primary; font-size: $font-size-sm; cursor: pointer;
  &:hover { background: $surface-bg; }
  &--sm { padding: 2px $space-2; font-size: $font-size-xs; }
  &--secondary { background: $brand-primary-light; color: $brand-primary; border-color: transparent;
    &:hover { background: $brand-primary; color: $text-on-brand; } }
  &--primary { background: $brand-primary; color: $text-on-brand; border-color: $brand-primary;
    &:hover { background: $brand-primary-dark; } }
  &--warning { color: $brand-warning; border-color: $brand-warning; &:hover { background: rgba(217,119,6,.1); } }
  &--success { color: $brand-success; border-color: $brand-success; &:hover { background: rgba(22,163,74,.1); } }
  &--danger  { color: $brand-danger; border-color: $brand-danger; &:hover { background: rgba(220,38,38,.1); } }
}
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: $font-size-xs; font-weight: $font-weight-medium;
  &--ok { background: rgba(22,163,74,.12); color: $brand-success; }
  &--muted { background: $surface-bg; color: $text-muted; }
}
.alert { padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3; font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; } }
.form__row { display: flex; flex-direction: column; gap: $space-2; }
.form__check { display: flex; align-items: center; gap: $space-2; }
label { display: flex; flex-direction: column; gap: $space-1; font-size: $font-size-sm; }
input[type="text"], input[type="date"], input[type="number"], select, textarea {
  padding: $space-2; border: 1px solid $surface-border; border-radius: $radius-md;
  font-size: $font-size-sm; font-family: inherit;
  &:focus { border-color: $brand-primary; outline: none; }
}
</style>
