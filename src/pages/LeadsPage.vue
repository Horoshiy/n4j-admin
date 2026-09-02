<script setup lang="ts">
/**
 * LeadsPage — список заявок с сайта + hard delete.
 *
 * Только для админки. Заявка = потенциальный клиент, удалять осторожно.
 */
import { ref } from 'vue'
import { useList, gqlRequest } from '@/shared/composables/useResource'
import { deleteLead } from '@/widgets/entities/mutations'
import PageHeader from '@/shared/ui/PageHeader.vue'
import ResourceTable from '@/shared/ui/ResourceTable.vue'
import ConfirmDialog from '@/shared/ui/ConfirmDialog.vue'

interface Lead {
  id: string
  childName: string
  childAge: string
  parentName: string
  phone: string
  email: string | null
  preferredTime: string | null
  message: string | null
  ageGroup: string | null
  createdAt: string
}

const { items, loading, error, refetch } = useList<Lead>(
  'leadsAdmin',
  async () => {
    const data = await gqlRequest<{ leadsAdmin: Lead[] }>(`
      {
        leadsAdmin {
          id childName childAge parentName phone email preferredTime message ageGroup createdAt
        }
      }
    `)
    return data.leadsAdmin
  },
)

const confirming = ref<Lead | null>(null)
const flash = ref<string | null>(null)

function askDelete(l: Lead): void {
  confirming.value = l
}

async function confirmDelete(): Promise<void> {
  if (!confirming.value) return
  const lead = confirming.value
  confirming.value = null
  try {
    await deleteLead(lead.id)
    flash.value = `Заявка от ${lead.parentName} удалена`
    await refetch()
  } catch (e) {
    flash.value = `Ошибка: ${e instanceof Error ? e.message : String(e)}`
  }
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const columns = [
  { key: 'parentName', label: 'Родитель' },
  { key: 'phone', label: 'Телефон' },
  { key: 'childName', label: 'Ребёнок' },
  { key: 'childAge', label: 'Возраст' },
  { key: 'message', label: 'Сообщение', render: (l: Lead) => l.message?.slice(0, 60) ?? '—' },
  { key: 'createdAt', label: 'Дата', render: fmtDate },
]
</script>

<template>
  <div>
    <PageHeader
      title="Заявки с сайта"
      :subtitle="`Всего: ${items.length}`"
    >
      <template #actions>
        <button class="btn btn--secondary" @click="refetch">↻ Обновить</button>
      </template>
    </PageHeader>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="flash" class="alert alert--ok">{{ flash }}</div>

    <ResourceTable
      :items="items"
      :columns="columns"
      :loading="loading"
      empty-title="Нет заявок"
    >
      <template #row-actions="{ item }">
        <button class="btn btn--sm btn--danger" @click="askDelete(item as Lead)">
          Удалить
        </button>
      </template>
    </ResourceTable>

    <ConfirmDialog
      :open="confirming !== null"
      title="Удалить заявку?"
      :message="
        confirming
          ? `Заявка от ${confirming.parentName} (${confirming.phone}) будет удалена безвозвратно.`
          : ''
      "
      confirm-label="Удалить"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="confirming = null"
    />
  </div>
</template>

<style lang="scss" scoped>
.btn { padding: $space-1 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
  background: $surface-card; color: $text-primary; font-size: $font-size-sm; cursor: pointer;
  &--sm { padding: 2px $space-2; font-size: $font-size-xs; }
  &--secondary { background: $brand-primary-light; color: $brand-primary; border-color: transparent;
    &:hover { background: $brand-primary; color: $text-on-brand; } }
  &--danger { color: $brand-danger; border-color: $brand-danger; &:hover { background: rgba(220,38,38,.1); } } }
.alert { padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3; font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; } }
</style>
