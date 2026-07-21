<script setup lang="ts">
import type { Asset } from '../../../data/assetManagementData';
import { formatDate } from '../../../data/assetManagementData';
import StatusChip from './StatusChip.vue';

const props = defineProps<{
  modelValue: boolean;
  asset: Asset | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'edit', asset: Asset): void;
  (e: 'qrcode', asset: Asset): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});

function formatIdr(v: number) {
  return `IDR ${v.toLocaleString('id-ID')}`;
}
</script>

<template>
  <VDialog v-model="open" max-width="640">
    <VCard v-if="asset" rounded="lg">
      <div class="d-flex align-start justify-space-between pa-5 pb-3">
        <div>
          <div class="text-caption text-medium-emphasis mb-1">{{ asset.code }}</div>
          <div class="text-h6 font-weight-bold">{{ asset.name }}</div>
        </div>
        <VBtn icon="mdi-close" variant="text" size="small" @click="open = false" />
      </div>

      <VDivider />

      <div class="pa-5">
        <div class="d-flex align-center justify-space-between mb-4">
          <StatusChip :status="asset.status" />
          <div class="d-flex" style="gap: 8px">
            <VBtn
              size="small"
              variant="outlined"
              prepend-icon="mdi-pencil-outline"
              @click="emit('edit', asset)"
            >
              Edit
            </VBtn>
            <VBtn
              size="small"
              variant="outlined"
              prepend-icon="mdi-qrcode"
              @click="emit('qrcode', asset)"
            >
              QR Code
            </VBtn>
          </div>
        </div>

        <div class="text-overline text-medium-emphasis mb-2">Basic Information</div>
        <VRow dense class="mb-2">
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Category</div>
            <div class="font-weight-medium">{{ asset.category }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Brand / Model</div>
            <div class="font-weight-medium">{{ asset.brand }} / {{ asset.model }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Serial Number</div>
            <div class="font-weight-medium">{{ asset.serialNumber }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">PIC</div>
            <div class="font-weight-medium">{{ asset.pic }}</div>
          </VCol>
        </VRow>

        <VDivider class="my-4" />

        <div class="text-overline text-medium-emphasis mb-2">Location & Ownership</div>
        <VRow dense class="mb-2">
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Location</div>
            <div class="font-weight-medium">{{ asset.location }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Department</div>
            <div class="font-weight-medium">{{ asset.department }}</div>
          </VCol>
        </VRow>

        <VDivider class="my-4" />

        <div class="text-overline text-medium-emphasis mb-2">Financial</div>
        <VRow dense class="mb-2">
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Purchase Date</div>
            <div class="font-weight-medium">{{ formatDate(asset.purchaseDate) }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Purchase Value</div>
            <div class="font-weight-medium">{{ formatIdr(asset.purchaseValue) }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Useful Life</div>
            <div class="font-weight-medium">{{ asset.usefulLifeYears }} years</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Monthly Depreciation</div>
            <div class="font-weight-medium">{{ formatIdr(asset.monthlyDepreciation) }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Current Book Value</div>
            <div class="font-weight-medium">{{ formatIdr(asset.bookValue) }}</div>
          </VCol>
        </VRow>

        <template v-if="asset.insurance">
          <VDivider class="my-4" />
          <div class="text-overline text-medium-emphasis mb-2">Insurance</div>
          <VRow dense>
            <VCol cols="6">
              <div class="text-caption text-medium-emphasis">Company</div>
              <div class="font-weight-medium">{{ asset.insurance.company }}</div>
            </VCol>
            <VCol cols="6">
              <div class="text-caption text-medium-emphasis">Policy Number</div>
              <div class="font-weight-medium">{{ asset.insurance.policyNumber }}</div>
            </VCol>
            <VCol cols="6">
              <div class="text-caption text-medium-emphasis">Coverage</div>
              <div class="font-weight-medium">{{ formatIdr(asset.insurance.coverage) }}</div>
            </VCol>
            <VCol cols="6">
              <div class="text-caption text-medium-emphasis">Premium</div>
              <div class="font-weight-medium">{{ formatIdr(asset.insurance.premium) }}</div>
            </VCol>
            <VCol cols="6">
              <div class="text-caption text-medium-emphasis">Expiry Date</div>
              <div class="font-weight-medium">
                {{ formatDate(asset.insurance.expiryDate) }}
              </div>
            </VCol>
          </VRow>
        </template>
      </div>
    </VCard>
  </VDialog>
</template>
