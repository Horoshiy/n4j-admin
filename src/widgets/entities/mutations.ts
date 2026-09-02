/**
 * Общие GraphQL-мутации для админки.
 *
 * Сгруппированы по сущности. Каждая мутация — отдельная функция,
 * которая возвращает результат и нормализует ошибки через gqlRequest.
 *
 * На шаге 3.2 используются только операции, не требующие сложных
 * input-объектов: setEntityVisible и deleteLead. upsert*-формы и
 * reorder* приедут в 3.3/3.4.
 */
import { gqlRequest } from '@/shared/api/gql'

/**
 * Универсальное soft-delete (показать/скрыть).
 * Бэкенд принимает entity: 'team' | 'coach' | 'tournament' | 'player' | 'album'
 * (см. VISIBLE_ENTITIES в content-ops.ts).
 */
export async function setEntityVisible(
  entity: 'team' | 'coach' | 'tournament' | 'player' | 'album',
  id: string,
  visible: boolean,
): Promise<boolean> {
  const data = await gqlRequest<{ setEntityVisible: boolean }>(
    `mutation V($e: String!, $id: ID!, $v: Boolean!) {
      setEntityVisible(entity: $e, id: $id, visible: $v)
    }`,
    { e: entity, id, v: visible },
  )
  return data.setEntityVisible
}

/**
 * Универсальное hard-delete. Бэкенд удаляет сущность из коллекции полностью,
 * каскадно чистит ссылки (players.teamId при удалении команды, gallery.albumId при удалении альбома).
 */
export async function deleteEntity(
  entity: 'team' | 'coach' | 'tournament' | 'player' | 'album',
  id: string,
): Promise<boolean> {
  const data = await gqlRequest<{ deleteEntity: boolean }>(
    `mutation D($e: String!, $id: ID!) {
      deleteEntity(entity: $e, id: $id)
    }`,
    { e: entity, id },
  )
  return data.deleteEntity
}

// ─── Upsert мутации (create + edit) ────────────────────────────────────────

export interface TeamInput {
  id?: string | null
  name: string
  ageGroup: string
  ageLabel: string
  description: string
  playersCount: number
  color: string
  coachId: string
  schedule: Array<{ day: string; time: string; location: string }>
  visible: boolean
}

export interface CoachAchievementInput {
  title: string
  description: string
  iconKey: string
}

export interface CoachInput {
  id?: string | null
  fullName: string
  role: string
  description: string
  experienceYears: number
  specialization: string[]
  ageGroups: string[]
  avatarGradient: string
  achievements: CoachAchievementInput[]
  visible: boolean
}

export interface TournamentInput {
  id?: string | null
  name: string
  description: string
  ageGroup: string | null
  status: string
  startDate: string
  endDate: string
  location: string
  teamIds: string[]
  visible: boolean
}

export interface PlayerInput {
  id?: string | null
  fullName: string
  birthYear: number
  position: string
  number: number
  teamId: string
  photoUrl: string
  height: number
  weight: number
  visible: boolean
}

export interface AlbumInput {
  id?: string | null
  title: string
  description: string
  coverUrl: string
  date: string
  visible: boolean
}

export async function upsertTeam(input: TeamInput): Promise<{ id: string; name: string }> {
  const data = await gqlRequest<{ upsertTeam: { id: string; name: string } }>(
    `mutation U($i: TeamInput!) { upsertTeam(input: $i) { id name } }`,
    { i: input },
  )
  return data.upsertTeam
}

export async function upsertCoach(input: CoachInput): Promise<{ id: string; fullName: string }> {
  const data = await gqlRequest<{ upsertCoach: { id: string; fullName: string } }>(
    `mutation U($i: CoachInput!) { upsertCoach(input: $i) { id fullName } }`,
    { i: input },
  )
  return data.upsertCoach
}

export async function upsertTournament(input: TournamentInput): Promise<{ id: string; name: string }> {
  const data = await gqlRequest<{ upsertTournament: { id: string; name: string } }>(
    `mutation U($i: TournamentInput!) { upsertTournament(input: $i) { id name } }`,
    { i: input },
  )
  return data.upsertTournament
}

export async function upsertPlayer(input: PlayerInput): Promise<{ id: string; fullName: string }> {
  const data = await gqlRequest<{ upsertPlayer: { id: string; fullName: string } }>(
    `mutation U($i: PlayerInput!) { upsertPlayer(input: $i) { id fullName } }`,
    { i: input },
  )
  return data.upsertPlayer
}

export async function upsertAlbum(input: AlbumInput): Promise<{ id: string; title: string }> {
  const data = await gqlRequest<{ upsertAlbum: { id: string; title: string } }>(
    `mutation U($i: AlbumInput!) { upsertAlbum(input: $i) { id title } }`,
    { i: input },
  )
  return data.upsertAlbum
}

/**
 * Reorder-мутации. Бэкенд переставляет элементы в указанном порядке
 * (orderedIds — массив id в новом порядке) и возвращает массив id
 * в новом порядке (для подтверждения).
 *
 * Шаг 3.3 — drag-and-drop в админке: после drop фронт отправляет
 * новый порядок id и, при ошибке, делает rollback к предыдущему.
 */
export async function reorderTeams(orderedIds: string[]): Promise<string[]> {
  const data = await gqlRequest<{ reorderTeams: string[] }>(
    `mutation R($ids: [ID!]!) { reorderTeams(orderedIds: $ids) }`,
    { ids: orderedIds },
  )
  return data.reorderTeams
}

export async function reorderCoaches(orderedIds: string[]): Promise<string[]> {
  const data = await gqlRequest<{ reorderCoaches: string[] }>(
    `mutation R($ids: [ID!]!) { reorderCoaches(orderedIds: $ids) }`,
    { ids: orderedIds },
  )
  return data.reorderCoaches
}

export async function reorderTournaments(orderedIds: string[]): Promise<string[]> {
  const data = await gqlRequest<{ reorderTournaments: string[] }>(
    `mutation R($ids: [ID!]!) { reorderTournaments(orderedIds: $ids) }`,
    { ids: orderedIds },
  )
  return data.reorderTournaments
}

export async function reorderAlbums(orderedIds: string[]): Promise<string[]> {
  const data = await gqlRequest<{ reorderAlbums: string[] }>(
    `mutation R($ids: [ID!]!) { reorderAlbums(orderedIds: $ids) }`,
    { ids: orderedIds },
  )
  return data.reorderAlbums
}

export async function reorderPlayers(orderedIds: string[]): Promise<string[]> {
  const data = await gqlRequest<{ reorderPlayers: string[] }>(
    `mutation R($ids: [ID!]!) { reorderPlayers(orderedIds: $ids) }`,
    { ids: orderedIds },
  )
  return data.reorderPlayers
}

/**
 * Hard-delete заявки (lead).
 */
export async function deleteLead(id: string): Promise<boolean> {
  const data = await gqlRequest<{ deleteLead: boolean }>(
    `mutation D($id: ID!) { deleteLead(id: $id) }`,
    { id },
  )
  return data.deleteLead
}

/**
 * Модерация отзыва: одобрить/скрыть.
 */
export async function setReviewVisible(id: string, visible: boolean): Promise<void> {
  await gqlRequest<{ setReviewVisible: { id: string; visible: boolean } }>(
    `mutation V($id: ID!, $v: Boolean!) {
      setReviewVisible(id: $id, visible: $v) { id visible }
    }`,
    { id, v: visible },
  )
}

/**
 * Hard-delete отзыва.
 */
export async function deleteReview(id: string): Promise<boolean> {
  const data = await gqlRequest<{ deleteReview: boolean }>(
    `mutation D($id: ID!) { deleteReview(id: $id) }`,
    { id },
  )
  return data.deleteReview
}

// ─── PageContent, ContactInfo, Venues (шаг 3.4) ──────────────────────────

import type {
  PageContent,
  ContactInfo,
  Venue,
} from '@/shared/types/content'

/** Reorder внутри PageContent (stats/features/programs/trainingSteps). */
export async function reorderPageGroup(
  slug: string,
  group: 'stats' | 'features' | 'programs' | 'trainingSteps',
  orderedIds: string[],
): Promise<boolean> {
  const data = await gqlRequest<{ reorderPageGroup: boolean }>(
    `mutation R($slug: String!, $group: String!, $ids: [ID!]!) {
      reorderPageGroup(slug: $slug, group: $group, orderedIds: $ids)
    }`,
    { slug, group, ids: orderedIds },
  )
  return data.reorderPageGroup
}

/** Сохранить изменения PageContent (все поля опциональны — partial update). */
export async function updatePageContent(
  slug: string,
  input: Partial<PageContent>,
): Promise<PageContent> {
  const data = await gqlRequest<{ updatePageContent: PageContent }>(
    `mutation U($slug: String!, $input: PageContentInput!) {
      updatePageContent(slug: $slug, input: $input) {
        hero { eyebrow titleLead titleAccent description ctaPrimary ctaSecondary }
        stats { id value label }
        features { id iconKey title description }
        programs { id ageLabel title description ageGroup }
        trainingSteps { id title description iconKey }
      }
    }`,
    { slug, input },
  )
  return data.updatePageContent
}

/** Сохранить контактную информацию. */
export async function updateContactInfo(
  input: Omit<ContactInfo, 'phoneFormatted'> & { phoneFormatted: string },
): Promise<ContactInfo> {
  const data = await gqlRequest<{ updateContactInfo: ContactInfo }>(
    `mutation U($input: ContactInfoInput!) {
      updateContactInfo(input: $input) {
        phone phoneFormatted whatsapp telegram email legalAddress address workingHours inn
        socials { vk youtube instagram telegram max }
      }
    }`,
    { input },
  )
  return data.updateContactInfo
}

/** Заменить список площадок целиком (порядок важен). */
export async function updateVenues(venues: Venue[]): Promise<Venue[]> {
  const data = await gqlRequest<{ updateVenues: Venue[] }>(
    `mutation U($input: [VenueInput!]!) {
      updateVenues(input: $input) {
        id name address shortAddress workingHours
      }
    }`,
    { input: venues },
  )
  return data.updateVenues
}

// ─── Дашборд: перестановка секций страницы ─────────────────────────────────

import type { PageSection, PageLayout } from '@/shared/types/content'

export interface PageSectionInput {
  kind: PageSection['kind']
  label: string
  collection: string
  order: number
  visible: boolean
}

/** Сохранить новый порядок/состав секций на странице. */
export async function updatePageLayout(
  route: string,
  sections: PageSectionInput[],
): Promise<PageLayout> {
  const data = await gqlRequest<{ updatePageLayout: PageLayout }>(
    `mutation updatePageLayout($r: String!, $s: [PageSectionInput!]!) {
      updatePageLayout(route: $r, sections: $s) {
        route
        title
        sections { kind label collection order visible }
      }
    }`,
    { r: route, s: sections },
  )
  return data.updatePageLayout
}
