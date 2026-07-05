<script setup lang="ts">
const store = useAmaDemoStore();
const currentUserId = store.currentUserId;

const items = computed(() =>
  store.data.value.appUsers.map((user) => ({
    title: `${user.demoPersona} - ${user.name}`,
    value: user.id,
    props: {
      subtitle: user.stationScopeIds.join(', ')
    }
  }))
);

const roleSummary = computed(() => store.currentRoles.value.map((role) => role.name).join(', '));
const stationSummary = computed(() =>
  store.currentUser.value.stationScopeIds
    .map((stationId) => store.getStation(stationId)?.code)
    .filter(Boolean)
    .join(', ')
);

function onPersonaChange(value: string | null) {
  if (value) store.switchPersona(value);
}
</script>

<template>
  <div class="w-full min-w-0">
    <VSelect
      density="compact"
      hide-details
      item-title="title"
      item-value="value"
      label="Demo Persona - simulasi lokal"
      :items="items"
      :model-value="currentUserId"
      variant="outlined"
      @update:model-value="onPersonaChange"
    />
    <div class="mt-1 text-xs text-text-secondary">
      {{ roleSummary }} | Scope: {{ stationSummary || 'self' }}
    </div>
  </div>
</template>
