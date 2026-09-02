<script setup lang="ts">
/**
 * PlayersPage — список игроков + CRUD + soft-delete + reorder.
 */
import { ref, computed, onMounted } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import {
  setEntityVisible,
  deleteEntity,
  reorderPlayers,
  upsertPlayer,
  type PlayerInput,
} from '@/widgets/entities/mutations'
import { useReorder } from '@/shared/composables/useReorder'
import { useCrud } from '@/shared/composables/useCrud'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'
import EntityEditDialog from '@/shared/ui/EntityEditDialog.vue'

interface Player {
  id: string
  fullName: string
  birthYear: number
  position: string
  number: number
  team: { id: string; name: string }
  photoUrl: string
  height: number
  weight: number
  visible: boolean
  /** Вычисляемые для UI. */
  age: number
  jerseyNumber: number
  coach?: { id: string; fullName: string } | null
}

interface TeamOption { id: string; name: string }

const { items, loading, error, refetch } = useList<Player>(
  'playersAdmin',
  async () => {
    const data = await gqlRequest<{ playersAdmin: Player[] }>(`
      { playersAdmin { id fullName birthYear position number team { id name } photoUrl height weight visible } }
    `)
    return data.playersAdmin
  },
)

const confirming = ref<{ id: string; nextVisible: boolean; name: string } | null>(null)
const flash = ref<string | null>(null)

function ask(p: Player): void {
  confirming.value = { id: p.id, nextVisible: !p.visible, name: p.fullName }
}
async function confirm(): Promise<void> {
  if (!confirming.value) return
  const { id, nextVisible, name } = confirming.value
  confirming.value = null
  try {
    await setEntityVisible('player', id, nextVisible)
    await refetch()
    flash.value = `${name}: ${nextVisible ? 'показан' : 'скрыт'}`
  } catch (e) {
    flash.value = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
  }
}

const columns = [
  { key: 'fullName', label: 'Игрок' },
  { key: 'number', label: '№' },
  { key: 'age', label: 'Возраст' },
  { key: 'position', label: 'Позиция' },
  { key: 'team', label: 'Команда', render: (p: Player) => p.team?.name ?? '—' },
  { key: 'visible', label: 'Видимость' },
]

const { save: saveReorder } = useReorder<Player>({
  items,
  getId: (p) => p.id,
  mutate: reorderPlayers,
  onError: (e) => {
    flash.value = `Не удалось сохранить порядок: ${e instanceof Error ? e.message : String(e)}`
  },
})

// ─── CRUD ────────────────────────────────────────────────────────────
const crud = useCrud<Player>({ entity: 'player', onRefresh: refetch, labels: { singular: 'игрока', plural: 'игроки' } })

const form = ref<PlayerInput>(emptyForm())
const formError = ref<string | null>(null)
const formSaving = ref(false)

const teamOptions = ref<TeamOption[]>([])

function emptyForm(): PlayerInput {
  return {
    id: null,
    fullName: '',
    birthYear: new Date().getFullYear() - 8,
    position: 'MID',
    number: 0,
    teamId: '',
    photoUrl: '',
    height: 0,
    weight: 0,
    visible: true,
  }
}

function calcAge(birthYear: number): number {
  if (!birthYear) return 0
  return new Date().getFullYear() - birthYear
}

async function loadTeams(): Promise<void> {
  if (teamOptions.value.length > 0) return
  const data = await gqlRequest<{ teamsAdmin: TeamOption[] }>('{ teamsAdmin { id name } }')
  teamOptions.value = data.teamsAdmin
}

function onCreate(): void { form.value = emptyForm(); crud.openCreate(); loadTeams() }
function onEdit(p: Player): void {
  form.value = {
    id: p.id,
    fullName: p.fullName,
    birthYear: p.birthYear,
    position: p.position,
    number: p.number,
    teamId: p.team?.id ?? '',
    photoUrl: p.photoUrl,
    height: p.height,
    weight: p.weight,
    visible: p.visible,
  }
  crud.openEdit(p)
  loadTeams()
}

async function onSubmitForm(): Promise<void> {
  if (formSaving.value) return
  formError.value = null
  formSaving.value = true
  try {
    await upsertPlayer({
      ...form.value,
      fullName: form.value.fullName.trim(),
    })
    crud.closeDialog()
    await refetch()
    flash.value = form.value.id ? 'Игрок обновлён' : 'Игрок создан'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    formSaving.value = false
  }
}

const formAge = computed(() => calcAge(form.value.birthYear))
</script>

<template>
  <div>
    <PageHeader title="Игроки">
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
      drag-hint="Перетащите строку, чтобы изменить порядок игроков"
      empty-title="Нет игроков"
      @reorder="saveReorder"
    >
      <template #cell-visible="{ item }">
        <span :class="['badge', (item as Player).visible ? 'badge--ok' : 'badge--muted']">
          {{ (item as Player).visible ? 'виден' : 'скрыт' }}
        </span>
      </template>
      <template #row-actions="{ item }">
        <button class="btn btn--sm" :class="(item as Player).visible ? 'btn--warning' : 'btn--success'" @click="ask(item as Player)">
          {{ (item as Player).visible ? 'Скрыть' : 'Показать' }}
        </button>
        <button class="btn btn--sm btn--secondary" @click="onEdit(item as Player)">✎</button>
        <button class="btn btn--sm btn--danger" @click="crud.askHardDelete(item as Player)">🗑</button>
      </template>
    </ResourceTable>

    <ConfirmDialog
      :open="confirming !== null"
      :title="confirming?.nextVisible ? 'Показать игрока?' : 'Скрыть игрока?'"
      :message="confirming ? `«${confirming.name}» будет ${confirming.nextVisible ? 'виден' : 'скрыт'} на сайте.` : ''"
      :confirm-label="confirming?.nextVisible ? 'Показать' : 'Скрыть'"
      :variant="confirming?.nextVisible ? 'default' : 'danger'"
      @confirm="confirm"
      @cancel="confirming = null"
    />

    <ConfirmDialog
      :open="crud.confirmOpen.value && crud.pendingAction.value?.kind === 'hard'"
      title="Удалить игрока безвозвратно?"
      :message="crud.pendingAction.value ? `«${crud.pendingAction.value.item.fullName}» будет удалён из БД. Действие необратимо.` : ''"
      confirm-label="Удалить навсегда"
      variant="danger"
      @confirm="crud.confirmAction"
      @cancel="crud.cancelAction"
    />

    <EntityEditDialog
      :open="crud.dialog.value.open"
      :title="crud.dialog.value.mode === 'edit' ? 'Редактировать игрока' : 'Новый игрок'"
      :saving="formSaving"
      :error="formError"
      size="md"
      :submit-label="form.id ? 'Сохранить' : 'Создать'"
      @submit="onSubmitForm"
      @cancel="crud.closeDialog"
    >
      <div class="form__row form__row--2">
        <label>ФИО<input v-model="form.fullName" type="text" required maxlength="120" /></label>
        <label>Номер<input v-model.number="form.number" type="number" min="0" max="99" /></label>
      </div>
      <div class="form__row form__row--3">
        <label>Год рождения<input v-model.number="form.birthYear" type="number" min="2000" max="2026" /></label>
        <label>Возраст<input :value="formAge" disabled /></label>
        <label>Позиция
          <select v-model="form.position">
            <option value="GK">GK (вратарь)</option>
            <option value="DEF">DEF (защитник)</option>
            <option value="MID">MID (полузащитник)</option>
            <option value="FWD">FWD (нападающий)</option>
          </select>
        </label>
      </div>
      <div class="form__row form__row--3">
        <label>Рост (см)<input v-model.number="form.height" type="number" min="0" /></label>
        <label>Вес (кг)<input v-model.number="form.weight" type="number" min="0" /></label>
        <label>Команда
          <select v-model="form.teamId" required>
            <option value="" disabled>— выберите —</option>
            <option v-for="t in teamOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>
      </div>
      <label>URL фото<input v-model="form.photoUrl" type="text" placeholder="https://..." /></label>
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
.form__row--2 { flex-direction: row; gap: $space-3; > label { flex: 1; } }
.form__row--3 { flex-direction: row; gap: $space-2; > label { flex: 1; } }
.form__check { display: flex; align-items: center; gap: $space-2; }
label { display: flex; flex-direction: column; gap: $space-1; font-size: $font-size-sm; }
input[type="text"], input[type="date"], input[type="number"], select, textarea {
  padding: $space-2; border: 1px solid $surface-border; border-radius: $radius-md;
  font-size: $font-size-sm; font-family: inherit;
  &:focus { border-color: $brand-primary; outline: none; }
  &:disabled { background: $surface-bg; color: $text-muted; }
}
</style>
