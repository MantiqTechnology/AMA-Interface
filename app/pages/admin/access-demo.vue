<script setup lang="ts">
const session = useDemoSession();
const { visibleModules } = useAuthorization();

onMounted(() => session.load());
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Access Demo</h1>
        <p class="text-text-secondary">Active role and module access for the demo session.</p>
      </div>
      <VSpacer />
      <div style="width: min(100%, 360px)">
        <FeatureDemoPersonaSwitcher />
      </div>
    </div>

    <VRow>
      <VCol cols="12" lg="7">
        <VCard border>
          <VCardTitle class="text-subtitle-1 font-weight-bold">Demo personas</VCardTitle>
          <VDivider />
          <VTable density="comfortable">
            <thead>
              <tr>
                <th>Role</th>
                <th>Persona</th>
                <th>Station scope</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="persona in session.personas" :key="persona.role">
                <td>
                  <VChip
                    :color="persona.role === session.role.value ? 'primary' : undefined"
                    size="small"
                    variant="tonal"
                  >
                    {{ persona.role }}
                  </VChip>
                </td>
                <td>
                  <div class="font-weight-medium">{{ persona.name }}</div>
                  <div class="text-caption text-text-secondary">{{ persona.label }}</div>
                </td>
                <td>{{ persona.stationScope.join(', ') }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>

      <VCol cols="12" lg="5">
        <VCard border>
          <VCardTitle class="text-subtitle-1 font-weight-bold">Visible modules</VCardTitle>
          <VDivider />
          <VList density="comfortable">
            <VListItem v-for="module in visibleModules()" :key="module.key">
              <template #prepend>
                <VIcon color="success" icon="mdi-check-circle-outline" />
              </template>
              <VListItemTitle>{{ module.name }}</VListItemTitle>
              <VListItemSubtitle>{{ module.category }}</VListItemSubtitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
