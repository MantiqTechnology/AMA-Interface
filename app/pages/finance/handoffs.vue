<script setup lang="ts">
import type { FinanceHandoffDto, FinanceHandoffStatus } from '#shared/features/finance/handoffs';

useHead({ title: 'Finance Handoffs - PT AMA' });

const { can } = useAuthorization();
const search = ref('');
const sourceModule = ref<string | null>(null);
const status = ref<FinanceHandoffStatus | null>(null);
const page = ref(1);
const pageSize = 25;
const actionError = ref('');
const showDrawer = ref(false);
const selectedHandoff = ref<FinanceHandoffDto | null>(null);

const query = computed(() => ({
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(sourceModule.value ? { sourceModule: sourceModule.value } : {}),
  ...(status.value ? { status: status.value } : {}),
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}));

watch([search, sourceModule, status], () => {
  page.value = 1;
});

const {
  data: handoffs,
  pending,
  error,
  refresh: refreshList
} = await useAsyncData(
  'finance-handoff-inbox',
  () => fetchApi<FinanceHandoffDto[]>('/api/finance/handoffs', { query: query.value }),
  { default: (): FinanceHandoffDto[] => [], watch: [query] }
);

// Fetch broader stats for the 4 summary cards
const { data: allHandoffsForStats, refresh: refreshStats } = await useAsyncData(
  'finance-handoff-stats',
  () => fetchApi<FinanceHandoffDto[]>('/api/finance/handoffs', { query: { limit: 250 } }),
  { default: (): FinanceHandoffDto[] => [] }
);

async function refresh() {
  await Promise.all([refreshList(), refreshStats()]);
}

const totalCount = computed(() => allHandoffsForStats.value?.length || handoffs.value.length);
const pendingCount = computed(
  () =>
    allHandoffsForStats.value?.filter((h) =>
      ['RECEIVED', 'VALIDATING', 'VALIDATED'].includes(h.status)
    ).length ?? 0
);
const postedCount = computed(
  () =>
    allHandoffsForStats.value?.filter((h) =>
      ['ACCEPTED', 'ACCOUNTING_EVENT_CREATED', 'JOURNAL_CREATED', 'POSTED'].includes(h.status)
    ).length ?? 0
);
const exceptionCount = computed(
  () =>
    allHandoffsForStats.value?.filter((h) => ['EXCEPTION', 'REJECTED'].includes(h.status)).length ??
    0
);

const canProcess = computed(() => can('finance.handoff.process').allowed);

const sourceModules = [
  { value: 'FLIGHT_OPERATIONS', title: 'Flight Operations (Penerbangan)' },
  { value: 'FUEL', title: 'Bahan Bakar Avtur (Fuel)' },
  { value: 'MRO', title: 'Pemeliharaan Armada (MRO)' },
  { value: 'TICKETING', title: 'Tiket & Kargo (Ticketing)' },
  { value: 'INVENTORY', title: 'Suku Cadang & Logistik' },
  { value: 'PROCUREMENT', title: 'Pengadaan (Procurement)' }
];

const statuses: Array<{ value: FinanceHandoffStatus; title: string }> = [
  { value: 'RECEIVED', title: 'Diterima (Received)' },
  { value: 'VALIDATING', title: 'Memvalidasi (Validating)' },
  { value: 'VALIDATED', title: 'Terverifikasi (Validated)' },
  { value: 'ACCEPTED', title: 'Disetujui (Accepted)' },
  { value: 'ACCOUNTING_EVENT_CREATED', title: 'Event Dibuat' },
  { value: 'JOURNAL_CREATED', title: 'Jurnal Dibuat' },
  { value: 'POSTED', title: 'Diposting ke GL' },
  { value: 'EXCEPTION', title: 'Pengecualian (Exception)' },
  { value: 'REJECTED', title: 'Ditolak (Rejected)' }
];

const moduleMeta: Record<string, { label: string; icon: string; color: string }> = {
  FLIGHT_OPERATIONS: { label: 'Flight Operations', icon: 'mdi-airplane', color: 'primary' },
  FUEL: { label: 'Fuel / Avtur', icon: 'mdi-gas-station', color: 'warning' },
  MRO: { label: 'MRO Maintenance', icon: 'mdi-wrench-clock', color: 'secondary' },
  TICKETING: {
    label: 'Ticketing & Cargo',
    icon: 'mdi-ticket-confirmation-outline',
    color: 'success'
  },
  INVENTORY: { label: 'Inventory & Parts', icon: 'mdi-package-variant-closed', color: 'info' },
  PROCUREMENT: { label: 'Procurement', icon: 'mdi-cart-outline', color: 'deep-orange' }
};

function getModuleMeta(module: string) {
  return (
    moduleMeta[module] ?? {
      label: module,
      icon: 'mdi-swap-horizontal-bold',
      color: 'grey'
    }
  );
}

async function bridgeSources() {
  actionError.value = '';
  try {
    await fetchApi('/api/finance/handoffs/bridge', { method: 'POST' });
    await refresh();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function act(item: FinanceHandoffDto, action: 'accept' | 'retry') {
  actionError.value = '';
  try {
    await fetchApi(`/api/finance/handoffs/${item.id}/${action}`, { method: 'POST' });
    if (selectedHandoff.value?.id === item.id) {
      showDrawer.value = false;
      selectedHandoff.value = null;
    }
    await refresh();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
  }
}

function openTrace(item: FinanceHandoffDto) {
  selectedHandoff.value = item;
  showDrawer.value = true;
}

function money(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

// PSAK & Accounting Simulation Logic
function getHandoffPsakInfo(item: FinanceHandoffDto) {
  switch (item.sourceModule) {
    case 'FUEL':
      return {
        standard: 'PSAK 1 (Pengakuan Beban Operasional Langsung)',
        explanation:
          'Bahan bakar avtur yang dikonsumsi langsung dibukukan sebagai Beban Pokok Operasi (COGS Akun 5100) pada periode berjalan sesuai jam terbang aktual pesawat.'
      };
    case 'TICKETING':
      return {
        standard: 'PSAK 72 (Pendapatan dari Kontrak Pelanggan)',
        explanation:
          'Pendapatan tiket penumpang dan carter kargo diakui resmi saat kewajiban pelaksanaan penerbangan tuntas. Sebelum penerbangan terlaksana, dicatat sebagai Pendapatan Diterima di Muka (Akun 2200).'
      };
    case 'MRO':
      return {
        standard: 'PSAK 14 (Persediaan) & PSAK 16 (Aset Tetap)',
        explanation:
          'Pengeluaran pemeliharaan rutin dibebankan ke Biaya Perawatan Pesawat (Akun 5400). Komponen berat (seperti overhaul mesin) yang memperpanjang umur ekonomis pesawat dikapitalisasi ke Aset Tetap.'
      };
    case 'FLIGHT_OPERATIONS':
    default:
      return {
        standard: 'PSAK 1 (Alokasi Biaya Stasiun & Bandara)',
        explanation:
          'Biaya penanganan bandara (handling) dan stasiun perintis dialokasikan langsung ke akun biaya operasi penerbangan (Akun 5500) per rute dan nomor penerbangan.'
      };
  }
}

function getHandoffJournalSimulation(item: FinanceHandoffDto) {
  switch (item.sourceModule) {
    case 'FUEL':
      return {
        debitAccount: '5100 · Biaya Bahan Bakar Pesawat (Avtur)',
        creditAccount: '2000 · Utang Usaha (Vendor Pertamina)',
        amount: item.amountMinor
      };
    case 'TICKETING':
      return {
        debitAccount: '1010 · Kas & Bank Operasional Pos/Tiket',
        creditAccount: '4010 · Pendapatan Tiket Penumpang & Kargo',
        amount: item.amountMinor
      };
    case 'MRO':
      return {
        debitAccount: '5400 · Biaya Pemeliharaan & Inspeksi Pesawat',
        creditAccount: '1200 · Persediaan Suku Cadang Pesawat (Inventory)',
        amount: item.amountMinor
      };
    case 'FLIGHT_OPERATIONS':
    default:
      return {
        debitAccount: '5500 · Beban Ground Handling & Stasiun Bandara',
        creditAccount: '2000 · Utang Usaha Stasiun / Kas Operasional',
        amount: item.amountMinor
      };
  }
}

function getHandoffRatioImpact(item: FinanceHandoffDto) {
  switch (item.sourceModule) {
    case 'FUEL':
      return {
        title: 'Mempengaruhi Fuel Cost Ratio & CPFH',
        description:
          'Biaya ini akan meningkatkan Cost per Flight Hour (CPFH) dan masuk dalam kalkulasi porsi beban bahan bakar avtur.',
        tone: 'warning'
      };
    case 'TICKETING':
      return {
        title: 'Meningkatkan Revenue per Flight Hour (RPFH) & Kas',
        description:
          'Pencatatan pendapatan ini meningkatkan margin laba kotor (GPM) dan memperkuat rasio likuiditas kas operasional.',
        tone: 'success'
      };
    case 'MRO':
      return {
        title: 'Mempengaruhi Maintenance Cost Ratio & Quick Ratio',
        description:
          'Meningkatkan porsi beban perawatan armada dan menyesuaikan nilai persediaan suku cadang pada rasio uji asam.',
        tone: 'info'
      };
    case 'FLIGHT_OPERATIONS':
    default:
      return {
        title: 'Komponen Beban Pokok Operasi (Direct Costs)',
        description:
          'Biaya ground handling stasiun mempengaruhi total beban langsung per rute dan margin profitabilitas penerbangan.',
        tone: 'primary'
      };
  }
}
</script>

<template>
  <VContainer class="px-3 py-4 md:px-5" fluid>
    <!-- 1. Executive Header Bar -->
    <header class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div>
        <div class="d-flex align-center ga-2 mb-1">
          <h1 class="text-h5 font-weight-bold text-text-primary">Finance Handoffs</h1>
          <VChip color="primary" density="compact" size="small" variant="tonal">
            Cross-Module Integration
          </VChip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Jembatan integrasi data operasional (Penerbangan, Avtur, MRO, Tiket) menuju pembukuan Buku
          Besar PT AMA.
        </p>
      </div>

      <div class="d-flex align-center ga-2">
        <VBtn
          v-if="canProcess"
          color="primary"
          :loading="pending"
          prepend-icon="mdi-source-branch-sync"
          variant="tonal"
          @click="bridgeSources"
        >
          Tarik Transaksi Operasional
        </VBtn>
        <VBtn
          aria-label="Refresh Finance handoffs"
          icon="mdi-refresh"
          :loading="pending"
          variant="tonal"
          @click="refresh()"
        />
      </div>
    </header>

    <!-- 2. Alur Integrasi Otomatis (Visual Workflow Stepper Banner) -->
    <VCard border class="pa-4 mb-5 elevation-0" rounded="lg">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="d-flex align-center ga-2">
          <VIcon color="primary" icon="mdi-vector-polyline" size="20" />
          <span class="text-subtitle-2 font-weight-bold">Alur Integrasi Otomatis Modul Operasional ke Keuangan</span>
        </div>
        <VChip color="info" density="compact" size="x-small" variant="tonal">
          Otomasi Terintegrasi
        </VChip>
      </div>

      <VRow dense class="text-center">
        <VCol cols="12" sm="3">
          <div
            class="pa-3 rounded-lg border bg-surface-variant-light fill-height d-flex flex-column align-center"
          >
            <div class="text-caption font-weight-bold text-primary mb-1">TAHAP 1</div>
            <VIcon color="primary" icon="mdi-airplane-takeoff" size="24" class="mb-1" />
            <div class="text-caption font-weight-bold">Modul Operasional</div>
            <div class="text-caption text-medium-emphasis">Flight Ops, Fuel, MRO, & Tiket</div>
          </div>
        </VCol>
        <VCol cols="12" sm="3">
          <div
            class="pa-3 rounded-lg border bg-surface-variant-light fill-height d-flex flex-column align-center"
          >
            <div class="text-caption font-weight-bold text-info mb-1">TAHAP 2</div>
            <VIcon color="info" icon="mdi-swap-horizontal-bold" size="24" class="mb-1" />
            <div class="text-caption font-weight-bold">Antrean Handoffs</div>
            <div class="text-caption text-medium-emphasis">Pemeriksaan dimensi rute & armada</div>
          </div>
        </VCol>
        <VCol cols="12" sm="3">
          <div
            class="pa-3 rounded-lg border bg-surface-variant-light fill-height d-flex flex-column align-center"
          >
            <div class="text-caption font-weight-bold text-warning mb-1">TAHAP 3</div>
            <VIcon color="warning" icon="mdi-book-arrow-right-outline" size="24" class="mb-1" />
            <div class="text-caption font-weight-bold">Jurnal Debit/Kredit</div>
            <div class="text-caption text-medium-emphasis">Pemetaan akun COA & aturan PSAK</div>
          </div>
        </VCol>
        <VCol cols="12" sm="3">
          <div
            class="pa-3 rounded-lg border bg-surface-variant-light fill-height d-flex flex-column align-center"
          >
            <div class="text-caption font-weight-bold text-success mb-1">TAHAP 4</div>
            <VIcon color="success" icon="mdi-file-chart-check-outline" size="24" class="mb-1" />
            <div class="text-caption font-weight-bold">Buku Besar & Rasio</div>
            <div class="text-caption text-medium-emphasis">Posting GL, Laporan Neraca, & CPFH</div>
          </div>
        </VCol>
      </VRow>
    </VCard>

    <!-- 3. Status Summary Cards (KISS Principle: 4 Kolom Proporsional) -->
    <VRow class="mb-5" dense>
      <VCol cols="12" sm="6" lg="3">
        <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Total Transaksi</span>
            <div class="summary-icon-badge bg-blue-lighten-5 text-primary">
              <VIcon icon="mdi-tray-full" size="20" />
            </div>
          </div>
          <div class="text-h5 font-weight-bold text-text-primary">{{ totalCount }}</div>
          <div class="text-caption text-medium-emphasis mt-1">
            Seluruh data masuk dari operasional
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" lg="3">
        <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Siap Diproses</span>
            <div class="summary-icon-badge bg-orange-lighten-5 text-warning">
              <VIcon icon="mdi-clock-outline" size="20" />
            </div>
          </div>
          <div class="text-h5 font-weight-bold text-warning">{{ pendingCount }}</div>
          <div class="text-caption text-medium-emphasis mt-1">
            Menunggu persetujuan ke jurnal GL
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" lg="3">
        <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Sudah Masuk GL</span>
            <div class="summary-icon-badge bg-green-lighten-5 text-success">
              <VIcon icon="mdi-check-decagram-outline" size="20" />
            </div>
          </div>
          <div class="text-h5 font-weight-bold text-success">{{ postedCount }}</div>
          <div class="text-caption text-medium-emphasis mt-1">
            Telah dibukukan ke Buku Besar resmi
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" lg="3">
        <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Pengecualian</span>
            <div class="summary-icon-badge bg-red-lighten-5 text-error">
              <VIcon icon="mdi-alert-circle-outline" size="20" />
            </div>
          </div>
          <div class="text-h5 font-weight-bold text-error">{{ exceptionCount }}</div>
          <div class="text-caption text-medium-emphasis mt-1">
            Perlu perbaikan data dimensi rute/akun
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- 4. Filter Panel (Bersih & Rapi) -->
    <VCard border class="pa-4 mb-4 elevation-0" rounded="lg">
      <div class="d-flex flex-wrap align-center ga-3">
        <VTextField
          v-model="search"
          clearable
          density="compact"
          hide-details
          label="Cari no. referensi atau modul"
          prepend-inner-icon="mdi-magnify"
          style="min-width: 280px; max-width: 380px"
          variant="outlined"
        />
        <VSelect
          v-model="sourceModule"
          clearable
          density="compact"
          hide-details
          :items="sourceModules"
          label="Pilih Modul Asal"
          style="min-width: 240px"
          variant="outlined"
        />
        <VSelect
          v-model="status"
          clearable
          density="compact"
          hide-details
          :items="statuses"
          label="Status Integrasi"
          style="min-width: 220px"
          variant="outlined"
        />
        <VSpacer />
        <VBtn
          v-if="search || sourceModule || status"
          density="compact"
          prepend-icon="mdi-filter-off-outline"
          size="small"
          variant="text"
          @click="
            search = '';
            sourceModule = null;
            status = null;
          "
        >
          Reset Filter
        </VBtn>
      </div>
    </VCard>

    <VAlert
      v-if="error || actionError"
      class="mb-4"
      color="error"
      title="Gagal Memproses Handoffs Keuangan"
      variant="tonal"
    >
      {{ actionError || error?.message }}
    </VAlert>

    <VSkeletonLoader v-if="pending && !handoffs.length" type="table" />

    <!-- State Kosong -->
    <VCard v-else-if="!handoffs.length" border class="py-12 text-center elevation-0" rounded="lg">
      <VIcon color="medium-emphasis" icon="mdi-inbox-arrow-down-outline" size="48" />
      <div class="mt-3 text-subtitle-1 font-weight-bold">
        Tidak ada transaksi handoffs ditemukan.
      </div>
      <div class="text-body-2 text-medium-emphasis mb-3">
        Gunakan tombol "Tarik Transaksi Operasional" atau sesuaikan filter pencarian Anda.
      </div>
      <VBtn
        v-if="canProcess"
        color="primary"
        prepend-icon="mdi-source-branch-sync"
        variant="tonal"
        @click="bridgeSources"
      >
        Tarik Transaksi Sekarang
      </VBtn>
    </VCard>

    <!-- 5. Tabel Transaksi Handoffs yang Lega & Interaktif -->
    <template v-else>
      <VCard border class="elevation-0" rounded="lg">
        <VTable density="comfortable" hover>
          <thead class="bg-surface-variant-light">
            <tr>
              <th style="min-width: 190px">Modul Asal</th>
              <th style="min-width: 170px">No. Referensi Transaksi</th>
              <th style="min-width: 230px">Dimensi Operasional</th>
              <th class="text-right" style="min-width: 150px">Nominal (IDR)</th>
              <th class="text-center" style="min-width: 140px">Status Integrasi</th>
              <th style="min-width: 140px">Buku Besar (GL)</th>
              <th class="text-right" style="min-width: 130px">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in handoffs"
              :key="item.id"
              class="handoff-table-row"
              @click="openTrace(item)"
            >
              <!-- Modul Asal -->
              <td>
                <div class="d-flex align-center ga-2">
                  <div
                    class="module-badge-icon"
                    :class="`bg-${getModuleMeta(item.sourceModule).color}-lighten-5 text-${getModuleMeta(item.sourceModule).color}`"
                  >
                    <VIcon :icon="getModuleMeta(item.sourceModule).icon" size="18" />
                  </div>
                  <div>
                    <div class="font-weight-bold text-body-2">
                      {{ getModuleMeta(item.sourceModule).label }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ item.sourceType }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- No. Referensi & Tanggal -->
              <td>
                <div class="font-weight-bold text-body-2 text-text-primary">
                  {{ item.sourceId }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ dateTime(item.transactionDate) }}
                </div>
              </td>

              <!-- Dimensi Operasional -->
              <td>
                <div class="d-flex flex-wrap ga-1">
                  <VChip
                    v-if="item.dimensions?.AIRCRAFT"
                    color="primary"
                    density="compact"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ item.dimensions.AIRCRAFT }}
                  </VChip>
                  <VChip
                    v-if="item.dimensions?.ROUTE"
                    color="info"
                    density="compact"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ item.dimensions.ROUTE }}
                  </VChip>
                  <VChip
                    v-if="item.dimensions?.STATION"
                    density="compact"
                    size="x-small"
                    variant="outlined"
                  >
                    Base: {{ item.dimensions.STATION }}
                  </VChip>
                  <VChip
                    v-if="item.dimensions?.FLIGHT && !item.dimensions?.ROUTE"
                    density="compact"
                    size="x-small"
                    variant="outlined"
                  >
                    {{ item.dimensions.FLIGHT }}
                  </VChip>
                  <span
                    v-if="!Object.keys(item.dimensions ?? {}).length"
                    class="text-caption text-medium-emphasis"
                  >
                    -
                  </span>
                </div>
              </td>

              <!-- Nominal Uang -->
              <td class="text-right">
                <span class="text-subtitle-2 font-weight-bold text-text-primary">
                  {{ money(item.amountMinor, item.currencyCode) }}
                </span>
              </td>

              <!-- Status Integrasi -->
              <td class="text-center">
                <DsStatusBadge :value="item.status" />
                <div
                  v-if="item.errorMessage"
                  class="mt-1 text-caption text-error font-weight-medium"
                >
                  {{ item.errorCode }}
                </div>
              </td>

              <!-- Jurnal GL -->
              <td>
                <NuxtLink
                  v-if="item.journalId"
                  class="text-primary font-weight-medium text-caption d-inline-flex align-center ga-1"
                  :to="`/finance/accounting?tab=general-journal&journal=${item.journalId}`"
                  @click.stop
                >
                  <span>{{ item.journalId }}</span>
                  <VIcon icon="mdi-open-in-new" size="12" />
                </NuxtLink>
                <span v-else class="text-caption text-medium-emphasis"> Belum dibuat </span>
              </td>

              <!-- Aksi -->
              <td class="text-right" @click.stop>
                <div class="d-flex justify-end align-center ga-1">
                  <VBtn
                    icon="mdi-eye-outline"
                    size="x-small"
                    variant="text"
                    @click="openTrace(item)"
                  >
                    <VIcon size="16" />
                    <VTooltip activator="parent" location="top">
                      Lihat Detail Trace & Jurnal
                    </VTooltip>
                  </VBtn>

                  <template v-if="canProcess">
                    <DsConfirmIconButton
                      v-if="['RECEIVED', 'VALIDATING', 'VALIDATED'].includes(item.status)"
                      :action="() => act(item, 'accept')"
                      aria-label="Accept Finance handoff"
                      confirm-text="Terima"
                      icon="mdi-check-decagram-outline"
                      :message="`Terima transaksi ${item.sourceModule} (${item.sourceId}) dan buat jurnal pembukuan otomatis?`"
                      title="Terima Transaksi ke Jurnal?"
                      tone="success"
                      tooltip="Terima & Masukkan Jurnal"
                    />
                    <DsConfirmIconButton
                      v-if="item.status === 'EXCEPTION'"
                      :action="() => act(item, 'retry')"
                      aria-label="Retry Finance handoff"
                      confirm-text="Coba Lagi"
                      icon="mdi-reload"
                      :message="`Ulangi validasi dan posting akuntansi untuk ${item.sourceId}?`"
                      title="Ulangi Proses Handoff?"
                      tone="warning"
                      tooltip="Ulangi Validasi"
                    />
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <!-- Paginasi Bersih -->
      <div class="mt-4 d-flex align-center justify-space-between">
        <div class="text-caption text-medium-emphasis">
          Menampilkan {{ handoffs.length }} transaksi pada halaman {{ page }}
        </div>
        <div class="d-flex align-center ga-2">
          <VBtn
            aria-label="Previous handoff page"
            :disabled="page === 1 || pending"
            icon="mdi-chevron-left"
            size="small"
            variant="outlined"
            @click="page -= 1"
          />
          <span class="text-body-2 font-weight-medium">Hal {{ page }}</span>
          <VBtn
            aria-label="Next handoff page"
            :disabled="handoffs.length < pageSize || pending"
            icon="mdi-chevron-right"
            size="small"
            variant="outlined"
            @click="page += 1"
          />
        </div>
      </div>
    </template>

    <!-- 6. Operational Trace & Journal Preview Dialog (Drawer Samping / Modal) -->
    <VDialog v-model="showDrawer" max-width="680" scrollable>
      <VCard v-if="selectedHandoff" class="pa-2" rounded="lg">
        <VCardItem class="pb-2">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center ga-2">
              <div
                class="module-badge-icon"
                :class="`bg-${getModuleMeta(selectedHandoff.sourceModule).color}-lighten-5 text-${getModuleMeta(selectedHandoff.sourceModule).color}`"
              >
                <VIcon :icon="getModuleMeta(selectedHandoff.sourceModule).icon" size="20" />
              </div>
              <div>
                <VCardTitle class="text-subtitle-1 font-weight-bold pb-0">
                  Detail Trace Integrasi: {{ selectedHandoff.sourceId }}
                </VCardTitle>
                <p class="text-caption text-medium-emphasis mb-0">
                  Modul {{ getModuleMeta(selectedHandoff.sourceModule).label }} ·
                  {{ selectedHandoff.sourceType }}
                </p>
              </div>
            </div>
            <DsStatusBadge :value="selectedHandoff.status" />
          </div>
        </VCardItem>

        <VDivider />

        <VCardText class="py-4" style="max-height: 520px">
          <!-- A. Informasi Operasional & Dimensi -->
          <div class="mb-4">
            <h3 class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              1. Konteks Dimensi Operasional
            </h3>
            <div class="pa-3 rounded-lg border bg-surface-variant-light">
              <VRow dense>
                <VCol cols="6">
                  <div class="text-caption text-medium-emphasis">Nominal Transaksi</div>
                  <div class="text-subtitle-1 font-weight-bold text-primary">
                    {{ money(selectedHandoff.amountMinor, selectedHandoff.currencyCode) }}
                  </div>
                </VCol>
                <VCol cols="6">
                  <div class="text-caption text-medium-emphasis">Waktu Transaksi</div>
                  <div class="text-body-2 font-weight-medium">
                    {{ dateTime(selectedHandoff.transactionDate) }}
                  </div>
                </VCol>
                <VCol v-if="selectedHandoff.dimensions?.AIRCRAFT" cols="6" class="mt-2">
                  <div class="text-caption text-medium-emphasis">Armada Pesawat</div>
                  <div class="text-body-2 font-weight-bold">
                    {{ selectedHandoff.dimensions.AIRCRAFT }}
                  </div>
                </VCol>
                <VCol v-if="selectedHandoff.dimensions?.ROUTE" cols="6" class="mt-2">
                  <div class="text-caption text-medium-emphasis">Rute Penerbangan</div>
                  <div class="text-body-2 font-weight-bold">
                    {{ selectedHandoff.dimensions.ROUTE }}
                  </div>
                </VCol>
                <VCol v-if="selectedHandoff.dimensions?.STATION" cols="6" class="mt-2">
                  <div class="text-caption text-medium-emphasis">Base / Stasiun</div>
                  <div class="text-body-2 font-weight-medium">
                    {{ selectedHandoff.dimensions.STATION }}
                  </div>
                </VCol>
                <VCol v-if="selectedHandoff.dimensions?.COST_CENTER" cols="6" class="mt-2">
                  <div class="text-caption text-medium-emphasis">Cost Center</div>
                  <div class="text-body-2 font-weight-medium">
                    {{ selectedHandoff.dimensions.COST_CENTER }}
                  </div>
                </VCol>
              </VRow>
            </div>
          </div>

          <!-- B. Kepatuhan Standar PSAK -->
          <div class="mb-4">
            <h3 class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              2. Kepatuhan Standar Akuntansi (PSAK)
            </h3>
            <div class="pa-3 rounded-lg border bg-blue-lighten-5">
              <div class="d-flex align-center ga-2 mb-1">
                <VIcon color="primary" icon="mdi-certificate-outline" size="18" />
                <span class="text-caption font-weight-bold text-primary">
                  {{ getHandoffPsakInfo(selectedHandoff).standard }}
                </span>
              </div>
              <p class="text-caption text-text-primary mb-0">
                {{ getHandoffPsakInfo(selectedHandoff).explanation }}
              </p>
            </div>
          </div>

          <!-- C. Simulasi Jurnal Berpasangan (Double-Entry Debit / Kredit) -->
          <div class="mb-4">
            <h3 class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              3. Simulasi Jurnal Berpasangan (Double-Entry General Ledger)
            </h3>
            <VCard border class="elevation-0" rounded="lg">
              <VTable density="compact">
                <thead class="bg-surface-variant-light">
                  <tr>
                    <th>Posisi</th>
                    <th>Nomor & Nama Akun (COA)</th>
                    <th class="text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><VChip color="primary" density="compact" size="x-small">DEBIT</VChip></td>
                    <td class="font-weight-medium text-body-2">
                      {{ getHandoffJournalSimulation(selectedHandoff).debitAccount }}
                    </td>
                    <td class="text-right font-weight-bold">
                      {{ money(getHandoffJournalSimulation(selectedHandoff).amount) }}
                    </td>
                  </tr>
                  <tr>
                    <td><VChip color="success" density="compact" size="x-small">KREDIT</VChip></td>
                    <td class="font-weight-medium text-body-2 pl-4">
                      {{ getHandoffJournalSimulation(selectedHandoff).creditAccount }}
                    </td>
                    <td class="text-right font-weight-bold">
                      {{ money(getHandoffJournalSimulation(selectedHandoff).amount) }}
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCard>
          </div>

          <!-- D. Dampak terhadap Rasio Keuangan & Aviasi -->
          <div>
            <h3 class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
              4. Dampak pada Rasio Keuangan & Metrik Aviasi
            </h3>
            <div class="pa-3 rounded-lg border bg-surface-variant-light d-flex align-center ga-3">
              <VIcon
                :color="getHandoffRatioImpact(selectedHandoff).tone"
                icon="mdi-chart-line-variant"
                size="24"
              />
              <div>
                <div class="text-caption font-weight-bold">
                  {{ getHandoffRatioImpact(selectedHandoff).title }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ getHandoffRatioImpact(selectedHandoff).description }}
                </div>
              </div>
            </div>
          </div>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-3 d-flex justify-space-between">
          <VBtn variant="text" @click="showDrawer = false">Tutup</VBtn>
          <div v-if="canProcess" class="d-flex ga-2">
            <VBtn
              v-if="['RECEIVED', 'VALIDATING', 'VALIDATED'].includes(selectedHandoff.status)"
              color="success"
              prepend-icon="mdi-check-decagram-outline"
              variant="flat"
              @click="act(selectedHandoff, 'accept')"
            >
              Terima & Masukkan ke Jurnal
            </VBtn>
            <VBtn
              v-if="selectedHandoff.status === 'EXCEPTION'"
              color="warning"
              prepend-icon="mdi-reload"
              variant="flat"
              @click="act(selectedHandoff, 'retry')"
            >
              Coba Ulangi Validasi
            </VBtn>
          </div>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.bg-surface-variant-light {
  background: #f8fafc;
}

.summary-icon-badge {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
}

.module-badge-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.handoff-table-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.handoff-table-row:hover {
  background-color: #f8fafc;
}
</style>
