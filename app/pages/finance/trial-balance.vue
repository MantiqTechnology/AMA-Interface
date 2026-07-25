<script setup lang="ts">
import { trialBalanceDemo, type TrialBalanceAccount } from '../../composables/useFinanceDemoData';

useHead({ title: 'Neraca Saldo · PT AMA' });

type Category = TrialBalanceAccount['category'];

const selectedPeriod = ref('2026-07');
const search = ref('');
const selectedCategory = ref<'Semua' | Category>('Semua');
const collapsedGroups = ref<Set<Category>>(new Set());

const categoryOrder: Category[] = ['Aset', 'Kewajiban', 'Ekuitas', 'Pendapatan', 'Beban'];

const { data: source, refresh } = await useAsyncData(
  'trial-balance-demo',
  async () => trialBalanceDemo
);
const accounts = computed(() => source.value ?? trialBalanceDemo);

const filteredAccounts = computed(() => {
  const query = search.value.trim().toLowerCase();
  return accounts.value.filter((account) => {
    const matchesCategory =
      selectedCategory.value === 'Semua' || account.category === selectedCategory.value;
    const matchesSearch =
      !query ||
      [account.code, account.name, account.category, account.subcategory].some((value) =>
        value.toLowerCase().includes(query)
      );
    return matchesCategory && matchesSearch;
  });
});

const groupedAccounts = computed(() =>
  categoryOrder
    .map((category) => ({
      category,
      rows: filteredAccounts.value.filter((account) => account.category === category)
    }))
    .filter((group) => group.rows.length > 0)
);

const totals = computed(() =>
  accounts.value.reduce(
    (result, account) => {
      result.debit += account.debit;
      result.credit += account.credit;
      return result;
    },
    { debit: 0, credit: 0 }
  )
);

const isBalanced = computed(() => Math.abs(totals.value.debit - totals.value.credit) < 0.5);
const abnormalCount = computed(() => accounts.value.filter((account) => account.abnormal).length);
const negativeCashCount = computed(
  () => accounts.value.filter((account) => account.negativeCash).length
);

function groupSubtotal(rows: TrialBalanceAccount[]) {
  return rows.reduce(
    (result, account) => {
      result.debit += account.debit;
      result.credit += account.credit;
      result.actual += account.actualBalance;
      return result;
    },
    { debit: 0, credit: 0, actual: 0 }
  );
}

function toggleGroup(category: Category) {
  const next = new Set(collapsedGroups.value);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  collapsedGroups.value = next;
}

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

function accountingNumber(value: number) {
  if (value === 0) return '—';
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
    Math.abs(value)
  );
  return value < 0 ? `(${formatted})` : formatted;
}

function rowClass(account: TrialBalanceAccount) {
  if (account.abnormal) return 'bg-rose-50/90 hover:bg-rose-100/70';
  if (account.negativeCash) return 'bg-amber-50/70 hover:bg-amber-100/60';
  return 'bg-white hover:bg-slate-50';
}

function exportCsv() {
  if (!import.meta.client) return;
  const header = [
    'Kode Akun',
    'Nama Akun',
    'Kategori',
    'Debit',
    'Kredit',
    'Saldo Normal',
    'Saldo Aktual'
  ];
  const rows = accounts.value.map((account) => [
    account.code,
    account.name,
    account.category,
    account.debit,
    account.credit,
    account.normalBalance,
    account.actualBalance
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'trial-balance-2026-07.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="finance-page">
    <div class="finance-page-shell">
      <FinanceFinancePageHeader
        v-model:period="selectedPeriod"
        subtitle="Validasi posisi saldo akun terhadap saldo normal Chart of Accounts."
        title="Neraca Saldo (Trial Balance)"
        @refresh="refresh"
      >
        <template #actions>
          <button
            class="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            type="button"
            @click="exportCsv"
          >
            Export CSV
          </button>
        </template>
      </FinanceFinancePageHeader>

      <section class="grid gap-3 md:grid-cols-3">
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Debit</p>
          <p class="mt-2 font-mono text-xl font-semibold tabular-nums text-slate-950">
            {{ rupiah(totals.debit) }}
          </p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Kredit</p>
          <p class="mt-2 font-mono text-xl font-semibold tabular-nums text-slate-950">
            {{ rupiah(totals.credit) }}
          </p>
        </article>
        <article
          class="rounded-xl border p-4 shadow-sm"
          :class="isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wide"
            :class="isBalanced ? 'text-emerald-700' : 'text-rose-700'"
          >
            Status Neraca
          </p>
          <div class="mt-2 flex items-center gap-2">
            <span
              class="grid h-7 w-7 place-items-center rounded-full text-sm font-bold text-white"
              :class="isBalanced ? 'bg-emerald-600' : 'bg-rose-600'"
            >
              {{ isBalanced ? '✓' : '×' }}
            </span>
            <span
              class="text-base font-semibold"
              :class="isBalanced ? 'text-emerald-800' : 'text-rose-800'"
            >
              {{ isBalanced ? 'Debit dan kredit balance' : 'Debit dan kredit tidak balance' }}
            </span>
          </div>
        </article>
      </section>

      <FinanceFinancePanel :padded="false">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <FinanceFinanceStatusBadge
              :value="`${abnormalCount} saldo abnormal`"
              :tone="abnormalCount ? 'danger' : 'success'"
            />
            <FinanceFinanceStatusBadge
              :value="`${negativeCashCount} kas negatif`"
              :tone="negativeCashCount ? 'warning' : 'success'"
            />
          </div>
        </template>

        <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <label class="min-w-[240px] flex-1">
            <span class="sr-only">Cari akun</span>
            <input
              v-model="search"
              class="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="Cari kode atau nama akun…"
              type="search"
            >
          </label>
          <label>
            <span class="sr-only">Kategori akun</span>
            <select
              v-model="selectedCategory"
              class="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="Semua">Semua kategori</option>
              <option v-for="category in categoryOrder" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </label>
        </div>

        <div class="finance-table-wrap max-h-[68vh]">
          <table class="finance-table">
            <thead>
              <tr>
                <th class="w-10"><span class="sr-only">Validasi</span></th>
                <th>Kode Akun</th>
                <th>Nama Akun</th>
                <th>Kategori</th>
                <th class="text-right">Debit</th>
                <th class="text-right">Kredit</th>
                <th class="text-center">Saldo Normal</th>
                <th class="text-right">Saldo Aktual</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in groupedAccounts" :key="group.category">
                <tr class="sticky top-[41px] z-[5] bg-slate-100 shadow-[0_1px_0_0_#e2e8f0]">
                  <td colspan="4" class="!py-2.5">
                    <button
                      class="flex w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-wide text-slate-700"
                      type="button"
                      @click="toggleGroup(group.category)"
                    >
                      <span
                        class="grid h-5 w-5 place-items-center rounded bg-white text-slate-500 ring-1 ring-slate-200"
                      >
                        {{ collapsedGroups.has(group.category) ? '+' : '−' }}
                      </span>
                      {{ group.category }}
                    </button>
                  </td>
                  <td class="finance-number !py-2.5 font-semibold">
                    {{ accountingNumber(groupSubtotal(group.rows).debit) }}
                  </td>
                  <td class="finance-number !py-2.5 font-semibold">
                    {{ accountingNumber(groupSubtotal(group.rows).credit) }}
                  </td>
                  <td class="!py-2.5" />
                  <td class="finance-number !py-2.5 font-semibold">
                    {{ accountingNumber(groupSubtotal(group.rows).actual) }}
                  </td>
                </tr>

                <tr
                  v-for="account in collapsedGroups.has(group.category) ? [] : group.rows"
                  :key="account.id"
                  class="transition"
                  :class="rowClass(account)"
                >
                  <td>
                    <span
                      v-if="account.abnormal"
                      class="grid h-6 w-6 place-items-center rounded-full bg-rose-100 text-xs font-bold text-rose-700"
                      title="Saldo tidak sesuai posisi normal akun"
                    >
                      !
                    </span>
                    <span
                      v-else-if="account.negativeCash"
                      class="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800"
                      title="Saldo negatif masih valid secara notasi, tetapi perlu perhatian"
                    >
                      !
                    </span>
                  </td>
                  <td class="font-mono text-xs font-semibold tabular-nums text-slate-700">
                    {{ account.code }}
                  </td>
                  <td>
                    <p class="font-medium text-slate-900">{{ account.name }}</p>
                    <p class="mt-0.5 text-xs text-slate-500">{{ account.subcategory }}</p>
                  </td>
                  <td>
                    <span class="text-sm text-slate-600">{{ account.category }}</span>
                  </td>
                  <td class="finance-number">{{ accountingNumber(account.debit) }}</td>
                  <td class="finance-number">{{ accountingNumber(account.credit) }}</td>
                  <td class="text-center">
                    <span
                      class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                      :class="
                        account.normalBalance === 'D'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      "
                    >
                      {{ account.normalBalance }}
                    </span>
                  </td>
                  <td
                    class="finance-number font-semibold"
                    :class="
                      account.abnormal
                        ? 'text-rose-700'
                        : account.negativeCash
                          ? 'text-amber-800'
                          : 'text-slate-900'
                    "
                  >
                    {{ accountingNumber(account.actualBalance) }}
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr class="bg-slate-950 text-white">
                <td colspan="4" class="px-4 py-4 text-sm font-bold uppercase tracking-wide">
                  Total
                </td>
                <td class="finance-number px-4 py-4 font-bold">
                  {{ accountingNumber(totals.debit) }}
                </td>
                <td class="finance-number px-4 py-4 font-bold">
                  {{ accountingNumber(totals.credit) }}
                </td>
                <td colspan="2" class="px-4 py-4 text-right">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                    :class="isBalanced ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'"
                  >
                    {{ isBalanced ? '✓ BALANCE' : '× TIDAK BALANCE' }}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <footer
          class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500"
        >
          <span><b class="text-emerald-700">D</b> = saldo normal Debit</span>
          <span><b class="text-amber-700">K</b> = saldo normal Kredit</span>
          <span><b class="text-rose-700">!</b> = saldo bertentangan dengan posisi normal</span>
          <span><b class="text-amber-700">!</b> = kas negatif/perlu perhatian</span>
        </footer>
      </FinanceFinancePanel>
    </div>
  </div>
</template>
