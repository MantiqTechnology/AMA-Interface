<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    buttonLabel?: string;
  }>(),
  {
    title: 'Panduan Demo',
    description:
      'Ini adalah tampilan demo sistem Procurement. Data yang ditampilkan bersifat dummy dan hanya untuk keperluan presentasi.',
    buttonLabel: 'Lihat Panduan'
  }
);

const dialog = ref(false);
</script>

<template>
  <div class="guide-banner">
    <div class="guide-banner__icon">
      <VIcon icon="mdi-information-outline" size="20" />
    </div>
    <div class="guide-banner__body">
      <div class="guide-banner__title">{{ title }}</div>
      <p class="guide-banner__desc">{{ description }}</p>
    </div>
    <VBtn
      variant="outlined"
      color="white"
      size="small"
      class="guide-banner__cta"
      prepend-icon="mdi-book-open-page-variant-outline"
      @click="dialog = true"
    >
      {{ buttonLabel }}
    </VBtn>

    <VDialog v-model="dialog" max-width="560">
      <VCard rounded="lg">
        <VCardItem>
          <VCardTitle class="text-h6 font-weight-bold">Panduan Penggunaan Demo Procurement</VCardTitle>
        </VCardItem>
        <VCardText class="text-body-2" style="color: #334155">
          <ul class="guide-list">
            <li>Seluruh data (PO, PR, vendor, delivery, spend) bersifat dummy dan disimpan lokal di browser Anda.</li>
            <li>Gunakan tombol <strong>Refresh</strong> di setiap halaman untuk mensimulasikan pembaruan data real-time.</li>
            <li>Aksi seperti Approve, Reject, Send to Vendor, Receive, atau Match hanya mengubah status secara lokal. Tidak ada perubahan yang tersimpan ke server.</li>
            <li>Klik baris pada tabel untuk membuka detail (drawer/dialog) dari data terkait.</li>
            <li>Gunakan tab navigasi di atas untuk berpindah antar sub-modul Procurement.</li>
          </ul>
        </VCardText>
        <VCardActions class="pa-4 pt-0">
          <VSpacer />
          <VBtn color="primary" variant="flat" @click="dialog = false">Mengerti</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.guide-banner {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: linear-gradient(135deg, #0b2a43 0%, #082b49 100%);
  border-radius: 10px;
  padding: 18px 20px;
  color: #fff;
}

.guide-banner__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.guide-banner__body {
  flex: 1;
  min-width: 0;
}

.guide-banner__title {
  font-size: 14.5px;
  font-weight: 700;
  margin-bottom: 4px;
}

.guide-banner__desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
  margin: 0;
  line-height: 1.5;
}

.guide-banner__cta {
  flex-shrink: 0;
  border-color: rgba(255, 255, 255, 0.35) !important;
  align-self: center;
}

.guide-list {
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
