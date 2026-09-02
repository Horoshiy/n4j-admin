<script setup lang="ts">
/**
 * DashboardPage — карта сайта: какие страницы → какие блоки в каком порядке.
 *
 * Шаг 5 (page_layout в БД). Дашборд показывает:
 *  - 10 страниц из state.pageLayouts (route + title)
 *  - внутри каждой — секции с иконкой kind, label, счётчиком элементов
 *  - drag-and-drop секций внутри страницы (vue-draggable-plus)
 *  - кнопка 👁 на секции — скрыть/показать (сохраняется)
 *  - кнопка «💾 Сохранить порядок» в шапке (dirty флаг)
 *  - клик по label → router.push на страницу редактора
 *  - кнопка «+ Добавить секцию» — мини-форма (kind, label, collection)
 *
 * Счётчики по collection берутся из существующих public queries
 * (teams, coaches, ...), не из state (UI отображает только видимые).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import { fetchPageLayouts } from '@/widgets/entities/queries'
import { updatePageLayout, type PageSectionInput } from '@/widgets/entities/mutations'
import { gqlRequest } from '@/shared/api/gql'
import PageHeader from '@/shared/ui/PageHeader.vue'
import type { PageLayout, PageSection, PageSectionKind } from '@/shared/types/content'

const router = useRouter()

/** Локальный state — копия того, что пришло с бэкенда, мутируется при drag/click. */
const layouts = ref<PageLayout[]>([])
const originalLayouts = ref<string>('') // JSON для dirty-сравнения
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

/** Счётчики по collection. Заполняются параллельно с загрузкой layouts. */
const counts = ref<Record<string, number>>({})

/** Иконка для kind (юникод, чтобы не тянуть иконки). */
const KIND_ICONS: Record<PageSectionKind, string> = {
  HERO: '🎯',
  LIST: '📋',
  GALLERY: '🖼',
  CONTACT: '📞',
  TEXT: '📝',
  MEDIA: '🎬',
  LINK: '🔗',
}

/** Список видов для dropdown'а «+ Добавить секцию». */
const ALL_KINDS: PageSectionKind[] = ['HERO', 'LIST', 'GALLERY', 'CONTACT', 'TEXT', 'MEDIA', 'LINK']

/** Какие collections и через какой query считать. Если нет — 0. */
const COUNT_QUERIES: Record<string, string> = {
  teams: '{ teams { id } }',
  coaches: '{ coaches { id } }',
  tournaments: '{ tournaments { id } }',
  players: '{ players { id } }',
  albums: '{ albums { id } }',
  reviews: '{ reviews { id } }',
  venues: '{ venues { id } }',
  contactInfo: '{ contactInfo { phone } }', // не массив, 0 или 1
  pageContent: '{ pageContent(slug: "home") { hero { titleLead } } }',
  hero: '{ pageContent(slug: "home") { hero { titleLead } } }', // alias
  stats: '{ pageContent(slug: "home") { stats { id } } }',
  features: '{ pageContent(slug: "home") { features { id } } }',
  programs: '{ pageContent(slug: "home") { programs { id } } }',
  trainingSteps: '{ pageContent(slug: "home") { trainingSteps { id } } }',
  albumsPhotos: '{ allPhotos { id } }',
}

/** Загрузить layouts + счётчики. */
async function load() {
  loading.value = true
  error.value = null
  try {
    layouts.value = await fetchPageLayouts()
    originalLayouts.value = JSON.stringify(layouts.value)
    await loadCounts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить дашборд'
  } finally {
    loading.value = false
  }
}

/** Загрузить счётчики параллельно (для тех, у кого есть query). */
async function loadCounts() {
  const collections = new Set<string>()
  for (const l of layouts.value) for (const s of l.sections) collections.add(s.collection)
  const out: Record<string, number> = {}
  await Promise.all([...collections].map(async (c) => {
    const q = COUNT_QUERIES[c]
    if (!q) { out[c] = 0; return }
    try {
      const data = await gqlRequest<Record<string, unknown>>(q)
      const arr = Object.values(data).find((v) => Array.isArray(v)) as Array<unknown> | undefined
      const obj = Object.values(data).find((v) => v && typeof v === 'object' && !Array.isArray(v))
      if (Array.isArray(arr)) out[c] = arr.length
      else if (obj) out[c] = Object.keys(obj).length > 0 ? 1 : 0
      else out[c] = 0
    } catch {
      out[c] = 0
    }
  }))
  counts.value = out
}

/** Есть несохранённые изменения? */
const dirty = computed(() => JSON.stringify(layouts.value) !== originalLayouts.value)

/** Суммарное число секций. */
const totalSections = computed(() =>
  layouts.value.reduce((sum, l) => sum + l.sections.length, 0))

/** Сколько видимых. */
const visibleSections = computed(() =>
  layouts.value.reduce((sum, l) => sum + l.sections.filter((s) => s.visible).length, 0))

/** Переключить видимость секции (локально, до сохранения). */
function toggleVisible(layout: PageLayout, section: PageSection) {
  section.visible = !section.visible
}

/** Клик по label — переход на страницу редактора. */
function openSection(layout: PageLayout, section: PageSection) {
  // route совпадает с путём админки (vue-router). Для / → /content.
  const target = layout.route === '/' ? '/content' : layout.route
  router.push(target)
}

/** Сбросить локальные правки к серверному снимку. */
function reset() {
  if (!originalLayouts.value) return
  layouts.value = JSON.parse(originalLayouts.value) as PageLayout[]
}

/** Сохранить ВСЕ layouts, в которых есть изменения. */
async function save() {
  saving.value = true
  saveError.value = null
  try {
    // Перенумеровать order 0..N-1 и сохранить каждую страницу, в которой
    // sections изменились относительно originalLayouts.
    const orig = JSON.parse(originalLayouts.value) as PageLayout[]
    const origByRoute = new Map(orig.map((l) => [l.route, l]))
    for (const l of layouts.value) {
      l.sections.forEach((s, i) => { s.order = i })
      const before = origByRoute.get(l.route)
      const beforeJson = JSON.stringify(before?.sections ?? [])
      const afterJson = JSON.stringify(l.sections)
      if (beforeJson === afterJson) continue
      const input: PageSectionInput[] = l.sections.map((s) => ({
        kind: s.kind,
        label: s.label,
        collection: s.collection,
        order: s.order,
        visible: s.visible,
      }))
      await updatePageLayout(l.route, input)
    }
    // После сохранения — обновим «оригинал».
    originalLayouts.value = JSON.stringify(layouts.value)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

/** Состояние «добавить секцию» — индекс страницы + draft. */
const adding = ref<{ route: string; draft: PageSectionInput } | null>(null)

function startAdd(layout: PageLayout) {
  adding.value = {
    route: layout.route,
    draft: {
      kind: 'LIST',
      label: '',
      collection: '',
      order: layout.sections.length,
      visible: true,
    },
  }
}

function commitAdd() {
  if (!adding.value) return
  const layout = layouts.value.find((l) => l.route === adding.value!.route)
  if (!layout) return
  const d = adding.value.draft
  if (!d.label.trim() || !d.collection.trim()) return
  layout.sections.push({ ...d })
  adding.value = null
}

function cancelAdd() {
  adding.value = null
}

function removeSection(layout: PageLayout, section: PageSection) {
  layout.sections = layout.sections.filter((s) => s !== section)
}

onMounted(load)
</script>

<template>
  <div class="dash">
    <PageHeader
      title="Дашборд"
      :subtitle="`${layouts.length} страниц · ${totalSections} секций (${visibleSections} видимых)`"
    >
      <template #actions>
        <button v-if="dirty" class="btn btn--ghost" :disabled="saving" @click="reset">↶ Сбросить</button>
        <button
          class="btn btn--primary"
          :disabled="!dirty || saving"
          @click="save"
        >
          {{ saving ? 'Сохранение…' : '💾 Сохранить порядок' }}
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="dash__state">Загрузка карты сайта…</div>
    <div v-else-if="error" class="dash__state dash__state--err">✗ {{ error }} <button class="btn btn--ghost" @click="load">Повторить</button></div>

    <div v-else class="dash__grid">
      <section v-for="layout in layouts" :key="layout.route" class="card">
        <header class="card__head">
          <div class="card__title">
            <span class="card__route">{{ layout.route }}</span>
            <span class="card__name">{{ layout.title }}</span>
          </div>
          <span class="card__count">{{ layout.sections.length }} секций</span>
        </header>

        <VueDraggable
          v-model="layout.sections"
          :animation="180"
          handle=".section__handle"
          class="section-list"
        >
          <div
            v-for="section in layout.sections"
            :key="`${section.kind}-${section.collection}-${section.order}`"
            class="section"
            :class="{ 'section--hidden': !section.visible }"
          >
            <span class="section__handle" title="Перетащить">⋮⋮</span>
            <span class="section__icon">{{ KIND_ICONS[section.kind] }}</span>
            <button
              type="button"
              class="section__label"
              :title="`Перейти к редактированию: ${layout.route}`"
              @click="openSection(layout, section)"
            >{{ section.label }}</button>
            <span class="section__kind">{{ section.kind }}</span>
            <span class="section__count" :title="`collection: ${section.collection}`">
              {{ counts[section.collection] ?? 0 }}
            </span>
            <button
              type="button"
              class="section__btn"
              :title="section.visible ? 'Скрыть секцию' : 'Показать секцию'"
              @click="toggleVisible(layout, section)"
            >{{ section.visible ? '👁' : '🚫' }}</button>
            <button
              type="button"
              class="section__btn section__btn--danger"
              title="Удалить секцию"
              @click="removeSection(layout, section)"
            >✕</button>
          </div>
        </VueDraggable>

        <!-- Форма добавления секции -->
        <div v-if="adding?.route === layout.route" class="add-form">
          <select v-model="adding.draft.kind" class="add-form__kind">
            <option v-for="k in ALL_KINDS" :key="k" :value="k">{{ KIND_ICONS[k] }} {{ k }}</option>
          </select>
          <input
            v-model="adding.draft.label"
            placeholder="Название (например, Видео)"
            class="add-form__label"
          />
          <input
            v-model="adding.draft.collection"
            placeholder="collection (например, videos)"
            class="add-form__collection"
          />
          <label class="add-form__visible">
            <input v-model="adding.draft.visible" type="checkbox" /> видна
          </label>
          <button class="btn btn--primary btn--sm" @click="commitAdd">+ Добавить</button>
          <button class="btn btn--ghost btn--sm" @click="cancelAdd">Отмена</button>
        </div>
        <button v-else class="card__add" @click="startAdd(layout)">+ Добавить секцию</button>
      </section>
    </div>

    <div v-if="saveError" class="dash__save-err">✗ {{ saveError }}</div>
  </div>
</template>

<style lang="scss" scoped>
.dash {
  max-width: 1200px;
}

.dash__state {
  padding: $space-5;
  color: $text-muted;
  text-align: center;
}
.dash__state--err {
  color: $brand-danger;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
}

.dash__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: $space-4;
}

.dash__save-err {
  margin-top: $space-3;
  padding: $space-2 $space-3;
  background: $brand-primary-light;
  color: $brand-danger;
  border-radius: $radius-md;
}

.card {
  background: $surface-card;
  border: 1px solid $surface-border;
  border-radius: $radius-lg;
  padding: $space-4;
  box-shadow: $shadow-sm;
}

.card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: $space-3;
  padding-bottom: $space-2;
  border-bottom: 1px dashed $surface-border;
}

.card__title {
  display: flex;
  align-items: baseline;
  gap: $space-2;
}

.card__route {
  font-family: $font-mono;
  font-size: $font-size-sm;
  color: $text-muted;
  background: $surface-bg;
  padding: 2px 6px;
  border-radius: $radius-sm;
}

.card__name {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.card__count {
  font-size: $font-size-sm;
  color: $text-muted;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  min-height: 32px;
}

.section {
  display: grid;
  grid-template-columns: 20px 24px 1fr auto 36px 28px 28px;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  background: $surface-bg;
  border: 1px solid $surface-border;
  border-radius: $radius-md;
  transition: background 0.15s, opacity 0.15s;

  &:hover {
    background: $brand-primary-light;
  }
}

.section--hidden {
  opacity: 0.5;
}

.section__handle {
  cursor: grab;
  color: $text-muted;
  text-align: center;
  user-select: none;
  font-weight: bold;
  &:active { cursor: grabbing; }
}

.section__icon {
  text-align: center;
  font-size: $font-size-lg;
}

.section__label {
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: $text-primary;
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  &:hover { color: $brand-primary; text-decoration: underline; }
}

.section__kind {
  font-family: $font-mono;
  font-size: $font-size-xs;
  color: $text-muted;
  background: $surface-card;
  padding: 1px 5px;
  border-radius: $radius-sm;
}

.section__count {
  font-family: $font-mono;
  font-size: $font-size-sm;
  color: $brand-primary;
  text-align: right;
  font-weight: $font-weight-semibold;
}

.section__btn {
  background: none;
  border: 1px solid $surface-border;
  border-radius: $radius-sm;
  padding: 2px 4px;
  cursor: pointer;
  font-size: $font-size-base;
  line-height: 1;
  &:hover { background: $brand-primary-light; }
}

.section__btn--danger {
  color: $brand-danger;
  &:hover { background: $brand-primary-light; }
}

.card__add {
  margin-top: $space-2;
  width: 100%;
  background: none;
  border: 1px dashed $surface-border;
  color: $text-muted;
  padding: $space-2;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-sm;
  &:hover { color: $brand-primary; border-color: $brand-primary; }
}

.add-form {
  margin-top: $space-2;
  display: grid;
  grid-template-columns: 90px 1fr 1fr 70px auto auto;
  gap: $space-1;
  align-items: center;
  padding: $space-2;
  background: $surface-bg;
  border-radius: $radius-md;
}
.add-form__kind,
.add-form__label,
.add-form__collection {
  font-size: $font-size-sm;
  padding: 4px 6px;
  border: 1px solid $surface-border;
  border-radius: $radius-sm;
  background: $surface-card;
}
.add-form__visible {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: $font-size-sm;
  color: $text-muted;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  padding: 6px 12px;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, color 0.15s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
.btn--primary {
  background: $brand-primary;
  color: white;
  &:hover:not(:disabled) { background: darken($brand-primary, 8%); }
}
.btn--ghost {
  background: transparent;
  color: $text-secondary;
  border-color: $surface-border;
  &:hover:not(:disabled) { background: $brand-primary-light; }
}
.btn--sm { padding: 3px 8px; font-size: $font-size-xs; }
</style>
