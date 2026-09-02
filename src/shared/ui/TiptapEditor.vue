<script setup lang="ts">
/**
 * TiptapEditor — обёртка над TipTap 2 (Vue 3) для админки.
 *
 * v-model:value — HTML-строка. Используется для редактирования
 * длинных текстов в PageContent.hero.description, news.body и т.п.
 *
 * Расширения:
 *  - StarterKit (paragraph, bold, italic, headings, lists, blockquote, code, hr)
 *  - Link (Ctrl+K)
 *  - Image (по URL)
 *  - Table + TableRow + TableCell + TableHeader
 *
 * minHeight — минимальная высота редактора (px).
 */
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

const props = withDefaults(
  defineProps<{
    value: string
    placeholder?: string
    minHeight?: number
  }>(),
  {
    placeholder: 'Введите текст…',
    minHeight: 200,
  },
)

const emit = defineEmits<{
  (e: 'update:value', html: string): void
}>()

const editor = useEditor({
  content: props.value,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
    }),
    Image,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-content',
    },
  },
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:value', html)
  },
})

// Sync external value changes (e.g. after refetch) into the editor.
watch(
  () => props.value,
  (val) => {
    if (!editor.value) return
    if (editor.value.getHTML() !== val) {
      editor.value.commands.setContent(val || '', false)
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function addLink(): void {
  if (!editor.value) return
  const url = window.prompt('URL:', 'https://')
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function addImage(): void {
  if (!editor.value) return
  const url = window.prompt('URL картинки:', 'https://')
  if (!url) return
  editor.value.chain().focus().setImage({ src: url }).run()
}

function insertTable(): void {
  editor.value
    ?.chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run()
}
</script>

<template>
  <div class="tiptap">
    <div v-if="editor" class="tiptap__toolbar">
      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('bold') }"
        title="Жирный (Ctrl+B)"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <b>B</b>
      </button>
      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('italic') }"
        title="Курсив (Ctrl+I)"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <i>I</i>
      </button>
      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('strike') }"
        title="Зачёркнутый"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <s>S</s>
      </button>

      <span class="tiptap__sep" />

      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('heading', { level: 2 }) }"
        title="Заголовок 2"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('heading', { level: 3 }) }"
        title="Заголовок 3"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>

      <span class="tiptap__sep" />

      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('bulletList') }"
        title="Маркированный список"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        •
      </button>
      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('orderedList') }"
        title="Нумерованный список"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1.
      </button>
      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('blockquote') }"
        title="Цитата"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        ❝
      </button>

      <span class="tiptap__sep" />

      <button
        type="button"
        class="tiptap__btn"
        :class="{ 'tiptap__btn--active': editor.isActive('link') }"
        title="Ссылка (Ctrl+K)"
        @click="addLink"
      >
        🔗
      </button>
      <button
        type="button"
        class="tiptap__btn"
        title="Картинка по URL"
        @click="addImage"
      >
        🖼
      </button>
      <button
        type="button"
        class="tiptap__btn"
        title="Таблица 3×3"
        @click="insertTable"
      >
        ⊞
      </button>

      <span class="tiptap__sep" />

      <button
        type="button"
        class="tiptap__btn"
        title="Отменить (Ctrl+Z)"
        :disabled="!editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      >
        ↶
      </button>
      <button
        type="button"
        class="tiptap__btn"
        title="Повторить (Ctrl+Y)"
        :disabled="!editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      >
        ↷
      </button>
    </div>

    <EditorContent
      :editor="editor"
      class="tiptap__editor"
      :style="{ minHeight: props.minHeight + 'px' }"
    />
  </div>
</template>

<style lang="scss">
// Глобальные стили (не scoped) — TipTap рендерит HTML внутри, нам нужен
// красивый вывод и в редакторе, и при просмотре.
.tiptap {
  border: 1px solid $surface-border;
  border-radius: $radius-md;
  background: $surface-card;
  overflow: hidden;
}

.tiptap__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: $space-1 $space-2;
  background: $surface-bg;
  border-bottom: 1px solid $surface-border;
}

.tiptap__btn {
  min-width: 32px;
  height: 30px;
  padding: 0 $space-1;
  border: 1px solid transparent;
  background: transparent;
  border-radius: $radius-sm;
  font-size: $font-size-sm;
  cursor: pointer;
  color: $text-primary;
  transition: background 0.1s;

  &:hover:not(:disabled) {
    background: $surface-card;
    border-color: $surface-border;
  }

  &--active {
    background: $brand-primary-light;
    color: $brand-primary;
    border-color: transparent;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.tiptap__sep {
  width: 1px;
  background: $surface-border;
  margin: 4px 4px;
  align-self: stretch;
}

.tiptap__editor {
  padding: $space-3;
  font-size: $font-size-base;
  line-height: 1.6;
  color: $text-primary;
}

.tiptap-content {
  outline: none;
  min-height: inherit;

  &:focus {
    outline: none;
  }

  // ProseMirror оставляет пустой <p><br></p> — скрываем визуально.
  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: $text-muted;
    pointer-events: none;
    height: 0;
  }

  p { margin: 0 0 $space-2; }
  h2 { font-size: 1.4rem; font-weight: 700; margin: $space-3 0 $space-2; }
  h3 { font-size: 1.15rem; font-weight: 600; margin: $space-2 0 $space-1; }
  h4 { font-size: 1rem;    font-weight: 600; margin: $space-2 0 $space-1; }
  ul, ol { padding-left: $space-4; margin: 0 0 $space-2; }
  blockquote {
    border-left: 3px solid $brand-primary;
    padding-left: $space-2;
    margin: $space-2 0;
    color: $text-secondary;
  }
  code {
    background: $surface-bg;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: $font-mono, monospace;
    font-size: 0.9em;
  }
  pre {
    background: $surface-bg;
    padding: $space-2;
    border-radius: $radius-sm;
    overflow-x: auto;
    code { background: transparent; padding: 0; }
  }
  hr { border: 0; border-top: 1px solid $surface-border; margin: $space-3 0; }
  a { color: $brand-primary; text-decoration: underline; }
  img { max-width: 100%; height: auto; border-radius: $radius-sm; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: $space-2 0;
    th, td {
      border: 1px solid $surface-border;
      padding: $space-1 $space-2;
      min-width: 60px;
    }
    th { background: $surface-bg; font-weight: 600; }
  }
}
</style>
