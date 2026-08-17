<script setup lang="ts">
import type { InventoryQuarantineItemDto } from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { errorMessage } = useInventoryUi();
const {
  data: items,
  pending,
  refresh
} = await useAsyncData('quarantine-items', () =>
  fetchApi<InventoryQuarantineItemDto[]>('/api/inventory/quarantine')
);

const showReleaseModal = ref(false);
const selectedSerial = ref<InventoryQuarantineItemDto | null>(null);
const releaseTargetBinId = ref('');
const releaseCertRef = ref('');
const isSubmitting = ref(false);

function openRelease(item: InventoryQuarantineItemDto) {
  selectedSerial.value = item;
  releaseTargetBinId.value = '';
  releaseCertRef.value = '';
  showReleaseModal.value = true;
}

async function submitRelease() {
  if (!selectedSerial.value || !releaseTargetBinId.value || !releaseCertRef.value) return;
  isSubmitting.value = true;
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
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Quarantine release failed.'));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Digital Quarantine & SUP Management">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh quarantine records"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert color="warning" icon="mdi-shield-lock-outline" class="mb-4" variant="tonal">
      <strong>Digital Quarantine Enforcement:</strong> Suku cadang dengan status Quarantine atau
      Suspected Unapproved Parts (SUP) dikunci secara digital. Part tidak dapat di-issue ke Work
      Order atau di-transfer sampai Inspektur QA memverifikasi sertifikat (FAA Form 8130-3 / EASA
      Form 1) dan menyetujui Quarantine Release.
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex align-center py-3 px-4">
        <div>
          <h2 class="text-h6 font-weight-bold">Quarantine Area & Locked Stock</h2>
          <div class="text-caption text-medium-emphasis">
            Daftar komponen yang ditahan untuk inspeksi & verifikasi sertifikat kelaikan
          </div>
        </div>
        <VSpacer />
        <VChip color="warning" size="small" variant="flat">
          {{ items?.length ?? 0 }} Items Quarantined
        </VChip>
      </VCardTitle>

      <VTable>
        <thead>
          <tr>
            <th>Airworthiness Tag</th>
            <th>Part Number</th>
            <th>Part Name</th>
            <th>Serial Number</th>
            <th>Quarantine Reason</th>
            <th>Location / Station</th>
            <th>SUP Flag</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items ?? []" :key="item.serialId">
            <td>
              <VChip color="orange-darken-2" size="small" variant="flat" class="font-weight-bold">
                🟠 ORANGE - QUARANTINE
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
                🔴 SUSPECTED UNAPPROVED PART
              </VChip>
              <span v-else class="text-caption text-medium-emphasis">Pending Inspection</span>
            </td>
            <td class="text-end">
              <VBtn
                color="success"
                size="small"
                prepend-icon="mdi-lock-open-check-outline"
                variant="tonal"
                @click="openRelease(item)"
              >
                Release to Available
              </VBtn>
            </td>
          </tr>
          <tr v-if="!pending && !(items?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="8">
              Tidak ada suku cadang di area Karantina. Semua komponen dalam kondisi Serviceable!
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <!-- Quarantine Release Dialog -->
    <VDialog v-model="showReleaseModal" max-width="500">
      <VCard>
        <VCardTitle class="font-weight-bold">
          Quarantine Release (Release to Serviceable)
        </VCardTitle>
        <VCardText>
          <div class="mb-3 text-body-2">
            Verifikasi sertifikat kelaikan (CoC / Form 8130-3 / EASA Form 1) untuk melepas kuncian
            digital pada serial
            <strong>{{ selectedSerial?.serialNumber }}</strong> ({{ selectedSerial?.partNumber }}).
          </div>
          <VTextField
            v-model="releaseCertRef"
            label="Airworthiness Certificate Ref (Form 8130-3 / EASA Form 1)"
            placeholder="e.g. FAA-8130-2026-90412"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="releaseTargetBinId"
            label="Target Serviceable Bin ID"
            placeholder="e.g. inv-bin-djj-shelf-a"
            density="compact"
            variant="outlined"
          />
        </VCardText>
        <VCardActions class="justify-end px-4 pb-4">
          <VBtn variant="text" @click="showReleaseModal = false">Batal</VBtn>
          <VBtn color="success" variant="flat" :loading="isSubmitting" @click="submitRelease">
            Approve Release (🟡 Yellow Tag)
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
