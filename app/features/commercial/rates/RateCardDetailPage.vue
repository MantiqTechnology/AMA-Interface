<script setup lang="ts">
import type { RateCardDto } from '#shared/features/commercial/rates';
const pageRoute = useRoute();
const { data: record, error } = await useAsyncData('rates-' + pageRoute.params.id, () =>
  fetchApi<RateCardDto>('/api/master-data/rates/' + pageRoute.params.id)
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
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/rates" variant="text">
      Fare & Rate Cards
    </VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="record">
      <h1 class="my-4 text-h4 font-weight-bold">{{ record.rateCode }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Rate code</strong>
              <div>{{ display(record.rateCode) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Service type</strong>
              <div>{{ display(record.serviceType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Origin</strong>
              <div>{{ display(record.originStationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Destination</strong>
              <div>{{ display(record.destinationStationId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Customer</strong>
              <div>{{ display(record.customerId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Aircraft type</strong>
              <div>{{ display(record.aircraftType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Currency</strong>
              <div>{{ display(record.currencyId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Tax code</strong>
              <div>{{ display(record.taxCodeId) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Base rate</strong>
              <div>{{ display(record.baseRate) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Rate unit</strong>
              <div>{{ display(record.rateUnit) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Pricing scope</strong>
              <div>{{ display(record.pricingScope) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Booking channel</strong>
              <div>{{ display(record.bookingChannel) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Passenger type</strong>
              <div>{{ display(record.passengerType) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Cargo price basis</strong>
              <div>{{ display(record.cargoPriceBasis) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Rate priority</strong>
              <div>{{ display(record.ratePriority) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Minimum charge</strong>
              <div>{{ display(record.minimumCharge) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Demo usage note</strong>
              <div>{{ display(record.demoUsageNote) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Effective from</strong>
              <div>{{ display(record.effectiveFrom) }}</div>
            </VCol><VCol cols="12" md="6">
              <strong>Effective to</strong>
              <div>{{ display(record.effectiveTo) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
