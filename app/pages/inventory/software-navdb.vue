<script setup lang="ts">
import type { InventorySoftwareNavdbDto } from '#shared/features/inventory';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { errorMessage } = useInventoryUi();
const { can } = useAuthorization();
const {
  data: list,
  pending,
  error,
  refresh
} = await useAsyncData('software-navdb', () =>
  fetchApi<InventorySoftwareNavdbDto[]>('/api/inventory/software-navdb')
);

const showModal = ref(false);
const isSubmitting = ref(false);
const actionError = ref('');
const actionMessage = ref('');
const form = reactive({
  softwareName: '',
  systemType: 'FMS / GPS',
  version: '',
  airacCycle: 'AIRAC 2608',
  effectiveDate: new Date().toISOString().slice(0, 10),
  expirationDate: ''
});

async function submitSave() {
  if (!form.softwareName || !form.version || !form.expirationDate) return;
  isSubmitting.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await fetchApi('/api/inventory/software-navdb', {
      method: 'POST',
      body: form
    });
    showModal.value = false;
    actionMessage.value = 'Siklus AIRAC / software berhasil disimpan.';
    await refresh();
  } catch (err: unknown) {
    actionError.value = errorMessage(
      err,
      'Database NavDB tidak dapat diperbarui. Periksa nama, versi, dan tanggal expiry.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="AIRAC NavDB & Software Avionik">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.catalog.manage').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Update AIRAC / software"
        variant="flat"
        @click="showModal = true"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui NavDB"
        variant="text"
        @click="() => refresh()"
      />
    </template>

    <VAlert color="info" icon="mdi-satellite-variant" class="mb-4" variant="tonal">
      <strong>AIRAC 28-Day Cycle Control (ICAO/FAA Standard):</strong> Database Navigasi Avionik
      (Garmin G1000, FMS, EGPWS) wajib diperbarui setiap siklus 28 hari. Sistem memberikan
      peringatan dini otomatis ketika database mendekati tanggal kedaluwarsa.
    </VAlert>
    <VAlert
      v-if="error || actionError"
      aria-live="polite"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ actionError || 'Data AIRAC NavDB tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
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
      subtitle="Pelacakan masa berlaku siklus AIRAC 28-hari & versi firmware avionik"
      title="Status Database Navigasi & Versi Software Armada"
    >
      <VTable>
        <thead>
          <tr>
            <th>Tipe Sistem</th>
            <th>Nama Software / NavDB</th>
            <th>Siklus AIRAC</th>
            <th>Versi Software</th>
            <th>Tanggal Efektif</th>
            <th>Tanggal Expiry</th>
            <th>Sisa Hari</th>
            <th>Status Kelaikan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list ?? []" :key="item.id">
            <td class="font-weight-bold">{{ item.systemType }}</td>
            <td class="font-weight-bold text-primary">{{ item.softwareName }}</td>
            <td>
              <VChip size="small" color="primary" variant="flat">
                {{ item.airacCycle ?? 'N/A' }}
              </VChip>
            </td>
            <td>{{ item.version }}</td>
            <td>{{ item.effectiveDate }}</td>
            <td class="font-weight-bold" :class="{ 'text-error': item.daysLeft <= 7 }">
              {{ item.expirationDate }}
            </td>
            <td class="font-weight-bold">{{ item.daysLeft }} hari</td>
            <td>
              <VChip
                :color="
                  item.status === 'ACTIVE'
                    ? 'success'
                    : item.status === 'EXPIRING_SOON'
                      ? 'warning'
                      : 'error'
                "
                size="small"
                variant="flat"
              >
                {{ item.status }}
              </VChip>
            </td>
          </tr>
          <tr v-if="!pending && !(list?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="8">
              Belum ada data database NavDB / Software terdaftar.
            </td>
          </tr>
        </tbody>
      </VTable>
    </InventoryPanel>

    <VDialog v-model="showModal" max-width="500">
      <VCard>
        <VCardTitle class="font-weight-bold">Update Database AIRAC / Software Avionik</VCardTitle>
        <VCardText>
          <VTextField
            v-model="form.softwareName"
            label="Nama Software / Database NavDB"
            placeholder="e.g. Garmin G1000 NXi AIRAC 2608"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="form.systemType"
            label="Tipe sistem (contoh: FMS, GPS, EGPWS)"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="form.version"
            label="Versi Software / Cycle Version"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="form.airacCycle"
            label="Kode siklus AIRAC (contoh: AIRAC 2608)"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="form.effectiveDate"
            type="date"
            label="Tanggal Efektif"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="form.expirationDate"
            type="date"
            label="Tanggal expiry"
            density="compact"
            variant="outlined"
          />
        </VCardText>
        <InventoryDialogActions
          :disabled="!form.softwareName || !form.version || !form.expirationDate"
          :loading="isSubmitting"
          submit-text="Simpan siklus"
          @cancel="showModal = false"
          @submit="submitSave"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
