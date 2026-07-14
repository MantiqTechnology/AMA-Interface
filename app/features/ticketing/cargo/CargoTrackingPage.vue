<script setup lang="ts">
import type { CargoBookingDto } from '#shared/features/ticketing/cargo';
import type { TicketRefundRequestDto } from '#shared/features/ticketing/refunds';
import { downloadCargoWaybill } from '../booking/ticketDocument';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';

const search = ref('');
const paymentStatus = ref<'UNPAID' | 'PAID' | undefined>();
const bookingStatus = ref<'BOOKED' | 'DELIVERED' | undefined>();
const deliveryOpen = ref(false);
const selectedBooking = ref<CargoBookingDto | null>(null);
const deliveredTo = ref('');
const submitting = ref(false);
const actionError = ref('');
const decisionOpen = ref(false);
const decisionBooking = ref<CargoBookingDto | null>(null);
const decision = ref<'APPROVE' | 'REJECT'>('APPROVE');
const decisionNote = ref('');

function listQuery() {
  return {
    ...(search.value.trim() ? { search: search.value.trim() } : {}),
    ...(paymentStatus.value ? { paymentStatus: paymentStatus.value } : {}),
    ...(bookingStatus.value ? { status: bookingStatus.value } : {})
  };
}

const {
  data: bookings,
  pending,
  error,
  refresh
} = await useAsyncData(
  'ticketing-cargo-tracking',
  () =>
    fetchApi<CargoBookingDto[]>('/api/ticketing/cargo-bookings', {
      query: listQuery()
    }),
  { default: () => [], watch: [search, paymentStatus, bookingStatus] }
);

function openDelivery(booking: CargoBookingDto) {
  selectedBooking.value = booking;
  deliveredTo.value = '';
  actionError.value = '';
  deliveryOpen.value = true;
}
async function deliver() {
  if (!selectedBooking.value || !deliveredTo.value.trim()) return;
  submitting.value = true;
  actionError.value = '';
  try {
    await fetchApi<CargoBookingDto>(
      `/api/ticketing/cargo-bookings/${selectedBooking.value.id}/delivery`,
      { method: 'PATCH', body: { deliveredTo: deliveredTo.value } }
    );
    deliveryOpen.value = false;
    await refresh();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Unable to record delivery.';
  } finally {
    submitting.value = false;
  }
}

function openDecision(booking: CargoBookingDto, nextDecision: 'APPROVE' | 'REJECT') {
  decisionBooking.value = booking;
  decision.value = nextDecision;
  decisionNote.value = '';
  actionError.value = '';
  decisionOpen.value = true;
}

async function submitDecision() {
  const requestId = decisionBooking.value?.refundRequest?.id;
  if (!requestId || decisionNote.value.trim().length < 3) return;
  submitting.value = true;
  actionError.value = '';
  try {
    await fetchApi<TicketRefundRequestDto>(`/api/ticketing/refund-requests/${requestId}/decision`, {
      method: 'PATCH',
      body: { decision: decision.value, note: decisionNote.value }
    });
    decisionOpen.value = false;
    await refresh();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Refund decision failed.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Cargo Tracking</h1>
        <p class="text-text-secondary">AWB payment, DG acceptance, and proof-of-delivery status.</p>
      </div>
      <VSpacer />
      <VBtn prepend-icon="mdi-open-in-new" to="/ticketing/booking" variant="tonal">
        Booking portal
      </VBtn>
    </div>
    <VAlert v-if="actionError" class="mb-4" color="error" variant="tonal">
      {{ actionError }}
    </VAlert>
    <VCard border>
      <VCardText>
        <div class="mb-4 d-flex flex-wrap ga-3">
          <VTextField
            v-model="search"
            clearable
            hide-details
            label="Search AWB or party"
            max-width="360"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
          <VSelect
            v-model="paymentStatus"
            clearable
            hide-details
            :items="['UNPAID', 'PAID']"
            label="Payment"
            max-width="180"
            variant="outlined"
          />
          <VSelect
            v-model="bookingStatus"
            clearable
            hide-details
            :items="['BOOKED', 'DELIVERED']"
            label="Delivery"
            max-width="180"
            variant="outlined"
          />
        </div>
        <VAlert v-if="error" color="error">{{ error.message }}</VAlert>
        <VSkeletonLoader v-else-if="pending" type="table" />
        <VTable v-else class="ticketing-table">
          <thead>
            <tr>
              <th>AWB</th>
              <th>Parties</th>
              <th>Flight</th>
              <th>Weight</th>
              <th>DG</th>
              <th>Tariff</th>
              <th>Payment</th>
              <th>Delivery</th>
              <th>Refund</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in bookings" :key="booking.id">
              <td>
                <strong>{{ booking.id }}</strong>
                <div class="text-xs text-text-secondary">
                  {{ formatTicketingDateTime(booking.createdAt) }}
                </div>
              </td>
              <td>
                {{ booking.senderName }}
                <div class="text-xs text-text-secondary">to {{ booking.receiverName }}</div>
              </td>
              <td>
                {{ booking.flightNumber }}
                <div class="text-xs text-text-secondary">
                  {{ booking.originCode }} -> {{ booking.destinationCode }}
                </div>
              </td>
              <td>
                {{ booking.chargeableWeightKg }} kg
                <div class="text-xs text-text-secondary">
                  actual {{ booking.actualWeightKg }} kg
                </div>
              </td>
              <td>
                <VChip :color="booking.isDangerous ? 'warning' : undefined" size="small">
                  {{ booking.dgCategoryCode || 'No DG' }}
                </VChip>
              </td>
              <td>
                {{ formatTicketingCurrency(booking.totalAmount, booking.currencyCode) }}
                <div class="text-xs text-text-secondary">
                  Tax {{ formatTicketingCurrency(booking.taxAmount, booking.currencyCode) }}
                </div>
              </td>
              <td>
                <VChip
                  :color="booking.paymentStatus === 'PAID' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ booking.paymentStatus }}
                </VChip>
              </td>
              <td>
                <VChip :color="booking.status === 'DELIVERED' ? 'success' : 'info'" size="small">
                  {{ booking.status }}
                </VChip>
              </td>
              <td>
                <VChip
                  v-if="booking.refundRequest"
                  :color="
                    booking.refundRequest.status === 'APPROVED'
                      ? 'success'
                      : booking.refundRequest.status === 'REJECTED'
                        ? 'error'
                        : 'warning'
                  "
                  size="small"
                >
                  {{ booking.refundRequest.status }}
                </VChip>
                <span v-else class="text-text-secondary">-</span>
              </td>
              <td class="text-right text-no-wrap">
                <VBtn
                  aria-label="Download AWB PDF"
                  icon="mdi-file-pdf-box"
                  variant="text"
                  @click="downloadCargoWaybill(booking)"
                />
                <VBtn
                  v-if="booking.status === 'BOOKED'"
                  aria-label="Record proof of delivery"
                  :disabled="
                    booking.paymentStatus !== 'PAID' ||
                      ['REQUESTED', 'APPROVED'].includes(booking.refundRequest?.status ?? '')
                  "
                  icon="mdi-package-variant-closed-check"
                  variant="text"
                  @click="openDelivery(booking)"
                />
                <VBtn
                  v-if="booking.refundRequest?.status === 'REQUESTED'"
                  aria-label="Approve cargo refund"
                  color="success"
                  icon="mdi-check-circle-outline"
                  variant="text"
                  @click="openDecision(booking, 'APPROVE')"
                />
                <VBtn
                  v-if="booking.refundRequest?.status === 'REQUESTED'"
                  aria-label="Reject cargo refund"
                  color="error"
                  icon="mdi-close-circle-outline"
                  variant="text"
                  @click="openDecision(booking, 'REJECT')"
                />
              </td>
            </tr>
            <tr v-if="bookings.length === 0">
              <td class="py-8 text-center text-text-secondary" colspan="10">
                No cargo bookings match the filters.
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <VDialog v-model="deliveryOpen" max-width="520">
      <VCard>
        <VCardTitle>Record proof of delivery</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" color="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <p class="mb-4 text-text-secondary">
            {{ selectedBooking?.id }} · {{ selectedBooking?.receiverName }}
          </p>
          <VTextField
            v-model="deliveredTo"
            label="Received by"
            variant="outlined"
            @keyup.enter="deliver"
          />
        </VCardText><VDivider />
        <VCardActions>
          <VSpacer /><VBtn variant="text" @click="deliveryOpen = false">Cancel</VBtn><VBtn
            color="primary"
            :disabled="!deliveredTo.trim()"
            :loading="submitting"
            prepend-icon="mdi-content-save"
            @click="deliver"
          >
            Confirm delivery
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="decisionOpen" max-width="560">
      <VCard>
        <VCardTitle>{{ decision === 'APPROVE' ? 'Approve' : 'Reject' }} cargo refund</VCardTitle>
        <VDivider />
        <VCardText>
          <p class="mb-2 font-weight-medium">
            {{ decisionBooking?.id }} · {{ decisionBooking?.senderName }}
          </p>
          <p class="mb-4 text-text-secondary">
            {{ decisionBooking?.refundRequest?.reason }}
          </p>
          <VTextarea
            v-model="decisionNote"
            label="Decision note"
            :rules="[(value: string) => value.trim().length >= 3 || 'Enter a decision note.']"
            variant="outlined"
          />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="decisionOpen = false">Cancel</VBtn>
          <VBtn
            :color="decision === 'APPROVE' ? 'success' : 'error'"
            :disabled="decisionNote.trim().length < 3"
            :loading="submitting"
            :prepend-icon="decision === 'APPROVE' ? 'mdi-check' : 'mdi-close'"
            @click="submitDecision"
          >
            {{ decision === 'APPROVE' ? 'Approve refund' : 'Reject refund' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.ticketing-table {
  min-width: 1180px;
}
</style>
