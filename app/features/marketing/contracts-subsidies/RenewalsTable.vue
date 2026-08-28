<script setup lang="ts">
import type { ContractSubsidyRenewalItemDto } from '#shared/features/marketing/contracts-subsidies';

defineProps<{ items: ContractSubsidyRenewalItemDto[] }>();
const emit = defineEmits<{ select: [item: ContractSubsidyRenewalItemDto] }>();

function daysColor(days: number) {
  if (days <= 60) return 'warning';
  if (days <= 90) return 'amber';
  return 'success';
}

function renewalColor(status: string | null) {
  if (status === 'REVIEW_REQUIRED' || status === 'DUE_SOON') return 'warning';
  if (status === 'EXPIRED' || status === 'TERMINATED' || status === 'ARCHIVED') return 'error';
  return 'success';
}
</script>

<template>
  <div class="renewals-table">
    <VTable v-if="items.length" density="comfortable" hover>
      <thead>
        <tr>
          <th>Contract / Program</th>
          <th>Counterparty</th>
          <th>Type</th>
          <th>End Date</th>
          <th>Days Left</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="`${item.sourceType}-${item.id}`">
          <td>
            <VBtn
              class="renewals-table__link px-0"
              size="small"
              variant="text"
              @click="emit('select', item)"
            >
              {{ item.code }}
            </VBtn>
            <div
              v-if="item.name !== item.code"
              class="text-caption text-medium-emphasis text-truncate"
            >
              {{ item.name }}
            </div>
          </td>
          <td>{{ item.counterparty ?? '—' }}</td>
          <td>{{ item.entityType === 'SUBSIDY' ? 'Subsidy' : 'Contract' }}</td>
          <td>
            {{
              new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }).format(new Date(`${item.endDate}T00:00:00`))
            }}
          </td>
          <td>
            <VChip :color="daysColor(item.daysLeft)" size="small" variant="tonal">
              {{
                item.daysLeft
              }}
            </VChip>
          </td>
          <td>
            <VChip
              :color="renewalColor(item.renewalStatus ?? item.status)"
              size="small"
              variant="tonal"
            >
              {{ (item.renewalStatus ?? item.status).replaceAll('_', ' ') }}
            </VChip>
          </td>
        </tr>
      </tbody>
    </VTable>
    <div v-else class="pa-8 text-center text-body-2 text-medium-emphasis">
      No upcoming renewals after this snapshot.
    </div>
  </div>
</template>

<style scoped>
.renewals-table {
  overflow-x: auto;
}
.renewals-table :deep(table) {
  min-width: 760px;
}
.renewals-table__link {
  min-width: 0;
  text-transform: none;
  letter-spacing: 0;
}
.renewals-table th {
  white-space: nowrap;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
}
</style>
