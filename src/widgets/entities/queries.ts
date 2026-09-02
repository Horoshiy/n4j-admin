/**
 * Общие GraphQL-запросы для админки.
 *
 * Группируются по сущности, как мутации в mutations.ts.
 */
import { gqlRequest } from '@/shared/api/gql'
import type { PageLayout } from '@/shared/types/content'

/**
 * Все страницы с секциями — для дашборда. Публичный query (без admin-токена).
 */
export async function fetchPageLayouts(): Promise<PageLayout[]> {
  const data = await gqlRequest<{ pageLayouts: PageLayout[] }>(
    `{
      pageLayouts {
        route
        title
        sections { kind label collection order visible }
      }
    }`,
  )
  return data.pageLayouts
}

/**
 * Одна страница по route, или null.
 */
export async function fetchPageLayout(route: string): Promise<PageLayout | null> {
  const data = await gqlRequest<{ pageLayout: PageLayout | null }>(
    `query L($r: String!) {
      pageLayout(route: $r) {
        route
        title
        sections { kind label collection order visible }
      }
    }`,
    { r: route },
  )
  return data.pageLayout
}
