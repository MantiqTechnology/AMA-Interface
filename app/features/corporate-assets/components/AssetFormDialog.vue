<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import { assetCategories, assetLocationTypes } from '#shared/features/corporate-assets';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>();
const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});
const saving = ref(false);
const error = ref('');
const form = reactive({
  name: '',
  category: 'GSE',
  brand: null as string | null,
  model: null as string | null,
  serialNumber: null as string | null,
  stationId: null as string | null,
  locationType: 'STATION',
  locationDetail: '',
  departmentId: null as string | null,
  currentCustodianEmployeeId: null as string | null,
  custodianNameSnapshot: null as string | null,
  acquisitionDate: null as string | null,
  acquisitionReference: null as string | null,
  lifecycleStatus: 'ACTIVE',
  conditionStatus: 'SERVICEABLE'
});
const { data: stations } = await useFetch<ApiResponse<any[]>>('/api/master-data/stations/options');
const { data: departments } = await useFetch<ApiResponse<any[]>>(
  '/api/master-data/departments/options'
);
const { data: employees } = await useFetch<ApiResponse<any[]>>(
  '/api/master-data/employees/options'
);
async function save() {
  saving.value = true;
  error.value = '';
  try {
    await $fetch('/api/asset-management/assets', { method: 'POST', body: form });
    open.value = false;
    emit('saved');
  } catch (value: any) {
    error.value =
      value?.data?.error?.message ?? value?.message ?? 'Corporate asset could not be saved.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <VDialog v-model="open" max-width="760" scrollable>
    <VCard title="Add Corporate Asset">
      <VCardText>
        <VAlert v-if="error" color="error" variant="tonal" class="mb-4">{{ error }}</VAlert>
        <VRow dense>
          <VCol cols="12" md="8"><VTextField v-model="form.name" label="Asset name" /></VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="form.category" :items="assetCategories" label="Category" />
          </VCol>
          <VCol cols="12" md="4"><VTextField v-model="form.brand" label="Brand" /></VCol>
          <VCol cols="12" md="4"><VTextField v-model="form.model" label="Model" /></VCol>
          <VCol cols="12" md="4">
            <VTextField v-model="form.serialNumber" label="Serial number" />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="form.stationId"
              :items="stations?.data ?? []"
              item-title="label"
              item-value="id"
              label="Station"
              clearable
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="form.departmentId"
              :items="departments?.data ?? []"
              item-title="departmentName"
              item-value="id"
              label="Department"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect v-model="form.locationType" :items="assetLocationTypes" label="Location type" />
          </VCol>
          <VCol cols="12" md="8">
            <VTextField v-model="form.locationDetail" label="Location detail" />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="form.currentCustodianEmployeeId"
              :items="employees?.data ?? []"
              item-title="fullName"
              item-value="id"
              label="Custodian"
              clearable
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model="form.custodianNameSnapshot" label="Custodian name snapshot" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model="form.acquisitionDate" type="date" label="Acquisition date" />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField v-model="form.acquisitionReference" label="Acquisition reference" />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions>
        <VSpacer /><VBtn variant="text" @click="open = false">Cancel</VBtn><VBtn
          color="primary"
          :loading="saving"
          :disabled="!form.name || !form.locationDetail"
          @click="save"
        >
          Save asset
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
