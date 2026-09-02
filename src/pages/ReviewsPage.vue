<script setup lang="ts">
/**
 * ReviewsPage — модерация отзывов.
 *
 * Две вкладки:
 *  - Опубликованные (visible=true)
 *  - На модерации / скрытые (visible=false)
 *
 * Действия: одобрить / скрыть / удалить.
 */
import { computed, ref } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import {
  setReviewVisible,
  deleteReview as deleteReviewApi,
} from '@/widgets/entities/mutations'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'

interface Review {
  id: string
  text: string
  authorName: string
  authorRelation: string
  initials: string
  rating: number | null
  visible: boolean
  createdAt: string
}

const tab = ref<'published' | 'pending'>('pending')

const { items, loading, error, refetch } = useList<Review>(
  'reviewsAdmin',
  async () => {
    const data = await gqlRequest<{ reviewsAdmin: Review[] }>(`
      {
        reviewsAdmin {
          id text authorName authorRelation initials rating visible createdAt
        }
      }
    `)
    return data.reviewsAdmin
  },
)

const filtered = computed(() =>
  items.value.filter((r) => (tab.value === 'published' ? r.visible : !r.visible)),
)

const counts = computed(() => ({
  published: items.value.filter((r) => r.visible).length,
  pending: items.value.filter((r) => !r.visible).length,
}))

const confirming = ref<
  | null
  | { type: 'hide' | 'approve' | 'delete'; review: Review }
>(null)
const flash = ref<string | null>(null)

function askApprove(r: Review): void {
  confirming.value = { type: 'approve', review: r }
}
function askHide(r: Review): void {
  confirming.value = { type: 'hide', review: r }
}
function askDelete(r: Review): void {
  confirming.value = { type: 'delete', review: r }
}

async function confirm(): Promise<void> {
  if (!confirming.value) return
  const { type, review } = confirming.value
  confirming.value = null
  try {
    if (type === 'delete') {
      await deleteReviewApi(review.id)
      flash.value = `Отзыв от ${review.authorName} удалён`
    } else {
      const visible = type === 'approve'
      await setReviewVisible(review.id, visible)
      flash.value = `${review.authorName}: ${visible ? 'одобрен' : 'скрыт'}`
    }
    await refetch()
  } catch (e) {
    flash.value = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
  }
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const columns = [
  { key: 'authorName', label: 'Автор' },
  { key: 'rating', label: 'Оценка', render: (r: Review) => r.rating ? '★'.repeat(r.rating) : '—' },
  { key: 'text', label: 'Текст', render: (r: Review) => r.text.slice(0, 80) + (r.text.length > 80 ? '…' : '') },
  { key: 'createdAt', label: 'Дата', render: fmtDate },
]

const dialogConfig = computed(() => {
  if (!confirming.value) return null
  const { type, review } = confirming.value
  switch (type) {
    case 'approve':
      return { title: 'Одобрить отзыв?', message: `«${review.authorName}» будет виден на сайте.`, confirmLabel: 'Одобрить', variant: 'default' as const }
    case 'hide':
      return { title: 'Скрыть отзыв?', message: `«${review.authorName}» будет скрыт с публичной части.`, confirmLabel: 'Скрыть', variant: 'danger' as const }
    case 'delete':
      return { title: 'Удалить отзыв?', message: `Отзыв от «${review.authorName}» будет удалён безвозвратно.`, confirmLabel: 'Удалить', variant: 'danger' as const }
  }
})
</script>

<template>
  <div>
    <PageHeader
      title="Отзывы"
      subtitle="Модерация: одобрить, скрыть или удалить отзыв."
    >
      <template #actions>
        <button class="btn btn--secondary" @click="refetch">↻ Обновить</button>
      </template>
    </PageHeader>

    <div class="tabs">
      <button
        :class="['tab', { 'tab--active': tab === 'pending' }]"
        @click="tab = 'pending'"
      >
        На модерации <span class="tab__count">{{ counts.pending }}</span>
      </button>
      <button
        :class="['tab', { 'tab--active': tab === 'published' }]"
        @click="tab = 'published'"
      >
        Опубликованные <span class="tab__count">{{ counts.published }}</span>
      </button>
    </div>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="flash" class="alert alert--ok">{{ flash }}</div>

    <ResourceTable
      :items="filtered"
      :columns="columns"
      :loading="loading"
      empty-title="Нет отзывов в этой вкладке"
    >
      <template #row-actions="{ item }">
        <template v-if="!(item as Review).visible">
          <button class="btn btn--sm btn--success" @click="askApprove(item as Review)">Одобрить</button>
          <button class="btn btn--sm btn--danger" @click="askDelete(item as Review)">Удалить</button>
        </template>
        <template v-else>
          <button class="btn btn--sm btn--warning" @click="askHide(item as Review)">Скрыть</button>
          <button class="btn btn--sm btn--danger" @click="askDelete(item as Review)">Удалить</button>
        </template>
      </template>
    </ResourceTable>

    <ConfirmDialog
      v-if="dialogConfig"
      :open="confirming !== null"
      :title="dialogConfig.title"
      :message="dialogConfig.message"
      :confirm-label="dialogConfig.confirmLabel"
      :variant="dialogConfig.variant"
      @confirm="confirm"
      @cancel="confirming = null"
    />
  </div>
</template>

<style lang="scss" scoped>
.tabs {
  display: flex;
  gap: $space-1;
  margin-bottom: $space-3;
  border-bottom: 1px solid $surface-border;
}
.tab {
  padding: $space-2 $space-3;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: $text-secondary;
  font-size: $font-size-sm;
  cursor: pointer;
  margin-bottom: -1px;
  &:hover { color: $text-primary; }
  &--active {
    color: $brand-primary;
    border-bottom-color: $brand-primary;
    font-weight: $font-weight-medium;
  }
}
.tab__count {
  display: inline-block;
  padding: 0 $space-1;
  margin-left: $space-1;
  background: $surface-bg;
  border-radius: 999px;
  font-size: $font-size-xs;
  color: $text-muted;
}
.btn {
  padding: $space-1 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
  background: $surface-card; color: $text-primary; font-size: $font-size-sm; cursor: pointer;
  margin-left: $space-1;
  &--sm { padding: 2px $space-2; font-size: $font-size-xs; }
  &--secondary { background: $brand-primary-light; color: $brand-primary; border-color: transparent;
    &:hover { background: $brand-primary; color: $text-on-brand; } }
  &--warning { color: $brand-warning; border-color: $brand-warning; &:hover { background: rgba(217,119,6,.1); } }
  &--success { color: $brand-success; border-color: $brand-success; &:hover { background: rgba(22,163,74,.1); } }
  &--danger { color: $brand-danger; border-color: $brand-danger; &:hover { background: rgba(220,38,38,.1); } }
}
.alert { padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3; font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; } }
</style>
