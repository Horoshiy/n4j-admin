<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './store'

/**
 * LoginPage — единственная страница с bare-layout (без сайдбара/хедера).
 * После успешного логина редиректит на ?next= или /dashboard.
 */
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const password = ref('')
const showPassword = ref(false)

const nextPath = computed<string>(() => {
  const q = route.query.next
  if (typeof q === 'string' && q.startsWith('/') && !q.startsWith('//')) {
    return q
  }
  return '/dashboard'
})

async function onSubmit(): Promise<void> {
  if (!password.value) return
  try {
    await auth.login(password.value)
    router.replace(nextPath.value)
  } catch {
    // ошибка уже в auth.lastError, отрисуется ниже
  }
}
</script>

<template>
  <div class="login">
    <div class="login__card">
      <div class="login__brand">
        <div class="login__logo">⚽</div>
        <h1 class="login__title">DFC Динамчики</h1>
        <p class="login__subtitle">Панель администратора</p>
      </div>

      <form class="login__form" @submit.prevent="onSubmit">
        <label class="login__label" for="password">Пароль администратора</label>
        <div class="login__input-wrap">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="login__input"
            placeholder="••••••••••••"
            autocomplete="current-password"
            autofocus
            :disabled="auth.loading"
            @keydown.enter="onSubmit"
          />
          <button
            type="button"
            class="login__toggle"
            :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Скрыть' : 'Показать' }}
          </button>
        </div>

        <div v-if="auth.lastError" class="login__error" role="alert">
          {{ auth.lastError }}
        </div>

        <button
          type="submit"
          class="login__submit"
          :disabled="auth.loading || !password"
        >
          {{ auth.loading ? 'Входим…' : 'Войти' }}
        </button>

        <p class="login__hint">
          Если забыли пароль — он в <code>/etc/dinamchiki-gql-admin.env.d/secrets.env</code>
          на сервере бета-стенда.
        </p>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-4;
  background: linear-gradient(135deg, $brand-primary-light 0%, $surface-bg 100%);
}

.login__card {
  width: 100%;
  max-width: 400px;
  background: $surface-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $space-6;
}

.login__brand {
  text-align: center;
  margin-bottom: $space-5;
}

.login__logo {
  font-size: 48px;
  line-height: 1;
  margin-bottom: $space-2;
}

.login__title {
  margin: 0 0 $space-1;
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

.login__subtitle {
  margin: 0;
  color: $text-secondary;
  font-size: $font-size-sm;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.login__label {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $text-secondary;
}

.login__input-wrap {
  position: relative;
}

.login__input {
  width: 100%;
  padding: $space-3 $space-4;
  padding-right: 80px;
  border: 1px solid $surface-border;
  border-radius: $radius-md;
  font-size: $font-size-md;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: $brand-primary;
    box-shadow: 0 0 0 3px rgba(30, 111, 217, 0.15);
  }

  &:disabled {
    background: $surface-bg;
    cursor: not-allowed;
  }
}

.login__toggle {
  position: absolute;
  right: $space-2;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  padding: $space-1 $space-2;
  font-size: $font-size-xs;
  color: $brand-primary;
  border-radius: $radius-sm;

  &:hover {
    background: $brand-primary-light;
  }
}

.login__error {
  background: rgba(220, 38, 38, 0.08);
  color: $brand-danger;
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  font-size: $font-size-sm;
}

.login__submit {
  padding: $space-3 $space-4;
  background: $brand-primary;
  color: $text-on-brand;
  border: none;
  border-radius: $radius-md;
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: $brand-primary-dark;
  }

  &:disabled {
    background: $text-muted;
    cursor: not-allowed;
  }
}

.login__hint {
  margin: $space-2 0 0;
  font-size: $font-size-xs;
  color: $text-muted;
  text-align: center;

  code {
    font-family: $font-mono;
    background: $surface-bg;
    padding: 1px 4px;
    border-radius: $radius-sm;
  }
}
</style>
