<script setup lang="ts">
definePageMeta({
  layout: false
});

const loading = ref(false);

async function login() {
  loading.value = true;
  await navigateTo('/ops/command-center');
}
</script>

<template>
  <div class="min-h-screen bg-bg-canvas">
    <div class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section class="relative hidden overflow-hidden bg-brand-primary p-10 text-white lg:flex">
        <div class="absolute inset-0 opacity-20">
          <div class="absolute left-16 top-20 h-44 w-44 rounded-full border border-white/40" />
          <div class="absolute bottom-20 right-16 h-64 w-64 rounded-full border border-white/30" />
          <div class="absolute left-1/3 top-1/3 h-px w-130 rotate-[-24deg] bg-white/40" />
          <div class="absolute left-1/4 top-1/2 h-px w-105 rotate-18 bg-white/30" />
        </div>

        <div class="relative z-10 flex w-full flex-col justify-between">
          <div>
            <div class="mb-10 flex items-center justify-start gap-4 text-left">
              <div>
                <VImg
                  alt="PT AMA logo"
                  class="shrink-0"
                  height="72"
                  src="https://amapapua.com/files/ama-pt-logo-shaded4.png"
                  width="96"
                />
                <div class="text-sm uppercase text-white/70">Ops Interface</div>
              </div>
            </div>

            <div class="max-w-xl">
              <VChip class="mb-5" color="accent-cenderawasih" variant="elevated">
                Internal aviation operations prototype
              </VChip>
              <h1 class="text-5xl font-bold leading-tight">
                Operations control for demo flight readiness.
              </h1>
              <p class="mt-5 max-w-lg text-lg text-white/75">
                Fixture-based command center for flight request, readiness, dispatch, following, and
                closure scenarios.
              </p>
            </div>
          </div>

          <div class="grid max-w-2xl gap-4">
            <VCard color="surface" variant="tonal">
              <VCardText>
                <div class="mb-4 flex items-center justify-between">
                  <span class="font-semibold text-white">Live demo board</span>
                  <VChip color="accent-cenderawasih" size="small">Mock</VChip>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="rounded-lg bg-white/10 p-4">
                    <div class="text-2xl font-bold">4</div>
                    <div class="text-sm text-white/70">Requests</div>
                  </div>
                  <div class="rounded-lg bg-white/10 p-4">
                    <div class="text-2xl font-bold">2</div>
                    <div class="text-sm text-white/70">Blockers</div>
                  </div>
                  <div class="rounded-lg bg-white/10 p-4">
                    <div class="text-2xl font-bold">1</div>
                    <div class="text-sm text-white/70">Airborne</div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </div>
        </div>
      </section>

      <main class="flex min-h-screen items-center justify-center p-6">
        <VCard border class="w-full max-w-110" elevation="0">
          <VCardText class="p-8">
            <div class="mb-8 lg:hidden">
              <div class="mb-3 flex items-center justify-start gap-3 text-left">
                <VImg
                  alt="PT AMA logo"
                  class="shrink-0"
                  height="56"
                  src="https://amapapua.com/files/ama-pt-logo-shaded4.png"
                  width="82"
                />
                <div>
                  <div class="text-xl font-bold text-brand-primary">PT AMA</div>
                  <div class="text-xs uppercase text-text-secondary">Ops Interface</div>
                </div>
              </div>
            </div>

            <div class="mb-8">
              <VChip class="mb-4" color="accent-cenderawasih" variant="tonal"> Demo access </VChip>
              <h1 class="text-3xl font-bold text-brand-primary">Sign in</h1>
              <p class="mt-2 text-text-secondary">
                Local demo login. Tombol masuk langsung membuka aplikasi tanpa autentikasi nyata.
              </p>
            </div>

            <div class="grid gap-4">
              <VTextField
                density="comfortable"
                label="Workspace"
                model-value="PT AMA Demo"
                prepend-inner-icon="mdi-domain"
                readonly
                variant="outlined"
              />
              <VTextField
                density="comfortable"
                label="Demo user"
                model-value="Nadia Latuperissa - Flight Coordinator"
                prepend-inner-icon="mdi-account-outline"
                readonly
                variant="outlined"
              />

              <VBtn
                block
                color="accent-cenderawasih"
                :loading="loading"
                prepend-icon="mdi-login"
                size="large"
                @click="login"
              >
                Login
              </VBtn>

              <VBtn
                block
                color="secondary"
                variant="outlined"
                prepend-icon="mdi-ticket-confirmation-outline"
                size="large"
                to="/ticketing/booking"
              >
                Portal Booking Publik (Penumpang & Kargo)
              </VBtn>
            </div>

            <VDivider class="my-6" />
          </VCardText>
        </VCard>
      </main>
    </div>
  </div>
</template>
