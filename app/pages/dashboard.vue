<script setup lang="ts">
import type { DashboardDto } from '#shared/contracts/dashboard';

const { data: dashboard, pending } = await useAsyncData('dashboard', () =>
  fetchApi<DashboardDto>('/api/dashboard')
);
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5">
      <h1 class="text-h4 font-weight-bold text-text-primary">Operations Dashboard</h1>
      <p class="text-text-muted">Live demo data from local SQLite.</p>
    </div>

    <VProgressLinear v-if="pending" color="secondary" indeterminate />

    <template v-else-if="dashboard">
      <VRow class="mb-1">
        <VCol cols="12" md="4">
          <DsStatCard label="Active Flights" :value="dashboard.kpis.activeFlights" />
        </VCol>
        <VCol cols="12" md="4">
          <DsStatCard
            label="Pending Approvals"
            :value="dashboard.kpis.pendingApprovals"
            tone="warning"
          />
        </VCol>
        <VCol cols="12" md="4">
          <DsStatCard
            label="Unpaid Invoices"
            :value="dashboard.kpis.unpaidInvoices"
            tone="danger"
          />
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12" lg="8">
          <VCard border>
            <VCardTitle class="text-text-primary">Flight Board</VCardTitle>
            <FeatureFlightTable :flights="dashboard.flights" />
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard border class="mb-4">
            <VCardTitle class="text-text-primary">Alerts</VCardTitle>
            <VList lines="two">
              <VListItem v-for="alert in dashboard.alerts" :key="alert.id">
                <template #prepend>
                  <DsStatusBadge :value="alert.severity" />
                </template>
                <VListItemTitle>{{ alert.title }}</VListItemTitle>
                <VListItemSubtitle>{{ alert.message }}</VListItemSubtitle>
              </VListItem>
            </VList>
          </VCard>

          <VCard border>
            <VCardTitle class="text-text-primary">Approvals</VCardTitle>
            <VTable density="comfortable">
              <tbody>
                <tr v-for="approval in dashboard.approvals" :key="approval.id">
                  <td>{{ approval.domainEntity.replaceAll('_', ' ') }}</td>
                  <td>{{ approval.roleRequired }}</td>
                  <td>
                    <DsStatusBadge :value="approval.status" />
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>
    </template>
  </VContainer>
</template>
