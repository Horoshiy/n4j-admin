/**
 * useCrud — общая CRUD-логика для админ-страниц.
 *
 * Возвращает state и методы для создания, редактирования, soft-delete
 * и hard-delete сущности. Используется в pages Teams/Coaches/Tournaments/Players/Albums.
 *
 * Каждая страница передаёт:
 * - entity: какой тип ('team' | 'coach' | ...)
 * - onRefresh: () => Promise<void> — перезагрузить список после мутации
 * - onUpsert: (form) => Promise<void> — отправить create/edit (специфичный upsert*)
 *
 * Composables возвращает:
 * - dialog: ref<{ open, mode: 'create' | 'edit' }> — управление модалкой
 * - openCreate(): void — открыть пустую форму
 * - openEdit(item): void — открыть форму, заполненную item
 * - softDelete(item): Promise<void> — setEntityVisible(false) с подтверждением
 * - hardDelete(item): Promise<void> — deleteEntity с подтверждением
 *
 * Подтверждение делается через ConfirmDialog: запрос к пользователю
 * возвращается в `pendingAction: ref<{kind: 'soft'|'hard', item: T} | null>`,
 * UI слушает и вызывает ConfirmDialog.
 */
import { ref, computed, type Ref } from 'vue'
import { setEntityVisible, deleteEntity } from '@/widgets/entities/mutations'

export type CrudEntityKind = 'team' | 'coach' | 'tournament' | 'player' | 'album'

export interface CrudItem {
  id: string
  visible?: boolean
}

export interface UseCrudOptions<T extends CrudItem> {
  entity: CrudEntityKind
  /** Что вызывать после успешной мутации (для перезагрузки списка). */
  onRefresh: () => Promise<void> | void
  /** Человеко-читаемые имена для подтверждений. */
  labels?: { singular?: string; plural?: string }
}

export interface DialogState {
  open: boolean
  mode: 'create' | 'edit' | null
  item: CrudItem | null
}

export function useCrud<T extends CrudItem>(opts: UseCrudOptions<T>) {
  const dialog = ref<DialogState>({ open: false, mode: null, item: null }) as Ref<DialogState>
  const saving = ref(false)
  const error = ref<string | null>(null)

  const pendingAction = ref<{ kind: 'soft' | 'hard'; item: T } | null>(null)
  const confirmOpen = computed(() => pendingAction.value !== null)

  const singular = computed(() => opts.labels?.singular ?? opts.entity)
  const plural = computed(() => opts.labels?.plural ?? opts.entity)

  function openCreate(): void {
    dialog.value = { open: true, mode: 'create', item: null }
    error.value = null
  }

  function openEdit(item: T): void {
    dialog.value = { open: true, mode: 'edit', item: { ...item } }
    error.value = null
  }

  function closeDialog(): void {
    if (saving.value) return
    dialog.value = { open: false, mode: null, item: null }
    error.value = null
  }

  function askSoftDelete(item: T): void {
    pendingAction.value = { kind: 'soft', item }
  }

  function askHardDelete(item: T): void {
    pendingAction.value = { kind: 'hard', item }
  }

  function cancelAction(): void {
    pendingAction.value = null
  }

  async function confirmAction(): Promise<void> {
    const action = pendingAction.value
    if (!action) return
    pendingAction.value = null
    if (action.kind === 'soft') {
      try {
        await setEntityVisible(opts.entity, action.item.id, false)
        await opts.onRefresh()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Не удалось скрыть'
      }
    } else {
      try {
        await deleteEntity(opts.entity, action.item.id)
        await opts.onRefresh()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Не удалось удалить'
      }
    }
  }

  function setError(msg: string | null): void {
    error.value = msg
  }

  return {
    dialog,
    saving,
    error,
    pendingAction,
    confirmOpen,
    singular,
    plural,
    openCreate,
    openEdit,
    closeDialog,
    askSoftDelete,
    askHardDelete,
    cancelAction,
    confirmAction,
    setError,
  }
}
