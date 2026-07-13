<script setup lang="ts">
import type { CostCategoryDto } from '#shared/features/finance/cost-categories';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('cost-categories-' + pageRoute.params.id, () =>
  fetchApi<CostCategoryDto>('/api/master-data/cost-categories/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/cost-categories" variant="text">
      Cost Categories
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.categoryName }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Category code</strong>
              <div>{{ display(record.categoryCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Category name</strong>
              <div>{{ display(record.categoryName) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Cost group</strong>
              <div>{{ display(record.costGroup) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Default expense COA</strong>
              <div>{{ display(record.defaultCoaId) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
