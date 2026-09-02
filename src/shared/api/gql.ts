/**
 * Минимальный GraphQL-клиент на fetch.
 *
 * Почему не graphql-request:
 * - Yoga присылает set-cookie при adminLogin (HttpOnly, SameSite=Lax).
 *   graphql-request выбрасывает cookies, токен остаётся только в браузерном
 *   cookie store, а не в JS. Это значит adminLogin возвращает JSON без
 *   токена в {data} при работе через graphql-request (на самом деле
 *   токен там есть, но библиотека падает на парсинге SSE).
 * - Cookies нам НУЖНЫ: при F5 token в localStorage восстанавливается,
 *   но Yoga всё равно отдаёт set-cookie → на dev это мешает, на проде
 *   может путать auth-flow.
 *
 * Решение: тонкая обёртка над fetch с credentials: 'include' и явным JSON.
 * - credentials: 'include' → cookies сохраняются и пересылаются.
 * - Content-Type/Accept: application/json → Yoga отдаёт чистый JSON.
 * - Если ответ пришёл с errors[] и пустым data → бросаем AppError.
 */
import { API_URL } from '@/app/config/env'
import { useAuthStore } from '@/features/auth/store'

export async function gqlRequest<T = unknown>(
  document: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const auth = useAuthStore()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (auth.token) {
    headers['X-Admin-Token'] = auth.token
  }
  if (import.meta.env.DEV) {
    console.debug('[gql] →', API_URL, 'token:', auth.token ? 'yes' : 'no')
  }
  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ query: document, variables }),
      signal,
    })
  } catch (e) {
    if (import.meta.env.DEV) console.debug('[gql] ← network ERROR', e)
    throw new AppError(
      'Не удалось связаться с сервером. Проверьте интернет.',
    )
  }
  let body: { data?: T; errors?: Array<{ message: string; extensions?: Record<string, unknown> }> }
  try {
    body = (await response.json()) as typeof body
  } catch {
    throw new AppError(`Сервер вернул не-JSON (HTTP ${response.status})`)
  }
  if (!response.ok) {
    if (import.meta.env.DEV) console.debug('[gql] ← HTTP', response.status, body)
    throw new AppError(
      body?.errors?.[0]?.message ?? `HTTP ${response.status}`,
      { statusCode: response.status, gqlErrors: body?.errors },
    )
  }
  if (body.errors?.length) {
    if (import.meta.env.DEV) console.debug('[gql] ← GraphQL errors', body.errors)
    throw new AppError(body.errors[0].message, {
      statusCode: response.status,
      gqlErrors: body.errors,
    })
  }
  if (body.data === undefined || body.data === null) {
    throw new AppError('Сервер вернул пустой ответ')
  }
  if (import.meta.env.DEV) {
    console.debug('[gql] ← ok', document.slice(0, 60))
  }
  return body.data
}

/**
 * Нормализованная ошибка. Поля: человеческое сообщение, HTTP-статус,
 * массив GraphQL errors (если есть).
 */
export class AppError extends Error {
  statusCode: number | null = null
  gqlErrors: Array<{ message: string; extensions?: Record<string, unknown> }> = []

  constructor(
    message: string,
    options: {
      statusCode?: number | null
      gqlErrors?: Array<{ message: string; extensions?: Record<string, unknown> }>
    } = {},
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = options.statusCode ?? null
    this.gqlErrors = options.gqlErrors ?? []
  }
}
