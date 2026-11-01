/**
 * Конфиг приложения — единственное место, читающее import.meta.env.
 * Если нужно добавить env-переменную — только здесь.
 */

// Статика и API живут на одном домене (прод — dst.dinamchiki.ru, бета —
// n4j.dinamchiki.ru), поэтому относительный путь /api/graphql (веб-сервер
// пересылает его в /query бэкенда). В dev — Vite проксирует его на бету
// через server.proxy (см. vite.config.ts).
// graphql-request требует абсолютный URL, поэтому в dev склеиваем с window.location.origin,
// в проде используем абсолютный путь относительно origin (window.location.origin + VITE_API_URL).
const _base = (import.meta.env.VITE_API_URL as string) || '/api/graphql'
export const API_URL: string =
  _base.startsWith('http') ? _base : (typeof window !== 'undefined' ? window.location.origin : '') + _base
export const IS_DEV: boolean = import.meta.env.DEV
export const APP_NAME = 'DFC Динамчики — Админка'
