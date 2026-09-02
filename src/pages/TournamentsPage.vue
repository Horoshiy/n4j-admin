<script setup lang="ts">
/**
 * TournamentsPage — список турниров + CRUD + soft-delete + reorder.
 */
import { ref } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import {
  setEntityVisible,
  deleteEntity,
  reorderTournaments,
  upsertTournament,
  type TournamentInput,
} from '@/widgets/entities/mutations'
import { useReorder } from '@/shared/composables/useReorder'
import { useCrud } from '@/shared/composables/useCrud'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'
import EntityEditDialog from '@/shared/ui/EntityEditDialog.vue'

interface Tournament {
  id: string
  name: string
  description: string
  ageGroup: string | null
  status: string
  startDate: string
  endDate: string
  location: string
  teamIds: string[]
  visible: boolean
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  upcoming: { label: 'анонс', cls: 'badge--info' },
  live: { label: 'идёт', cls: 'badge--ok' },
  finished: { label: 'завершён', cls: 'badge--muted' },
}

const { items, loading, error, refetch } = useList<Tournament>(
  'tournamentsAdmin',
  async () => {
    const data = await gqlRequest<{ tournamentsAdmin: Tournament[] }>(`
      { tournamentsAdmin { id name description ageGroup status startDate endDate location teamIds visible } }
    `)
    return data.tournamentsAdmin
  },
)

const confirming = ref<{ id: string; nextVisible: boolean; name: string } | null>(null)
const flash = ref<string | null>(null)

function ask(t: Tournament): void {
  confirming.value = { id: t.id, nextVisible: !t.visible, name: t.name }
}
async function confirm(): Promise<void> {
  if (!confirming.value) return
  const { id, nextVisible, name } = confirming.value
  confirming.value = null
  try {
    await setEntityVisible('tournament', id, nextVisible)
    await refetch()
    flash.value = `${name}: ${nextVisible ? 'показан' : 'скрыт'}`
  } catch (e) {
    flash.value = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
  }
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const columns = [
  { key: 'name', label: 'Турнир' },
  { key: 'status', label: 'Статус' },
  { key: 'startDate', label: 'Начало', render: (t: Tournament) => fmtDate(t.startDate) },
  { key: 'location', label: 'Место' },
  { key: 'visible', label: 'Видимость' },
]

const { save: saveReorder } = useReorder<Tournament>({
  items,
  getId: (t) => t.id,
  mutate: reorderTournaments,
  onError: (e) => {
    flash.value = `Не удалось сохранить порядок: ${e instanceof Error ? e.message : String(e)}`
  },
})

// ─── CRUD ────────────────────────────────────────────────────────────
const crud = useCrud<Tournament>({ entity: 'tournament', onRefresh: refetch, labels: { singular: 'турнир', plural: 'турниры' } })

const form = ref<TournamentInput>(emptyForm())
const formError = ref<string | null>(null)
const formSaving = ref(false)

function emptyForm(): TournamentInput {
  return {
    id: null,
    name: '',
    description: '',
    ageGroup: null,
    status: 'upcoming',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    location: '',
    teamIds: [],
    visible: true,
  }
}

function onCreate(): void { form.value = emptyForm(); crud.openCreate() }
function onEdit(t: Tournament): void {
  form.value = {
    id: t.id,
    name: t.name,
    description: t.description,
    ageGroup: t.ageGroup,
    status: t.status,
    startDate: t.startDate.slice(0, 10),
    endDate: t.endDate.slice(0, 10),
    location: t.location,
    teamIds: [...t.teamIds],
    visible: t.visible,
  }
  crud.openEdit(t)
}

async function onSubmitForm(): Promise<void> {
  if (formSaving.value) return
  formError.value = null
  formSaving.value = true
  try {
    await upsertTournament({
      ...form.value,
      name: form.value.name.trim(),
      startDate: new Date(form.value.startDate).toISOString(),
      endDate: new Date(form.value.endDate).toISOString(),
    })
    crud.closeDialog()
    await refetch()
    flash.value = form.value.id ? 'Турнир обновлён' : 'Турнир создан'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    formSaving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Турниры">
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
      drag-hint="Перетащите строку, чтобы изменить порядок турниров"
      empty-title="Нет турниров"
      @reorder="saveReorder"
    >
      <template #cell-status="{ item }">
        <span :class="['badge', STATUS_LABELS[(item as Tournament).status]?.cls ?? 'badge--muted']">
          {{ STATUS_LABELS[(item as Tournament).status]?.label ?? (item as Tournament).status }}
        </span>
      </template>
      <template #cell-visible="{ item }">
        <span :class="['badge', (item as Tournament).visible ? 'badge--ok' : 'badge--muted']">
          {{ (item as Tournament).visible ? 'виден' : 'скрыт' }}
        </span>
      </template>
      <template #row-actions="{ item }">
        <button class="btn btn--sm" :class="(item as Tournament).visible ? 'btn--warning' : 'btn--success'" @click="ask(item as Tournament)">
          {{ (item as Tournament).visible ? 'Скрыть' : 'Показать' }}
        </button>
        <button class="btn btn--sm btn--secondary" @click="onEdit(item as Tournament)">✎</button>
        <button class="btn btn--sm btn--danger" @click="crud.askHardDelete(item as Tournament)">🗑</button>
      </template>
    </ResourceTable>

    <ConfirmDialog
      :open="confirming !== null"
      :title="confirming?.nextVisible ? 'Показать турнир?' : 'Скрыть турнир?'"
      :message="confirming ? `«${confirming.name}» будет ${confirming.nextVisible ? 'виден' : 'скрыт'} на сайте.` : ''"
      :confirm-label="confirming?.nextVisible ? 'Показать' : 'Скрыть'"
      :variant="confirming?.nextVisible ? 'default' : 'danger'"
      @confirm="confirm"
      @cancel="confirming = null"
    />

    <ConfirmDialog
      :open="crud.confirmOpen.value && crud.pendingAction.value?.kind === 'hard'"
      title="Удалить турнир безвозвратно?"
      :message="crud.pendingAction.value ? `«${crud.pendingAction.value.item.name}» будет удалён из БД. Действие необратимо.` : ''"
      confirm-label="Удалить навсегда"
      variant="danger"
      @confirm="crud.confirmAction"
      @cancel="crud.cancelAction"
    />

    <EntityEditDialog
      :open="crud.dialog.value.open"
      :title="crud.dialog.value.mode === 'edit' ? 'Редактировать турнир' : 'Новый турнир'"
      :saving="formSaving"
      :error="formError"
      size="md"
      :submit-label="form.id ? 'Сохранить' : 'Создать'"
      @submit="onSubmitForm"
      @cancel="crud.closeDialog"
    >
      <label>Название<input v-model="form.name" type="text" required maxlength="120" /></label>
      <label>Описание<textarea v-model="form.description" rows="2" /></label>
      <div class="form__row form__row--2">
        <label>Статус
          <select v-model="form.status">
            <option value="upcoming">анонс</option>
            <option value="live">идёт</option>
            <option value="finished">завершён</option>
          </select>
        </label>
        <label>Возрастная группа
          <select v-model="form.ageGroup">
            <option :value="null">— любая —</option>
            <option value="A5_7">5–7</option>
            <option value="A8_10">8–10</option>
            <option value="A11_14">11–14</option>
            <option value="MIXED">смешанная</option>
          </select>
        </label>
      </div>
      <div class="form__row form__row--2">
        <label>Начало<input v-model="form.startDate" type="date" /></label>
        <label>Окончание<input v-model="form.endDate" type="date" /></label>
      </div>
      <label>Место<input v-model="form.location" type="text" placeholder="г. Ставрополь, стадион ..." /></label>
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
  &--info { background: rgba(30,111,217,.12); color: $brand-primary; }
  &--muted { background: $surface-bg; color: $text-muted; }
}
.alert { padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3; font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; } }
.form__row { display: flex; flex-direction: column; gap: $space-2; }
.form__row--2 { flex-direction: row; gap: $space-3; > label { flex: 1; } }
.form__check { display: flex; align-items: center; gap: $space-2; }
label { display: flex; flex-direction: column; gap: $space-1; font-size: $font-size-sm; }
input[type="text"], input[type="date"], input[type="number"], select, textarea {
  padding: $space-2; border: 1px solid $surface-border; border-radius: $radius-md;
  font-size: $font-size-sm; font-family: inherit;
  &:focus { border-color: $brand-primary; outline: none; }
}
</style>
