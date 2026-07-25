<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
  padded?: boolean;
}>();
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
    <header
      v-if="title || $slots.actions"
      class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"
    >
      <div>
        <h2 v-if="title" class="text-base font-semibold text-slate-950">{{ title }}</h2>
        <p v-if="subtitle" class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div :class="padded === false ? '' : 'p-5'">
      <slot />
    </div>
  </section>
</template>
