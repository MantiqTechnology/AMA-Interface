<script setup lang="ts">
import type { InventoryCoreReturnDto } from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { money, errorMessage } = useInventoryUi();
const { can } = useAuthorization();
const {
  data: returns,
  pending,
  refresh
} = await useAsyncData('core-returns', () =>
  fetchApi<InventoryCoreReturnDto[]>('/api/inventory/core-returns')
);

const isSubmitting = ref(false);

async function updateStatus(id: string, newStatus: string) {
  isSubmitting.value = true;
  try {
    await fetchApi(`/api/inventory/core-returns/${id}/status`, {
      method: 'PUT',
      body: { status: newStatus }
    });
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Gagal update status core return.'));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Vendor Core Return & Exchange Tracking">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh list core return"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert color="info" icon="mdi-backup-restore" class="mb-4" variant="tonal">
      <strong>Core Return Management (Rotables & Exchange Parts):</strong> Pelacakan batas waktu
      pengembalian suku cadang bekas (*Old Core*) ke vendor eksternal untuk mengklaim pengembalian
      uang jaminan (*Core Deposit Refund*).
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex align-center py-3 px-4">
        <div>
          <h2 class="text-h6 font-weight-bold">Status Core Return ke Vendor</h2>
          <div class="text-caption text-medium-emphasis">
            Daftar item exchange/repairable yang wajib dikirim ulang ke manufaktur/vendor
          </div>
        </div>
        <VSpacer />
      </VCardTitle>

      <VTable>
        <thead>
          <tr>
            <th>Nomor Return</th>
            <th>Vendor</th>
            <th>Part & Serial Number</th>
            <th>Core Due Date</th>
            <th>Nilai Deposit Core (IDR)</th>
            <th>Status Core</th>
            <th class="text-end">Aksi Pengiriman / Klaim</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in returns ?? []" :key="item.id">
            <td class="font-weight-bold">{{ item.returnNumber }}</td>
            <td>{{ item.vendorName }}</td>
            <td>
              <div class="font-weight-bold">{{ item.partNumber }} - {{ item.partName }}</div>
              <div class="text-caption text-primary">S/N: {{ item.serialNumber ?? 'N/A' }}</div>
            </td>
            <td class="font-weight-bold" :class="{ 'text-error': item.isOverdue }">
              {{ item.coreDueDate }}
              <VChip v-if="item.isOverdue" color="error" size="x-small" variant="flat" class="ml-1">
                OVERDUE
              </VChip>
            </td>
            <td class="font-weight-bold text-success">
              {{ item.depositAmountIdr === null ? 'Restricted' : money(item.depositAmountIdr) }}
            </td>
            <td>
              <VChip
                :color="
                  item.status === 'PENDING_RETURN'
                    ? 'warning'
                    : item.status === 'SHIPPED'
                      ? 'info'
                      : 'success'
                "
                size="small"
                variant="flat"
              >
                {{ item.status }}
              </VChip>
            </td>
            <td class="text-end">
              <div class="d-flex justify-end ga-2">
                <VBtn
                  v-if="
                    can('inventory.procurement.manage').allowed && item.status === 'PENDING_RETURN'
                  "
                  color="info"
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-truck-delivery-outline"
                  :loading="isSubmitting"
                  @click="updateStatus(item.id, 'SHIPPED')"
                >
                  Kirim Core (Shipped)
                </VBtn>
                <VBtn
                  v-if="can('inventory.procurement.manage').allowed && item.status === 'SHIPPED'"
                  color="success"
                  size="small"
                  variant="flat"
                  prepend-icon="mdi-check-decagram"
                  :loading="isSubmitting"
                  @click="updateStatus(item.id, 'ACCEPTED_BY_VENDOR')"
                >
                  Diterima Vendor & Refund
                </VBtn>
              </div>
            </td>
          </tr>
          <tr v-if="!pending && !(returns?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="7">
              Tidak ada data Core Return pending.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </InventoryShell>
</template>
