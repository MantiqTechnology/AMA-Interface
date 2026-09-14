<script setup lang="ts">
import type {
  BalanceSheetDto,
  FinanceDashboardDto,
  FinanceReportingPeriodDto,
  ProfitAndLossDto
} from '#shared/features/finance/reporting';

useHead({ title: 'Financial Statements - PT AMA' });
const route = useRoute();
const selectedPeriod = ref('');
const tab = ref<'pnl' | 'balance-sheet' | 'ratios'>(
  (route.query.tab as 'pnl' | 'balance-sheet' | 'ratios') || 'pnl'
);

const { data: periods } = await useAsyncData(
  'statement-periods',
  () => fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods'),
  { default: () => [] }
);
if (!selectedPeriod.value) selectedPeriod.value = periods.value[0]?.code ?? '';
const query = computed(() => ({ period: selectedPeriod.value }));

const {
  data: pnl,
  pending: pnlPending,
  error: pnlError,
  refresh: refreshPnl
} = await useAsyncData(
  'finance-pnl',
  () => fetchApi<ProfitAndLossDto>('/api/finance/reporting/profit-loss', { query: query.value }),
  { watch: [query] }
);

const {
  data: balanceSheet,
  pending: bsPending,
  error: bsError,
  refresh: refreshBs
} = await useAsyncData(
  'finance-balance-sheet',
  () => fetchApi<BalanceSheetDto>('/api/finance/reporting/balance-sheet', { query: query.value }),
  { watch: [query] }
);

const { data: dashboard, refresh: refreshDash } = await useAsyncData(
  'finance-dashboard-ratios',
  () => fetchApi<FinanceDashboardDto>('/api/finance/reporting/dashboard', { query: query.value }),
  { watch: [query] }
);

const periodOptions = computed(() =>
  periods.value.map((period) => ({
    title: `${period.name} (${period.status})`,
    value: period.code
  }))
);

const selectedPeriodLabel = computed(
  () => periods.value.find((p) => p.code === selectedPeriod.value)?.name ?? selectedPeriod.value
);

/** Rp lengkap — hanya untuk KPI / headline */
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

/** Angka polos — untuk tabel, header kolom sudah menyebut (IDR) */
function num(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value);
}

/** Konvensi akuntansi: negatif ditampilkan dalam kurung */
function numParens(value: number) {
  return value < 0 ? `(${num(Math.abs(value))})` : num(value);
}

async function refresh() {
  await Promise.all([refreshPnl(), refreshBs(), refreshDash()]);
}

const activeCategory = ref<'ALL' | 'LIQUIDITY' | 'SOLVENCY' | 'PROFITABILITY' | 'AVIATION'>('ALL');

const categories = [
  { id: 'ALL', label: 'Semua Rasio (12)' },
  { id: 'LIQUIDITY', label: 'Likuiditas (3)' },
  { id: 'SOLVENCY', label: 'Solvabilitas (2)' },
  { id: 'PROFITABILITY', label: 'Profitabilitas (3)' },
  { id: 'AVIATION', label: 'Kinerja Aviasi AMA (4)' }
];

type RatioAnalysisItem = {
  id: string;
  category: 'LIQUIDITY' | 'SOLVENCY' | 'PROFITABILITY' | 'AVIATION';
  categoryLabel: string;
  name: string;
  formula: string;
  sourceAccount: string;
  currentValue: string;
  benchmark: string;
  status: string;
  tone: 'success' | 'warning' | 'info' | 'error';
  evaluation: string;
};

const comprehensiveRatios = computed<RatioAnalysisItem[]>(() => {
  const bs = balanceSheet.value;
  const p = pnl.value;
  const d = dashboard.value;
  const r = d?.executiveRatios;

  const cashMinor =
    bs?.classifiedSections?.currentAssets?.accounts
      ?.filter((a) => a.accountCode.startsWith('10'))
      ?.reduce((sum, a) => sum + a.amountMinor, 0) ?? 0;

  const currentLiabilitiesMinor = bs?.totals?.currentLiabilitiesMinor ?? 0;
  const cashRatio =
    currentLiabilitiesMinor > 0
      ? Math.round((cashMinor / currentLiabilitiesMinor) * 100) / 100
      : null;

  const totalAssetsMinor = bs?.totals?.assetsMinor ?? 0;
  const totalLiabilitiesMinor = bs?.totals?.liabilitiesMinor ?? 0;
  const dar =
    totalAssetsMinor > 0
      ? Math.round((totalLiabilitiesMinor / totalAssetsMinor) * 100) / 100
      : null;

  const netIncomeMinor = p?.totals?.profitLossMinor ?? 0;
  const roa =
    totalAssetsMinor > 0 ? Math.round((netIncomeMinor / totalAssetsMinor) * 1000) / 10 : null;

  return [
    {
      id: 'current-ratio',
      category: 'LIQUIDITY',
      categoryLabel: 'Likuiditas',
      name: 'Current Ratio (Rasio Lancar)',
      formula: 'Total Aset Lancar ÷ Total Liabilitas Jangka Pendek',
      sourceAccount: 'Akun 1000-1400 ÷ Akun 2000-2699',
      currentValue:
        bs?.ratios?.currentRatio != null ? `${bs.ratios.currentRatio.toFixed(2)}x` : 'N/A',
      benchmark: '≥ 1.50x',
      status: (bs?.ratios?.currentRatio ?? 0) >= 1.5 ? 'Sehat' : 'Perhatian',
      tone: (bs?.ratios?.currentRatio ?? 0) >= 1.5 ? 'success' : 'warning',
      evaluation:
        'Mengukur kecukupan kas, piutang, dan suku cadang untuk membayar kewajiban jatuh tempo.'
    },
    {
      id: 'quick-ratio',
      category: 'LIQUIDITY',
      categoryLabel: 'Likuiditas',
      name: 'Quick Ratio (Uji Asam)',
      formula: '(Aset Lancar − Persediaan Suku Cadang) ÷ Liabilitas Lancar',
      sourceAccount: '(Akun 1000-1400 − Akun 1200) ÷ Akun 2000-2699',
      currentValue: bs?.ratios?.quickRatio != null ? `${bs.ratios.quickRatio.toFixed(2)}x` : 'N/A',
      benchmark: '≥ 1.00x',
      status: (bs?.ratios?.quickRatio ?? 0) >= 1.0 ? 'Likuid' : 'Ketat',
      tone: (bs?.ratios?.quickRatio ?? 0) >= 1.0 ? 'success' : 'warning',
      evaluation:
        'Daya likuiditas instan tanpa harus mengandalkan pencairan persediaan suku cadang pesawat.'
    },
    {
      id: 'cash-ratio',
      category: 'LIQUIDITY',
      categoryLabel: 'Likuiditas',
      name: 'Cash Ratio (Rasio Kas)',
      formula: 'Kas & Setara Kas ÷ Liabilitas Jangka Pendek',
      sourceAccount: 'Akun 1000 (Kas & Bank) ÷ Akun 2000-2699',
      currentValue: cashRatio != null ? `${cashRatio.toFixed(2)}x` : 'N/A',
      benchmark: '≥ 0.20x',
      status: (cashRatio ?? 0) >= 0.2 ? 'Aman' : 'Rendah',
      tone: (cashRatio ?? 0) >= 0.2 ? 'success' : 'warning',
      evaluation:
        'Kemampuan kas dan saldo bank operasional maskapai melunasi tagihan mendesak secara kontan.'
    },
    {
      id: 'der',
      category: 'SOLVENCY',
      categoryLabel: 'Solvabilitas',
      name: 'Debt to Equity Ratio (DER)',
      formula: 'Total Liabilitas Utang ÷ Total Ekuitas Modal',
      sourceAccount: '(Liabilitas Lancar + Jk. Panjang) ÷ Akun 3000 & Laba',
      currentValue:
        bs?.ratios?.debtToEquityRatio != null
          ? `${bs.ratios.debtToEquityRatio.toFixed(2)}x`
          : 'N/A',
      benchmark: '≤ 1.00x',
      status: (bs?.ratios?.debtToEquityRatio ?? 99) <= 1.0 ? 'Aman' : 'Tinggi',
      tone: (bs?.ratios?.debtToEquityRatio ?? 99) <= 1.0 ? 'success' : 'warning',
      evaluation:
        'Struktur modal maskapai; semakin rendah rasio, semakin tangguh terhadap beban utang.'
    },
    {
      id: 'dar',
      category: 'SOLVENCY',
      categoryLabel: 'Solvabilitas',
      name: 'Debt to Asset Ratio (DAR)',
      formula: 'Total Liabilitas Utang ÷ Total Aset Perusahaan',
      sourceAccount: 'Total Liabilitas ÷ Total Aset (1000-1500)',
      currentValue: dar != null ? `${(dar * 100).toFixed(1)}%` : 'N/A',
      benchmark: '≤ 60.0%',
      status: (dar ?? 1) <= 0.6 ? 'Sehat' : 'Tinggi',
      tone: (dar ?? 1) <= 0.6 ? 'success' : 'warning',
      evaluation:
        'Persentase aset maskapai (armada pesawat & fasilitas) yang didanai menggunakan utang luar.'
    },
    {
      id: 'gpm',
      category: 'PROFITABILITY',
      categoryLabel: 'Profitabilitas',
      name: 'Gross Profit Margin (GPM)',
      formula: '(Total Pendapatan − Beban Operasi Langsung) ÷ Pendapatan',
      sourceAccount: '(Akun 4000 − Akun 5100-5500) ÷ Akun 4000',
      currentValue: r?.grossMarginPercent != null ? `${r.grossMarginPercent.toFixed(1)}%` : 'N/A',
      benchmark: '≥ 30.0%',
      status: (r?.grossMarginPercent ?? 0) >= 30 ? 'Prima' : 'Ketat',
      tone: (r?.grossMarginPercent ?? 0) >= 30 ? 'success' : 'warning',
      evaluation:
        'Tingkat keuntungan kotor dari penerbangan sebelum dikurangi beban gaji kantor dan administrasi.'
    },
    {
      id: 'npm',
      category: 'PROFITABILITY',
      categoryLabel: 'Profitabilitas',
      name: 'Net Profit Margin (NPM)',
      formula: 'Laba Bersih Akhir ÷ Total Pendapatan Operasional',
      sourceAccount: 'Laba Bersih P&L ÷ Akun 4000',
      currentValue: r?.netMarginPercent != null ? `${r.netMarginPercent.toFixed(1)}%` : 'N/A',
      benchmark: '≥ 10.0%',
      status: (r?.netMarginPercent ?? 0) >= 10 ? 'Menguntungkan' : 'Tipis',
      tone: (r?.netMarginPercent ?? 0) >= 10 ? 'success' : 'warning',
      evaluation:
        'Hasil bersih riil dari setiap rupiah pendapatan tiket, charter, dan kargo yang menjadi laba.'
    },
    {
      id: 'roa',
      category: 'PROFITABILITY',
      categoryLabel: 'Profitabilitas',
      name: 'Return on Assets (ROA)',
      formula: 'Laba Bersih Akhir ÷ Total Aset Neraca',
      sourceAccount: 'Laba Bersih P&L ÷ Total Aset Neraca',
      currentValue: roa != null ? `${roa.toFixed(1)}%` : 'N/A',
      benchmark: '≥ 5.0%',
      status: (roa ?? 0) >= 5.0 ? 'Efisien' : 'Optimalisasi',
      tone: (roa ?? 0) >= 5.0 ? 'success' : 'info',
      evaluation:
        'Efektivitas seluruh modal aset pesawat dan operasional AMA dalam menghasilkan keuntungan bersih.'
    },
    {
      id: 'cpfh',
      category: 'AVIATION',
      categoryLabel: 'Kinerja Aviasi AMA',
      name: 'Cost per Flight Hour (CPFH)',
      formula: 'Total Beban Operasi Langsung ÷ Total Jam Terbang (FH)',
      sourceAccount: 'Akun 5100-5500 ÷ Total Jam Terbang Riil',
      currentValue: r?.costPerFlightHourMinor != null ? money(r.costPerFlightHourMinor) : 'N/A',
      benchmark: 'Sesuai Spesifikasi Pesawat',
      status: 'Efisiensi Ops',
      tone: 'info',
      evaluation: `Biaya operasi aktual per 1 jam terbang berdasarkan ${r?.totalFlightHours ?? 0} FH dari ${r?.totalFlights ?? 0} penerbangan perintis.`
    },
    {
      id: 'rpfh',
      category: 'AVIATION',
      categoryLabel: 'Kinerja Aviasi AMA',
      name: 'Revenue per Flight Hour (RPFH)',
      formula: 'Total Pendapatan Penerbangan ÷ Total Jam Terbang (FH)',
      sourceAccount: 'Akun 4000 ÷ Total Jam Terbang Riil',
      currentValue:
        r?.revenuePerFlightHourMinor != null ? money(r.revenuePerFlightHourMinor) : 'N/A',
      benchmark: '> CPFH (Yield Positif)',
      status:
        (r?.revenuePerFlightHourMinor ?? 0) > (r?.costPerFlightHourMinor ?? 0)
          ? 'Surplus'
          : 'Defisit',
      tone:
        (r?.revenuePerFlightHourMinor ?? 0) > (r?.costPerFlightHourMinor ?? 0)
          ? 'success'
          : 'warning',
      evaluation: 'Produktivitas moneter armada pesawat per satu jam terbang operasional di udara.'
    },
    {
      id: 'fuel-ratio',
      category: 'AVIATION',
      categoryLabel: 'Kinerja Aviasi AMA',
      name: 'Fuel Cost Ratio (% Avtur)',
      formula: 'Beban Bahan Bakar Avtur ÷ Total Beban Langsung',
      sourceAccount: 'Akun 5100 ÷ Total Beban Langsung (5100-5500)',
      currentValue:
        r?.fuelCostRatioPercent != null ? `${r.fuelCostRatioPercent.toFixed(1)}%` : '0%',
      benchmark: '30.0% – 40.0%',
      status: (r?.fuelCostRatioPercent ?? 0) <= 40 ? 'Normal (≤40%)' : 'Tinggi',
      tone: (r?.fuelCostRatioPercent ?? 0) <= 40 ? 'success' : 'warning',
      evaluation: 'Porsi biaya bahan bakar avtur terhadap total biaya penerbangan langsung.'
    },
    {
      id: 'mro-ratio',
      category: 'AVIATION',
      categoryLabel: 'Kinerja Aviasi AMA',
      name: 'Maintenance Cost Ratio (% MRO)',
      formula: 'Beban Pemeliharaan & Parts ÷ Total Beban Langsung',
      sourceAccount: 'Akun 5400 ÷ Total Beban Langsung (5100-5500)',
      currentValue:
        r?.maintenanceCostRatioPercent != null
          ? `${r.maintenanceCostRatioPercent.toFixed(1)}%`
          : '0%',
      benchmark: '15.0% – 25.0%',
      status: 'MRO Service',
      tone: 'info',
      evaluation:
        'Porsi pengeluaran suku cadang dan pemeliharaan kelaikudaraan pesawat terhadap biaya operasional.'
    }
  ];
});

/** Kelompokkan rasio per kategori untuk layout ledger */
const ratioGroups = computed(() => {
  const byCategory = new Map<string, RatioAnalysisItem[]>();
  for (const ratio of comprehensiveRatios.value) {
    const list = byCategory.get(ratio.category);
    if (list) list.push(ratio);
    else byCategory.set(ratio.category, [ratio]);
  }
  return categories
    .filter((cat) => cat.id !== 'ALL')
    .map((cat) => ({ id: cat.id, label: cat.label, items: byCategory.get(cat.id) ?? [] }))
    .filter((group) => group.items.length > 0);
});

const visibleGroups = computed(() =>
  activeCategory.value === 'ALL'
    ? ratioGroups.value
    : ratioGroups.value.filter((group) => group.id === activeCategory.value)
);

const healthyCount = computed(
  () => comprehensiveRatios.value.filter((item) => item.tone === 'success').length
);
const attentionCount = computed(
  () => comprehensiveRatios.value.filter((item) => item.tone === 'warning').length
);

const pnlRevenueAccounts = computed(
  () => pnl.value?.lines.filter((l) => l.accountType === 'REVENUE') ?? []
);

const pnlExpenseAccounts = computed(
  () => pnl.value?.lines.filter((l) => l.accountType === 'EXPENSE') ?? []
);

const pnlTotalRevenue = computed(() => pnl.value?.totals.revenueMinor ?? 0);
const pnlTotalExpense = computed(() => pnl.value?.totals.expenseMinor ?? 0);
const pnlNetProfit = computed(() => pnl.value?.totals.profitLossMinor ?? 0);
const pnlMarginPercent = computed(() => {
  if (!pnlTotalRevenue.value) return null;
  return Math.round((pnlNetProfit.value / pnlTotalRevenue.value) * 1000) / 10;
});

/** KPI P&L — anatomi konsisten: label / nilai / catatan */
const pnlKpis = computed(() => [
  {
    label: 'Total Pendapatan',
    value: money(pnlTotalRevenue.value),
    note: 'Carter pesawat & tiket penumpang',
    toneClass: ''
  },
  {
    label: 'Total Beban Operasi',
    value: money(pnlTotalExpense.value),
    note: 'MRO, avtur, & operasional stasiun',
    toneClass: ''
  },
  {
    label: 'Laba Bersih',
    value: numParens(pnlNetProfit.value),
    note: pnlMarginPercent.value != null ? `Net margin ${pnlMarginPercent.value}%` : 'Net margin —',
    toneClass: pnlNetProfit.value >= 0 ? 'text-success' : 'text-error'
  }
]);

/** Ringkasan rasio pokok di tab neraca — detail lengkap ada di tab Rasio */
const bsRatioCards = computed(() => {
  const r = balanceSheet.value?.ratios;
  const fmt = (v: number | null | undefined) => (v != null ? `${v.toFixed(2)}x` : '—');
  return [
    {
      label: 'Current Ratio',
      value: fmt(r?.currentRatio),
      benchmark: 'Acuan ≥ 1.50x',
      formula: 'Aset Lancar ÷ Liabilitas Lancar',
      ok: (r?.currentRatio ?? 0) >= 1.5,
      status: (r?.currentRatio ?? 0) >= 1.5 ? 'Sehat' : 'Perhatian'
    },
    {
      label: 'Quick Ratio',
      value: fmt(r?.quickRatio),
      benchmark: 'Acuan ≥ 1.00x',
      formula: '(Aset Lancar − Persediaan) ÷ Liabilitas Lancar',
      ok: (r?.quickRatio ?? 0) >= 1.0,
      status: (r?.quickRatio ?? 0) >= 1.0 ? 'Likuid' : 'Ketat'
    },
    {
      label: 'Debt to Equity',
      value: fmt(r?.debtToEquityRatio),
      benchmark: 'Acuan ≤ 1.00x',
      formula: 'Total Liabilitas ÷ Total Ekuitas',
      ok: (r?.debtToEquityRatio ?? 99) <= 1.0,
      status: (r?.debtToEquityRatio ?? 99) <= 1.0 ? 'Aman' : 'Leveraged'
    }
  ];
});
</script>

<template>
  <VContainer class="px-4 py-6 md:px-6" fluid>
    <!-- ══ Header ══ -->
    <header class="mb-6 d-flex flex-wrap align-center justify-space-between ga-4">
      <div>
        <h1 class="text-h5 font-weight-bold">Financial Statements</h1>
        <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
          Posisi keuangan, laba rugi, dan rasio kelayakan bisnis PT AMA — dihitung dari Buku Besar.
        </p>
      </div>
      <div class="d-flex align-center ga-3">
        <VSelect
          v-model="selectedPeriod"
          density="compact"
          hide-details
          :items="periodOptions"
          label="Periode Pembukuan"
          style="min-width: 240px"
          variant="outlined"
        />
        <VBtn
          aria-label="Refresh statements"
          icon="mdi-refresh"
          :loading="pnlPending || bsPending"
          variant="tonal"
          @click="refresh"
        />
      </div>
    </header>

    <VAlert
      v-if="pnlError || bsError"
      class="mb-6"
      color="error"
      title="Financial statements unavailable"
      variant="tonal"
    >
      {{ pnlError?.message || bsError?.message }}
    </VAlert>

    <!-- ══ Segmented pill tabs ══ -->
    <div class="statement-tabs-wrapper mb-6 pa-1 rounded-lg border">
      <VTabs
        v-model="tab"
        color="primary"
        density="comfortable"
        align-tabs="start"
        class="statement-pill-tabs"
        hide-slider
      >
        <VTab value="pnl" class="statement-pill-tab" rounded="lg">
          <VIcon start icon="mdi-chart-line" />
          Profit &amp; Loss
        </VTab>
        <VTab value="balance-sheet" class="statement-pill-tab" rounded="lg">
          <VIcon start icon="mdi-scale-balance" />
          Balance Sheet
        </VTab>
        <VTab value="ratios" class="statement-pill-tab" rounded="lg">
          <VIcon start icon="mdi-calculator-variant-outline" />
          Rasio Keuangan
        </VTab>
      </VTabs>
    </div>

    <VSkeletonLoader v-if="(pnlPending || bsPending) && !pnl" type="table" />
    <VWindow v-else v-model="tab">
      <!-- ══════════ TAB 1: PROFIT & LOSS ══════════ -->
      <VWindowItem value="pnl">
        <template v-if="pnl">
          <VRow class="mb-6">
            <VCol v-for="kpi in pnlKpis" :key="kpi.label" cols="12" sm="4">
              <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
                <span class="text-overline text-medium-emphasis">{{ kpi.label }}</span>
                <div class="text-h5 font-weight-bold num mt-1" :class="kpi.toneClass">
                  {{ kpi.value }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">{{ kpi.note }}</div>
              </VCard>
            </VCol>
          </VRow>

          <VCard border class="elevation-0" rounded="lg">
            <div class="pa-4 d-flex align-center justify-space-between border-b-thin">
              <h2 class="text-subtitle-1 font-weight-bold mb-0">Laporan Laba Rugi</h2>
              <span class="text-caption text-medium-emphasis">{{ selectedPeriodLabel }} · IDR</span>
            </div>

            <VTable density="comfortable" class="statement-table">
              <thead>
                <tr>
                  <th>Akun Buku Besar</th>
                  <th class="text-right">Nominal (IDR)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="section-row">
                  <td colspan="2">Pendapatan Operasional</td>
                </tr>
                <tr v-for="line in pnlRevenueAccounts" :key="line.accountCode">
                  <td class="pl-6">
                    <span class="acct-code">{{ line.accountCode }}</span>{{ line.accountName }}
                  </td>
                  <td class="text-right num">{{ num(line.amountMinor) }}</td>
                </tr>
                <tr v-if="!pnlRevenueAccounts.length">
                  <td class="pl-6 text-caption text-medium-emphasis" colspan="2">
                    Tidak ada transaksi pendapatan pada periode ini
                  </td>
                </tr>
                <tr class="subtotal-row">
                  <td>Subtotal Pendapatan Operasional</td>
                  <td class="text-right num">{{ num(pnlTotalRevenue) }}</td>
                </tr>

                <tr class="section-row">
                  <td colspan="2">Beban Operasional</td>
                </tr>
                <tr v-for="line in pnlExpenseAccounts" :key="line.accountCode">
                  <td class="pl-6">
                    <span class="acct-code">{{ line.accountCode }}</span>{{ line.accountName }}
                  </td>
                  <td class="text-right num">{{ num(line.amountMinor) }}</td>
                </tr>
                <tr v-if="!pnlExpenseAccounts.length">
                  <td class="pl-6 text-caption text-medium-emphasis" colspan="2">
                    Tidak ada beban operasional pada periode ini
                  </td>
                </tr>
                <tr class="subtotal-row">
                  <td>Subtotal Beban Operasional</td>
                  <td class="text-right num">{{ num(pnlTotalExpense) }}</td>
                </tr>

                <tr class="grand-total-row">
                  <td>Laba / (Rugi) Bersih</td>
                  <td
                    class="text-right num"
                    :class="pnlNetProfit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ numParens(pnlNetProfit) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </template>
      </VWindowItem>

      <!-- ══════════ TAB 2: BALANCE SHEET ══════════ -->
      <VWindowItem value="balance-sheet">
        <template v-if="balanceSheet">
          <VRow class="mb-6">
            <VCol v-for="card in bsRatioCards" :key="card.label" cols="12" sm="4">
              <VCard border class="pa-4 fill-height elevation-0" rounded="lg">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-overline text-medium-emphasis">{{ card.label }}</span>
                  <VChip
                    :color="card.ok ? 'success' : 'warning'"
                    density="compact"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ card.status }}
                  </VChip>
                </div>
                <div class="d-flex align-baseline flex-wrap ga-2">
                  <span class="text-h5 font-weight-bold num">{{ card.value }}</span>
                  <span class="text-caption text-medium-emphasis">{{ card.benchmark }}</span>
                </div>
                <div class="text-caption text-medium-emphasis mt-1">{{ card.formula }}</div>
              </VCard>
            </VCol>
          </VRow>

          <VAlert
            class="mb-6"
            :color="balanceSheet.totals.balanced ? 'success' : 'error'"
            density="comfortable"
            :icon="
              balanceSheet.totals.balanced
                ? 'mdi-check-decagram-outline'
                : 'mdi-alert-circle-outline'
            "
            variant="tonal"
          >
            <div class="d-flex flex-wrap align-center justify-space-between ga-2">
              <strong>
                Neraca {{ balanceSheet.totals.balanced ? 'Seimbang' : 'Tidak Seimbang' }} — Laporan
                Posisi Keuangan (PSAK 1)
              </strong>
              <span class="text-caption text-medium-emphasis">
                Total Aset {{ num(balanceSheet.totals.assetsMinor) }} · Liabilitas + Ekuitas
                {{ num(balanceSheet.totals.liabilitiesMinor + balanceSheet.totals.equityMinor) }} ·
                Selisih {{ num(balanceSheet.totals.differenceMinor) }}
              </span>
            </div>
          </VAlert>

          <VRow>
            <!-- ── Kolom kiri: ASET ── -->
            <VCol cols="12" md="6">
              <VCard border class="elevation-0" rounded="lg">
                <div class="pa-4 d-flex align-center justify-space-between border-b-thin">
                  <h2 class="text-subtitle-1 font-weight-bold mb-0">Aset</h2>
                  <span class="text-caption text-medium-emphasis">{{ selectedPeriodLabel }} · IDR</span>
                </div>

                <VTable density="comfortable" class="statement-table">
                  <tbody>
                    <tr class="section-row">
                      <td colspan="2">Aset Lancar</td>
                    </tr>
                    <tr
                      v-for="line in balanceSheet.classifiedSections.currentAssets.accounts"
                      :key="line.accountCode"
                    >
                      <td class="pl-6">
                        <span class="acct-code">{{ line.accountCode }}</span>{{ line.accountName }}
                      </td>
                      <td class="text-right num">{{ numParens(line.amountMinor) }}</td>
                    </tr>
                    <tr v-if="!balanceSheet.classifiedSections.currentAssets.accounts.length">
                      <td class="pl-6 text-caption text-medium-emphasis" colspan="2">
                        Tidak ada akun aset lancar aktif
                      </td>
                    </tr>
                    <tr class="subtotal-row">
                      <td>Subtotal Aset Lancar</td>
                      <td class="text-right num">
                        {{ num(balanceSheet.totals.currentAssetsMinor) }}
                      </td>
                    </tr>

                    <tr class="section-row">
                      <td colspan="2">Aset Tidak Lancar</td>
                    </tr>
                    <tr
                      v-for="line in balanceSheet.classifiedSections.nonCurrentAssets.accounts"
                      :key="line.accountCode"
                    >
                      <td class="pl-6">
                        <span class="acct-code">{{ line.accountCode }}</span>{{ line.accountName }}
                        <span
                          v-if="line.accountCode === '1500'"
                          class="text-caption text-medium-emphasis"
                        >
                          · kontra akun
                        </span>
                      </td>
                      <td class="text-right num">{{ numParens(line.amountMinor) }}</td>
                    </tr>
                    <tr v-if="!balanceSheet.classifiedSections.nonCurrentAssets.accounts.length">
                      <td class="pl-6 text-caption text-medium-emphasis" colspan="2">
                        Tidak ada akun aset tidak lancar aktif
                      </td>
                    </tr>
                    <tr class="subtotal-row">
                      <td>Subtotal Aset Tidak Lancar</td>
                      <td class="text-right num">
                        {{ num(balanceSheet.totals.nonCurrentAssetsMinor) }}
                      </td>
                    </tr>

                    <tr class="grand-total-row">
                      <td>TOTAL ASET</td>
                      <td class="text-right num">{{ num(balanceSheet.totals.assetsMinor) }}</td>
                    </tr>
                  </tbody>
                </VTable>
              </VCard>
            </VCol>

            <!-- ── Kolom kanan: LIABILITAS & EKUITAS ── -->
            <VCol cols="12" md="6">
              <VCard border class="elevation-0" rounded="lg">
                <div class="pa-4 d-flex align-center justify-space-between border-b-thin">
                  <h2 class="text-subtitle-1 font-weight-bold mb-0">Liabilitas &amp; Ekuitas</h2>
                  <span class="text-caption text-medium-emphasis">{{ selectedPeriodLabel }} · IDR</span>
                </div>

                <VTable density="comfortable" class="statement-table">
                  <tbody>
                    <tr class="section-row">
                      <td colspan="2">Liabilitas Jangka Pendek</td>
                    </tr>
                    <tr
                      v-for="line in balanceSheet.classifiedSections.currentLiabilities.accounts"
                      :key="line.accountCode"
                    >
                      <td class="pl-6">
                        <span class="acct-code">{{ line.accountCode }}</span>{{ line.accountName }}
                        <span
                          v-if="line.accountCode === '2200'"
                          class="text-caption text-medium-emphasis"
                        >
                          · PSAK 72
                        </span>
                      </td>
                      <td class="text-right num">{{ numParens(line.amountMinor) }}</td>
                    </tr>
                    <tr v-if="!balanceSheet.classifiedSections.currentLiabilities.accounts.length">
                      <td class="pl-6 text-caption text-medium-emphasis" colspan="2">
                        Tidak ada akun liabilitas lancar aktif
                      </td>
                    </tr>
                    <tr class="subtotal-row">
                      <td>Subtotal Liabilitas Jangka Pendek</td>
                      <td class="text-right num">
                        {{ num(balanceSheet.totals.currentLiabilitiesMinor) }}
                      </td>
                    </tr>

                    <tr class="section-row">
                      <td colspan="2">Liabilitas Jangka Panjang</td>
                    </tr>
                    <tr
                      v-for="line in balanceSheet.classifiedSections.nonCurrentLiabilities.accounts"
                      :key="line.accountCode"
                    >
                      <td class="pl-6">
                        <span class="acct-code">{{ line.accountCode }}</span>{{ line.accountName }}
                      </td>
                      <td class="text-right num">{{ numParens(line.amountMinor) }}</td>
                    </tr>
                    <tr
                      v-if="!balanceSheet.classifiedSections.nonCurrentLiabilities.accounts.length"
                    >
                      <td class="pl-6 text-caption text-medium-emphasis" colspan="2">
                        Tidak ada saldo liabilitas jangka panjang aktif
                      </td>
                    </tr>
                    <tr class="subtotal-row">
                      <td>Subtotal Liabilitas Jangka Panjang</td>
                      <td class="text-right num">
                        {{ num(balanceSheet.totals.nonCurrentLiabilitiesMinor) }}
                      </td>
                    </tr>
                    <tr class="total-row">
                      <td>Total Liabilitas</td>
                      <td class="text-right num">
                        {{ num(balanceSheet.totals.liabilitiesMinor) }}
                      </td>
                    </tr>

                    <tr class="section-row">
                      <td colspan="2">Ekuitas</td>
                    </tr>
                    <tr
                      v-for="line in balanceSheet.classifiedSections.equity.accounts"
                      :key="line.accountCode"
                    >
                      <td class="pl-6">
                        <span class="acct-code">{{ line.accountCode }}</span>{{ line.accountName }}
                      </td>
                      <td class="text-right num">{{ numParens(line.amountMinor) }}</td>
                    </tr>
                    <tr>
                      <td class="pl-6 font-italic">Laba / (Rugi) Tahun Berjalan</td>
                      <td class="text-right num font-italic">
                        {{ numParens(balanceSheet.currentEarningsMinor) }}
                      </td>
                    </tr>
                    <tr class="subtotal-row">
                      <td>Total Ekuitas</td>
                      <td class="text-right num">{{ num(balanceSheet.totals.equityMinor) }}</td>
                    </tr>

                    <tr class="grand-total-row">
                      <td>TOTAL LIABILITAS &amp; EKUITAS</td>
                      <td class="text-right num">
                        {{
                          num(
                            balanceSheet.totals.liabilitiesMinor + balanceSheet.totals.equityMinor
                          )
                        }}
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </VCard>
            </VCol>
          </VRow>
        </template>
      </VWindowItem>

      <!-- ══════════ TAB 3: RASIO KEUANGAN ══════════ -->
      <VWindowItem value="ratios">
        <VCard border class="elevation-0" rounded="lg">
          <!-- Ringkasan -->
          <div class="pa-4 pb-3">
            <div class="d-flex flex-wrap align-start justify-space-between ga-3">
              <div>
                <h2 class="text-h6 font-weight-bold mb-1">Analisis Rasio Keuangan &amp; Aviasi</h2>
                <p class="text-caption text-medium-emphasis mb-0">
                  Benchmark likuiditas, solvabilitas, profitabilitas, dan efisiensi operasional
                  armada.
                </p>
              </div>
              <div class="d-flex ga-2">
                <VChip
                  color="success"
                  prepend-icon="mdi-check-circle-outline"
                  size="small"
                  variant="tonal"
                >
                  {{ healthyCount }} Sehat
                </VChip>
                <VChip
                  v-if="attentionCount"
                  color="warning"
                  prepend-icon="mdi-alert-circle-outline"
                  size="small"
                  variant="tonal"
                >
                  {{ attentionCount }} Perhatian
                </VChip>
              </div>
            </div>
          </div>

          <VDivider />

          <!-- Filter kategori -->
          <div class="pa-4 d-flex flex-wrap align-center ga-2">
            <span class="text-caption font-weight-medium text-medium-emphasis mr-2">Kategori:</span>
            <VChip
              v-for="cat in categories"
              :key="cat.id"
              :color="activeCategory === cat.id ? 'primary' : undefined"
              :variant="activeCategory === cat.id ? 'flat' : 'outlined'"
              filter
              size="small"
              @click="activeCategory = cat.id as any"
            >
              {{ cat.label }}
            </VChip>
          </div>

          <VDivider />

          <!-- Ledger rasio, dikelompokkan per kategori -->
          <div>
            <template v-for="group in visibleGroups" :key="group.id">
              <div class="group-header px-4 py-2">{{ group.label }}</div>
              <div
                v-for="ratio in group.items"
                :key="ratio.id"
                class="ratio-row px-4 py-3 d-flex flex-wrap align-start ga-6"
              >
                <div class="flex-grow-1" style="min-width: 0">
                  <div class="text-body-2 font-weight-medium">{{ ratio.name }}</div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ ratio.formula }} · {{ ratio.sourceAccount }}
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">{{ ratio.evaluation }}</div>
                </div>
                <div class="ratio-meta text-right">
                  <div class="text-subtitle-1 font-weight-bold num">{{ ratio.currentValue }}</div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Acuan: {{ ratio.benchmark }}
                  </div>
                  <VChip
                    :color="ratio.tone"
                    class="mt-1"
                    density="compact"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ ratio.status }}
                  </VChip>
                </div>
              </div>
            </template>

            <div
              v-if="!visibleGroups.length"
              class="pa-6 text-center text-caption text-medium-emphasis"
            >
              Tidak ada rasio yang cocok dengan filter yang dipilih.
            </div>
          </div>
        </VCard>
      </VWindowItem>
    </VWindow>
  </VContainer>
</template>

<style scoped>
/* ── Segmented pill tabs ── */
.statement-tabs-wrapper {
  background: #f1f5f9;
  border-color: #e2e8f0 !important;
}

.statement-pill-tabs :deep(.v-tab) {
  min-height: 42px;
  border-radius: 8px !important;
  font-weight: 600;
  margin-right: 8px;
  padding: 0 18px;
  color: #475569;
  letter-spacing: normal;
  text-transform: none;
  transition: all 0.15s ease;
}

.statement-pill-tabs :deep(.v-tab--selected) {
  background-color: #ffffff !important;
  color: #0f172a !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ── Angka keuangan ── */
.num {
  font-variant-numeric: tabular-nums;
}

.acct-code {
  display: inline-block;
  min-width: 52px;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.border-b-thin {
  border-bottom: 1px solid #e2e8f0;
}

/* ── Anatomi baris tabel laporan ── */
.statement-table .section-row td {
  background: #f8fafc;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.statement-table .subtotal-row td {
  border-top: 1px solid #e2e8f0;
  font-weight: 600;
}

.statement-table .total-row td {
  border-top: 1px solid #cbd5e1;
  font-weight: 700;
}

/* Konvensi akuntansi: garis ganda untuk grand total */
.statement-table .grand-total-row td {
  border-top: 3px double #94a3b8;
  font-size: 0.95rem;
  font-weight: 800;
  padding-top: 14px !important;
  padding-bottom: 14px !important;
}

/* ── Ledger rasio ── */
.group-header {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ratio-row {
  border-bottom: 1px solid #f1f5f9;
}

.ratio-row:last-child {
  border-bottom: none;
}

.ratio-meta {
  flex-shrink: 0;
  min-width: 168px;
}
</style>
