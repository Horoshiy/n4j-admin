<script setup lang="ts">
/**
 * ContentPage — редактирование PageContent (slug=home).
 *
 * Шаг 3.4. Структура:
 *  - Hero (заголовок, подзаголовок, описание через TipTap, CTA)
 *  - Stats (метрики) — таблица с drag-and-drop
 *  - Features (преимущества) — таблица с drag-and-drop
 *  - Programs (возрастные программы) — таблица с drag-and-drop
 *  - TrainingSteps (этапы тренировки) — таблица с drag-and-drop
 *
 * Каждая секция имеет "Сохранить" (отправляет partial update). Hero — единый
 * update с 4 полями + TipTap для description.
 */
import { ref, onMounted, computed } from 'vue'
import { gqlRequest } from '@/shared/api/gql'
import {
  updatePageContent,
  reorderPageGroup,
} from '@/widgets/entities/mutations'
import { useReorder } from '@/shared/composables/useReorder'
import PageHeader from '@/shared/ui/PageHeader.vue'
import TiptapEditor from '@/shared/ui/TiptapEditor.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'
import type {
  PageContent,
  HeroContent,
  StatItem,
  FeatureItem,
  AgeProgram,
  TrainingStep,
} from '@/shared/types/content'

const loading = ref(false)
const error = ref<string | null>(null)
const flash = ref<string | null>(null)

const content = ref<PageContent | null>(null)
// Локальные копии групп для drag-and-drop (меняем items.value в <ResourceTable>).
const stats = ref<StatItem[]>([])
const features = ref<FeatureItem[]>([])
const programs = ref<AgeProgram[]>([])
const steps = ref<TrainingStep[]>([])
// Hero — отдельные refs, чтобы TipTap мог v-model на description
const heroEyebrow = ref('')
const heroTitleLead = ref('')
const heroTitleAccent = ref('')
const heroDescription = ref('')
const heroCtaPrimary = ref('')
const heroCtaSecondary = ref('')

const savingHero = ref(false)
const confirmingSave = ref<'hero' | 'stats' | 'features' | 'programs' | 'steps' | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const data = await gqlRequest<{ pageContent: PageContent | null }>(`
      {
        pageContent(slug: "home") {
          hero { eyebrow titleLead titleAccent description ctaPrimary ctaSecondary }
          stats { id value label }
          features { id iconKey title description }
          programs { id ageLabel title description ageGroup }
          trainingSteps { id title description iconKey }
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
    const updated = await updatePageContent('home', { hero })
    content.value = updated
    flash.value = 'Hero сохранён'
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    savingHero.value = false
    confirmingSave.value = null
  }
}

// Для каждой группы: drag-and-drop reorder → reorderPageGroup.
// + кнопка «Сохранить порядок» — на случай если backend опционально.
const { save: saveStatsOrder, saving: savingStatsOrder } = useReorder<StatItem>({
  items: stats,
  getId: (s) => s.id,
  mutate: (ids) => reorderPageGroup('home', 'stats', ids),
  onError: (e) => (error.value = `Stats: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Stats: порядок сохранён'),
})
const { save: saveFeaturesOrder, saving: savingFeaturesOrder } = useReorder<FeatureItem>({
  items: features,
  getId: (f) => f.id,
  mutate: (ids) => reorderPageGroup('home', 'features', ids),
  onError: (e) => (error.value = `Features: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Features: порядок сохранён'),
})
const { save: saveProgramsOrder, saving: savingProgramsOrder } = useReorder<AgeProgram>({
  items: programs,
  getId: (p) => p.id,
  mutate: (ids) => reorderPageGroup('home', 'programs', ids),
  onError: (e) => (error.value = `Programs: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Programs: порядок сохранён'),
})
const { save: saveStepsOrder, saving: savingStepsOrder } = useReorder<TrainingStep>({
  items: steps,
  getId: (s) => s.id,
  mutate: (ids) => reorderPageGroup('home', 'trainingSteps', ids),
  onError: (e) => (error.value = `Steps: ${e instanceof Error ? e.message : String(e)}`),
  onSuccess: () => (flash.value = 'Steps: порядок сохранён'),
})

const statsCols = [
  { key: 'value', label: 'Значение' },
  { key: 'label', label: 'Подпись' },
]
const featuresCols = [
  { key: 'title', label: 'Заголовок' },
  { key: 'iconKey', label: 'Иконка' },
  { key: 'description', label: 'Описание', render: (f: FeatureItem) => f.description.slice(0, 60) + (f.description.length > 60 ? '…' : '') },
]
const programsCols = [
  { key: 'ageLabel', label: 'Возраст' },
  { key: 'title', label: 'Название' },
  { key: 'description', label: 'Описание', render: (p: AgeProgram) => p.description.slice(0, 60) + (p.description.length > 60 ? '…' : '') },
]
const stepsCols = [
  { key: 'title', label: 'Этап' },
  { key: 'iconKey', label: 'Иконка' },
  { key: 'description', label: 'Описание', render: (s: TrainingStep) => s.description.slice(0, 60) + (s.description.length > 60 ? '…' : '') },
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
          <label class="block__label">Описание (description) — TipTap</label>
          <TiptapEditor v-model:value="heroDescription" :min-height="180" />
        </div>
      </section>

      <!-- ─── Stats ────────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Метрики (stats) <span class="muted">· {{ stats.length }} шт.</span></h2>
          <span v-if="savingStatsOrder" class="muted">сохраняем порядок…</span>
        </header>
        <ResourceTable
          :items="stats"
          :columns="statsCols"
          :draggable="true"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет метрик"
          @reorder="saveStatsOrder"
        />
      </section>

      <!-- ─── Features ─────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Преимущества (features) <span class="muted">· {{ features.length }} шт.</span></h2>
          <span v-if="savingFeaturesOrder" class="muted">сохраняем порядок…</span>
        </header>
        <ResourceTable
          :items="features"
          :columns="featuresCols"
          :draggable="true"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет преимуществ"
          @reorder="saveFeaturesOrder"
        />
      </section>

      <!-- ─── Programs ─────────────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Программы (programs) <span class="muted">· {{ programs.length }} шт.</span></h2>
          <span v-if="savingProgramsOrder" class="muted">сохраняем порядок…</span>
        </header>
        <ResourceTable
          :items="programs"
          :columns="programsCols"
          :draggable="true"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет программ"
          @reorder="saveProgramsOrder"
        />
      </section>

      <!-- ─── Training Steps ───────────────────────────────────────── -->
      <section class="block">
        <header class="block__header">
          <h2>Этапы тренировки (trainingSteps) <span class="muted">· {{ steps.length }} шт.</span></h2>
          <span v-if="savingStepsOrder" class="muted">сохраняем порядок…</span>
        </header>
        <ResourceTable
          :items="steps"
          :columns="stepsCols"
          :draggable="true"
          drag-hint="Перетащите строку, чтобы изменить порядок"
          empty-title="Нет этапов"
          @reorder="saveStepsOrder"
        />
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.btn {
  padding: $space-1 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
  background: $surface-card; color: $text-primary; font-size: $font-size-sm; cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
</style>
