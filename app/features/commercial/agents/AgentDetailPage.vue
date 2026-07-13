<script setup lang="ts">
import type { AgentDto } from '#shared/features/commercial/agents';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('agents-' + pageRoute.params.id, () =>
  fetchApi<AgentDto>('/api/master-data/agents/' + pageRoute.params.id)
);
const display = (value: unknown) =>
  Array.isArray(value)
    ? value.join(', ')
    : typeof value === 'boolean'
      ? value
        ? 'Yes'
        : 'No'
      : (value ?? '-');
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/agents" variant="text">Agents</VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.agentName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Agent code</strong>
              <div>{{ display(record.agentCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Agent name</strong>
              <div>{{ display(record.agentName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Agent type</strong>
              <div>{{ display(record.agentType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Station</strong>
              <div>{{ display(record.stationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Commission rate</strong>
              <div>{{ display(record.commissionBasisPoints) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Contact person</strong>
              <div>{{ display(record.contactPerson) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Phone</strong>
              <div>{{ display(record.phone) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
