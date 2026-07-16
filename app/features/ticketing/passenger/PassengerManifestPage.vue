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

async function submitDecision(ticket: PassengerTicketDto, nextDecision: 'APPROVE' | 'REJECT') {
  const requestId = ticket.refundRequest?.id;
  if (!requestId || decisionNote.value.trim().length < 3) return;
  actionId.value = ticket.id;
  actionError.value = '';
  try {
    await fetchApi<TicketRefundRequestDto>(`/api/ticketing/refund-requests/${requestId}/decision`, {
      method: 'PATCH',
      body: { decision: nextDecision, note: decisionNote.value }
    });
    decisionNote.value = '';
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
                <DsTooltipIconButton
                  aria-label="Download ticket PDF"
                  icon="mdi-file-pdf-box"
                  tooltip="Download ticket PDF"
                  variant="text"
                  @click="downloadPassengerTicket(ticket)"
                />
                <DsConfirmIconButton
                  v-if="ticket.ticketStatus === 'ACTIVE' && ticket.checkInStatus === 'PENDING'"
                  :action="() => checkIn(ticket)"
                  aria-label="Check in passenger"
                  confirm-icon="mdi-account-check-outline"
                  confirm-text="Check in"
                  :disabled="
                    ticket.paymentStatus !== 'PAID' ||
                      ['REQUESTED', 'APPROVED'].includes(ticket.refundRequest?.status ?? '')
                  "
                  icon="mdi-account-check-outline"
                  :loading="actionId === ticket.id"
                  :message="`Check in ${ticket.passengerName} for ${ticket.flightNumber}.`"
                  title="Check in passenger?"
                  tone="success"
                  tooltip="Check in passenger"
                  variant="text"
                />
                <DsTooltipIconButton
                  v-if="
                    ticket.ticketStatus === 'ACTIVE' &&
                      ticket.paymentStatus === 'PAID' &&
                      ticket.checkInStatus === 'PENDING' &&
                      !['REQUESTED', 'APPROVED'].includes(ticket.refundRequest?.status ?? '')
                  "
                  aria-label="Reschedule passenger ticket"
                  icon="mdi-calendar-sync"
                  tooltip="Reschedule passenger ticket"
                  variant="text"
                  @click="openReschedule(ticket)"
                />
                <DsConfirmIconButton
                  v-if="ticket.refundRequest?.status === 'REQUESTED'"
                  :action="() => submitDecision(ticket, 'APPROVE')"
                  aria-label="Approve refund"
                  color="success"
                  :confirm-disabled="decisionNote.trim().length < 3"
                  confirm-icon="mdi-check-circle-outline"
                  confirm-text="Approve refund"
                  icon="mdi-check-circle-outline"
                  max-width="560"
                  persistent
                  title="Approve passenger refund?"
                  tone="success"
                  tooltip="Approve refund"
                  variant="text"
                >
                  <p class="mb-2 font-weight-medium">
                    {{ ticket.id }} · {{ ticket.passengerName }}
                  </p>
                  <p class="mb-4 text-text-secondary">{{ ticket.refundRequest.reason }}</p>
                  <VTextarea
                    v-model="decisionNote"
                    label="Decision note"
                    :rules="[
                      (value: string) => value.trim().length >= 3 || 'Enter a decision note.'
                    ]"
                    variant="outlined"
                  />
                  <template #actions="{ cancel, confirm, loading }">
                    <VBtn
                      :disabled="loading"
                      variant="text"
                      @click="
                        () => {
                          decisionNote = '';
                          cancel();
                        }
                      "
                    >
                      Cancel
                    </VBtn>
                    <VBtn
                      color="success"
                      :disabled="decisionNote.trim().length < 3"
                      :loading="loading || actionId === ticket.id"
                      prepend-icon="mdi-check"
                      @click="confirm"
                    >
                      Approve refund
                    </VBtn>
                  </template>
                </DsConfirmIconButton>
                <DsConfirmIconButton
                  v-if="ticket.refundRequest?.status === 'REQUESTED'"
                  :action="() => submitDecision(ticket, 'REJECT')"
                  aria-label="Reject refund"
                  color="error"
                  :confirm-disabled="decisionNote.trim().length < 3"
                  confirm-icon="mdi-close-circle-outline"
                  confirm-text="Reject refund"
                  icon="mdi-close-circle-outline"
                  max-width="560"
                  persistent
                  title="Reject passenger refund?"
                  tone="error"
                  tooltip="Reject refund"
                  variant="text"
                >
                  <p class="mb-2 font-weight-medium">
                    {{ ticket.id }} · {{ ticket.passengerName }}
                  </p>
                  <p class="mb-4 text-text-secondary">{{ ticket.refundRequest.reason }}</p>
                  <VTextarea
                    v-model="decisionNote"
                    label="Decision note"
                    :rules="[
                      (value: string) => value.trim().length >= 3 || 'Enter a decision note.'
                    ]"
                    variant="outlined"
                  />
                  <template #actions="{ cancel, confirm, loading }">
                    <VBtn
                      :disabled="loading"
                      variant="text"
                      @click="
                        () => {
                          decisionNote = '';
                          cancel();
                        }
                      "
                    >
                      Cancel
                    </VBtn>
                    <VBtn
                      color="error"
                      :disabled="decisionNote.trim().length < 3"
                      :loading="loading || actionId === ticket.id"
                      prepend-icon="mdi-close"
                      @click="confirm"
                    >
                      Reject refund
                    </VBtn>
                  </template>
                </DsConfirmIconButton>
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
