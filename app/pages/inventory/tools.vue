<script setup lang="ts">
import type { InventoryToolDto } from '#shared/features/inventory';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const { errorMessage } = useInventoryUi();
const { can } = useAuthorization();
const {
  data: tools,
  pending,
  error,
  refresh
} = await useAsyncData('inventory-tools', () =>
  fetchApi<InventoryToolDto[]>('/api/inventory/tools')
);

const showAddTool = ref(false);
const showCheckoutModal = ref(false);
const showReturnModal = ref(false);
const showCalibrateModal = ref(false);

const selectedTool = ref<InventoryToolDto | null>(null);
const isSubmitting = ref(false);
const actionError = ref('');
const actionMessage = ref('');

// Add Tool Form
const newTool = reactive({
  toolNumber: '',
  serialNumber: '',
  toolName: '',
  category: 'SPECIAL_TOOL',
  warehouseId: '',
  binId: '',
  calibrationIntervalDays: 365,
  certificateNumber: '',
  restrictedUse: false
});

// Checkout Form
const checkoutWorkOrder = ref('');
const checkoutNotes = ref('');

// Calibrate Form
const calDate = ref(new Date().toISOString().slice(0, 10));
const nextDue = ref('');
const certNo = ref('');

function openCheckout(tool: InventoryToolDto) {
  selectedTool.value = tool;
  checkoutWorkOrder.value = '';
  checkoutNotes.value = '';
  showCheckoutModal.value = true;
}

function openReturn(tool: InventoryToolDto) {
  selectedTool.value = tool;
  showReturnModal.value = true;
}

function openCalibrate(tool: InventoryToolDto) {
  selectedTool.value = tool;
  calDate.value = new Date().toISOString().slice(0, 10);
  nextDue.value = '';
  certNo.value = tool.certificateNumber || '';
  showCalibrateModal.value = true;
}

async function submitCreateTool() {
  if (!newTool.toolNumber || !newTool.serialNumber || !newTool.toolName) return;
  isSubmitting.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await fetchApi('/api/inventory/tools', {
      method: 'POST',
      body: newTool
    });
    showAddTool.value = false;
    actionMessage.value = 'Tool / GSE berhasil didaftarkan.';
    await refresh();
  } catch (err: unknown) {
    actionError.value = errorMessage(
      err,
      'Tool tidak dapat ditambahkan. Periksa nomor, serial, dan nama tool.'
    );
  } finally {
    isSubmitting.value = false;
  }
}

async function submitCheckout() {
  if (!selectedTool.value) return;
  isSubmitting.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await fetchApi('/api/inventory/tools/checkout', {
      method: 'POST',
      body: {
        toolId: selectedTool.value.id,
        workOrderId: checkoutWorkOrder.value || null,
        notes: checkoutNotes.value || null
      }
    });
    showCheckoutModal.value = false;
    actionMessage.value = 'Tool berhasil di-check-out.';
    await refresh();
  } catch (err: unknown) {
    actionError.value = errorMessage(
      err,
      'Check-out tool gagal. Periksa work order dan status tool.'
    );
  } finally {
    isSubmitting.value = false;
  }
}

async function submitReturn(missing = false) {
  if (!selectedTool.value) return;
  isSubmitting.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await fetchApi('/api/inventory/tools/return', {
      method: 'POST',
      body: {
        toolId: selectedTool.value.id,
        conditionOnReturn: missing ? 'UNSERVICEABLE' : 'SERVICEABLE',
        missingReported: missing
      }
    });
    showReturnModal.value = false;
    actionMessage.value = missing
      ? 'Tool dikembalikan dengan laporan hilang/rusak.'
      : 'Tool berhasil dikembalikan laik pakai.';
    await refresh();
  } catch (err: unknown) {
    actionError.value = errorMessage(
      err,
      'Pengembalian tool gagal. Perbarui status lalu coba lagi.'
    );
  } finally {
    isSubmitting.value = false;
  }
}

async function submitCalibrate() {
  if (!selectedTool.value || !calDate.value || !nextDue.value || !certNo.value) return;
  isSubmitting.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await fetchApi('/api/inventory/tools/calibrate', {
      method: 'POST',
      body: {
        toolId: selectedTool.value.id,
        calibratedAt: calDate.value,
        nextCalibrationDue: nextDue.value,
        certificateNumber: certNo.value
      }
    });
    showCalibrateModal.value = false;
    actionMessage.value = 'Sertifikat kalibrasi berhasil diperbarui.';
    await refresh();
  } catch (err: unknown) {
    actionError.value = errorMessage(
      err,
      'Kalibrasi tidak dapat diperbarui. Periksa sertifikat dan tanggal.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Tool Control & Kalibrasi GSE">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.tool.manage').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Daftarkan tool / GSE"
        variant="flat"
        @click="showAddTool = true"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui tool"
        variant="text"
        @click="() => refresh()"
      />
    </template>

    <VAlert color="info" icon="mdi-wrench-clock" class="mb-4" variant="tonal">
      <strong>Aturan Kelaikan Tool (DKPPU/FAA):</strong> Tool dan Test Equipment wajib memiliki
      Sertifikat Kalibrasi aktif. Tool yang terlewat tanggal kalibrasinya (<em>Expired</em>)
      di-block otomatis oleh sistem dari proses Check-Out dan Sign-Off Task Card Perawatan.
    </VAlert>
    <VAlert
      v-if="error || actionError"
      aria-live="polite"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ actionError || 'Data tool tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
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
      subtitle="Pelacakan kalibrasi, check-out / check-in, dan lokasi penyimpanan tool"
      title="Master Tool & Test Equipment"
    >
      <VTable>
        <thead>
          <tr>
            <th>Tool P/N</th>
            <th>Serial Number</th>
            <th>Nama Tool / Peralatan</th>
            <th>Kategori</th>
            <th>Next Calibration Due</th>
            <th>Status Kalibrasi</th>
            <th>Status Penggunaan</th>
            <th class="text-end">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tool in tools ?? []" :key="tool.id">
            <td class="font-weight-bold">{{ tool.toolNumber }}</td>
            <td class="text-primary font-weight-bold">{{ tool.serialNumber }}</td>
            <td>{{ tool.toolName }}</td>
            <td>
              <VChip size="x-small" variant="outlined">{{ tool.category }}</VChip>
            </td>
            <td class="font-weight-bold" :class="{ 'text-error': tool.isExpired }">
              {{ tool.nextCalibrationDue ?? 'No Calibration Set' }}
            </td>
            <td>
              <VChip v-if="tool.isExpired" color="error" size="small" variant="flat">
                EXPIRED / BLOCKED
              </VChip>
              <VChip v-else color="success" size="small" variant="flat"> CALIBRATED & VALID </VChip>
            </td>
            <td>
              <VChip
                :color="
                  tool.status === 'AVAILABLE'
                    ? 'success'
                    : tool.status === 'CHECKED_OUT'
                      ? 'warning'
                      : 'error'
                "
                size="small"
                variant="tonal"
              >
                {{ tool.status }}
              </VChip>
            </td>
            <td class="text-end">
              <InventoryTableActions>
                <DsTooltipIconButton
                  v-if="
                    can('inventory.tool.checkout').allowed &&
                      tool.status === 'AVAILABLE' &&
                      !tool.isExpired
                  "
                  color="primary"
                  icon="mdi-export"
                  size="small"
                  tooltip="Check-out tool"
                  variant="tonal"
                  @click="openCheckout(tool)"
                />
                <DsTooltipIconButton
                  v-if="can('inventory.tool.checkout').allowed && tool.status === 'CHECKED_OUT'"
                  color="warning"
                  icon="mdi-import"
                  size="small"
                  tooltip="Kembalikan tool"
                  variant="tonal"
                  @click="openReturn(tool)"
                />
                <DsTooltipIconButton
                  v-if="can('inventory.tool.manage').allowed"
                  color="info"
                  icon="mdi-certificate-outline"
                  size="small"
                  tooltip="Update kalibrasi"
                  variant="text"
                  @click="openCalibrate(tool)"
                />
              </InventoryTableActions>
            </td>
          </tr>
          <tr v-if="!pending && !(tools?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="8">
              Belum ada data Tool / GSE terdaftar.
            </td>
          </tr>
        </tbody>
      </VTable>
    </InventoryPanel>

    <!-- Dialog Add Tool -->
    <VDialog v-model="showAddTool" max-width="500">
      <VCard>
        <VCardTitle class="font-weight-bold">Registrasi Tool / Test Equipment Baru</VCardTitle>
        <VCardText>
          <VTextField
            v-model="newTool.toolNumber"
            label="Tool Code / P/N"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="newTool.serialNumber"
            label="Serial Number"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="newTool.toolName"
            label="Nama Tool / Alat Ukur"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="newTool.warehouseId"
            label="Warehouse ID"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="newTool.binId"
            label="Bin ID (optional)"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="newTool.certificateNumber"
            label="Nomor Sertifikat Kalibrasi"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model.number="newTool.calibrationIntervalDays"
            type="number"
            label="Interval Kalibrasi (Hari)"
            density="compact"
            variant="outlined"
          />
        </VCardText>
        <InventoryDialogActions
          :disabled="!newTool.toolNumber || !newTool.serialNumber || !newTool.toolName"
          :loading="isSubmitting"
          submit-text="Simpan tool"
          @cancel="showAddTool = false"
          @submit="submitCreateTool"
        />
      </VCard>
    </VDialog>

    <!-- Dialog Check-Out Tool -->
    <VDialog v-model="showCheckoutModal" max-width="450">
      <VCard>
        <VCardTitle class="font-weight-bold">Check-Out Tool</VCardTitle>
        <VCardText>
          <div class="mb-3">
            Penyerahan tool <strong>{{ selectedTool?.toolName }}</strong> (SN:
            {{ selectedTool?.serialNumber }}).
          </div>
          <VTextField
            v-model="checkoutWorkOrder"
            label="Nomor Work Order / Task Card"
            placeholder="Contoh: WO-2026-0812…"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="checkoutNotes"
            label="Catatan"
            density="compact"
            variant="outlined"
          />
        </VCardText>
        <InventoryDialogActions
          :loading="isSubmitting"
          submit-icon="mdi-export"
          submit-text="Proses check-out"
          @cancel="showCheckoutModal = false"
          @submit="submitCheckout"
        />
      </VCard>
    </VDialog>

    <!-- Dialog Return Tool -->
    <VDialog v-model="showReturnModal" max-width="450">
      <VCard>
        <VCardTitle class="font-weight-bold">Pengembalian Tool (Check-In)</VCardTitle>
        <VCardText>
          <div class="mb-4">
            Konfirmasi pengembalian <strong>{{ selectedTool?.toolName }}</strong> ke gudang.
          </div>
          <VBtn
            block
            color="error"
            :disabled="isSubmitting"
            prepend-icon="mdi-alert-circle-outline"
            variant="tonal"
            @click="submitReturn(true)"
          >
            Lapor hilang / rusak
          </VBtn>
        </VCardText>
        <InventoryDialogActions
          :loading="isSubmitting"
          submit-color="success"
          submit-icon="mdi-import"
          submit-text="Kembalikan laik pakai"
          @cancel="showReturnModal = false"
          @submit="submitReturn(false)"
        />
      </VCard>
    </VDialog>

    <!-- Dialog Calibrate -->
    <VDialog v-model="showCalibrateModal" max-width="450">
      <VCard>
        <VCardTitle class="font-weight-bold">Update Sertifikat Kalibrasi</VCardTitle>
        <VCardText>
          <VTextField
            v-model="certNo"
            label="Nomor Sertifikat Kalibrasi Baru"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="calDate"
            type="date"
            label="Tanggal Kalibrasi"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="nextDue"
            type="date"
            label="Tanggal Expiry Kalibrasi Berikutnya"
            density="compact"
            variant="outlined"
          />
        </VCardText>
        <InventoryDialogActions
          :disabled="!calDate || !nextDue || !certNo"
          :loading="isSubmitting"
          submit-color="success"
          submit-icon="mdi-certificate"
          submit-text="Perbarui sertifikat"
          @cancel="showCalibrateModal = false"
          @submit="submitCalibrate"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
