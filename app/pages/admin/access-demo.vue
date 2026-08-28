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
      <VBtn color="primary" prepend-icon="mdi-logout-variant" @click="session.logout()">
        Switch demo account
      </VBtn>
    </div>

    <VRow>
      <VCol cols="12" lg="7">
        <VCard border>
          <VCardTitle class="text-subtitle-1 font-weight-bold">Authenticated identity</VCardTitle>
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
              <tr>
                <td>
                  <VChip color="primary" size="small" variant="tonal">
                    {{
                      session.role.value
                    }}
                  </VChip>
                </td>
                <td>
                  <div class="font-weight-medium">{{ session.currentPersona.value.name }}</div>
                  <div class="text-caption text-text-secondary">
                    {{ session.currentPersona.value.label }}
                  </div>
                </td>
                <td>{{ session.currentPersona.value.stationScope.join(', ') }}</td>
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
