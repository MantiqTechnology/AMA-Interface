<script setup lang="ts">
import type { RateCardDto, RateCardInput } from '#shared/features/commercial/rates';
import StationSelect from '../../operations/stations/StationSelect.vue';
import CustomerSelect from '../customers/CustomerSelect.vue';
import CurrencySelect from '../../finance/currencies/CurrencySelect.vue';
import TaxCodeSelect from '../../finance/tax-codes/TaxCodeSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: RateCardDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: RateCardDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<RateCardInput>({
  rateCode: '',
  serviceType: 'CHARTER',
  originStationId: '',
  destinationStationId: '',
  customerId: null,
  aircraftType: null,
  currencyId: '',
  taxCodeId: null,
  baseRate: 0,
  rateUnit: 'PER_FLIGHT',
  pricingScope: 'PUBLIC_COUNTER',
  bookingChannel: 'COUNTER',
  passengerType: null,
  cargoPriceBasis: null,
  ratePriority: 100,
  minimumCharge: null,
  demoUsageNote: null,
  effectiveFrom: '',
  effectiveTo: null
});
const required = (label: string) => (value: unknown) =>
  Array.isArray(value)
    ? value.length > 0 || `${label} is required`
    : value !== null && value !== ''
      ? true
      : `${label} is required`;
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    serverError.value = '';
    Object.assign(form, {
      rateCode: props.record ? (props.record.rateCode as RateCardInput['rateCode']) : '',
      serviceType: props.record
        ? (props.record.serviceType as RateCardInput['serviceType'])
        : 'CHARTER',
      originStationId: props.record
        ? (props.record.originStationId as RateCardInput['originStationId'])
        : '',
      destinationStationId: props.record
        ? (props.record.destinationStationId as RateCardInput['destinationStationId'])
        : '',
      customerId: props.record ? (props.record.customerId as RateCardInput['customerId']) : null,
      aircraftType: props.record
        ? (props.record.aircraftType as RateCardInput['aircraftType'])
        : null,
      currencyId: props.record ? (props.record.currencyId as RateCardInput['currencyId']) : '',
      taxCodeId: props.record ? (props.record.taxCodeId as RateCardInput['taxCodeId']) : null,
      baseRate: props.record ? (props.record.baseRate as RateCardInput['baseRate']) : 0,
      rateUnit: props.record ? (props.record.rateUnit as RateCardInput['rateUnit']) : 'PER_FLIGHT',
      pricingScope: props.record
        ? (props.record.pricingScope as RateCardInput['pricingScope'])
        : 'PUBLIC_COUNTER',
      bookingChannel: props.record
        ? (props.record.bookingChannel as RateCardInput['bookingChannel'])
        : 'COUNTER',
      passengerType: props.record
        ? (props.record.passengerType as RateCardInput['passengerType'])
        : null,
      cargoPriceBasis: props.record
        ? (props.record.cargoPriceBasis as RateCardInput['cargoPriceBasis'])
        : null,
      ratePriority: props.record
        ? (props.record.ratePriority as RateCardInput['ratePriority'])
        : 100,
      minimumCharge: props.record
        ? (props.record.minimumCharge as RateCardInput['minimumCharge'])
        : null,
      demoUsageNote: props.record
        ? (props.record.demoUsageNote as RateCardInput['demoUsageNote'])
        : null,
      effectiveFrom: props.record
        ? (props.record.effectiveFrom as RateCardInput['effectiveFrom'])
        : '',
      effectiveTo: props.record ? (props.record.effectiveTo as RateCardInput['effectiveTo']) : null
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<RateCardDto>(
      props.record ? '/api/master-data/rates/' + props.record.id : '/api/master-data/rates',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value =
      error instanceof Error ? error.message : 'Unable to save fare & rate cards.';
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <VDialog
    :model-value="modelValue"
    max-width="900"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Fare & Rate Cards</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.rateCode"
                label="Rate code"
                :rules="[required('Rate code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.serviceType"
                :items="['CHARTER', 'PASSENGER', 'CARGO']"
                label="Service type"
                :rules="[required('Service type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.originStationId" label="Origin" required />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.destinationStationId" label="Destination" required />
            </VCol>
            <VCol cols="12" md="6">
              <CustomerSelect v-model="form.customerId" label="Customer" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.aircraftType"
                label="Aircraft type"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <CurrencySelect v-model="form.currencyId" label="Currency" required />
            </VCol>
            <VCol cols="12" md="6">
              <TaxCodeSelect v-model="form.taxCodeId" label="Tax code" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.baseRate"
                label="Base rate"
                :rules="[required('Base rate')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.rateUnit"
                :items="['PER_FLIGHT', 'PER_PASSENGER', 'PER_KG']"
                label="Rate unit"
                :rules="[required('Rate unit')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.pricingScope"
                :items="[
                  'PUBLIC_COUNTER',
                  'CORPORATE_CONTRACT',
                  'CARGO_CONTRACT',
                  'CHARTER_CONTRACT'
                ]"
                label="Pricing scope"
                :rules="[required('Pricing scope')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.bookingChannel"
                :items="['COUNTER', 'AGENT', 'CORPORATE', 'CARGO', 'CHARTER']"
                label="Booking channel"
                :rules="[required('Booking channel')]"
                variant="outlined"
              />
            </VCol>
            <VCol v-if="form.serviceType === 'PASSENGER'" cols="12" md="6">
              <VSelect
                v-model="form.passengerType"
                :items="['ADULT', 'CHILD', 'INFANT']"
                label="Passenger type"
                variant="outlined"
              />
            </VCol>
            <VCol v-if="form.serviceType === 'CARGO'" cols="12" md="6">
              <VSelect
                v-model="form.cargoPriceBasis"
                :items="['ACTUAL_WEIGHT', 'VOLUME_WEIGHT', 'CHARGEABLE_WEIGHT']"
                label="Cargo price basis"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.ratePriority"
                label="Rate priority"
                :rules="[required('Rate priority')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.minimumCharge"
                label="Minimum charge"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.demoUsageNote"
                label="Demo usage note"
                rows="3"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.effectiveFrom"
                label="Effective from"
                :rules="[required('Effective from')]"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.effectiveTo"
                label="Effective to"
                type="date"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText><VDivider /><VCardActions>
        <VSpacer /><VBtn variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn><VBtn
          color="primary"
          :loading="submitting"
          prepend-icon="mdi-content-save"
          @click="submit"
        >
          Save fare & rate cards
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
