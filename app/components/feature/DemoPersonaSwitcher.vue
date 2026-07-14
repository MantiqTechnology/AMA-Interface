<script setup lang="ts">
import type { DemoRole } from '#shared/types/roles';

const session = useDemoSession();
const switching = ref(false);

const items = session.personas.map((persona) => ({
  title: `${persona.role} - ${persona.name}`,
  value: persona.role,
  props: { subtitle: `Scope: ${persona.stationScope.join(', ')}` }
}));

onMounted(() => session.load());

async function onPersonaChange(value: DemoRole | null) {
  if (!value || value === session.role.value) return;
  switching.value = true;
  try {
    await session.switchRole(value);
  } finally {
    switching.value = false;
  }
}
</script>

<template>
  <div class="w-full min-w-0">
    <VSelect
      density="compact"
      hide-details
      item-title="title"
      item-value="value"
      :items="items"
      label="Demo role"
      :loading="switching"
      :model-value="session.role.value"
      variant="outlined"
      @update:model-value="onPersonaChange"
    />
    <div class="mt-1 text-xs text-text-secondary">
      {{ session.currentPersona.value.label }} | Scope:
      {{ session.currentPersona.value.stationScope.join(', ') }}
    </div>
  </div>
</template>
