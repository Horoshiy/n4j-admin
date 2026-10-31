<script setup lang="ts">
/**
 * ContentPage — редактирование PageContent (slug=home).
 *
 * Шаг 3.4 + 6.2:
 *  - Hero: 5 input'ов + TipTap + кнопка «Сохранить Hero» (partial update).
 *  - Stats / Features / Programs / TrainingSteps:
 *      • inline-edit каждой ячейки через двойной клик (или сразу в input)
 *      • кнопка «Сохранить» в строке → update{Group}Item(slug, id, patch)
 *      • drag-and-drop для порядка (через reorderPageGroup)
 *      • визуальный dirty-state: подсветка строки + счётчик несохранённых
 */
import { ref, onMounted, computed, reactive } from 'vue'
import { gqlRequest } from '@/shared/api/gql'
import {
  updatePageContent,
  reorderPageGroup,
  updateStatItem,
  updateFeatureItem,
  updateProgramItem,
  updateTrainingStepItem,
  updateFaqItem,
  type StatItemPatchInput,
  type FeatureItemPatchInput,
  type AgeProgramPatchInput,
  type TrainingStepPatchInput,
  type FaqItemPatchInput,
} from '@/widgets/entities/mutations'
import { useReorder } from '@/shared/composables/useReorder'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import type {
  PageContent,
  HeroContent,
  StatItem,
  FeatureItem,
  AgeProgram,
  TrainingStep,
  FaqItem,
} from '@/shared/types/content'

const SLUG = 'home'

const loading = ref(false)
const error = ref<string | null>(null)
const flash = ref<string | null>(null)

const content = ref<PageContent | null>(null)
const stats = ref<StatItem[]>([])
const features = ref<FeatureItem[]>([])
const programs = ref<AgeProgram[]>([])
const steps = ref<TrainingStep[]>([])
const faq = ref<FaqItem[]>([])

const heroEyebrow = ref('')
const heroTitleLead = ref('')
const heroTitleAccent = ref('')
const heroDescription = ref('')
const heroCtaPrimary = ref('')
const heroCtaSecondary = ref('')

const savingHero = ref(false)
const rowSaving = reactive<Record<string, boolean>>({})

// ─── Локальные черновики для inline-edit ──────────────────────────────────
// Ключ: `${group}:${id}:${field}` (group: stats|features|programs|steps).
// Если в черновике есть значение и оно отличается от текущего —
// строка помечается как «грязная» (не сохранена).
type Drafts = Record<string, string>
const drafts = reactive<Drafts>({})

/** Группы, редактируемые inline в этой странице. */
type PageGroup = 'stats' | 'features' | 'programs' | 'steps' | 'faq'

function draftKey(group: PageGroup, id: string, field: string): string {
  return `${group}:${id}:${field}`
}

function getDraft(group: PageGroup, id: string, field: string, fallback: string): string {
  return drafts[draftKey(group, id, field)] ?? fallback
}

function setDraft(group: PageGroup, id: string, field: string, value: string): void {
  drafts[draftKey(group, id, field)] = value
}

/** Какие поля у каждой группы редактируются inline (через slot #cell-{key}). */
const STAT_FIELDS = ['value', 'label'] as const
const FEATURE_FIELDS = ['title', 'description', 'iconKey'] as const
const PROGRAM_FIELDS = ['ageLabel', 'title', 'description'] as const
const STEP_FIELDS = ['title', 'description', 'iconKey'] as const
const FAQ_FIELDS = ['question', 'answer'] as const

function groupFields(group: PageGroup): readonly string[] {
  if (group === 'stats') return STAT_FIELDS
  if (group === 'features') return FEATURE_FIELDS
  if (group === 'programs') return PROGRAM_FIELDS
  if (group === 'faq') return FAQ_FIELDS
  return STEP_FIELDS
}

/** Есть ли несохранённые правки в строке (для подсветки и кнопки). */
function isRowDirty(
  group: PageGroup,
  item: Record<string, unknown>,
): boolean {
  for (const f of groupFields(group)) {
    const id = String(item.id)
    const cur = String(item[f] ?? '')
    const draft = drafts[draftKey(group, id, f)]
    if (draft !== undefined && draft !== cur) return true
  }
  return false
}

function rowKey(group: string, id: string | number): string {
  return `${group}:${id}`
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const data = await gqlRequest<{ pageContent: PageContent | null }>(`
      {
        pageContent(slug: "home") {
          hero { eyebrow titleLead titleAccent description ctaPrimary ctaSecondary }
          stats { id value label caption iconKey }
          features { id iconKey title description }
          programs { id ageLabel title description ageGroup }
          trainingSteps { id title description iconKey }
          faq { id question answer }
        }
      }
    `)
    const pc = data.pageContent
    if (!pc) {
      error.value = 'PageContent(home) не найдено'
      return
    }
    content.value = pc
    heroEyebrow.value = pc.hero.eyebrow
    heroTitleLead.value = pc.hero.titleLead
    heroTitleAccent.value = pc.hero.titleAccent
    heroDescription.value = pc.hero.description
    heroCtaPrimary.value = pc.hero.ctaPrimary ?? ''
    heroCtaSecondary.value = pc.hero.ctaSecondary ?? ''
    stats.value = pc.stats
    features.value = pc.features
    programs.value = pc.programs
    steps.value = pc.trainingSteps
    faq.value = pc.faq ?? []
    // Сбрасываем черновики при перезагрузке — иначе покажут старые значения.
    for (const k of Object.keys(drafts)) delete drafts[k]
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить'
  } finally {
    loading.value = false
  }
}

async function saveHero(): Promise<void> {
  if (!content.value) return
  savingHero.value = true
  flash.value = null
  error.value = null
  try {
    const hero: HeroContent = {
      eyebrow: heroEyebrow.value,
      titleLead: heroTitleLead.value,
      titleAccent: heroTitleAccent.value,
      description: heroDescription.value,
      ctaPrimary: heroCtaPrimary.value || null,
      ctaSecondary: heroCtaSecondary.value || null,
    }
    const updated = await updatePageContent(SLUG, { hero })
    content.value = updated
    flash.value = 'Hero сохранён'
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    savingHero.value = false
  }
}

async function saveRow(
  group: PageGroup,
  id: string,
): Promise<void> {
  const item = (
    group === 'stats' ? stats.value :
    group === 'features' ? features.value :
    group === 'programs' ? programs.value : steps.value
  ).find((x) => x.id === id)
  if (!item) return
  const key = rowKey(group, id)
  rowSaving[key] = true
  error.value = null
  flash.value = null
  try {
    let updated: PageContent
    if (group === 'stats') {
      const patch: StatItemPatchInput = {}
      for (const f of STAT_FIELDS) {
        const d = drafts[draftKey(group, id, f)]
        if (d !== undefined && d !== (item as Record<string, unknown>)[f]) {
          (patch as Record<string, string>)[f] = d
        }
      }
      updated = await updateStatItem(SLUG, id, patch)
    } else if (group === 'features') {
      const patch: FeatureItemPatchInput = {}
      for (const f of FEATURE_FIELDS) {
        const d = drafts[draftKey(group, id, f)]
        if (d !== undefined && d !== (item as Record<string, unknown>)[f]) {
          (patch as Record<string, string>)[f] = d
        }
      }
      updated = await updateFeatureItem(SLUG, id, patch)
    } else if (group === 'programs') {
      const patch: AgeProgramPatchInput = {}
      for (const f of PROGRAM_FIELDS) {
        const d = drafts[draftKey(group, id, f)]
        if (d !== undefined && d !== (item as Record<string, unknown>)[f]) {
          (patch as Record<string, string>)[f] = d
        }
      }
      updated = await updateProgramItem(SLUG, id, patch)
    } else if (group === 'faq') {
      const patch: FaqItemPatchInput = {}
      for (const f of FAQ_FIELDS) {
        const d = drafts[draftKey(group, id, f)]
        if (d !== undefined && d !== (item as Record<string, unknown>)[f]) {
          (patch as Record<string, string>)[f] = d
        }
      }
      updated = await updateFaqItem(SLUG, id, patch)
    } else {
      const patch: TrainingStepPatchInput = {}
      for (const f of STEP_FIELDS) {
        const d = drafts[draftKey(group, id, f)]
        if (d !== undefined && d !== (item as Record<string, unknown>)[f]) {
          (patch as Record<string, string>)[f] = d
        }
      }
      updated = await updateTrainingStepItem(SLUG, id, patch)
    }
    content.value = updated
    // Подменяем массив в локале ответа бэкенда (он вернул обновлённый PageContent).
    stats.value = updated.stats
    features.value = updated.features
    programs.value = updated.programs
    steps.value = updated.trainingSteps
    faq.value = updated.faq ?? []
    // Чистим черновики для этой строки.
    for (const f of groupFields(group)) {
      delete drafts[draftKey(group, id, f)]
    }
    const label = group === 'stats' ? 'Метрика' :
                  group === 'features' ? 'Преимущество' :
                  group === 'programs' ? 'Программа' :
                  group === 'faq' ? 'Вопрос' : 'Этап'
    flash.value = `${label} (id=${id}) сохранено`
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    rowSaving[key] = false
  }
}

function rowClassName(group: PageGroup) {
  return (item: Record<string, unknown>) => {
    if (isRowDirty(group, item)) return 'rt__tr--dirty'
    if (rowSaving[rowKey(group, String(item.id))]) return 'rt__tr--saving'
    return undefined
  }
}

// ─── Reorder (drag-and-drop) ───────────────────────────────────────────────
const { save: saveStatsOrder, saving: savingStatsOrder } = useReorder<StatItem>({
  items: stats,
  getId: (s) => s.id,
  mutate: (ids) => reorderPageGroup(SLUG, 'stats', ids),
  onError: (e) => (error.value = `Stats: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Stats: порядок сохранён'),
})
const { save: saveFeaturesOrder, saving: savingFeaturesOrder } = useReorder<FeatureItem>({
  items: features,
  getId: (f) => f.id,
  mutate: (ids) => reorderPageGroup(SLUG, 'features', ids),
  onError: (e) => (error.value = `Features: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Features: порядок сохранён'),
})
const { save: saveProgramsOrder, saving: savingProgramsOrder } = useReorder<AgeProgram>({
  items: programs,
  getId: (p) => p.id,
  mutate: (ids) => reorderPageGroup(SLUG, 'programs', ids),
  onError: (e) => (error.value = `Programs: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Programs: порядок сохранён'),
})
const { save: saveFaqOrder, saving: savingFaqOrder } = useReorder<FaqItem>({
  items: faq,
  getId: (f) => f.id,
  mutate: (ids) => reorderPageGroup(SLUG, 'faq', ids),
  onError: (e) => (error.value = `FAQ: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'FAQ: порядок сохранён'),
})
const { save: saveStepsOrder, saving: savingStepsOrder } = useReorder<TrainingStep>({
  items: steps,
  getId: (s) => s.id,
  mutate: (ids) => reorderPageGroup(SLUG, 'trainingSteps', ids),
  onError: (e) => (error.value = `Steps: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Steps: порядок сохранён'),
})

// Колонки для таблиц (только «видимые» — поля, которые редактируем inline).
const statsCols = [
  { key: 'value', label: 'Значение' },
  { key: 'label', label: 'Подпись' },
]
const featuresCols = [
  { key: 'title', label: 'Заголовок' },
  { key: 'iconKey', label: 'Иконка', width: '120px' },
  { key: 'description', label: 'Описание' },
]
const programsCols = [
  { key: 'ageLabel', label: 'Возраст', width: '90px' },
  { key: 'title', label: 'Название' },
  { key: 'description', label: 'Описание' },
]
const stepsCols = [
  { key: 'title', label: 'Этап' },
  { key: 'iconKey', label: 'Иконка', width: '120px' },
  { key: 'description', label: 'Описание' },
]
const faqCols = [
  { key: 'question', label: 'Вопрос', width: '34%' },
  { key: 'answer', label: 'Ответ' },
]

const heroDirty = computed(() => {
  if (!content.value) return false
  const h = content.value.hero
  return h.eyebrow !== heroEyebrow.value
    || h.titleLead !== heroTitleLead.value
    || h.titleAccent !== heroTitleAccent.value
    || h.description !== heroDescription.value
    || (h.ctaPrimary ?? '') !== heroCtaPrimary.value
    || (h.ctaSecondary ?? '') !== heroCtaSecondary.value
})

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      title="Контент главной"
      subtitle="Hero, метрики, преимущества, программы, этапы тренировки (slug: home)."
    >
      <template #actions>
        <button class="btn btn--secondary" :disabled="loading" @click="load">↻ Обновить</button>
      </template>
    </PageHeader>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="flash" class="alert alert--ok">{{ flash }}</div>
    <div v-if="loading && !content" class="loading">Загрузка…</div>

    <template v-if="content">
      <!-- ─── Hero ─────────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Hero</h2>
          <button
            class="btn btn--primary"
            :disabled="!heroDirty || savingHero"
            @click="saveHero"
          >
            {{ savingHero ? 'Сохраняем…' : 'Сохранить Hero' }}
          </button>
        </header>
        <div class="form-grid">
          <label>Eyebrow (надзаголовок)<input v-model="heroEyebrow" type="text" /></label>
          <label>Title Lead<input v-model="heroTitleLead" type="text" /></label>
          <label>Title Accent<input v-model="heroTitleAccent" type="text" /></label>
          <label>CTA основной<input v-model="heroCtaPrimary" type="text" placeholder="Записаться" /></label>
          <label>CTA вторичный<input v-model="heroCtaSecondary" type="text" placeholder="Узнать больше" /></label>
        </div>
        <div class="block__field">
          <label class="block__label">Описание (description)</label>
          <textarea
            v-model="heroDescription"
            class="hero-lead"
            rows="4"
            maxlength="400"
            placeholder="Одна-две фразы под заголовком. Обычный текст, без форматирования."
          />
          <p class="block__hint">
            Выводится на первом экране как обычный текст. Разметка не поддерживается —
            теги попадут на страницу словами.
          </p>
        </div>
      </section>

      <!-- ─── Stats ────────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Метрики (stats) <span class="muted">· {{ stats.length }} шт.</span></h2>
          <span v-if="savingStatsOrder" class="muted">сохраняем порядок…</span>
        </header>
        <p class="block__hint">
          ✏️ Кликните в ячейку чтобы редактировать. Строка подсветится жёлтым,
          нажмите «💾 Сохранить» в строке. Перетаскивайте за ⋮⋮ для изменения порядка.
        </p>
        <ResourceTable
          :items="stats"
          :columns="statsCols"
          :draggable="true"
          :row-class-name="rowClassName('stats')"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет метрик"
          @reorder="saveStatsOrder"
        >
          <template #cell-value="{ item, value }">
            <input
              class="cell-input"
              :value="getDraft('stats', String(item.id), 'value', String(value ?? ''))"
              @input="(e) => setDraft('stats', String(item.id), 'value', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #cell-label="{ item, value }">
            <input
              class="cell-input"
              :value="getDraft('stats', String(item.id), 'label', String(value ?? ''))"
              @input="(e) => setDraft('stats', String(item.id), 'label', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #row-actions="{ item }">
            <button
              class="btn btn--primary btn--sm"
              :disabled="!isRowDirty('stats', item as Record<string, unknown>) || rowSaving[rowKey('stats', String(item.id))]"
              @click="saveRow('stats', String(item.id))"
            >
              {{ rowSaving[rowKey('stats', String(item.id))] ? '…' : '💾 Сохранить' }}
            </button>
          </template>
        </ResourceTable>
      </section>

      <!-- ─── Features ─────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Преимущества (features) <span class="muted">· {{ features.length }} шт.</span></h2>
          <span v-if="savingFeaturesOrder" class="muted">сохраняем порядок…</span>
        </header>
        <p class="block__hint">
          ✏️ Кликните в ячейку чтобы редактировать. <code>iconKey</code> —
          это ключ иконки (trophy, ball, shield, users, calendar, award, …).
        </p>
        <ResourceTable
          :items="features"
          :columns="featuresCols"
          :draggable="true"
          :row-class-name="rowClassName('features')"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет преимуществ"
          @reorder="saveFeaturesOrder"
        >
          <template #cell-title="{ item, value }">
            <input
              class="cell-input"
              :value="getDraft('features', String(item.id), 'title', String(value ?? ''))"
              @input="(e) => setDraft('features', String(item.id), 'title', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #cell-iconKey="{ item, value }">
            <input
              class="cell-input cell-input--narrow"
              :value="getDraft('features', String(item.id), 'iconKey', String(value ?? ''))"
              @input="(e) => setDraft('features', String(item.id), 'iconKey', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #cell-description="{ item, value }">
            <textarea
              class="cell-input cell-input--textarea"
              rows="2"
              :value="getDraft('features', String(item.id), 'description', String(value ?? ''))"
              @input="(e) => setDraft('features', String(item.id), 'description', (e.target as HTMLTextAreaElement).value)"
            />
          </template>
          <template #row-actions="{ item }">
            <button
              class="btn btn--primary btn--sm"
              :disabled="!isRowDirty('features', item as Record<string, unknown>) || rowSaving[rowKey('features', String(item.id))]"
              @click="saveRow('features', String(item.id))"
            >
              {{ rowSaving[rowKey('features', String(item.id))] ? '…' : '💾 Сохранить' }}
            </button>
          </template>
        </ResourceTable>
      </section>

      <!-- ─── Programs ─────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Программы (programs) <span class="muted">· {{ programs.length }} шт.</span></h2>
          <span v-if="savingProgramsOrder" class="muted">сохраняем порядок…</span>
        </header>
        <p class="block__hint">✏️ Кликните в ячейку чтобы редактировать. <code>ageLabel</code> — короткое (3–5), <code>ageGroup</code> меняется отдельно на бэкенде.</p>
        <ResourceTable
          :items="programs"
          :columns="programsCols"
          :draggable="true"
          :row-class-name="rowClassName('programs')"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет программ"
          @reorder="saveProgramsOrder"
        >
          <template #cell-ageLabel="{ item, value }">
            <input
              class="cell-input cell-input--narrow"
              :value="getDraft('programs', String(item.id), 'ageLabel', String(value ?? ''))"
              @input="(e) => setDraft('programs', String(item.id), 'ageLabel', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #cell-title="{ item, value }">
            <input
              class="cell-input"
              :value="getDraft('programs', String(item.id), 'title', String(value ?? ''))"
              @input="(e) => setDraft('programs', String(item.id), 'title', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #cell-description="{ item, value }">
            <textarea
              class="cell-input cell-input--textarea"
              rows="2"
              :value="getDraft('programs', String(item.id), 'description', String(value ?? ''))"
              @input="(e) => setDraft('programs', String(item.id), 'description', (e.target as HTMLTextAreaElement).value)"
            />
          </template>
          <template #row-actions="{ item }">
            <button
              class="btn btn--primary btn--sm"
              :disabled="!isRowDirty('programs', item as Record<string, unknown>) || rowSaving[rowKey('programs', String(item.id))]"
              @click="saveRow('programs', String(item.id))"
            >
              {{ rowSaving[rowKey('programs', String(item.id))] ? '…' : '💾 Сохранить' }}
            </button>
          </template>
        </ResourceTable>
      </section>

      <!-- ─── FAQ ─────────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Частые вопросы (faq) <span class="muted">· {{ faq.length }} шт.</span></h2>
          <span v-if="savingFaqOrder" class="muted">сохраняем порядок…</span>
        </header>
        <p class="block__hint">
          ✏️ Кликните в ячейку чтобы редактировать. Первый вопрос на сайте раскрыт по умолчанию —
          ставьте наверх самый важный.
        </p>
        <ResourceTable
          :items="faq"
          :columns="faqCols"
          :draggable="true"
          :row-class-name="rowClassName('faq')"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет вопросов"
          @reorder="saveFaqOrder"
        >
          <template #cell-question="{ item, value }">
            <textarea
              class="cell-input cell-input--textarea"
              rows="2"
              :value="getDraft('faq', String(item.id), 'question', String(value ?? ''))"
              @input="(e) => setDraft('faq', String(item.id), 'question', (e.target as HTMLTextAreaElement).value)"
            />
          </template>
          <template #cell-answer="{ item, value }">
            <textarea
              class="cell-input cell-input--textarea"
              rows="4"
              :value="getDraft('faq', String(item.id), 'answer', String(value ?? ''))"
              @input="(e) => setDraft('faq', String(item.id), 'answer', (e.target as HTMLTextAreaElement).value)"
            />
          </template>
          <template #row-actions="{ item }">
            <button
              class="btn btn--primary btn--sm"
              :disabled="!isRowDirty('faq', item as Record<string, unknown>) || rowSaving[rowKey('faq', String(item.id))]"
              @click="saveRow('faq', String(item.id))"
            >
              {{ rowSaving[rowKey('faq', String(item.id))] ? '…' : '💾 Сохранить' }}
            </button>
          </template>
        </ResourceTable>
      </section>

      <!-- ─── Training Steps ───────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Этапы тренировки (trainingSteps) <span class="muted">· {{ steps.length }} шт.</span></h2>
          <span v-if="savingStepsOrder" class="muted">сохраняем порядок…</span>
        </header>
        <p class="block__hint">✏️ Кликните в ячейку чтобы редактировать. <code>iconKey</code> — ключ иконки.</p>
        <ResourceTable
          :items="steps"
          :columns="stepsCols"
          :draggable="true"
          :row-class-name="rowClassName('steps')"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет этапов"
          @reorder="saveStepsOrder"
        >
          <template #cell-title="{ item, value }">
            <input
              class="cell-input"
              :value="getDraft('steps', String(item.id), 'title', String(value ?? ''))"
              @input="(e) => setDraft('steps', String(item.id), 'title', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #cell-iconKey="{ item, value }">
            <input
              class="cell-input cell-input--narrow"
              :value="getDraft('steps', String(item.id), 'iconKey', String(value ?? ''))"
              @input="(e) => setDraft('steps', String(item.id), 'iconKey', (e.target as HTMLInputElement).value)"
            />
          </template>
          <template #cell-description="{ item, value }">
            <textarea
              class="cell-input cell-input--textarea"
              rows="2"
              :value="getDraft('steps', String(item.id), 'description', String(value ?? ''))"
              @input="(e) => setDraft('steps', String(item.id), 'description', (e.target as HTMLTextAreaElement).value)"
            />
          </template>
          <template #row-actions="{ item }">
            <button
              class="btn btn--primary btn--sm"
              :disabled="!isRowDirty('steps', item as Record<string, unknown>) || rowSaving[rowKey('steps', String(item.id))]"
              @click="saveRow('steps', String(item.id))"
            >
              {{ rowSaving[rowKey('steps', String(item.id))] ? '…' : '💾 Сохранить' }}
            </button>
          </template>
        </ResourceTable>
      </section>
    </template>
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
}
.loading { padding: $space-5; text-align: center; color: $text-muted; }
.alert {
  padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3;
  font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; }
}
.muted { color: $text-muted; font-size: $font-size-sm; }
.block {
  background: $surface-card; border: 1px solid $surface-border; border-radius: $radius-lg;
  padding: $space-4 $space-5; margin-bottom: $space-4; box-shadow: $shadow-sm;
}
.block__header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: $space-3; gap: $space-3;
  h2 { font-size: $font-size-lg; font-weight: $font-weight-semibold; margin: 0; }
}
.hero-lead {
  width: 100%;
  font: inherit;
  padding: 8px 10px;
  border: 1px solid #d5dbe6;
  border-radius: 6px;
  resize: vertical;
}

.block__hint {
  font-size: $font-size-xs; color: $text-muted; margin: 0 0 $space-3;
  code { background: $surface-bg; padding: 1px 4px; border-radius: 3px; font-size: 0.95em; }
}
.block__field { margin-top: $space-3; }
.block__label {
  display: block; font-size: $font-size-sm; color: $text-secondary;
  margin-bottom: $space-2; font-weight: $font-weight-medium;
}
.form-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: $space-3; margin-bottom: $space-3;
  label {
    display: flex; flex-direction: column; gap: 4px;
    font-size: $font-size-sm; color: $text-secondary;
  }
  input {
    padding: $space-2 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
    font-size: $font-size-sm;
    &:focus { outline: none; border-color: $brand-primary; box-shadow: 0 0 0 3px rgba(30,111,217,.15); }
  }
}
.cell-input {
  width: 100%;
  padding: 4px $space-2;
  border: 1px solid transparent;
  border-radius: $radius-sm;
  background: transparent;
  font: inherit;
  color: inherit;
  &:hover { border-color: $surface-border; background: $surface-card; }
  &:focus { outline: none; border-color: $brand-primary; background: $surface-card; box-shadow: 0 0 0 2px rgba(30,111,217,.15); }
  &--narrow { width: 100px; }
  &--textarea { resize: vertical; min-height: 36px; font-family: inherit; }
}
:deep(.rt__tr--dirty) {
  background: rgba(245, 158, 11, .12) !important;
  border-left: 3px solid $brand-warning;
}
:deep(.rt__tr--saving) {
  opacity: 0.6;
  background: rgba(30, 111, 217, .1) !important;
}
</style>
