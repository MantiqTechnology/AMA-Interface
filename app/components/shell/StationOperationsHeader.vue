<script setup lang="ts">
import type {
  SelectOption,
  StationFlightRow
} from '../../features/station-operations/types/stationOperations';

type StationServiceForm = {
  flightId: string;
  serviceTypeId: string;
  serviceSupplierId: string;
  referenceRate: number | null;
};

const props = defineProps<{
  modelValue: boolean;
  creating: boolean;
  flights: StationFlightRow[];
  serviceTypes: SelectOption[];
  suppliers: SelectOption[];
  form: StationServiceForm;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: StationServiceForm];
  submit: [];
}>();

function updateForm<K extends keyof StationServiceForm>(key: K, value: StationServiceForm[K]) {
  emit('update:form', {
    ...props.form,
    [key]: value
  });
}

const flightId = computed({
  get: () => props.form.flightId,
  set: (value: string | null) => {
    updateForm('flightId', value ?? '');
  }
});

const serviceTypeId = computed({
  get: () => props.form.serviceTypeId,
  set: (value: string | null) => {
    updateForm('serviceTypeId', value ?? '');
  }
});

const serviceSupplierId = computed({
  get: () => props.form.serviceSupplierId,
  set: (value: string | null) => {
    updateForm('serviceSupplierId', value ?? '');
  }
});

const referenceRate = computed({
  get: () => props.form.referenceRate,
  set: (value: number | string | null) => {
    if (value === null || value === '') {
      updateForm('referenceRate', null);
      return;
    }

    const parsedValue = Number(value);

    updateForm('referenceRate', Number.isFinite(parsedValue) ? parsedValue : null);
  }
});

const canSubmit = computed(() => {
  return (
    Boolean(flightId.value) &&
    Boolean(serviceTypeId.value) &&
    Boolean(serviceSupplierId.value) &&
    referenceRate.value !== null &&
    referenceRate.value >= 0
  );
});
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>Create Station Service</VCardTitle>

      <VCardText class="flex flex-col gap-4">
        <VSelect
          v-model="flightId"
          :items="flights"
          item-title="flightNumber"
          item-value="flightId"
          label="Flight"
          variant="outlined"
        />

        <VSelect
          v-model="serviceTypeId"
          :items="serviceTypes"
          item-title="title"
          item-value="id"
          label="Service type"
          variant="outlined"
        />

        <VSelect
          v-model="serviceSupplierId"
          :items="suppliers"
          item-title="title"
          item-value="id"
          label="Supplier"
          variant="outlined"
        />

        <VTextField
          v-model="referenceRate"
          label="Reference rate"
          type="number"
          min="0"
          variant="outlined"
        />
      </VCardText>

      <VCardActions>
        <VSpacer />

        <VBtn variant="text" :disabled="creating" @click="emit('update:modelValue', false)">
          Cancel
        </VBtn>

        <VBtn color="primary" :loading="creating" :disabled="!canSubmit" @click="emit('submit')">
          Create
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
