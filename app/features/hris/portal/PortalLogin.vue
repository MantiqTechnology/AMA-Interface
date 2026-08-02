<script setup lang="ts">
const emit = defineEmits(['logged-in']);

const empCode = ref('EMP-0101');
const pin = ref('123456');
const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  if (!empCode.value || !pin.value) return;
  loading.value = true;
  errorMsg.value = '';

  try {
    const res = await fetchApi<any>('/api/auth/employee-login', {
      method: 'POST',
      body: { employeeCode: empCode.value, pin: pin.value }
    });
    emit('logged-in', res);
  } catch (err: any) {
    errorMsg.value =
      err.data?.error?.message || err.message || 'Login gagal. Periksa Kode Karyawan & PIN.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <VCard border class="max-w-md mx-auto pa-6 mt-8" elevation="2">
    <div class="text-center mb-6">
      <VAvatar color="primary" size="64" class="mb-3">
        <VIcon icon="mdi-account-circle-outline" size="36" />
      </VAvatar>
      <h2 class="text-h5 font-weight-bold text-primary">Login Self-Service Karyawan</h2>
      <p class="text-body-2 text-secondary">Masukkan Kode Karyawan / NIP dan 6-Digit PIN Anda</p>
    </div>

    <VAlert v-if="errorMsg" type="error" variant="tonal" class="mb-4">
      {{ errorMsg }}
    </VAlert>

    <VForm @submit.prevent="handleLogin()">
      <VTextField
        v-model="empCode"
        label="Kode Karyawan / NIP"
        prepend-inner-icon="mdi-card-account-details-outline"
        variant="outlined"
        density="comfortable"
        class="mb-3"
      />
      <VTextField
        v-model="pin"
        label="6-Digit PIN"
        type="password"
        maxlength="6"
        prepend-inner-icon="mdi-lock-outline"
        variant="outlined"
        density="comfortable"
        class="mb-4"
      />

      <VBtn
        type="submit"
        color="primary"
        block
        size="large"
        :loading="loading"
        prepend-icon="mdi-login"
      >
        Masuk Ke Portal Karyawan
      </VBtn>

      <div class="text-caption text-center text-secondary mt-4">
        Default PIN Demo: <strong>123456</strong>
      </div>
    </VForm>
  </VCard>
</template>
