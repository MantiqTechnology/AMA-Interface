<script setup lang="ts">
import type { DemoAccountHelperDto } from '#shared/contracts/auth';

definePageMeta({ layout: false });

const route = useRoute();
const session = useDemoSession();
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const helperLoading = ref(false);
const hydrated = ref(false);
const accounts = ref<DemoAccountHelperDto[]>([]);
const errorMessage = ref('');
const helperError = ref('');
const suggestedRole = computed(() => String(route.query.role ?? ''));

onMounted(() => {
  hydrated.value = true;
  void loadAccounts();
});

async function loadAccounts() {
  if (accounts.value.length) return;
  helperLoading.value = true;
  helperError.value = '';
  try {
    accounts.value = await fetchApi<DemoAccountHelperDto[]>('/api/auth/demo-accounts');
  } catch (error) {
    helperError.value =
      error instanceof Error ? error.message : 'Demo accounts could not be loaded.';
  } finally {
    helperLoading.value = false;
  }
}

function chooseAccount(account: DemoAccountHelperDto) {
  username.value = account.username;
  password.value = account.password;
  errorMessage.value = '';
}

async function submit() {
  errorMessage.value = '';
  loading.value = true;
  try {
    await session.login({ username: username.value, password: password.value });
    const requested = route.query.redirect;
    const redirect =
      typeof requested === 'string' && requested.startsWith('/') ? requested : '/dashboard';
    await navigateTo(redirect, { replace: true });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Sign-in failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg-canvas">
    <div class="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section class="relative hidden overflow-hidden bg-brand-primary p-10 text-white lg:flex">
        <div class="relative z-10 flex w-full flex-col justify-between">
          <div>
            <div
              class="mb-12 inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3"
            >
              <VIcon icon="mdi-airplane-cog" size="34" />
              <div>
                <div class="text-xl font-bold">PT AMA</div>
                <div class="text-xs uppercase tracking-widest text-white/70">Ops Interface</div>
              </div>
            </div>
            <div class="max-w-xl">
              <VChip class="mb-5" color="accent-cenderawasih" variant="elevated">
                Controlled local demo
              </VChip>
              <h1 class="text-5xl font-bold leading-tight">
                One operational picture, from request to closure.
              </h1>
              <p class="mt-5 max-w-lg text-lg text-white/75">
                Role-controlled flight operations, maintenance, inventory, finance, safety and
                quality workflows for PT AMA.
              </p>
            </div>
          </div>
          <VAlert color="white" icon="mdi-database-eye-outline" variant="tonal">
            Local demo environment · Synthetic operational data · Not for operational use
          </VAlert>
        </div>
      </section>

      <main class="flex min-h-screen items-center justify-center p-6">
        <VCard border class="w-full max-w-110" elevation="0">
          <VCardText class="p-8">
            <VChip class="mb-4" color="accent-cenderawasih" variant="tonal">
              AMA controlled access
            </VChip>
            <h1 class="text-3xl font-bold text-brand-primary">Sign in</h1>
            <p class="mt-2 text-text-secondary">
              Use an assigned demo account. Access and station scope are enforced by the server.
            </p>

            <VAlert v-if="suggestedRole" class="mt-5" color="info" variant="tonal">
              Continue the hand-off by signing in as <strong>{{ suggestedRole }}</strong>.
            </VAlert>
            <VAlert v-if="errorMessage" class="mt-5" color="error" role="alert" variant="tonal">
              {{ errorMessage }}
            </VAlert>

            <VForm class="mt-6" @submit.prevent="submit">
              <VTextField
                v-model="username"
                autocomplete="username"
                label="Username"
                name="username"
                prepend-inner-icon="mdi-account-outline"
                required
                variant="outlined"
              />
              <VTextField
                v-model="password"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                label="Password"
                name="password"
                prepend-inner-icon="mdi-lock-outline"
                required
                variant="outlined"
                @click:append-inner="showPassword = !showPassword"
              />
              <VBtn block color="accent-cenderawasih" :loading="loading" size="large" type="submit">
                Sign in to AMA Ops
              </VBtn>
            </VForm>
            <VDivider class="my-6" />
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-bold text-brand-primary">Demo Accounts</div>
                <div class="text-xs text-text-secondary">Click an account to fill the form.</div>
              </div>
              <VProgressCircular
                v-if="helperLoading"
                color="primary"
                indeterminate
                size="22"
                width="2"
              />
              <VBtn
                v-else
                :disabled="!hydrated"
                icon="mdi-refresh"
                size="small"
                variant="text"
                @click="loadAccounts"
              />
            </div>
            <VAlert v-if="helperError" class="mt-4" color="error" role="alert" variant="tonal">
              {{ helperError }}
            </VAlert>
            <VList
              v-else
              class="mt-3 max-h-80 overflow-auto rounded border border-border-default"
              density="compact"
              lines="two"
            >
              <VListItem
                v-for="account in accounts"
                :key="account.username"
                :active="account.role === suggestedRole"
                prepend-icon="mdi-account-key-outline"
                @click="chooseAccount(account)"
              >
                <VListItemTitle>{{ account.role }}</VListItemTitle>
                <VListItemSubtitle>
                  {{ account.username }} · {{ account.password }}
                </VListItemSubtitle>
              </VListItem>
            </VList>
            <div class="mt-6 text-center text-xs text-text-secondary">
              Demo credentials and all displayed records are synthetic.
            </div>
          </VCardText>
        </VCard>
      </main>
    </div>
  </div>
</template>
