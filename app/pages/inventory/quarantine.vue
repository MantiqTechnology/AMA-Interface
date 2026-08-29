<script setup lang="ts">
import type { InventoryQuarantineItemDto } from '#shared/features/inventory';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const { errorMessage } = useInventoryUi();
const { can } = useAuthorization();
const {
  data: items,
  pending,
  error,
  refresh
} = await useAsyncData('quarantine-items', () =>
  fetchApi<InventoryQuarantineItemDto[]>('/api/inventory/quarantine')
);

const showReleaseModal = ref(false);
const selectedSerial = ref<InventoryQuarantineItemDto | null>(null);
const releaseTargetBinId = ref('');
const releaseCertRef = ref('');
const isSubmitting = ref(false);
const actionError = ref('');
const actionMessage = ref('');

function openRelease(item: InventoryQuarantineItemDto) {
  selectedSerial.value = item;
  releaseTargetBinId.value = '';
  releaseCertRef.value = '';
  actionError.value = '';
  showReleaseModal.value = true;
}

async function submitRelease() {
  if (!selectedSerial.value || !releaseTargetBinId.value || !releaseCertRef.value) return;
  isSubmitting.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await fetchApi('/api/inventory/quarantine/release', {
      method: 'POST',
      body: {
        serialId: selectedSerial.value.serialId,
        targetBinId: releaseTargetBinId.value,
        certificateReference: releaseCertRef.value
      }
    });
    showReleaseModal.value = false;
    actionMessage.value = 'Part karantina berhasil dilepas ke bin serviceable.';
    await refresh();
  } catch (err: unknown) {
    actionError.value = errorMessage(
      err,
      'Quarantine release gagal. Verifikasi sertifikat dan target bin.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Karantina Digital & SUP">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui record karantina"
        variant="text"
        @click="() => refresh()"
      />
    </template>

    <VAlert color="warning" icon="mdi-shield-lock-outline" class="mb-4" variant="tonal">
      <strong>Digital Quarantine Enforcement:</strong> Suku cadang dengan status Quarantine atau
      Suspected Unapproved Parts (SUP) dikunci secara digital. Part tidak dapat di-issue ke Work
      Order atau di-transfer sampai Inspektur QA memverifikasi sertifikat (FAA Form 8130-3 / EASA
      Form 1) dan menyetujui Quarantine Release.
    </VAlert>
    <VAlert
      v-if="error || actionError"
      aria-live="polite"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ actionError || 'Data karantina tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
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
      subtitle="Daftar komponen yang ditahan untuk inspeksi & verifikasi sertifikat kelaikan"
      title="Area Karantina & Stok Terkunci"
    >
      <template #actions>
        <VChip color="warning" size="small" variant="flat">
          {{ items?.length ?? 0 }} item dikarantina
        </VChip>
      </template>
      <VTable>
        <thead>
          <tr>
            <th>Tag Kelaikan</th>
            <th>Nomor Part</th>
            <th>Nama Part</th>
            <th>Nomor Seri</th>
            <th>Alasan Karantina</th>
            <th>Lokasi / Station</th>
            <th>SUP Flag</th>
            <th class="text-end">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items ?? []" :key="item.serialId">
            <td>
              <VChip color="orange-darken-2" size="small" variant="flat" class="font-weight-bold">
                ORANGE - QUARANTINE
              </VChip>
            </td>
            <td class="font-weight-bold text-no-wrap">{{ item.partNumber }}</td>
            <td>{{ item.partName }}</td>
            <td class="font-weight-bold text-primary">{{ item.serialNumber }}</td>
            <td class="text-caption">{{ item.quarantineReason }}</td>
            <td>
              <div>{{ item.warehouseName ?? '-' }}</div>
              <div class="text-caption text-medium-emphasis">Bin: {{ item.binCode ?? '-' }}</div>
            </td>
            <td>
              <VChip v-if="item.isSuspectedUnapproved" color="error" size="x-small" variant="flat">
                SUSPECTED UNAPPROVED PART
              </VChip>
              <span v-else class="text-caption text-medium-emphasis">Menunggu inspeksi</span>
            </td>
            <td class="text-end">
              <InventoryTableActions>
                <DsTooltipIconButton
                  v-if="can('inventory.quarantine.release').allowed"
                  color="success"
                  icon="mdi-lock-open-check-outline"
                  size="small"
                  tooltip="Release ke serviceable"
                  variant="tonal"
                  @click="openRelease(item)"
                />
              </InventoryTableActions>
            </td>
          </tr>
          <tr v-if="!pending && !(items?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="8">
              Tidak ada suku cadang di area Karantina. Semua komponen dalam kondisi Serviceable!
            </td>
          </tr>
        </tbody>
      </VTable>
    </InventoryPanel>

    <!-- Quarantine Release Dialog -->
    <VDialog v-model="showReleaseModal" max-width="500">
      <VCard>
        <VCardTitle class="font-weight-bold">Quarantine Release</VCardTitle>
        <VCardText>
          <div class="mb-3 text-body-2">
            Verifikasi sertifikat kelaikan (CoC / Form 8130-3 / EASA Form 1) untuk melepas kuncian
            digital pada serial
            <strong>{{ selectedSerial?.serialNumber }}</strong> ({{ selectedSerial?.partNumber }}).
          </div>
          <VTextField
            v-model="releaseCertRef"
            label="Referensi sertifikat kelaikan"
            placeholder="Contoh: FAA-8130-2026-90412…"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="releaseTargetBinId"
            label="Target serviceable bin ID"
            placeholder="Contoh: inv-bin-djj-shelf-a…"
            density="compact"
            variant="outlined"
          />
        </VCardText>
        <InventoryDialogActions
          :disabled="!releaseTargetBinId || !releaseCertRef"
          :loading="isSubmitting"
          submit-color="success"
          submit-icon="mdi-lock-open-check-outline"
          submit-text="Setujui release"
          @cancel="showReleaseModal = false"
          @submit="submitRelease"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
