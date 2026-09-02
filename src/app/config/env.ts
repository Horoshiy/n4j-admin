/**
 * Конфиг приложения — единственное место, читающее import.meta.env.
 * Если нужно добавить env-переменную — только здесь.
 */

// В проде статика и /query живут на одном домене (n4j.dinamchiki.ru),
// поэтому относительный путь /query. В dev — Vite проксирует /query на
// локальный GQL-бэкенд через server.proxy (см. vite.config.ts).
// graphql-request требует абсолютный URL, поэтому в dev склеиваем с window.location.origin,
// в проде используем абсолютный путь относительно origin (window.location.origin + VITE_API_URL).
const _base = (import.meta.env.VITE_API_URL as string) || '/query'
export const API_URL: string =
  _base.startsWith('http') ? _base : (typeof window !== 'undefined' ? window.location.origin : '') + _base
export const IS_DEV: boolean = import.meta.env.DEV
export const APP_NAME = 'DFC Динамчики — Админка'
