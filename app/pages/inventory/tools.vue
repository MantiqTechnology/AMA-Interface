<script setup lang="ts">
import type { InventoryToolDto } from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { errorMessage } = useInventoryUi();
const { can } = useAuthorization();
const {
  data: tools,
  pending,
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
  try {
    await fetchApi('/api/inventory/tools', {
      method: 'POST',
      body: newTool
    });
    showAddTool.value = false;
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Gagal menambahkan tool.'));
  } finally {
    isSubmitting.value = false;
  }
}

async function submitCheckout() {
  if (!selectedTool.value) return;
  isSubmitting.value = true;
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
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Gagal check-out tool.'));
  } finally {
    isSubmitting.value = false;
  }
}

async function submitReturn(missing = false) {
  if (!selectedTool.value) return;
  isSubmitting.value = true;
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
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Gagal kembalikan tool.'));
  } finally {
    isSubmitting.value = false;
  }
}

async function submitCalibrate() {
  if (!selectedTool.value || !calDate.value || !nextDue.value || !certNo.value) return;
  isSubmitting.value = true;
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
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Gagal update kalibrasi.'));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Tool Control & GSE Calibration Management">
    <template #actions>
      <VBtn
        v-if="can('inventory.tool.manage').allowed"
        color="primary"
        prepend-icon="mdi-plus"
        @click="showAddTool = true"
      >
        Daftarkan Tool / GSE Baru
      </VBtn>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh list tools"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert color="info" icon="mdi-wrench-clock" class="mb-4" variant="tonal">
      <strong>Aturan Kelaikan Tool (DKPPU/FAA):</strong> Tool dan Test Equipment wajib memiliki
      Sertifikat Kalibrasi aktif. Tool yang terlewat tanggal kalibrasinya (<em>Expired</em>)
      di-block otomatis oleh sistem dari proses Check-Out dan Sign-Off Task Card Perawatan.
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex align-center py-3 px-4">
        <div>
          <h2 class="text-h6 font-weight-bold">Master Tool & Test Equipment</h2>
          <div class="text-caption text-medium-emphasis">
            Pelacakan kalibrasi, check-out / check-in, dan lokasi penyimpanan tool
          </div>
        </div>
        <VSpacer />
      </VCardTitle>

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
                🔴 EXPIRED / BLOCKED
              </VChip>
              <VChip v-else color="success" size="small" variant="flat">
                🟡 CALIBRATED & VALID
              </VChip>
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
              <div class="d-flex justify-end ga-2">
                <VBtn
                  v-if="
                    can('inventory.tool.checkout').allowed &&
                      tool.status === 'AVAILABLE' &&
                      !tool.isExpired
                  "
                  color="primary"
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-export"
                  @click="openCheckout(tool)"
                >
                  Check-Out
                </VBtn>
                <VBtn
                  v-if="can('inventory.tool.checkout').allowed && tool.status === 'CHECKED_OUT'"
                  color="warning"
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-import"
                  @click="openReturn(tool)"
                >
                  Return Tool
                </VBtn>
                <VBtn
                  v-if="can('inventory.tool.manage').allowed"
                  color="info"
                  size="small"
                  variant="text"
                  prepend-icon="mdi-certificate"
                  @click="openCalibrate(tool)"
                >
                  Update Kalibrasi
                </VBtn>
              </div>
            </td>
          </tr>
          <tr v-if="!pending && !(tools?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="8">
              Belum ada data Tool / GSE terdaftar.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

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
        <VCardActions class="justify-end px-4 pb-4">
          <VBtn variant="text" @click="showAddTool = false">Batal</VBtn>
          <VBtn color="primary" variant="flat" :loading="isSubmitting" @click="submitCreateTool">
            Simpan Tool
          </VBtn>
        </VCardActions>
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
            placeholder="e.g. WO-2026-0812"
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
        <VCardActions class="justify-end px-4 pb-4">
          <VBtn variant="text" @click="showCheckoutModal = false">Batal</VBtn>
          <VBtn color="primary" variant="flat" :loading="isSubmitting" @click="submitCheckout">
            Proses Check-Out
          </VBtn>
        </VCardActions>
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
        </VCardText>
        <VCardActions class="justify-end ga-2 px-4 pb-4">
          <VBtn color="error" variant="tonal" @click="submitReturn(true)">
            Lapor Hilang / Damaged
          </VBtn>
          <VBtn color="success" variant="flat" :loading="isSubmitting" @click="submitReturn(false)">
            Kembalikan (Laik Pakai)
          </VBtn>
        </VCardActions>
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
        <VCardActions class="justify-end px-4 pb-4">
          <VBtn variant="text" @click="showCalibrateModal = false">Batal</VBtn>
          <VBtn color="success" variant="flat" :loading="isSubmitting" @click="submitCalibrate">
            Perbarui Sertifikat
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
