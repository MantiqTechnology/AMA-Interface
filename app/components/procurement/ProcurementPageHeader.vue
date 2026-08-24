<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="page-header">
    <div class="page-header__accent" />
    <div class="page-header__text">
      <div class="page-header__eyebrow">{{ eyebrow }}</div>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-left: 14px;
  position: relative;
  flex-wrap: wrap;
}

.page-header__accent {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: #0e9f9a;
}

.page-header__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0e9f9a;
  margin-bottom: 4px;
}

.page-header__title {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
  margin: 0 0 6px;
}

.page-header__subtitle {
  font-size: 16px;
  color: #676d74;
  margin: 0;
  line-height: 1.2;
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 2px;
}
</style>
