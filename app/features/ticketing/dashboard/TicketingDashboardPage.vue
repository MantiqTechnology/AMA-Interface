<script setup lang="ts">
import type { TicketingDashboardDto } from '#shared/features/ticketing/dashboard';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';

const router = useRouter();
const route = useRoute();

function routeString(key: string, fallback: string) {
  return typeof route.query[key] === 'string' ? String(route.query[key]) : fallback;
}

const dateFrom = ref(routeString('dateFrom', ''));
const dateTo = ref(routeString('dateTo', ''));

const {
  data: dash,
  error,
  refresh
} = await useAsyncData(
  'ticketing-dashboard-summary',
  () =>
    fetchApi<TicketingDashboardDto>('/api/ticketing/dashboard', {
      query: {
        ...(dateFrom.value ? { dateFrom: dateFrom.value } : {}),
        ...(dateTo.value ? { dateTo: dateTo.value } : {})
      }
    }),
  {
    default: () =>
      ({
        totalPassengerTickets: 0,
        totalCargoBookings: 0,
        checkedInCount: 0,
        deliveredCargoCount: 0,
        pendingRefundCount: 0,
        unpaidTicketCount: 0,
        unpaidCargoCount: 0,
        revenueByCurrency: [],
        recentTransactions: [],
        salesByRoute: []
      }) as TicketingDashboardDto
  }
);

let timeout: ReturnType<typeof setTimeout>;
watch([dateFrom, dateTo], () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    void router.replace({
      query: {
        ...(dateFrom.value ? { dateFrom: dateFrom.value } : {}),
        ...(dateTo.value ? { dateTo: dateTo.value } : {})
      }
    });
    void refresh();
  }, 300);
});
</script>

<template>
  <div class="pa-6">
    <!-- Header Title Banner -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Ticketing Dashboard</h1>
        <p class="text-subtitle-1 text-secondary">
          Analytics & monitoring of passenger sales, cargo bookings, and ticketing revenue
        </p>
      </div>

      <div class="d-flex ga-2">
        <VTextField
          v-model="dateFrom"
          density="compact"
          hide-details
          label="From date"
          prepend-inner-icon="mdi-calendar"
          type="date"
          variant="outlined"
          max-width="180"
        />
        <VTextField
          v-model="dateTo"
          density="compact"
          hide-details
          label="To date"
          prepend-inner-icon="mdi-calendar"
          type="date"
          variant="outlined"
          max-width="180"
        />
        <VBtn prepend-icon="mdi-cash-register" color="success" to="/ticketing/booking">
          Booking Portal
        </VBtn>
        <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refresh()"> Refresh Data </VBtn>
      </div>
    </div>

    <VAlert v-if="error" class="mb-4" color="error" variant="tonal">
      {{ error.message }}
    </VAlert>

    <!-- KPI Metric Summary Cards (Top Row) -->
    <VRow class="mb-6 align-stretch">
      <!-- Card 1: Total Passenger Tickets -->
      <VCol cols="12" sm="6" md="3" class="d-flex">
        <VCard border class="pa-4 rounded-lg elevation-1 w-100 d-flex flex-column">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Passenger Tickets</span>
            <VAvatar color="primary" variant="tonal" size="38">
              <VIcon icon="mdi-ticket-account" size="22" />
            </VAvatar>
          </div>
          <div class="d-flex align-baseline ga-2">
            <div class="text-h3 font-weight-bold text-primary">
              {{ dash.totalPassengerTickets }}
            </div>
            <span class="text-subtitle-1 font-weight-bold text-secondary">sold</span>
          </div>
          <VProgressLinear
            :model-value="
              dash.totalPassengerTickets > 0
                ? (dash.checkedInCount / dash.totalPassengerTickets) * 100
                : 0
            "
            color="primary"
            height="6"
            rounded
            class="mt-2"
          />
          <div class="text-caption text-secondary mt-1">{{ dash.checkedInCount }} Checked-in</div>
        </VCard>
      </VCol>

      <!-- Card 2: Total Cargo Bookings -->
      <VCol cols="12" sm="6" md="3" class="d-flex">
        <VCard border class="pa-4 rounded-lg elevation-1 w-100 d-flex flex-column">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Cargo Bookings</span>
            <VAvatar color="info" variant="tonal" size="38">
              <VIcon icon="mdi-package-variant-closed" size="22" />
            </VAvatar>
          </div>
          <div class="d-flex align-baseline ga-2">
            <div class="text-h3 font-weight-bold text-info">
              {{ dash.totalCargoBookings }}
            </div>
            <span class="text-subtitle-1 font-weight-bold text-secondary">booked</span>
          </div>
          <VProgressLinear
            :model-value="
              dash.totalCargoBookings > 0
                ? (dash.deliveredCargoCount / dash.totalCargoBookings) * 100
                : 0
            "
            color="info"
            height="6"
            rounded
            class="mt-2"
          />
          <div class="text-caption text-secondary mt-1">
            {{ dash.deliveredCargoCount }} Delivered
          </div>
        </VCard>
      </VCol>

      <!-- Card 3: Pending Refunds -->
      <VCol cols="12" sm="6" md="3" class="d-flex">
        <VCard border class="pa-4 rounded-lg elevation-1 w-100 d-flex flex-column">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Pending Refunds</span>
            <VAvatar color="warning" variant="tonal" size="38">
              <VIcon icon="mdi-cash-refund" size="22" />
            </VAvatar>
          </div>
          <div class="d-flex align-baseline ga-2">
            <div class="text-h3 font-weight-bold text-warning">
              {{ dash.pendingRefundCount }}
            </div>
            <span class="text-subtitle-1 font-weight-bold text-secondary">requests</span>
          </div>
          <div class="text-caption text-secondary mt-3">Awaiting approval from management</div>
        </VCard>
      </VCol>

      <!-- Card 4: Unpaid Transactions -->
      <VCol cols="12" sm="6" md="3" class="d-flex">
        <VCard border class="pa-4 rounded-lg elevation-1 w-100 d-flex flex-column">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Unpaid Transactions</span>
            <VAvatar color="error" variant="tonal" size="38">
              <VIcon icon="mdi-cash-remove" size="22" />
            </VAvatar>
          </div>
          <div class="d-flex align-baseline ga-2">
            <div class="text-h3 font-weight-bold text-error">
              {{ dash.unpaidTicketCount + dash.unpaidCargoCount }}
            </div>
            <span class="text-caption text-secondary">Total pending</span>
          </div>
          <div class="text-caption text-secondary mt-1">
            Pax: <strong>{{ dash.unpaidTicketCount }}</strong> &bull; Cargo:
            <strong>{{ dash.unpaidCargoCount }}</strong>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mb-6">
      <VCol cols="12" md="4">
        <!-- Revenue Summary by Currency -->
        <VCard border class="pa-5 h-100 rounded-lg elevation-1">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-cash-multiple" color="primary" size="22" />
              <h3 class="text-h6 font-weight-bold text-primary">Revenue Summary</h3>
            </div>
          </div>
          <VDivider class="mb-4" />
          <div class="d-flex flex-column ga-4">
            <div
              v-for="rev in dash.revenueByCurrency"
              :key="rev.currencyCode"
              class="pa-3 border rounded"
            >
              <div class="text-caption text-secondary font-weight-bold text-uppercase">
                {{ rev.currencyCode }} Collected
              </div>
              <div class="text-h5 font-weight-bold text-primary my-1">
                {{ formatTicketingCurrency(rev.totalRevenue, rev.currencyCode) }}
              </div>
              <div class="d-flex justify-space-between text-caption text-secondary mt-2">
                <span>Passenger:
                  {{ formatTicketingCurrency(rev.passengerRevenue, rev.currencyCode) }}</span>
                <span>Cargo: {{ formatTicketingCurrency(rev.cargoRevenue, rev.currencyCode) }}</span>
              </div>
            </div>
            <div v-if="!dash.revenueByCurrency.length" class="text-center py-6 text-secondary">
              No revenue recorded yet.
            </div>
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" md="8">
        <!-- Sales by Route Chart -->
        <VCard border class="pa-5 h-100 rounded-lg elevation-1">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-map-marker-path" color="success" size="22" />
              <h3 class="text-h6 font-weight-bold text-primary">Top Sales by Route</h3>
            </div>
          </div>
          <VDivider class="mb-4" />
          <div class="d-flex flex-column ga-3">
            <div
              v-for="(route, idx) in dash.salesByRoute"
              :key="`${route.routeLabel}-${route.currencyCode}`"
            >
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="font-weight-medium text-body-2 text-high-emphasis">
                  {{ route.routeLabel }}
                  <span class="text-caption text-secondary ml-1">({{ formatTicketingCurrency(route.totalRevenue, route.currencyCode) }})</span>
                </span>
                <span class="font-weight-bold text-body-2 text-primary">
                  {{ route.passengerCount }} Pax, {{ route.cargoCount }} Cargo
                </span>
              </div>
              <VProgressLinear
                :model-value="
                  dash.salesByRoute.length > 0
                    ? (route.totalRevenue / dash.salesByRoute[0].totalRevenue) * 100
                    : 0
                "
                :color="['primary', 'info', 'success', 'warning', 'secondary'][idx % 5]"
                height="8"
                rounded
              />
            </div>
            <div v-if="!dash.salesByRoute.length" class="text-center py-6 text-secondary">
              No sales data per route available.
            </div>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" md="8">
        <!-- Recent Transactions -->
        <VCard border class="rounded-lg elevation-1" title="Recent Transactions">
          <template #prepend>
            <VIcon color="primary" icon="mdi-history" />
          </template>
          <VDivider />
          <VTable density="comfortable" hover>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Flight / Route</th>
                <th>Customer</th>
                <th>Status</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in dash.recentTransactions" :key="`${entry.type}-${entry.id}`">
                <td>
                  <strong>{{ entry.referenceNumber }}</strong>
                  <div class="text-xs text-text-secondary">
                    {{ formatTicketingDateTime(entry.createdAt) }}
                  </div>
                </td>
                <td>
                  <VChip
                    size="small"
                    variant="tonal"
                    :color="entry.type === 'PASSENGER' ? 'primary' : 'info'"
                  >
                    {{ entry.type }}
                  </VChip>
                </td>
                <td>
                  {{ entry.flightNumber }}
                  <div class="text-xs text-text-secondary">{{ entry.routeLabel }}</div>
                </td>
                <td>{{ entry.customerName }}</td>
                <td>
                  <VChip
                    :color="
                      entry.paymentStatus === 'PAID'
                        ? 'success'
                        : entry.paymentStatus === 'REFUNDED'
                          ? 'error'
                          : 'warning'
                    "
                    size="small"
                  >
                    {{ entry.paymentStatus }}
                  </VChip>
                </td>
                <td
                  :class="[
                    'text-right font-weight-bold',
                    entry.paymentStatus === 'REFUNDED' ? 'text-error' : ''
                  ]"
                >
                  {{ formatTicketingCurrency(entry.amount, entry.currencyCode) }}
                </td>
              </tr>
              <tr v-if="dash.recentTransactions.length === 0">
                <td colspan="6" class="text-center py-6 text-secondary">No recent transactions.</td>
              </tr>
            </tbody>
          </VTable>
          <VDivider />
          <VCardActions class="pa-3">
            <VSpacer />
            <VBtn
              color="primary"
              to="/ticketing/finance"
              variant="text"
              prepend-icon="mdi-arrow-right"
            >
              View Operational Ledger
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <!-- Quick Actions & Links -->
        <VCard border class="rounded-lg elevation-1" title="Quick Actions">
          <template #prepend>
            <VIcon color="primary" icon="mdi-flash-outline" />
          </template>
          <VDivider />
          <VList density="comfortable">
            <VListItem
              prepend-icon="mdi-account-multiple-outline"
              title="Passenger Sales & Check-in"
              to="/ticketing/passenger"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-package-variant"
              title="Cargo Tracking"
              to="/ticketing/cargo"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-store-cog-outline"
              title="Sales Management (OCC)"
              to="/ticketing/management"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-cash-register"
              title="Operational Ledger"
              to="/ticketing/finance"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-open-in-new"
              title="Ticketing Booking Portal"
              to="/ticketing/booking"
            >
              <template #append><VIcon icon="mdi-open-in-new" color="primary" /></template>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
