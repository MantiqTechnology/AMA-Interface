<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  period?: string;
  periodOptions?: Array<{ title: string; value: string }>;
  refreshing?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  'update:period': [value: string];
}>();
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
        Finance · PT AMA
      </p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-text-primary">{{ title }}</h1>
      <p class="mt-1 text-sm text-text-secondary">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <VSelect
        v-if="period"
        class="finance-period-select"
        density="compact"
        hide-details
        :items="periodOptions ?? []"
        label="Accounting period"
        :model-value="period"
        variant="outlined"
        @update:model-value="emit('update:period', String($event))"
      />
      <VBtn
        :loading="refreshing"
        prepend-icon="mdi-refresh"
        variant="outlined"
        @click="emit('refresh')"
      >
        Refresh
      </VBtn>
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.finance-period-select {
  min-width: 190px;
}

@media (max-width: 600px) {
  .finance-period-select {
    min-width: min(100%, 220px);
  }
}
</style>
