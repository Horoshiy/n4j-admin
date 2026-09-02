/**
 * useReorder — единая логика reorder для админки.
 *
 * Принимает:
 * - items: Ref<T[]> с текущим порядком (уже отсортированы так, как хочет пользователь)
 * - mutate: (orderedIds: string[]) => Promise<string[]> — GraphQL-мутация
 * - getId: (item) => string — извлечь id
 * - onSuccess / onError — опциональные хуки
 *
 * Возвращает:
 * - save: () => Promise<void> — отправить текущий порядок на бэкенд
 * - saving: Ref<boolean>
 *
 * Использование:
 *   const { save, saving } = useReorder({
 *     items,
 *     getId: (t) => t.id,
 *     mutate: reorderTeams,
 *   })
 *   // в обработчике onReorder из ResourceTable:
 *   await save()
 */
import { ref, type Ref } from 'vue'

interface UseReorderOptions<T> {
  items: Ref<T[]>
  getId: (item: T) => string
  mutate: (orderedIds: string[]) => Promise<string[]>
  onError?: (err: unknown) => void
  onSuccess?: (newOrder: string[]) => void
}

export function useReorder<T>(opts: UseReorderOptions<T>) {
  const saving = ref(false)
  // Сохраняем предыдущий порядок для rollback
  let previousOrder: T[] = []

  async function save(): Promise<void> {
    if (saving.value) return
    saving.value = true
    previousOrder = [...opts.items.value]
    const orderedIds = opts.items.value.map(opts.getId)
    try {
      const result = await opts.mutate(orderedIds)
      opts.onSuccess?.(result)
    } catch (err) {
      // Rollback: возвращаем предыдущий порядок
      opts.items.value = previousOrder
      opts.onError?.(err)
    } finally {
      saving.value = false
    }
  }

  return { save, saving }
}
