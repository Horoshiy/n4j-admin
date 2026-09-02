/**
 * Pinia auth-store.
 *
 * - token и expiresAt хранятся в localStorage, чтобы переживать F5.
 * - При mount проверяется expiresAt — если истёк, делаем auto-logout.
 * - login() делает GraphQL-запрос adminLogin; on success — пишем в store + storage.
 * - logout() чистит store + storage.
 *
 * Не держим секретов (пароль) в сторе — ввод пользователя → одноразовый запрос.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gqlRequest, AppError } from '@/shared/api/gql'

const STORAGE_KEY = 'n4j-admin-auth'

interface StoredAuth {
  token: string
  expiresAt: string // ISO
}

function loadFromStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuth
    if (!parsed.token || !parsed.expiresAt) return null
    // Сразу проверим срок — если истёк, не восстанавливаем.
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveToStorage(data: StoredAuth | null): void {
  if (data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const useAuthStore = defineStore('auth', () => {
  const initial = loadFromStorage()
  const token = ref<string | null>(initial?.token ?? null)
  const expiresAt = ref<Date | null>(initial ? new Date(initial.expiresAt) : null)
  const loading = ref(false)
  const lastError = ref<string | null>(null)

  const isAuthenticated = computed(() => {
    if (!token.value || !expiresAt.value) return false
    return expiresAt.value.getTime() > Date.now()
  })

  async function login(password: string): Promise<void> {
    loading.value = true
    lastError.value = null
    try {
      const data = await gqlRequest<{
        adminLogin: { token: string; expiresAt: string }
      }>(
        `mutation Login($p: String!) {
          adminLogin(input: { password: $p }) { token expiresAt }
        }`,
        { p: password },
      )
      token.value = data.adminLogin.token
      expiresAt.value = new Date(data.adminLogin.expiresAt)
      saveToStorage({ token: token.value, expiresAt: data.adminLogin.expiresAt })
    } catch (e) {
      const msg =
        e instanceof AppError
          ? e.message
          : 'Не удалось войти. Проверьте пароль и соединение.'
      lastError.value = msg
      throw e
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    token.value = null
    expiresAt.value = null
    saveToStorage(null)
  }

  return {
    token,
    expiresAt,
    loading,
    lastError,
    isAuthenticated,
    login,
    logout,
  }
})
