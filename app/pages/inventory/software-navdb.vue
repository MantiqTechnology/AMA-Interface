<script setup lang="ts">
import type { InventorySoftwareNavdbDto } from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { errorMessage } = useInventoryUi();
const {
  data: list,
  pending,
  refresh
} = await useAsyncData('software-navdb', () =>
  fetchApi<InventorySoftwareNavdbDto[]>('/api/inventory/software-navdb')
);

const showModal = ref(false);
const isSubmitting = ref(false);
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
  try {
    await fetchApi('/api/inventory/software-navdb', {
      method: 'POST',
      body: form
    });
    showModal.value = false;
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Gagal update database NavDB.'));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Avionics Software & AIRAC NavDB Tracker">
    <template #actions>
      <VBtn color="primary" prepend-icon="mdi-plus" @click="showModal = true">
        Update Database AIRAC / Software
      </VBtn>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh list NavDB"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert color="info" icon="mdi-satellite-variant" class="mb-4" variant="tonal">
      <strong>AIRAC 28-Day Cycle Control (ICAO/FAA Standard):</strong> Database Navigasi Avionik
      (Garmin G1000, FMS, EGPWS) wajib diperbarui setiap siklus 28 hari. Sistem memberikan
      peringatan dini otomatis ketika database mendekati tanggal kedaluwarsa.
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex align-center py-3 px-4">
        <div>
          <h2 class="text-h6 font-weight-bold">Status Database Navigasi & Versi Software Armada</h2>
          <div class="text-caption text-medium-emphasis">
            Pelacakan masa berlaku siklus AIRAC 28-hari & versi firmware avionik
          </div>
        </div>
        <VSpacer />
      </VCardTitle>

      <VTable>
        <thead>
          <tr>
            <th>System Type</th>
            <th>Nama Software / NavDB</th>
            <th>Siklus AIRAC</th>
            <th>Versi Software</th>
            <th>Effective Date</th>
            <th>Expiration Date</th>
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
    </VCard>

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
            label="System Type (e.g. FMS, GPS, EGPWS)"
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
            label="Kode Siklus AIRAC (e.g. AIRAC 2608)"
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
            label="Tanggal Expiration (Kedaluwarsa)"
            density="compact"
            variant="outlined"
          />
        </VCardText>
        <VCardActions class="justify-end px-4 pb-4">
          <VBtn variant="text" @click="showModal = false">Batal</VBtn>
          <VBtn color="primary" variant="flat" :loading="isSubmitting" @click="submitSave">
            Simpan Siklus Baru
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
