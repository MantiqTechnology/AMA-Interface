<script setup lang="ts">
import { demoRoles, type DemoRole } from '#shared/types/roles';

const { session, refreshSession, switchRole } = useDemoAuth();

await refreshSession();

async function onRoleChange(role: DemoRole | null) {
  if (!role) return;
  await switchRole(role);
}
</script>

<template>
  <VSelect
    density="compact"
    hide-details
    label="Role"
    max-width="260"
    min-width="220"
    :items="demoRoles"
    :model-value="session.role"
    variant="outlined"
    @update:model-value="onRoleChange"
  />
</template>
