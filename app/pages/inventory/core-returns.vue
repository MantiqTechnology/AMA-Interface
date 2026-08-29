<script setup lang="ts">
import type { InventoryCoreReturnDto } from '#shared/features/inventory';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const { money, errorMessage } = useInventoryUi();
const { can } = useAuthorization();
const {
  data: returns,
  pending,
  error,
  refresh
} = await useAsyncData('core-returns', () =>
  fetchApi<InventoryCoreReturnDto[]>('/api/inventory/core-returns')
);

const isSubmitting = ref(false);
const actionError = ref('');
const actionMessage = ref('');

async function updateStatus(id: string, newStatus: string) {
  isSubmitting.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await fetchApi(`/api/inventory/core-returns/${id}/status`, {
      method: 'PUT',
      body: { status: newStatus }
    });
    actionMessage.value = 'Status Core Return berhasil diperbarui.';
    await refresh();
  } catch (err: unknown) {
    actionError.value = errorMessage(
      err,
      'Status Core Return tidak dapat diperbarui. Perbarui data lalu coba lagi.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Core Return Vendor & Exchange">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui Core Return"
        variant="text"
        @click="() => refresh()"
      />
    </template>

    <VAlert color="info" icon="mdi-backup-restore" class="mb-4" variant="tonal">
      <strong>Core Return Management (Rotables & Exchange Parts):</strong> Pelacakan batas waktu
      pengembalian suku cadang bekas (*Old Core*) ke vendor eksternal untuk mengklaim pengembalian
      uang jaminan (*Core Deposit Refund*).
    </VAlert>
    <VAlert
      v-if="error || actionError"
      aria-live="polite"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ actionError || 'Core Return tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
    </VAlert>
    <VAlert
      v-if="actionMessage"
      aria-live="polite"
      closable
      class="mb-4"
      type="success"
      variant="tonal"
    >
      {{ actionMessage }}
    </VAlert>

    <InventoryPanel
      subtitle="Daftar item exchange/repairable yang wajib dikirim ulang ke manufaktur/vendor"
      title="Status Core Return ke Vendor"
    >
      <VTable>
        <thead>
          <tr>
            <th>Nomor Return</th>
            <th>Vendor</th>
            <th>Part & Serial Number</th>
            <th>Jatuh Tempo Core</th>
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
                TERLAMBAT
              </VChip>
            </td>
            <td class="font-weight-bold text-success">
              {{ item.depositAmountIdr === null ? 'Terbatas' : money(item.depositAmountIdr) }}
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
              <InventoryTableActions>
                <DsTooltipIconButton
                  v-if="
                    can('inventory.procurement.manage').allowed && item.status === 'PENDING_RETURN'
                  "
                  color="info"
                  icon="mdi-truck-delivery-outline"
                  :loading="isSubmitting"
                  size="small"
                  tooltip="Kirim Core ke vendor"
                  variant="tonal"
                  @click="updateStatus(item.id, 'SHIPPED')"
                />
                <DsTooltipIconButton
                  v-if="can('inventory.procurement.manage').allowed && item.status === 'SHIPPED'"
                  color="success"
                  icon="mdi-check-decagram-outline"
                  :loading="isSubmitting"
                  size="small"
                  tooltip="Konfirmasi diterima vendor & refund"
                  variant="flat"
                  @click="updateStatus(item.id, 'ACCEPTED_BY_VENDOR')"
                />
              </InventoryTableActions>
            </td>
          </tr>
          <tr v-if="!pending && !(returns?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="7">
              Tidak ada data Core Return pending.
            </td>
          </tr>
        </tbody>
      </VTable>
    </InventoryPanel>
  </InventoryShell>
</template>
