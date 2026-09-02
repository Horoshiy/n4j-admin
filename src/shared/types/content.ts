/**
 * Типы контента для админки (PageContent, ContactInfo, Venue).
 * Соответствуют GraphQL-схеме в /home/clawd/dinamchiki-gql/src/schema.graphql.
 */

export type PageSectionKind =
  | 'HERO' | 'LIST' | 'GALLERY' | 'CONTACT' | 'TEXT' | 'MEDIA' | 'LINK'

export interface PageSection {
  kind: PageSectionKind
  label: string
  collection: string
  order: number
  visible: boolean
}

export interface PageLayout {
  route: string
  title: string
  sections: PageSection[]
}

export interface HeroContent {
  eyebrow: string
  titleLead: string
  titleAccent: string
  description: string
  ctaPrimary: string | null
  ctaSecondary: string | null
}

export interface StatItem {
  id: string
  value: string
  label: string
}

export interface FeatureItem {
  id: string
  iconKey: string
  title: string
  description: string
}

export interface AgeProgram {
  id: string
  ageLabel: string
  title: string
  description: string
  ageGroup: string
}

export interface TrainingStep {
  id: string
  title: string
  description: string
  iconKey: string
}

export interface PageContent {
  hero: HeroContent
  stats: StatItem[]
  features: FeatureItem[]
  programs: AgeProgram[]
  trainingSteps: TrainingStep[]
}

export interface Socials {
  vk: string | null
  youtube: string | null
  instagram: string | null
  telegram: string | null
  max: string | null
}

export interface ContactInfo {
  phone: string
  phoneFormatted: string
  whatsapp: string
  telegram: string
  email: string
  legalAddress: string
  address: string | null
  workingHours: string | null
  inn: string | null
  socials: Socials
}

export interface Venue {
  id: string
  name: string
  address: string
  shortAddress: string
  workingHours: string
}
