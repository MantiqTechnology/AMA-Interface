<script setup lang="ts">
const {
  data: scenario,
  pending,
  error,
  role,
  continueScenario,
  resetScenario
} = await useInternalAogDemo();

const resetDialog = ref(false);
const resetPending = ref(false);
const resetError = ref('');

const canReset = computed(() => ['Maintenance Manager', 'Demo Admin'].includes(role.value));
const primaryActionLabel = computed(() => {
  if (!scenario.value?.nextRole || !scenario.value.nextAction) return 'Skenario selesai';
  if (scenario.value.nextRole !== role.value) return `Lanjut sebagai ${scenario.value.nextRole}`;
  return scenario.value.nextAction.label;
});

async function confirmReset() {
  resetPending.value = true;
  resetError.value = '';
  try {
    await resetScenario();
    resetDialog.value = false;
  } catch (caught) {
    resetError.value = caught instanceof Error ? caught.message : 'Skenario belum dapat direset.';
  } finally {
    resetPending.value = false;
  }
}
</script>

<template>
  <VCard v-if="scenario" data-testid="internal-aog-demo-coach" class="aog-coach mb-4" elevation="0">
    <div class="aog-coach__rail" aria-hidden="true">
      <span
        v-for="step in scenario.totalSteps"
        :key="step"
        class="aog-coach__rail-segment"
        :class="{
          'aog-coach__rail-segment--done': step < scenario.currentStep,
          'aog-coach__rail-segment--current': step === scenario.currentStep
        }"
      />
    </div>

    <VCardText class="aog-coach__content">
      <div class="aog-coach__identity">
        <div class="aog-coach__eyebrow">
          <VIcon icon="mdi-presentation-play" size="15" />
          Panduan demo
        </div>
        <div class="aog-coach__title">{{ scenario.title }}</div>
        <div class="aog-coach__meta">
          <span>Langkah {{ scenario.currentStep }} dari {{ scenario.totalSteps }}</span>
          <span aria-hidden="true">/</span>
          <span>Peran aktif: {{ role }}</span>
        </div>
      </div>

      <div class="aog-coach__next">
        <div class="aog-coach__next-label">Tindakan berikutnya</div>
        <div class="aog-coach__next-value">
          {{ scenario.nextAction?.label ?? 'Alur Internal AOG selesai' }}
        </div>
        <div v-if="scenario.nextRole" class="aog-coach__next-owner">
          Penanggung jawab · {{ scenario.nextRole }}
        </div>
      </div>

      <div class="aog-coach__actions">
        <VBtn
          color="primary"
          :disabled="!scenario.nextAction"
          :prepend-icon="scenario.nextRole === role ? 'mdi-arrow-right' : 'mdi-account-switch'"
          @click="continueScenario"
        >
          {{ primaryActionLabel }}
        </VBtn>
        <VBtn
          v-if="canReset"
          aria-label="Reset skenario Internal AOG"
          icon="mdi-restore"
          size="small"
          variant="text"
          @click="resetDialog = true"
        />
      </div>
    </VCardText>

    <VDialog v-model="resetDialog" max-width="480">
      <VCard>
        <VCardTitle>Reset skenario Internal AOG?</VCardTitle>
        <VCardText>
          Reservasi, issue, instalasi, sign-off, pemeriksaan, dan rilis pada skenario ini akan
          kembali ke baseline awal.
          <VAlert v-if="resetError" type="error" variant="tonal" class="mt-4">
            {{ resetError }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text="Batal" variant="text" @click="resetDialog = false" />
          <VBtn color="warning" :loading="resetPending" @click="confirmReset">
            Reset skenario
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>

  <VAlert v-else-if="error" type="warning" variant="tonal" class="mb-4">
    Panduan Internal AOG belum dapat dimuat. Fitur MRO utama tetap dapat digunakan.
  </VAlert>
  <VSkeletonLoader v-else-if="pending" type="article" class="mb-4" />
</template>

<style scoped>
.aog-coach {
  --aog-graphite: #17212b;
  --aog-steel: #dfe7ed;
  --aog-blue: #1769aa;
  --aog-green: #177245;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--aog-graphite) 22%, transparent);
  border-radius: 14px;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 4%) 1px, transparent 1px) 0 0 / 32px 100%,
    var(--aog-graphite);
  color: white;
}

.aog-coach__rail {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
  padding: 0 4px;
}

.aog-coach__rail-segment {
  height: 5px;
  background: rgb(255 255 255 / 16%);
}

.aog-coach__rail-segment--done {
  background: var(--aog-green);
}

.aog-coach__rail-segment--current {
  background: #57a7e8;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 35%);
}

.aog-coach__content {
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(230px, 1fr) auto;
  align-items: center;
  gap: 28px;
  padding: 20px 24px !important;
}

.aog-coach__eyebrow,
.aog-coach__next-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9fb2c2;
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.aog-coach__title {
  margin-top: 5px;
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.aog-coach__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;
  color: #c3d0da;
  font-size: 0.78rem;
}

.aog-coach__next {
  padding-left: 22px;
  border-left: 1px solid rgb(255 255 255 / 16%);
}

.aog-coach__next-value {
  margin-top: 5px;
  font-weight: 650;
}

.aog-coach__next-owner {
  margin-top: 3px;
  color: #c3d0da;
  font-size: 0.78rem;
}

.aog-coach__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 900px) {
  .aog-coach__content {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .aog-coach__next {
    padding-top: 14px;
    padding-left: 0;
    border-top: 1px solid rgb(255 255 255 / 16%);
    border-left: 0;
  }

  .aog-coach__actions {
    justify-content: space-between;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aog-coach * {
    scroll-behavior: auto !important;
    transition: none !important;
  }
}
</style>
