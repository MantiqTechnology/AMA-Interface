<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  period?: string;
}>();

const emit = defineEmits<{
  refresh: [];
  'update:period': [value: string];
}>();
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Finance · PT AMA
      </p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-950">{{ title }}</h1>
      <p class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <label v-if="period" class="block">
        <span class="sr-only">Periode</span>
        <select
          class="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          :value="period"
          @change="emit('update:period', ($event.target as HTMLSelectElement).value)"
        >
          <option value="2026-07">Juli 2026</option>
          <option value="2026-Q2">Kuartal 2 2026</option>
          <option value="2026">Tahun 2026</option>
        </select>
      </label>
      <button
        class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        type="button"
        @click="emit('refresh')"
      >
        Refresh
      </button>
      <slot name="actions" />
    </div>
  </header>
</template>
