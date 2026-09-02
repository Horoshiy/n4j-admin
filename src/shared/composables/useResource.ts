/**
 * useList — единый composable для list+loading+error+refetch.
 *
 * Использование:
 *   const { items, loading, error, refetch } = useList<Team>(
 *     'teams',
 *     () => gqlRequest<{ teams: Team[] }>('{ teams { id name visible } }').then(d => d.teams),
 *   )
 *
 * - items: Ref<T[]> (не null, начинается с [])
 * - loading/error/refetch — стандартный набор
 * - auto-load при mount
 * - refetch() дёргается после мутаций
 */
import { ref, onMounted, type Ref } from 'vue'
import { gqlRequest, AppError } from '@/shared/api/gql'

export interface ListState<T> {
  items: Ref<T[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  refetch: () => Promise<void>
}

export function useList<T>(
  // Описание ресурса — только для логов/devtools.
  _description: string,
  fetcher: () => Promise<T[]>,
): ListState<T> {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await fetcher()
    } catch (e) {
      error.value = e instanceof AppError ? e.message : 'Не удалось загрузить'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  return {
    items,
    loading,
    error,
    refetch: load,
  }
}

export { gqlRequest, AppError } from '@/shared/api/gql'
