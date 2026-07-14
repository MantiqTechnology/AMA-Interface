<script setup lang="ts">
import type { PassengerTicketDto } from '#shared/features/ticketing/passenger';
import type { TicketRefundRequestDto } from '#shared/features/ticketing/refunds';
import { downloadPassengerTicket } from '../booking/ticketDocument';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';
import PassengerRescheduleDialog from './PassengerRescheduleDialog.vue';

const search = ref('');
const paymentStatus = ref<'UNPAID' | 'PAID' | undefined>();
const checkInStatus = ref<'PENDING' | 'CHECKED_IN' | undefined>();
const actionId = ref('');
const actionError = ref('');
const decisionOpen = ref(false);
const decisionTicket = ref<PassengerTicketDto | null>(null);
const decision = ref<'APPROVE' | 'REJECT'>('APPROVE');
const decisionNote = ref('');
const rescheduleOpen = ref(false);
const rescheduleTicket = ref<PassengerTicketDto | null>(null);

function listQuery() {
  return {
    ...(search.value.trim() ? { search: search.value.trim() } : {}),
    ...(paymentStatus.value ? { paymentStatus: paymentStatus.value } : {}),
    ...(checkInStatus.value ? { checkInStatus: checkInStatus.value } : {})
  };
}

const {
  data: tickets,
  pending,
  error,
  refresh
} = await useAsyncData(
  'ticketing-passenger-manifest',
  () =>
    fetchApi<PassengerTicketDto[]>('/api/ticketing/passenger-tickets', {
      query: listQuery()
    }),
  { default: () => [], watch: [search, paymentStatus, checkInStatus] }
);

async function checkIn(ticket: PassengerTicketDto) {
  actionId.value = ticket.id;
  actionError.value = '';
  try {
    await fetchApi<PassengerTicketDto>(`/api/ticketing/passenger-tickets/${ticket.id}/check-in`, {
      method: 'PATCH'
    });
    await refresh();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Check-in failed.';
  } finally {
    actionId.value = '';
  }
}

function openDecision(ticket: PassengerTicketDto, nextDecision: 'APPROVE' | 'REJECT') {
  decisionTicket.value = ticket;
  decision.value = nextDecision;
  decisionNote.value = '';
  actionError.value = '';
  decisionOpen.value = true;
}

async function submitDecision() {
  const requestId = decisionTicket.value?.refundRequest?.id;
  if (!requestId || decisionNote.value.trim().length < 3) return;
  actionId.value = decisionTicket.value!.id;
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
    actionId.value = '';
  }
}

function openReschedule(ticket: PassengerTicketDto) {
  rescheduleTicket.value = ticket;
  rescheduleOpen.value = true;
}

async function onRescheduled() {
  await refresh();
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Passenger Manifest</h1>
        <p class="text-text-secondary">Ticket payment, seat, and check-in status by flight.</p>
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
            label="Search ticket or passenger"
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
            v-model="checkInStatus"
            clearable
            hide-details
            :items="['PENDING', 'CHECKED_IN']"
            label="Check-in"
            max-width="180"
            variant="outlined"
          />
        </div>
        <VAlert v-if="error" color="error">{{ error.message }}</VAlert>
        <VSkeletonLoader v-else-if="pending" type="table" />
        <VTable v-else class="ticketing-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Passenger</th>
              <th>Flight</th>
              <th>Seat</th>
              <th>Fare</th>
              <th>Payment</th>
              <th>Check-in</th>
              <th>Refund</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticket in tickets" :key="ticket.id">
              <td>
                <strong>{{ ticket.id }}</strong>
                <div class="text-xs text-text-secondary">
                  {{ formatTicketingDateTime(ticket.createdAt) }}
                </div>
              </td>
              <td>
                {{ ticket.passengerName }}
                <div class="text-xs text-text-secondary">{{ ticket.documentNumber }}</div>
              </td>
              <td>
                {{ ticket.flightNumber }}
                <div class="text-xs text-text-secondary">
                  {{ ticket.originCode }} -> {{ ticket.destinationCode }}
                </div>
              </td>
              <td>{{ ticket.seatNumber }}</td>
              <td>
                {{ formatTicketingCurrency(ticket.totalAmount, ticket.currencyCode) }}
                <div class="text-xs text-text-secondary">
                  Tax {{ formatTicketingCurrency(ticket.taxAmount, ticket.currencyCode) }}
                </div>
              </td>
              <td>
                <VChip
                  :color="ticket.paymentStatus === 'PAID' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ ticket.paymentStatus }}
                </VChip>
              </td>
              <td>
                <VChip
                  :color="ticket.checkInStatus === 'CHECKED_IN' ? 'info' : undefined"
                  size="small"
                >
                  {{ ticket.checkInStatus }}
                </VChip>
              </td>
              <td>
                <VChip
                  v-if="ticket.refundRequest"
                  :color="
                    ticket.refundRequest.status === 'APPROVED'
                      ? 'success'
                      : ticket.refundRequest.status === 'REJECTED'
                        ? 'error'
                        : 'warning'
                  "
                  size="small"
                >
                  {{ ticket.refundRequest.status }}
                </VChip>
                <span v-else class="text-text-secondary">-</span>
              </td>
              <td class="text-right text-no-wrap">
                <VBtn
                  aria-label="Download ticket PDF"
                  icon="mdi-file-pdf-box"
                  variant="text"
                  @click="downloadPassengerTicket(ticket)"
                />
                <VBtn
                  v-if="ticket.ticketStatus === 'ACTIVE' && ticket.checkInStatus === 'PENDING'"
                  aria-label="Check in passenger"
                  :disabled="
                    ticket.paymentStatus !== 'PAID' ||
                      ['REQUESTED', 'APPROVED'].includes(ticket.refundRequest?.status ?? '')
                  "
                  icon="mdi-account-check-outline"
                  :loading="actionId === ticket.id"
                  variant="text"
                  @click="checkIn(ticket)"
                />
                <VBtn
                  v-if="
                    ticket.ticketStatus === 'ACTIVE' &&
                      ticket.paymentStatus === 'PAID' &&
                      ticket.checkInStatus === 'PENDING' &&
                      !['REQUESTED', 'APPROVED'].includes(ticket.refundRequest?.status ?? '')
                  "
                  aria-label="Reschedule passenger ticket"
                  icon="mdi-calendar-sync"
                  variant="text"
                  @click="openReschedule(ticket)"
                />
                <VBtn
                  v-if="ticket.refundRequest?.status === 'REQUESTED'"
                  aria-label="Approve refund"
                  color="success"
                  icon="mdi-check-circle-outline"
                  variant="text"
                  @click="openDecision(ticket, 'APPROVE')"
                />
                <VBtn
                  v-if="ticket.refundRequest?.status === 'REQUESTED'"
                  aria-label="Reject refund"
                  color="error"
                  icon="mdi-close-circle-outline"
                  variant="text"
                  @click="openDecision(ticket, 'REJECT')"
                />
              </td>
            </tr>
            <tr v-if="tickets.length === 0">
              <td class="py-8 text-center text-text-secondary" colspan="9">
                No passenger tickets match the filters.
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <VDialog v-model="decisionOpen" max-width="560">
      <VCard>
        <VCardTitle>
          {{ decision === 'APPROVE' ? 'Approve' : 'Reject' }} passenger refund
        </VCardTitle>
        <VDivider />
        <VCardText>
          <p class="mb-2 font-weight-medium">
            {{ decisionTicket?.id }} · {{ decisionTicket?.passengerName }}
          </p>
          <p class="mb-4 text-text-secondary">
            {{ decisionTicket?.refundRequest?.reason }}
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
            :loading="Boolean(actionId)"
            :prepend-icon="decision === 'APPROVE' ? 'mdi-check' : 'mdi-close'"
            @click="submitDecision"
          >
            {{ decision === 'APPROVE' ? 'Approve refund' : 'Reject refund' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <PassengerRescheduleDialog
      v-model="rescheduleOpen"
      :ticket="rescheduleTicket"
      @rescheduled="onRescheduled"
    />
  </VContainer>
</template>

<style scoped>
.ticketing-table {
  min-width: 1040px;
}
</style>
