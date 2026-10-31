<script setup lang="ts">
/**
 * TeamsPage — список команд с CRUD (create, edit, soft-delete, hard-delete)
 * и drag-and-drop reorder.
 *
 * Шаг 3.5: добавлены:
 * - + Создать (upsertTeam с id=null)
 * - ✎ Редактировать (upsertTeam с id=item.id)
 * - 🗑 Удалить навсегда (deleteEntity — каскадно чистит players.teamId)
 *
 * Toggle видимости (soft-delete) сохранён.
 */
import { computed, ref } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import {
  setEntityVisible,
  deleteEntity,
  reorderTeams,
  upsertTeam,
} from '@/widgets/entities/mutations'
import { useReorder } from '@/shared/composables/useReorder'
import { useCrud } from '@/shared/composables/useCrud'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'
import EntityEditDialog from '@/shared/ui/EntityEditDialog.vue'

interface CoachRef {
  id: string
  name: string
  role: string
}

interface Team {
  id: string
  name: string
  ageGroup: string
  ageLabel: string
  description: string
  playersCount: number
  color: string
  coach: CoachRef
  schedule: Array<{ day: string; time: string; venue: string }>
  visible: boolean
}

const { items, loading, error, refetch } = useList<Team>(
  'teamsAdmin',
  async () => {
    const data = await gqlRequest<{ teamsAdmin: Team[] }>(`
      {
        teamsAdmin {
          id name ageGroup ageLabel description playersCount color visible
          coach { id name role }
          schedule { day time venue }
        }
      }
    `)
    return data.teamsAdmin
  },
)

// Список тренеров для селекта в форме команды
const coaches = ref<Array<{ id: string; fullName: string }>>([])
async function loadCoaches(): Promise<void> {
  const data = await gqlRequest<{ coachesAdmin: Array<{ id: string; fullName: string }> }>(`
    { coachesAdmin { id fullName } }
  `)
  coaches.value = data.coachesAdmin
}

const columns = [
  { key: 'name', label: 'Команда' },
  { key: 'ageLabel', label: 'Возраст' },
  { key: 'coach', label: 'Тренер', render: (t: Team) => t.coach?.name ?? '—' },
  { key: 'playersCount', label: 'Игроков' },
  { key: 'visible', label: 'Видимость' },
]

// ─── CRUD ────────────────────────────────────────────────────────────
const crud = useCrud<Team>({
  entity: 'team',
  onRefresh: refetch,
  labels: { singular: 'команду', plural: 'команды' },
})

// Форма команды — единый объект
interface TeamForm {
  id: string | null
  name: string
  ageGroup: string
  ageLabel: string
  description: string
  playersCount: number
  color: string
  coachId: string
  visible: boolean
}

const form = ref<TeamForm>(emptyForm())
const formError = ref<string | null>(null)
const formSaving = ref(false)

/**
 * Возрастные группы сайта. Список тот же, что в фильтре на /teams и в формах
 * заявки; свободный ввод здесь недопустим — группа со значением вне набора
 * не попадает ни в один фильтр и выпадает из витрины.
 */
const AGE_GROUPS = [
  { value: '3-5',   label: '3–5 лет' },
  { value: '6-7',   label: '6–7 лет' },
  { value: '8-10',  label: '8–10 лет' },
  { value: '11-14', label: '11–14 лет' },
] as const

/** Подпись подставляем из выбранной группы, если редактор её не менял вручную. */
function syncAgeLabel(): void {
  const picked = AGE_GROUPS.find((a) => a.value === form.value.ageGroup)
  if (!picked) return
  const wasAuto = AGE_GROUPS.some((a) => a.label === form.value.ageLabel) || !form.value.ageLabel
  if (wasAuto) form.value.ageLabel = picked.label
}

function emptyForm(): TeamForm {
  return {
    id: null,
    name: '',
    ageGroup: '8-10',
    ageLabel: '8–10 лет',
    description: '',
    playersCount: 0,
    color: '#22c55e',
    coachId: '',
    visible: true,
  }
}

function onCreate(): void {
  form.value = emptyForm()
  crud.openCreate()
  if (coaches.value.length === 0) loadCoaches()
}

function onEdit(team: Team): void {
  form.value = {
    id: team.id,
    name: team.name,
    ageGroup: team.ageGroup,
    ageLabel: team.ageLabel,
    description: team.description,
    playersCount: team.playersCount,
    color: team.color,
    coachId: team.coach?.id ?? '',
    visible: team.visible,
  }
  crud.openEdit(team)
  if (coaches.value.length === 0) loadCoaches()
}

async function onSubmitForm(): Promise<void> {
  if (formSaving.value) return
  formError.value = null
  formSaving.value = true
  try {
    await upsertTeam({
      id: form.value.id,
      name: form.value.name.trim(),
      ageGroup: form.value.ageGroup,
      ageLabel: form.value.ageLabel,
      description: form.value.description,
      playersCount: form.value.playersCount,
      color: form.value.color,
      coachId: form.value.coachId,
      schedule: [],
      visible: form.value.visible,
    })
    crud.closeDialog()
    await refetch()
    flashMessage.value = form.value.id ? 'Команда обновлена' : 'Команда создана'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    formSaving.value = false
  }
}

// ─── Soft-delete (toggle видимости) ─────────────────────────────────
const confirmingToggle = ref<{ id: string; nextVisible: boolean; name: string } | null>(null)

function askToggle(team: Team): void {
  confirmingToggle.value = {
    id: team.id,
    nextVisible: !team.visible,
    name: team.name,
  }
}

async function confirmToggle(): Promise<void> {
  if (!confirmingToggle.value) return
  const { id, nextVisible, name } = confirmingToggle.value
  confirmingToggle.value = null
  try {
    await setEntityVisible('team', id, nextVisible)
    await refetch()
    flashMessage.value = `${name}: ${nextVisible ? 'показана' : 'скрыта'}`
  } catch (e) {
    flashMessage.value = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
  }
}

const flashMessage = ref<string | null>(null)

function rowClass(t: Team): string | undefined {
  return t.visible ? undefined : 'rt__tr--muted'
}

const summary = computed(() => {
  const total = items.value.length
  const visible = items.value.filter((t) => t.visible).length
  return { total, visible, hidden: total - visible }
})

// ─── Reorder (drag-and-drop) ───────────────────────────────────────
const { save: saveReorder } = useReorder<Team>({
  items,
  getId: (t) => t.id,
  mutate: reorderTeams,
  onError: (e) => {
    flashMessage.value = `Не удалось сохранить порядок: ${e instanceof Error ? e.message : String(e)}`
  },
})
</script>

<template>
  <div>
    <PageHeader
      title="Команды"
      :subtitle="`Всего: ${summary.total} · видны: ${summary.visible} · скрыты: ${summary.hidden}`"
    >
      <template #actions>
        <button class="btn btn--secondary" @click="refetch">↻ Обновить</button>
        <button class="btn btn--primary" @click="onCreate">+ Создать</button>
      </template>
    </PageHeader>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="flashMessage" class="alert alert--ok">{{ flashMessage }}</div>

    <ResourceTable
      :items="items"
      :columns="columns"
      :loading="loading"
      :row-class-name="rowClass"
      :draggable="true"
      drag-hint="Перетащите строку, чтобы изменить порядок команд"
      empty-title="Нет команд"
      @reorder="saveReorder"
    >
      <template #cell-color="{ item }">
        <span class="color-chip" :style="{ background: (item as Team).color }" />
      </template>
      <template #cell-visible="{ item }">
        <span :class="['badge', (item as Team).visible ? 'badge--ok' : 'badge--muted']">
          {{ (item as Team).visible ? 'видна' : 'скрыта' }}
        </span>
      </template>
      <template #row-actions="{ item }">
        <button
          class="btn btn--sm"
          :class="(item as Team).visible ? 'btn--warning' : 'btn--success'"
          @click="askToggle(item as Team)"
        >
          {{ (item as Team).visible ? 'Скрыть' : 'Показать' }}
        </button>
        <button class="btn btn--sm btn--secondary" @click="onEdit(item as Team)">✎</button>
        <button class="btn btn--sm btn--danger" @click="crud.askHardDelete(item as Team)">🗑</button>
      </template>
    </ResourceTable>

    <!-- Soft-delete toggle -->
    <ConfirmDialog
      :open="confirmingToggle !== null"
      :title="confirmingToggle?.nextVisible ? 'Показать команду?' : 'Скрыть команду?'"
      :message="
        confirmingToggle
          ? `«${confirmingToggle.name}» будет ${confirmingToggle.nextVisible ? 'видна' : 'скрыта'} на сайте.`
          : ''
      "
      :confirm-label="confirmingToggle?.nextVisible ? 'Показать' : 'Скрыть'"
      :variant="confirmingToggle?.nextVisible ? 'default' : 'danger'"
      @confirm="confirmToggle"
      @cancel="confirmingToggle = null"
    />

    <!-- Hard-delete (через useCrud) -->
    <ConfirmDialog
      :open="crud.confirmOpen.value && crud.pendingAction.value?.kind === 'hard'"
      title="Удалить команду безвозвратно?"
      :message="
        crud.pendingAction.value
          ? `«${crud.pendingAction.value.item.name}» будет удалена из БД. Игроки команды получат пустой teamId. Действие необратимо.`
          : ''
      "
      confirm-label="Удалить навсегда"
      variant="danger"
      @confirm="crud.confirmAction"
      @cancel="crud.cancelAction"
    />

    <!-- Edit / Create dialog -->
    <EntityEditDialog
      :open="crud.dialog.value.open"
      :title="crud.dialog.value.mode === 'edit' ? 'Редактировать команду' : 'Новая команда'"
      :saving="formSaving"
      :error="formError"
      size="md"
      :submit-label="form.id ? 'Сохранить' : 'Создать'"
      @submit="onSubmitForm"
      @cancel="crud.closeDialog"
    >
      <div class="form__row">
        <label>Название<input v-model="form.name" type="text" required maxlength="80" /></label>
      </div>
      <div class="form__row form__row--2">
        <label>Возрастная группа
          <select v-model="form.ageGroup" @change="syncAgeLabel">
            <option v-for="a in AGE_GROUPS" :key="a.value" :value="a.value">{{ a.label }}</option>
          </select>
        </label>
        <label>Подпись (ageLabel)<input v-model="form.ageLabel" type="text" placeholder="8–10 лет" /></label>
      </div>
      <label>Описание<textarea v-model="form.description" rows="3" /></label>
      <div class="form__row form__row--2">
        <label>Количество игроков<input v-model.number="form.playersCount" type="number" min="0" /></label>
        <label>Цвет<input v-model="form.color" type="color" /></label>
      </div>
      <label>Тренер
        <select v-model="form.coachId" required>
          <option value="" disabled>— выберите тренера —</option>
          <option v-for="c in coaches" :key="c.id" :value="c.id">{{ c.fullName }}</option>
        </select>
      </label>
      <label class="form__check">
        <input v-model="form.visible" type="checkbox" />
        Видима на сайте
      </label>
    </EntityEditDialog>
  </div>
</template>

<style lang="scss" scoped>
.color-chip {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: $radius-sm;
  border: 1px solid rgba(0, 0, 0, 0.1);
  vertical-align: middle;
}

.btn {
  padding: $space-1 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
  background: $surface-card; color: $text-primary; font-size: $font-size-sm; cursor: pointer;
  transition: all 0.15s;
  &:hover { background: $surface-bg; }
  &--sm { padding: 2px $space-2; font-size: $font-size-xs; }
  &--secondary {
    background: $brand-primary-light; color: $brand-primary; border-color: transparent;
    &:hover { background: $brand-primary; color: $text-on-brand; }
  }
  &--primary {
    background: $brand-primary; color: $text-on-brand; border-color: $brand-primary;
    &:hover { background: $brand-primary-dark; }
  }
  &--warning { color: $brand-warning; border-color: $brand-warning; &:hover { background: rgba(217,119,6,.1); } }
  &--success { color: $brand-success; border-color: $brand-success; &:hover { background: rgba(22,163,74,.1); } }
  &--danger  { color: $brand-danger; border-color: $brand-danger; &:hover { background: rgba(220,38,38,.1); } }
}

.badge {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: $font-size-xs; font-weight: $font-weight-medium;
  &--ok { background: rgba(22,163,74,.12); color: $brand-success; }
  &--muted { background: $surface-bg; color: $text-muted; }
}

.alert {
  padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3;
  font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; }
}

.form__row { display: flex; flex-direction: column; gap: $space-2; }
.form__row--2 { flex-direction: row; gap: $space-3; > label { flex: 1; } }
.form__check { display: flex; align-items: center; gap: $space-2; }
label { display: flex; flex-direction: column; gap: $space-1; font-size: $font-size-sm; }
input[type="text"], input[type="number"], select, textarea {
  padding: $space-2; border: 1px solid $surface-border; border-radius: $radius-md;
  font-size: $font-size-sm; font-family: inherit;
  &:focus { border-color: $brand-primary; outline: none; }
}
input[type="color"] { height: 36px; padding: 2px; cursor: pointer; }
</style>
