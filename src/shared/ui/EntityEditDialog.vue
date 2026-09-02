<script setup lang="ts">
/**
 * EntityEditDialog — модалка создания/редактирования сущности.
 *
 * Использование:
 *   <EntityEditDialog
 *     v-model:open="dialogOpen"
 *     :title="editing ? 'Редактировать тренера' : 'Новый тренер'"
 *     :saving="saving"
 *     :error="error"
 *     @submit="onSubmit"
 *   >
 *     <template #default>
 *       <div class="form__row">
 *         <label>Имя<input v-model="form.fullName" /></label>
 *       </div>
 *     </template>
 *   </EntityEditDialog>
 *
 * Внутри:
 * - Teleport to body (как ConfirmDialog)
 * - Слот default — произвольная форма
 * - Кнопки «Отмена» и «Сохранить» (submit) на месте
 * - Disabled состояние кнопки «Сохранить» при saving
 */
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  saving?: boolean
  error?: string | null
  /** Ширина модалки: 'sm' (420px), 'md' (560px), 'lg' (760px). По умолчанию md. */
  size?: 'sm' | 'md' | 'lg'
  /** Текст submit-кнопки. По умолчанию 'Сохранить'. */
  submitLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

function close(): void {
  if (props.saving) return
  emit('update:open', false)
  emit('cancel')
}

function onSubmit(): void {
  if (props.saving) return
  emit('submit')
}

function onKeydown(e: KeyboardEvent): void {
  if (!props.open) return
  if (e.key === 'Escape') close()
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="edit" @click.self="close">
        <div
          class="edit__card"
          :class="[`edit__card--${size ?? 'md'}`]"
          role="dialog"
          aria-modal="true"
        >
          <h2 class="edit__title">{{ title }}</h2>
          <div v-if="error" class="alert alert--error">{{ error }}</div>

          <form class="edit__form" @submit.prevent="onSubmit">
            <div class="edit__body">
              <slot />
            </div>

            <div class="edit__actions">
              <button
                type="button"
                class="edit__btn edit__btn--cancel"
                :disabled="saving"
                @click="close"
              >
                Отмена
              </button>
              <button
                type="submit"
                class="edit__btn edit__btn--primary"
                :disabled="saving"
              >
                {{ saving ? 'Сохраняем…' : (submitLabel ?? 'Сохранить') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.edit {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: $z-modal;
  padding: $space-8 $space-4 $space-4;
  overflow-y: auto;
}

.edit__card {
  background: $surface-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $space-5;
  width: 100%;

  &--sm { max-width: 420px; }
  &--md { max-width: 560px; }
  &--lg { max-width: 760px; }
}

.edit__title {
  margin: 0 0 $space-3;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
}

.edit__form {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.edit__body {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: $space-1;
}

.edit__actions {
  display: flex;
  justify-content: flex-end;
  gap: $space-2;
  margin-top: $space-2;
}

.edit__btn {
  padding: $space-2 $space-4;
  border-radius: $radius-md;
  border: 1px solid $surface-border;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: background 0.15s;

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &--cancel {
    background: $surface-card;
    color: $text-primary;
    &:hover:not(:disabled) { background: $surface-bg; }
  }

  &--primary {
    background: $brand-primary;
    color: $text-on-brand;
    border-color: $brand-primary;
    &:hover:not(:disabled) { background: $brand-primary-dark; }
  }
}

.alert {
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  &--error { background: rgba(220,38,38,.08); color: $brand-danger; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
