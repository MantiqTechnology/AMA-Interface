<script setup lang="ts">
import type {
  SelectOption,
  StationFlightRow
} from '../../features/station-operations/types/stationOperations';

type StationCostForm = {
  flightId: string;
  costCategoryId: string;
  vendorId: string;
  currencyId: string;
  description: string;
  amount: number | null;
};

defineProps<{
  creating: boolean;
  flights: StationFlightRow[];
  categories: SelectOption[];
  vendors: SelectOption[];
  currencies: SelectOption[];
}>();

const dialogOpen = defineModel<boolean>({
  required: true
});

const form = defineModel<StationCostForm>('form', {
  required: true
});

const emit = defineEmits<{
  submit: [];
}>();

function updateForm<K extends keyof StationCostForm>(key: K, value: StationCostForm[K]) {
  form.value = {
    ...form.value,
    [key]: value
  };
}

const flightId = computed({
  get: () => form.value.flightId,
  set: (value: string | null) => {
    updateForm('flightId', value ?? '');
  }
});

const costCategoryId = computed({
  get: () => form.value.costCategoryId,
  set: (value: string | null) => {
    updateForm('costCategoryId', value ?? '');
  }
});

const vendorId = computed({
  get: () => form.value.vendorId,
  set: (value: string | null) => {
    updateForm('vendorId', value ?? '');
  }
});

const currencyId = computed({
  get: () => form.value.currencyId,
  set: (value: string | null) => {
    updateForm('currencyId', value ?? '');
  }
});

const description = computed({
  get: () => form.value.description,
  set: (value: string | null) => {
    updateForm('description', value ?? '');
  }
});

const amount = computed({
  get: () => form.value.amount,
  set: (value: number | string | null) => {
    if (value === null || value === '') {
      updateForm('amount', null);
      return;
    }

    const parsed = Number(value);

    updateForm('amount', Number.isFinite(parsed) ? parsed : null);
  }
});

const canSubmit = computed(() => {
  return (
    Boolean(costCategoryId.value) &&
    Boolean(currencyId.value) &&
    Boolean(description.value.trim()) &&
    amount.value !== null &&
    amount.value >= 0
  );
});
</script>

<template>
  <VDialog v-model="dialogOpen" max-width="560">
    <VCard>
      <VCardTitle tag="h2">Create Station Cost</VCardTitle>

      <VCardText class="flex flex-col gap-4">
        <VSelect
          v-model="flightId"
          :items="flights"
          item-title="flightNumber"
          item-value="flightId"
          label="Related flight (optional)"
          clearable
          variant="outlined"
        />

        <VSelect
          v-model="costCategoryId"
          :items="categories"
          item-title="title"
          item-value="id"
          label="Cost category"
          variant="outlined"
        />

        <VSelect
          v-model="vendorId"
          :items="vendors"
          item-title="title"
          item-value="id"
          label="Vendor"
          clearable
          variant="outlined"
        />

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <VTextField v-model="amount" label="Amount" type="number" min="0" variant="outlined" />

          <VSelect
            v-model="currencyId"
            :items="currencies"
            item-title="title"
            item-value="id"
            label="Currency"
            variant="outlined"
          />
        </div>

        <VTextarea v-model="description" label="Description" rows="3" variant="outlined" />
      </VCardText>

      <VCardActions>
        <VSpacer />

        <VBtn variant="text" :disabled="creating" @click="dialogOpen = false"> Cancel </VBtn>

        <VBtn color="primary" :loading="creating" :disabled="!canSubmit" @click="emit('submit')">
          Create
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
