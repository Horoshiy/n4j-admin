<script setup lang="ts">
/**
 * CoachesPage — список тренеров с CRUD + soft-delete + reorder.
 */
import { ref } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import {
  setEntityVisible,
  deleteEntity,
  reorderCoaches,
  upsertCoach,
  type CoachInput,
  type CoachAchievementInput,
} from '@/widgets/entities/mutations'
import { useReorder } from '@/shared/composables/useReorder'
import { useCrud } from '@/shared/composables/useCrud'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'
import EntityEditDialog from '@/shared/ui/EntityEditDialog.vue'

interface Coach {
  id: string
  fullName: string
  role: string
  description: string
  experienceYears: number
  specialization: string[]
  ageGroups: string[]
  avatarGradient: string
  achievements: CoachAchievementInput[]
  visible: boolean
}

const { items, loading, error, refetch } = useList<Coach>(
  'coachesAdmin',
  async () => {
    const data = await gqlRequest<{ coachesAdmin: Coach[] }>(`
      {
        coachesAdmin {
          id fullName role description experienceYears specialization ageGroups avatarGradient visible
          achievements { title description iconKey }
        }
      }
    `)
    return data.coachesAdmin
  },
)

const confirming = ref<{ id: string; nextVisible: boolean; name: string } | null>(null)
const flash = ref<string | null>(null)

function ask(c: Coach): void {
  confirming.value = { id: c.id, nextVisible: !c.visible, name: c.fullName }
}

async function confirm(): Promise<void> {
  if (!confirming.value) return
  const { id, nextVisible, name } = confirming.value
  confirming.value = null
  try {
    await setEntityVisible('coach', id, nextVisible)
    await refetch()
    flash.value = `${name}: ${nextVisible ? 'показан' : 'скрыт'}`
  } catch (e) {
    flash.value = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
  }
}

const columns = [
  { key: 'fullName', label: 'Тренер' },
  { key: 'role', label: 'Роль' },
  { key: 'experienceYears', label: 'Опыт (лет)' },
  { key: 'specialization', label: 'Специализация', render: (c: Coach) => c.specialization.join(', ') || '—' },
  { key: 'visible', label: 'Видимость' },
]

const { save: saveReorder } = useReorder<Coach>({
  items,
  getId: (c) => c.id,
  mutate: reorderCoaches,
  onError: (e) => {
    flash.value = `Не удалось сохранить порядок: ${e instanceof Error ? e.message : String(e)}`
  },
})

// ─── CRUD ────────────────────────────────────────────────────────────
const crud = useCrud<Coach>({
  entity: 'coach',
  onRefresh: refetch,
  labels: { singular: 'тренера', plural: 'тренеры' },
})

const form = ref<CoachInput>(emptyForm())
const formError = ref<string | null>(null)
const formSaving = ref(false)

function emptyForm(): CoachInput {
  return {
    id: null,
    fullName: '',
    role: '',
    description: '',
    experienceYears: 0,
    specialization: [],
    ageGroups: [],
    avatarGradient: 'linear-gradient(135deg, #22c55e, #06b6d4)',
    achievements: [],
    visible: true,
  }
}

function onCreate(): void {
  form.value = emptyForm()
  crud.openCreate()
}

function onEdit(c: Coach): void {
  form.value = {
    id: c.id,
    fullName: c.fullName,
    role: c.role,
    description: c.description,
    experienceYears: c.experienceYears,
    specialization: [...c.specialization],
    ageGroups: [...c.ageGroups],
    avatarGradient: c.avatarGradient,
    achievements: c.achievements.map((a) => ({ ...a })),
    visible: c.visible,
  }
  crud.openEdit(c)
}

async function onSubmitForm(): Promise<void> {
  if (formSaving.value) return
  formError.value = null
  formSaving.value = true
  try {
    await upsertCoach({
      ...form.value,
      fullName: form.value.fullName.trim(),
      role: form.value.role.trim(),
      description: form.value.description,
    })
    crud.closeDialog()
    await refetch()
    flash.value = form.value.id ? 'Тренер обновлён' : 'Тренер создан'
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    formSaving.value = false
  }
}

function addSpecialization(): void {
  form.value.specialization.push('')
}
function removeSpecialization(i: number): void {
  form.value.specialization.splice(i, 1)
}
function addAchievement(): void {
  form.value.achievements.push({ title: '', description: '', iconKey: 'trophy' })
}
function removeAchievement(i: number): void {
  form.value.achievements.splice(i, 1)
}
</script>

<template>
  <div>
    <PageHeader title="Тренеры">
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
      drag-hint="Перетащите строку, чтобы изменить порядок тренеров"
      empty-title="Нет тренеров"
      @reorder="saveReorder"
    >
      <template #cell-visible="{ item }">
        <span :class="['badge', (item as Coach).visible ? 'badge--ok' : 'badge--muted']">
          {{ (item as Coach).visible ? 'виден' : 'скрыт' }}
        </span>
      </template>
      <template #row-actions="{ item }">
        <button
          class="btn btn--sm"
          :class="(item as Coach).visible ? 'btn--warning' : 'btn--success'"
          @click="ask(item as Coach)"
        >
          {{ (item as Coach).visible ? 'Скрыть' : 'Показать' }}
        </button>
        <button class="btn btn--sm btn--secondary" @click="onEdit(item as Coach)">✎</button>
        <button class="btn btn--sm btn--danger" @click="crud.askHardDelete(item as Coach)">🗑</button>
      </template>
    </ResourceTable>

    <!-- Soft-delete toggle -->
    <ConfirmDialog
      :open="confirming !== null"
      :title="confirming?.nextVisible ? 'Показать тренера?' : 'Скрыть тренера?'"
      :message="confirming ? `«${confirming.name}» будет ${confirming.nextVisible ? 'виден' : 'скрыт'} на сайте.` : ''"
      :confirm-label="confirming?.nextVisible ? 'Показать' : 'Скрыть'"
      :variant="confirming?.nextVisible ? 'default' : 'danger'"
      @confirm="confirm"
      @cancel="confirming = null"
    />

    <!-- Hard-delete -->
    <ConfirmDialog
      :open="crud.confirmOpen.value && crud.pendingAction.value?.kind === 'hard'"
      title="Удалить тренера безвозвратно?"
      :message="
        crud.pendingAction.value
          ? `«${crud.pendingAction.value.item.fullName}» будет удалён из БД. Действие необратимо.`
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
      :title="crud.dialog.value.mode === 'edit' ? 'Редактировать тренера' : 'Новый тренер'"
      :saving="formSaving"
      :error="formError"
      size="lg"
      :submit-label="form.id ? 'Сохранить' : 'Создать'"
      @submit="onSubmitForm"
      @cancel="crud.closeDialog"
    >
      <div class="form__row form__row--2">
        <label>ФИО<input v-model="form.fullName" type="text" required maxlength="120" /></label>
        <label>Роль<input v-model="form.role" type="text" placeholder="Главный тренер" /></label>
      </div>
      <label>Описание<textarea v-model="form.description" rows="3" /></label>
      <div class="form__row form__row--2">
        <label>Опыт (лет)<input v-model.number="form.experienceYears" type="number" min="0" /></label>
        <label>Градиент аватара<input v-model="form.avatarGradient" type="text" placeholder="linear-gradient(...)" /></label>
      </div>

      <fieldset class="form__group">
        <legend>Специализация</legend>
        <div v-for="(s, i) in form.specialization" :key="i" class="form__list-item">
          <input v-model="form.specialization[i]" type="text" placeholder="GK / DEF / MID / FWD" />
          <button type="button" class="btn btn--sm btn--danger" @click="removeSpecialization(i)">×</button>
        </div>
        <button type="button" class="btn btn--sm btn--secondary" @click="addSpecialization">+ Добавить</button>
      </fieldset>

      <fieldset class="form__group">
        <legend>Возрастные группы</legend>
        <div class="form__check-row">
          <label class="form__check"><input v-model="form.ageGroups" type="checkbox" value="A5_7" /> 5–7</label>
          <label class="form__check"><input v-model="form.ageGroups" type="checkbox" value="A8_10" /> 8–10</label>
          <label class="form__check"><input v-model="form.ageGroups" type="checkbox" value="A11_14" /> 11–14</label>
        </div>
      </fieldset>

      <fieldset class="form__group">
        <legend>Достижения</legend>
        <div v-for="(a, i) in form.achievements" :key="i" class="form__achievement">
          <input v-model="form.achievements[i].title" type="text" placeholder="Заголовок" />
          <input v-model="form.achievements[i].description" type="text" placeholder="Описание" />
          <select v-model="form.achievements[i].iconKey">
            <option value="trophy">🏆 trophy</option>
            <option value="medal">🥇 medal</option>
            <option value="star">⭐ star</option>
            <option value="ball">⚽ ball</option>
          </select>
          <button type="button" class="btn btn--sm btn--danger" @click="removeAchievement(i)">×</button>
        </div>
        <button type="button" class="btn btn--sm btn--secondary" @click="addAchievement">+ Достижение</button>
      </fieldset>

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
  &--danger { color: $brand-danger; border-color: $brand-danger; &:hover { background: rgba(220,38,38,.1); } }
}
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: $font-size-xs; font-weight: $font-weight-medium;
  &--ok { background: rgba(22,163,74,.12); color: $brand-success; }
  &--muted { background: $surface-bg; color: $text-muted; }
}
.alert {
  padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3; font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; }
}

.form__row { display: flex; flex-direction: column; gap: $space-2; }
.form__row--2 { flex-direction: row; gap: $space-3; > label { flex: 1; } }
.form__check { display: flex; align-items: center; gap: $space-2; }
.form__check-row { display: flex; gap: $space-3; }
.form__group {
  border: 1px solid $surface-border; border-radius: $radius-md; padding: $space-2 $space-3;
  display: flex; flex-direction: column; gap: $space-2;
  legend { font-size: $font-size-sm; font-weight: $font-weight-medium; padding: 0 $space-1; }
}
.form__list-item, .form__achievement { display: flex; gap: $space-2; align-items: center; }
.form__achievement { display: grid; grid-template-columns: 1fr 1fr 120px auto; gap: $space-2; }
label { display: flex; flex-direction: column; gap: $space-1; font-size: $font-size-sm; }
input[type="text"], input[type="number"], select, textarea {
  padding: $space-2; border: 1px solid $surface-border; border-radius: $radius-md;
  font-size: $font-size-sm; font-family: inherit;
  &:focus { border-color: $brand-primary; outline: none; }
}
</style>
