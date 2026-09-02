<script setup lang="ts">
/**
 * ContactPage — форма редактирования контактной информации клуба.
 *
 * Шаг 3.4: убрал telegramChannel/rutube (нет в GraphQL Socials),
 * использую updateContactInfo из widgets/entities/mutations.
 */
import { ref, onMounted } from 'vue'
import { gqlRequest } from '@/shared/api/gql'
import { updateContactInfo } from '@/widgets/entities/mutations'
import PageHeader from '@/shared/ui/PageHeader.vue'
import type { ContactInfo } from '@/shared/types/content'

const form = ref<ContactInfo | null>(null)
// address/workingHours — часть ContactInfo, можно редактировать через v-model="form.address"
const loading = ref(false)
const saving = ref(false)
const flash = ref<string | null>(null)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  try {
    const data = await gqlRequest<{ contactInfo: ContactInfo }>(`
      {
        contactInfo {
          phone phoneFormatted whatsapp telegram email legalAddress address workingHours inn
          socials { vk youtube }
        }
      }
    `)
    form.value = JSON.parse(JSON.stringify(data.contactInfo))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!form.value) return
  saving.value = true
  flash.value = null
  error.value = null
  try {
    const updated = await updateContactInfo({
      ...form.value,
      // address/workingHours теперь часть ContactInfo, передаём как nullable strings
      address: form.value.address ?? '',
      workingHours: form.value.workingHours ?? '',
    })
    form.value = JSON.parse(JSON.stringify(updated))
    flash.value = 'Контакты сохранены'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      title="Контакты"
      subtitle="Телефоны, email, юридические данные и соцсети клуба."
    >
      <template #actions>
        <button class="btn btn--secondary" :disabled="loading" @click="load">↻ Обновить</button>
        <button class="btn btn--primary" :disabled="saving || !form" @click="save">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="flash" class="alert alert--ok">{{ flash }}</div>

    <div v-if="loading && !form" class="loading">Загрузка…</div>

    <form v-else-if="form" class="form" @submit.prevent="save">
      <fieldset class="form__group">
        <legend>Основное</legend>
        <div class="form__row">
          <label>Телефон<input v-model="form.phone" type="tel" /></label>
          <label>Форматированный<input v-model="form.phoneFormatted" type="text" placeholder="+7 (___) ___-__-__" /></label>
          <label>WhatsApp<input v-model="form.whatsapp" type="tel" /></label>
          <label>Telegram<input v-model="form.telegram" type="text" /></label>
        </div>
        <div class="form__row">
          <label>Email<input v-model="form.email" type="email" /></label>
          <label>ИНН<input v-model="form.inn" type="text" /></label>
        </div>
        <label>Юридический адрес<textarea v-model="form.legalAddress" rows="2" /></label>
        <label>Адрес (для шапки сайта)<input v-model="form.address" type="text" placeholder="г. Ставрополь, ул. ..." /></label>
        <label>Часы работы<input v-model="form.workingHours" type="text" placeholder="10:00 — 22:00" /></label>
      </fieldset>

      <fieldset class="form__group">
        <legend>Соцсети</legend>
        <div class="form__row">
          <label>VK<input v-model="form.socials.vk" type="url" placeholder="https://vk.com/..." /></label>
          <label>YouTube<input v-model="form.socials.youtube" type="url" placeholder="https://youtube.com/..." /></label>
        </div>
      </fieldset>

      <div class="form__footer">
        <button class="btn btn--primary" type="submit" :disabled="saving">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.btn {
  padding: $space-1 $space-3;
  border: 1px solid $surface-border;
  border-radius: $radius-md;
  background: $surface-card;
  color: $text-primary;
  font-size: $font-size-sm;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &--secondary {
    background: $brand-primary-light; color: $brand-primary; border-color: transparent;
    &:hover:not(:disabled) { background: $brand-primary; color: $text-on-brand; }
  }
  &--primary {
    background: $brand-primary; color: $text-on-brand; border-color: $brand-primary;
    &:hover:not(:disabled) { background: $brand-primary-dark; }
  }
}
.loading { padding: $space-5; text-align: center; color: $text-muted; }
.alert {
  padding: $space-2 $space-3; border-radius: $radius-md; margin-bottom: $space-3;
  font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
  &--ok { background: rgba(22,163,74,.08); color: $brand-success; }
}
.form {
  background: $surface-card; border: 1px solid $surface-border; border-radius: $radius-lg;
  padding: $space-5; box-shadow: $shadow-sm;
}
.form__group {
  border: none; padding: 0; margin: 0 0 $space-5;
  legend {
    font-size: $font-size-md; font-weight: $font-weight-semibold;
    margin-bottom: $space-3; color: $text-primary;
  }
  label {
    display: flex; flex-direction: column; gap: 4px;
    font-size: $font-size-sm; color: $text-secondary;
    margin-bottom: $space-2;
  }
  input, textarea {
    padding: $space-2 $space-3; border: 1px solid $surface-border; border-radius: $radius-md;
    font-size: $font-size-sm; font-family: inherit;
    &:focus { outline: none; border-color: $brand-primary; box-shadow: 0 0 0 3px rgba(30,111,217,.15); }
  }
}
.form__row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: $space-3; margin-bottom: $space-2;
}
.form__footer {
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $surface-border;
  display: flex; justify-content: flex-end;
}
</style>
