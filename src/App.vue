<script setup lang="ts">
/**
 * App.vue — ТОЛЬКО <RouterView />. Это критично: если обернуть в layout здесь
 * и параллельно в route-record, получим двойной рендер (header×2, footer×2).
 * См. pitfalls в vue3-spa-bootstrap skill.
 */
</script>

<template>
  <RouterView />
</template>
