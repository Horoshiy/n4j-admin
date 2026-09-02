<script setup lang="ts">
/**
 * ConfirmDialog — модальное окно подтверждения.
 *
 * Использование:
 *   <ConfirmDialog
 *     :open="confirmId !== null"
 *     title="Скрыть команду?"
 *     message="Команда 'U-10' будет скрыта с публичной части сайта."
 *     confirm-label="Скрыть"
 *     variant="danger"
 *     @confirm="onConfirm"
 *     @cancel="confirmId = null"
 *   />
 */
import { watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onConfirm(): void {
  emit('confirm')
}
function onCancel(): void {
  emit('cancel')
}

// Закрытие по Esc
watch(
  () => props.open,
  (v) => {
    if (typeof document === 'undefined') return
    if (v) {
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
)
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') onCancel()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="confirm" @click.self="onCancel">
        <div class="confirm__card" role="dialog" aria-modal="true">
          <h2 class="confirm__title">{{ title }}</h2>
          <p v-if="message" class="confirm__msg">{{ message }}</p>
          <div class="confirm__actions">
            <button class="confirm__btn confirm__btn--cancel" @click="onCancel">
              {{ cancelLabel ?? 'Отмена' }}
            </button>
            <button
              class="confirm__btn"
              :class="variant === 'danger' ? 'confirm__btn--danger' : 'confirm__btn--primary'"
              @click="onConfirm"
            >
              {{ confirmLabel ?? 'Подтвердить' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.confirm {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal;
  padding: $space-4;
}

.confirm__card {
  background: $surface-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $space-5;
  max-width: 420px;
  width: 100%;
}

.confirm__title {
  margin: 0 0 $space-2;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
}

.confirm__msg {
  margin: 0 0 $space-4;
  color: $text-secondary;
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: $space-2;
}

.confirm__btn {
  padding: $space-2 $space-4;
  border-radius: $radius-md;
  border: none;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: background 0.15s;

  &--cancel {
    background: $surface-bg;
    color: $text-primary;

    &:hover {
      background: $surface-border;
    }
  }

  &--primary {
    background: $brand-primary;
    color: $text-on-brand;

    &:hover {
      background: $brand-primary-dark;
    }
  }

  &--danger {
    background: $brand-danger;
    color: $text-on-brand;

    &:hover {
      background: darken-color($brand-danger, 8%);
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
