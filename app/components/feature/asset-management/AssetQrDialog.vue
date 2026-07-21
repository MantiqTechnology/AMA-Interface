<script setup lang="ts">
import type { Asset } from '../../../data/assetManagementData';

const props = defineProps<{
  modelValue: boolean;
  asset: Asset | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});

const qrPayload = computed(() => {
  if (!props.asset) return '';
  return JSON.stringify({
    code: props.asset.code,
    name: props.asset.name,
    location: props.asset.location
  });
});

const qrImageUrl = computed(() => {
  if (!qrPayload.value) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(qrPayload.value)}`;
});

const downloading = ref(false);

async function downloadQr() {
  if (!props.asset) return;
  downloading.value = true;
  try {
    const response = await fetch(qrImageUrl.value);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${props.asset.code}.png`;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    // fallback: open image in a new tab so the user can save it manually
    window.open(qrImageUrl.value, '_blank');
  } finally {
    downloading.value = false;
  }
}

function printQr() {
  if (!props.asset) return;
  const win = window.open('', '_blank', 'width=420,height=560');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>QR - ${props.asset.code}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 24px; }
          img { width: 240px; height: 240px; }
          h2 { margin: 12px 0 2px; font-size: 16px; }
          p { margin: 0; color: #555; font-size: 12px; }
        </style>
      </head>
      <body>
        <img src="${qrImageUrl.value}" onload="window.print()" />
        <h2>${props.asset.code}</h2>
        <p>${props.asset.name}</p>
        <p>${props.asset.location}</p>
      </body>
    </html>
  `);
  win.document.close();
}
</script>

<template>
  <VDialog v-model="open" max-width="380">
    <VCard v-if="asset" rounded="lg" class="text-center">
      <div class="d-flex align-center justify-space-between pa-4 pb-0">
        <div class="text-subtitle-1 font-weight-bold">Asset QR Code</div>
        <VBtn icon="mdi-close" variant="text" size="small" @click="open = false" />
      </div>

      <div class="pa-6 pt-3">
        <VSheet border rounded="lg" class="d-inline-flex pa-3 mb-4">
          <VImg :src="qrImageUrl" width="220" height="220" />
        </VSheet>
        <div class="font-weight-bold">{{ asset.code }}</div>
        <div class="text-body-2 text-medium-emphasis mb-1">{{ asset.name }}</div>
        <div class="text-caption text-medium-emphasis">{{ asset.location }}</div>
      </div>

      <VDivider />
      <VCardActions class="pa-4">
        <VBtn block variant="outlined" prepend-icon="mdi-printer-outline" @click="printQr">
          Print
        </VBtn>
        <VBtn
          block
          color="primary"
          :loading="downloading"
          prepend-icon="mdi-tray-arrow-down"
          @click="downloadQr"
        >
          Download
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
