<script setup lang="ts">
import type { InventoryFlyAwayKitDto } from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { errorMessage } = useInventoryUi();
const { can } = useAuthorization();
const {
  data: kits,
  pending,
  refresh
} = await useAsyncData('fly-away-kits', () =>
  fetchApi<InventoryFlyAwayKitDto[]>('/api/inventory/fly-away-kits')
);

const showModal = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  kitNumber: '',
  aircraftId: 'ac-pk-ama',
  partId: 'inv-part-filter-pc6',
  requiredQuantity: 2,
  currentQuantity: 2
});

async function submitCreateKit() {
  if (!form.kitNumber || !form.partId) return;
  isSubmitting.value = true;
  try {
    await fetchApi('/api/inventory/fly-away-kits', {
      method: 'POST',
      body: {
        kitNumber: form.kitNumber,
        aircraftId: form.aircraftId,
        items: [
          {
            partId: form.partId,
            requiredQuantity: form.requiredQuantity,
            currentQuantity: form.currentQuantity,
            condition: 'SERVICEABLE'
          }
        ]
      }
    });
    showModal.value = false;
    await refresh();
  } catch (err: unknown) {
    alert(errorMessage(err, 'Gagal membuat Fly Away Kit.'));
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Fly Away Kit (FAK) Onboard Spare Parts">
    <template #actions>
      <VBtn
        v-if="can('inventory.catalog.manage').allowed"
        color="primary"
        prepend-icon="mdi-plus"
        @click="showModal = true"
      >
        Daftarkan Fly Away Kit Baru
      </VBtn>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh list kit"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert color="info" icon="mdi-briefcase-variant" class="mb-4" variant="tonal">
      <strong>Fly Away Kit (FAK) Perintis:</strong> Kotak suku cadang darurat bawaan pesawat
      (seperti O-ring, filter, spark plug, fluid, fastener) yang wajib dibawa dalam penerbangan ke
      daerah terpencil. Kelengkapan kit diaudit secara berkala sebelum keberangkatan.
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex align-center py-3 px-4">
        <div>
          <h2 class="text-h6 font-weight-bold">Daftar Fly Away Kit Terpasang / Onboard</h2>
          <div class="text-caption text-medium-emphasis">
            Status kelengkapan komponen cadangan darurat per registrasi pesawat
          </div>
        </div>
        <VSpacer />
      </VCardTitle>

      <VTable>
        <thead>
          <tr>
            <th>Kode Kit</th>
            <th>Registrasi Pesawat</th>
            <th>Status Kit</th>
            <th>Terakhir Diaudit</th>
            <th>Komponen & Kuantitas Onboard</th>
            <th>Status Kelengkapan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="kit in kits ?? []" :key="kit.id">
            <td class="font-weight-bold">{{ kit.kitNumber }}</td>
            <td class="font-weight-bold text-primary">
              {{ kit.aircraftRegistration ?? 'Movable / Unassigned' }}
            </td>
            <td>
              <VChip color="info" size="small" variant="flat">{{ kit.status }}</VChip>
            </td>
            <td>{{ kit.lastInspectedAt ?? kit.assignedAt }}</td>
            <td>
              <div v-for="item in kit.items" :key="item.id" class="text-caption">
                <strong>{{ item.partNumber }}</strong>: {{ item.currentQuantity }} /
                {{ item.requiredQuantity }}
                {{ item.unitOfMeasure ?? 'EA' }}
              </div>
            </td>
            <td>
              <VChip :color="kit.isComplete ? 'success' : 'warning'" size="small" variant="flat">
                {{ kit.isComplete ? 'COMPLETE & READY' : 'REPLENISHMENT NEEDED' }}
              </VChip>
            </td>
          </tr>
          <tr v-if="!pending && !(kits?.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="6">
              Belum ada data Fly Away Kit terdaftar.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <VDialog v-model="showModal" max-width="500">
      <VCard>
        <VCardTitle class="font-weight-bold">Buat Fly Away Kit Baru</VCardTitle>
        <VCardText>
          <VTextField
            v-model="form.kitNumber"
            label="Kode Kit (e.g. FAK-PK-AMA-02)"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="form.aircraftId"
            label="Aircraft ID / Registrasi"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VTextField
            v-model="form.partId"
            label="Initial Spare Part ID"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <VRow>
            <VCol cols="6">
              <VTextField
                v-model.number="form.requiredQuantity"
                type="number"
                label="Required Qty"
                density="compact"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model.number="form.currentQuantity"
                type="number"
                label="Current Qty Onboard"
                density="compact"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="justify-end px-4 pb-4">
          <VBtn variant="text" @click="showModal = false">Batal</VBtn>
          <VBtn color="primary" variant="flat" :loading="isSubmitting" @click="submitCreateKit">
            Simpan Kit
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
