export type TrendDirection = 'up' | 'down';
export type SemanticTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface FinanceKpi {
  label: string;
  value: number;
  change: number;
  direction: TrendDirection;
  tone: SemanticTone;
  caption: string;
}

export interface FinanceRatio {
  label: string;
  value: string;
  trend: number[];
  tone?: SemanticTone;
}

export interface FinanceRatioGroup {
  label: string;
  ratios: FinanceRatio[];
}

export interface RouteRevenue {
  rank: number;
  route: string;
  revenue: number;
}

export interface FinanceActionItem {
  id: string;
  title: string;
  detail: string;
  value: string;
  tone: 'warning' | 'danger';
  to: string;
}

export interface TrialBalanceAccount {
  id: string;
  code: string;
  name: string;
  category: 'Aset' | 'Kewajiban' | 'Ekuitas' | 'Pendapatan' | 'Beban';
  subcategory: string;
  debit: number;
  credit: number;
  normalBalance: 'D' | 'K';
  actualBalance: number;
  abnormal: boolean;
  negativeCash?: boolean;
}

export interface HppBusinessLine {
  id: string;
  label: string;
  revenue: number;
  hpp: number;
  grossMargin: number;
  breakdown: {
    direct: number;
    indirect: number;
    nonOperating: number;
  };
}

export interface ContractRecord {
  id: string;
  partner: string;
  partnerType: string;
  cooperationType: string;
  routes: string[];
  totalBudget: number;
  absorbedBudget: number;
  startDate: string;
  endDate: string;
  status: 'Aktif' | 'Perlu Perpanjangan' | 'Berakhir';
  pic: string;
  documentName: string;
  documentSize: string;
  summary: string;
  absorptionTrend: Array<{ label: string; value: number }>;
  extensionHistory: Array<{ period: string; note: string }>;
}

export const financeDashboardDemo = {
  period: '2026-07',
  kpis: [
    {
      label: 'Total Pendapatan',
      value: 28_450_000_000,
      change: 12.6,
      direction: 'up',
      tone: 'success',
      caption: 'Recognized revenue bulan berjalan'
    },
    {
      label: 'Total Beban',
      value: 21_180_000_000,
      change: 6.3,
      direction: 'up',
      tone: 'danger',
      caption: 'Operational dan non-operational cost'
    },
    {
      label: 'Laba Bersih',
      value: 7_270_000_000,
      change: 24.4,
      direction: 'up',
      tone: 'success',
      caption: 'Setelah beban dan penyesuaian'
    },
    {
      label: 'Cash Position',
      value: 18_920_000_000,
      change: 5.7,
      direction: 'up',
      tone: 'success',
      caption: 'Kas dan setara kas tersedia'
    },
    {
      label: 'Piutang Jatuh Tempo',
      value: 2_340_000_000,
      change: 27.1,
      direction: 'up',
      tone: 'warning',
      caption: 'Outstanding lebih dari 30 hari'
    }
  ] satisfies FinanceKpi[],
  ratioGroups: [
    {
      label: 'Likuiditas',
      ratios: [
        {
          label: 'Current Ratio',
          value: '1,68x',
          trend: [1.31, 1.42, 1.37, 1.55, 1.48, 1.62, 1.68]
        },
        { label: 'Quick Ratio', value: '1,25x', trend: [0.96, 1.04, 1.12, 1.09, 1.18, 1.21, 1.25] }
      ]
    },
    {
      label: 'Profitabilitas',
      ratios: [
        { label: 'Gross Profit Margin', value: '34,2%', trend: [27, 28, 31, 30, 32, 33, 34.2] },
        {
          label: 'Net Profit Margin',
          value: '15,6%',
          trend: [10.8, 11.4, 12.9, 13.1, 14.2, 14.8, 15.6]
        },
        { label: 'ROA', value: '6,8%', trend: [4.3, 4.9, 5.1, 5.6, 5.8, 6.3, 6.8] }
      ]
    },
    {
      label: 'Efisiensi',
      ratios: [
        { label: 'Inventory Turnover', value: '5,2x', trend: [4.1, 4.4, 4.2, 4.7, 4.8, 5.0, 5.2] },
        { label: 'AR Turnover', value: '6,1x', trend: [5.1, 5.5, 5.3, 5.7, 5.8, 5.9, 6.1] }
      ]
    },
    {
      label: 'Solvabilitas',
      ratios: [
        {
          label: 'Debt to Equity Ratio',
          value: '0,72x',
          trend: [0.84, 0.81, 0.8, 0.78, 0.76, 0.74, 0.72]
        },
        {
          label: 'Debt to Asset Ratio',
          value: '0,42x',
          trend: [0.49, 0.48, 0.47, 0.46, 0.44, 0.43, 0.42]
        }
      ]
    }
  ] satisfies FinanceRatioGroup[],
  margins: [
    { label: 'Charter', value: 28.7 },
    { label: 'Passenger', value: 21.4 },
    { label: 'Cargo', value: 18.9 },
    { label: 'Helicopter', value: 15.6 },
    { label: 'MRO', value: 8.2 }
  ],
  busiestRoutes: [
    { rank: 1, route: 'Timika – Agats', revenue: 2_910_000_000 },
    { rank: 2, route: 'Nabire – Paniai', revenue: 2_470_000_000 },
    { rank: 3, route: 'Jayapura – Oksibil', revenue: 2_120_000_000 },
    { rank: 4, route: 'Merauke – Boven Digoel', revenue: 1_980_000_000 },
    { rank: 5, route: 'Wamena – Ilaga', revenue: 1_760_000_000 }
  ] satisfies RouteRevenue[],
  quietestRoutes: [
    { rank: 1, route: 'Kaimana – Fakfak', revenue: 128_000_000 },
    { rank: 2, route: 'Serui – Pomako', revenue: 116_000_000 },
    { rank: 3, route: 'Biak – Numfor', revenue: 104_000_000 },
    { rank: 4, route: 'Sarmi – Skouw', revenue: 98_000_000 },
    { rank: 5, route: 'Enarotali – Alama', revenue: 82_000_000 }
  ] satisfies RouteRevenue[],
  actions: [
    {
      id: 'overdue-ar',
      title: 'Piutang jatuh tempo',
      detail: '12 invoice melewati 30 hari',
      value: 'Rp 2,34 M',
      tone: 'warning',
      to: '/finance/accounts-receivable?status=overdue'
    },
    {
      id: 'due-ap',
      title: 'Utang jatuh tempo',
      detail: '8 invoice jatuh tempo dalam 7 hari',
      value: 'Rp 1,17 M',
      tone: 'warning',
      to: '/finance/accounts-payable?status=due-soon'
    },
    {
      id: 'coa-anomaly',
      title: 'Anomali validasi COA',
      detail: '7 akun bertentangan dengan saldo normal',
      value: 'Periksa Trial Balance',
      tone: 'danger',
      to: '/finance/trial-balance'
    },
    {
      id: 'contract-absorption',
      title: 'Serapan kontrak/subsidi > 80%',
      detail: '5 kontrak memerlukan review perpanjangan',
      value: '5 kontrak',
      tone: 'warning',
      to: '/marketing/contracts-subsidies'
    }
  ] satisfies FinanceActionItem[]
};

export const trialBalanceDemo: TrialBalanceAccount[] = [
  {
    id: '1100',
    code: '1100',
    name: 'Kas dan Bank',
    category: 'Aset',
    subcategory: 'Aset Lancar',
    debit: 118_750_000,
    credit: 5_000_000,
    normalBalance: 'D',
    actualBalance: 113_750_000,
    abnormal: false
  },
  {
    id: '1110',
    code: '1110',
    name: 'Kas Kecil',
    category: 'Aset',
    subcategory: 'Aset Lancar',
    debit: 50_000_000,
    credit: 0,
    normalBalance: 'D',
    actualBalance: 50_000_000,
    abnormal: false
  },
  {
    id: '1120',
    code: '1120',
    name: 'Piutang Usaha',
    category: 'Aset',
    subcategory: 'Aset Lancar',
    debit: 20_000_000,
    credit: 2_500_000,
    normalBalance: 'D',
    actualBalance: 17_500_000,
    abnormal: false
  },
  {
    id: '1130',
    code: '1130',
    name: 'Persediaan',
    category: 'Aset',
    subcategory: 'Aset Lancar',
    debit: 15_000_000,
    credit: 20_000_000,
    normalBalance: 'D',
    actualBalance: -5_000_000,
    abnormal: true
  },
  {
    id: '1140',
    code: '1140',
    name: 'Kas Operasional Timika',
    category: 'Aset',
    subcategory: 'Aset Lancar',
    debit: 2_000_000,
    credit: 7_000_000,
    normalBalance: 'D',
    actualBalance: -5_000_000,
    abnormal: false,
    negativeCash: true
  },
  {
    id: '2100',
    code: '2100',
    name: 'Utang Usaha',
    category: 'Kewajiban',
    subcategory: 'Kewajiban Lancar',
    debit: 0,
    credit: 25_000_000,
    normalBalance: 'K',
    actualBalance: -25_000_000,
    abnormal: false
  },
  {
    id: '2110',
    code: '2110',
    name: 'Utang Pajak',
    category: 'Kewajiban',
    subcategory: 'Kewajiban Lancar',
    debit: 0,
    credit: 7_500_000,
    normalBalance: 'K',
    actualBalance: -7_500_000,
    abnormal: false
  },
  {
    id: '2120',
    code: '2120',
    name: 'Utang Bank',
    category: 'Kewajiban',
    subcategory: 'Kewajiban Jangka Panjang',
    debit: 0,
    credit: 12_750_000,
    normalBalance: 'K',
    actualBalance: -12_750_000,
    abnormal: false
  },
  {
    id: '3100',
    code: '3100',
    name: 'Modal Disetor',
    category: 'Ekuitas',
    subcategory: 'Ekuitas',
    debit: 0,
    credit: 20_000_000,
    normalBalance: 'K',
    actualBalance: -20_000_000,
    abnormal: false
  },
  {
    id: '4100',
    code: '4100',
    name: 'Pendapatan Usaha',
    category: 'Pendapatan',
    subcategory: 'Pendapatan Operasional',
    debit: 0,
    credit: 32_500_000,
    normalBalance: 'K',
    actualBalance: -32_500_000,
    abnormal: false
  },
  {
    id: '5100',
    code: '5100',
    name: 'Beban Operasional',
    category: 'Beban',
    subcategory: 'Beban Operasional',
    debit: 23_500_000,
    credit: 0,
    normalBalance: 'D',
    actualBalance: 23_500_000,
    abnormal: false
  }
];

export const hppBusinessLinesDemo: HppBusinessLine[] = [
  {
    id: 'charter',
    label: 'Charter',
    revenue: 17_450_000_000,
    hpp: 12_450_000_000,
    grossMargin: 28.7,
    breakdown: { direct: 63, indirect: 25, nonOperating: 12 }
  },
  {
    id: 'passenger',
    label: 'Passenger',
    revenue: 11_350_000_000,
    hpp: 8_920_000_000,
    grossMargin: 21.4,
    breakdown: { direct: 58, indirect: 28, nonOperating: 14 }
  },
  {
    id: 'cargo',
    label: 'Cargo',
    revenue: 8_360_000_000,
    hpp: 6_780_000_000,
    grossMargin: 18.9,
    breakdown: { direct: 55, indirect: 29, nonOperating: 16 }
  },
  {
    id: 'helicopter',
    label: 'Helicopter',
    revenue: 4_090_000_000,
    hpp: 3_450_000_000,
    grossMargin: 15.6,
    breakdown: { direct: 60, indirect: 25, nonOperating: 15 }
  },
  {
    id: 'mro',
    label: 'MRO',
    revenue: 2_310_000_000,
    hpp: 2_120_000_000,
    grossMargin: 8.2,
    breakdown: { direct: 52, indirect: 29, nonOperating: 19 }
  }
];

export const contractsDemo: ContractRecord[] = [
  {
    id: 'CTR-001',
    partner: 'Pemerintah Kab. Mimika',
    partnerType: 'Pemerintah',
    cooperationType: 'PSO Penumpang',
    routes: ['Timika – Agats'],
    totalBudget: 12_000_000_000,
    absorbedBudget: 10_200_000_000,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: 'Perlu Perpanjangan',
    pic: 'Maria Ayu',
    documentName: 'MOU_Pemda_Mimika.pdf',
    documentSize: '1.3 MB',
    summary: 'Subsidi rute perintis untuk layanan penumpang masyarakat pedalaman.',
    absorptionTrend: [
      { label: 'Jan', value: 14 },
      { label: 'Feb', value: 28 },
      { label: 'Mar', value: 43 },
      { label: 'Apr', value: 58 },
      { label: 'Mei', value: 71 },
      { label: 'Jun', value: 85 }
    ],
    extensionHistory: [
      { period: '01 Jan 2024 – 31 Des 2024', note: 'Periode awal' },
      { period: '01 Jan 2025 – 31 Des 2025', note: 'Perpanjangan #1' }
    ]
  },
  {
    id: 'CTR-002',
    partner: 'Pemda Nabire',
    partnerType: 'Pemerintah',
    cooperationType: 'PSO Penumpang',
    routes: ['Nabire – Paniai'],
    totalBudget: 8_500_000_000,
    absorbedBudget: 5_440_000_000,
    startDate: '2026-01-01',
    endDate: '2026-09-15',
    status: 'Aktif',
    pic: 'Riko Wenda',
    documentName: 'MOU_Pemda_Nabire.pdf',
    documentSize: '980 KB',
    summary: 'Dukungan pendanaan layanan penumpang rute Nabire–Paniai.',
    absorptionTrend: [
      { label: 'Jan', value: 10 },
      { label: 'Feb', value: 21 },
      { label: 'Mar', value: 32 },
      { label: 'Apr', value: 44 },
      { label: 'Mei', value: 55 },
      { label: 'Jun', value: 64 }
    ],
    extensionHistory: [{ period: '01 Jan 2026 – 15 Sep 2026', note: 'Periode awal' }]
  },
  {
    id: 'CTR-003',
    partner: 'Keuskupan Jayapura',
    partnerType: 'Gereja',
    cooperationType: 'Charter Medis',
    routes: ['Jayapura – Oksibil'],
    totalBudget: 5_000_000_000,
    absorbedBudget: 4_600_000_000,
    startDate: '2026-01-01',
    endDate: '2026-07-20',
    status: 'Perlu Perpanjangan',
    pic: 'Yohanes Kogoya',
    documentName: 'MOU_Keuskupan_Jayapura.pdf',
    documentSize: '1.8 MB',
    summary: 'Kontrak charter medis dan dukungan pelayanan sosial.',
    absorptionTrend: [
      { label: 'Jan', value: 18 },
      { label: 'Feb', value: 35 },
      { label: 'Mar', value: 49 },
      { label: 'Apr', value: 63 },
      { label: 'Mei', value: 78 },
      { label: 'Jun', value: 92 }
    ],
    extensionHistory: [{ period: '01 Jan 2026 – 20 Jul 2026', note: 'Periode awal' }]
  },
  {
    id: 'CTR-004',
    partner: 'Yayasan Peduli Papua',
    partnerType: 'Yayasan',
    cooperationType: 'Logistik & Cargo',
    routes: ['Timika – Boven Digoel'],
    totalBudget: 2_200_000_000,
    absorbedBudget: 902_000_000,
    startDate: '2026-02-01',
    endDate: '2026-11-10',
    status: 'Aktif',
    pic: 'Stefanus Yikwa',
    documentName: 'MOU_Yayasan_Peduli_Papua.pdf',
    documentSize: '1.1 MB',
    summary: 'Pendanaan pengiriman logistik untuk program sosial.',
    absorptionTrend: [
      { label: 'Feb', value: 7 },
      { label: 'Mar', value: 15 },
      { label: 'Apr', value: 24 },
      { label: 'Mei', value: 33 },
      { label: 'Jun', value: 41 }
    ],
    extensionHistory: [{ period: '01 Feb 2026 – 10 Nov 2026', note: 'Periode awal' }]
  },
  {
    id: 'CTR-005',
    partner: 'Tokoh Adat Lanny Jaya',
    partnerType: 'Tokoh Adat',
    cooperationType: 'Charter Kegiatan',
    routes: ['Wamena – Ilaga'],
    totalBudget: 2_000_000_000,
    absorbedBudget: 1_520_000_000,
    startDate: '2026-01-15',
    endDate: '2026-08-25',
    status: 'Aktif',
    pic: 'Anselmus Wanimbo',
    documentName: 'MOU_Lanny_Jaya.pdf',
    documentSize: '720 KB',
    summary: 'Kerja sama charter untuk kegiatan masyarakat adat.',
    absorptionTrend: [
      { label: 'Jan', value: 5 },
      { label: 'Feb', value: 20 },
      { label: 'Mar', value: 34 },
      { label: 'Apr', value: 48 },
      { label: 'Mei', value: 61 },
      { label: 'Jun', value: 76 }
    ],
    extensionHistory: [{ period: '15 Jan 2026 – 25 Agu 2026', note: 'Periode awal' }]
  },
  {
    id: 'CTR-006',
    partner: 'Pemda Merauke',
    partnerType: 'Pemerintah',
    cooperationType: 'PSO Penumpang',
    routes: ['Merauke – Kepi'],
    totalBudget: 6_000_000_000,
    absorbedBudget: 4_980_000_000,
    startDate: '2026-01-01',
    endDate: '2026-06-15',
    status: 'Berakhir',
    pic: 'Dewi Mahuze',
    documentName: 'MOU_Pemda_Merauke.pdf',
    documentSize: '1.4 MB',
    summary: 'Kontrak PSO penumpang yang telah berakhir dan menunggu keputusan.',
    absorptionTrend: [
      { label: 'Jan', value: 13 },
      { label: 'Feb', value: 27 },
      { label: 'Mar', value: 43 },
      { label: 'Apr', value: 58 },
      { label: 'Mei', value: 73 },
      { label: 'Jun', value: 83 }
    ],
    extensionHistory: [{ period: '01 Jan 2026 – 15 Jun 2026', note: 'Periode awal' }]
  }
];
