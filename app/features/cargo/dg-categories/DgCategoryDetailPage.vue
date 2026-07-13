<script setup lang="ts">
import type { DgCategoryDto } from '#shared/features/cargo/dg-categories';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('dg-categories-' + pageRoute.params.id, () =>
  fetchApi<DgCategoryDto>('/api/master-data/dg-categories/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/dg-categories" variant="text">
      DG Categories
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.description }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>DG code</strong>
              <div>{{ display(record.dgCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>DG class</strong>
              <div>{{ display(record.dgClass) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Description</strong>
              <div>{{ display(record.description) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Handling instruction</strong>
              <div>{{ display(record.handlingInstruction) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Requires special approval</strong>
              <div>{{ display(record.requiresSpecialApproval) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
