import type { Lead, Customer, Tender, Campaign, Opportunity, CrmActivity } from '../types/crm';

export function formatIDR(value: number): string {
  if (value >= 1_000_000_000) {
    return `IDR ${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, '')} B`;
  }
  if (value >= 1_000_000) {
    return `IDR ${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  }
  return `IDR ${value.toLocaleString('id-ID')}`;
}

export function formatIDRFull(value: number): string {
  return `IDR ${value.toLocaleString('id-ID')}`;
}

// ---------------------------------------------------------------------
// Generic helper: generate the next sequential id following `PREFIX-000N`
// ---------------------------------------------------------------------
function nextId(prefix: string, items: { id: string }[], digits: number): string {
  const nums = items
    .map((i) => parseInt(i.id.replace(`${prefix}-`, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(digits, '0')}`;
}

export function useCrmDummyData() {
  // ---------------------------------------------------------------------
  // LEADS
  // ---------------------------------------------------------------------

  const leadsState = useState<Lead[]>('crm-leads', () => [
    {
      id: 'LD-0312',
      orgName: 'Pemkab Sleman',
      sector: 'Government',
      contactPerson: 'Budi Santoso',
      phone: '0812-2345-1101',
      email: 'budi.santoso@slemankab.go.id',
      source: 'Website',
      status: 'New',
      assignedSales: 'Rangga Wibowo',
      createdDate: '07 Jul 2026'
    },
    {
      id: 'LD-0311',
      orgName: 'GKI Kota Wisata',
      sector: 'Church',
      contactPerson: 'Andreas Wijaya',
      phone: '0813-9988-2210',
      email: 'andreas@gkikotawisata.org',
      source: 'Referral',
      status: 'Contacted',
      assignedSales: 'Dewi Lestari',
      createdDate: '07 Jul 2026'
    },
    {
      id: 'LD-0310',
      orgName: 'PT Sarana Indah',
      sector: 'Commercial',
      contactPerson: 'Hendra Gunawan',
      phone: '0821-5566-7788',
      email: 'hendra@saranaindah.co.id',
      source: 'Exhibition',
      status: 'New',
      assignedSales: 'Yoga Permana',
      createdDate: '06 Jul 2026'
    },
    {
      id: 'LD-0309',
      orgName: 'Dinas Perhubungan Provinsi Papua',
      sector: 'Government',
      contactPerson: 'Yusuf Prasetyo',
      phone: '0852-4411-9900',
      email: 'yusuf.prasetyo@dishub-papua.go.id',
      source: 'Website',
      status: 'Qualified',
      assignedSales: 'Rangga Wibowo',
      createdDate: '06 Jul 2026'
    },
    {
      id: 'LD-0308',
      orgName: 'Hotel Grand Makassar',
      sector: 'Commercial',
      contactPerson: 'Sri Wahyuni',
      phone: '0817-2233-4455',
      email: 'sri.wahyuni@grandmakassar.com',
      source: 'Social Media',
      status: 'Contacted',
      assignedSales: 'Teguh Prabowo',
      createdDate: '05 Jul 2026'
    },
    {
      id: 'LD-0307',
      orgName: 'GBI Immanuel',
      sector: 'Church',
      contactPerson: 'Yohanes Tampubolon',
      phone: '0811-6677-8899',
      email: 'yohanes@gbiimmanuel.org',
      source: 'WhatsApp',
      status: 'New',
      assignedSales: 'Dewi Lestari',
      createdDate: '05 Jul 2026'
    },
    {
      id: 'LD-0306',
      orgName: 'Kementerian Perhubungan',
      sector: 'Government',
      contactPerson: 'Agus Permana',
      phone: '0813-1122-3344',
      email: 'agus.permana@dephub.go.id',
      source: 'Referral',
      status: 'Qualified',
      assignedSales: 'Rangga Wibowo',
      createdDate: '04 Jul 2026'
    },
    {
      id: 'LD-0305',
      orgName: 'PT Maju Bersama',
      sector: 'Commercial',
      contactPerson: 'Rina Setiawan',
      phone: '0822-3344-5566',
      email: 'rina.setiawan@majubersama.co.id',
      source: 'Google Ads',
      status: 'Contacted',
      assignedSales: 'Yoga Permana',
      createdDate: '03 Jul 2026'
    },
    {
      id: 'LD-0304',
      orgName: 'Keuskupan Agung Makassar',
      sector: 'Church',
      contactPerson: 'Rio Pratama',
      phone: '0819-8877-6655',
      email: 'rio.pratama@kamakassar.org',
      source: 'Email',
      status: 'Lost',
      assignedSales: 'Dewi Lestari',
      createdDate: '02 Jul 2026'
    },
    {
      id: 'LD-0303',
      orgName: 'Pemerintah Kota Jayapura',
      sector: 'Government',
      contactPerson: 'Dedi Firmansyah',
      phone: '0852-1122-8899',
      email: 'dedi.firmansyah@jayapurakota.go.id',
      source: 'Website',
      status: 'New',
      assignedSales: 'Rangga Wibowo',
      createdDate: '01 Jul 2026'
    },
    {
      id: 'LD-0302',
      orgName: 'Universitas Nusantara',
      sector: 'Commercial',
      contactPerson: 'Anisa Putri',
      phone: '0821-9900-1122',
      email: 'anisa.putri@unusantara.ac.id',
      source: 'Exhibition',
      status: 'Qualified',
      assignedSales: 'Teguh Prabowo',
      createdDate: '30 Jun 2026'
    },
    {
      id: 'LD-0301',
      orgName: 'HKBP Jakarta',
      sector: 'Church',
      contactPerson: 'Marto Simanjuntak',
      phone: '0813-4455-6677',
      email: 'marto@hkbpjakarta.org',
      source: 'Walk In',
      status: 'Contacted',
      assignedSales: 'Dewi Lestari',
      createdDate: '29 Jun 2026'
    }
  ]);
  const leads = leadsState.value;

  // ---------------------------------------------------------------------
  // CUSTOMERS
  // ---------------------------------------------------------------------
  const customersState = useState<Customer[]>('crm-customers', () => [
    {
      id: 'CST-1001',
      name: 'Dinas Perhubungan Provinsi Papua',
      sector: 'Government',
      contactPerson: 'Yusuf Prasetyo',
      email: 'yusuf.prasetyo@dishub-papua.go.id',
      phone: '0852-4411-9900',
      totalProjects: 6,
      customerSince: '2019',
      province: 'Papua',
      status: 'Active'
    },
    {
      id: 'CST-1002',
      name: 'Kementerian Perhubungan',
      sector: 'Government',
      contactPerson: 'Agus Permana',
      email: 'agus.permana@dephub.go.id',
      phone: '0813-1122-3344',
      totalProjects: 11,
      customerSince: '2016',
      province: 'DKI Jakarta',
      status: 'Active'
    },
    {
      id: 'CST-1003',
      name: 'Pemerintah Kota Jayapura',
      sector: 'Government',
      contactPerson: 'Dedi Firmansyah',
      email: 'dedi.firmansyah@jayapurakota.go.id',
      phone: '0852-1122-8899',
      totalProjects: 4,
      customerSince: '2021',
      province: 'Papua',
      status: 'Active'
    },
    {
      id: 'CST-1004',
      name: 'GKI Kota Wisata',
      sector: 'Church',
      contactPerson: 'Andreas Wijaya',
      email: 'andreas@gkikotawisata.org',
      phone: '0813-9988-2210',
      totalProjects: 2,
      customerSince: '2022',
      province: 'Jawa Barat',
      status: 'Active'
    },
    {
      id: 'CST-1005',
      name: 'Keuskupan Agung Makassar',
      sector: 'Church',
      contactPerson: 'Rio Pratama',
      email: 'rio.pratama@kamakassar.org',
      phone: '0819-8877-6655',
      totalProjects: 3,
      customerSince: '2020',
      province: 'Sulawesi Selatan',
      status: 'Inactive'
    },
    {
      id: 'CST-1006',
      name: 'GBI Immanuel',
      sector: 'Church',
      contactPerson: 'Yohanes Tampubolon',
      email: 'yohanes@gbiimmanuel.org',
      phone: '0811-6677-8899',
      totalProjects: 1,
      customerSince: '2023',
      province: 'DKI Jakarta',
      status: 'Active'
    },
    {
      id: 'CST-1007',
      name: 'PT Angkasa Nusantara',
      sector: 'Commercial',
      contactPerson: 'Bagas Saputra',
      email: 'bagas@angkasanusantara.co.id',
      phone: '0812-3344-5566',
      totalProjects: 8,
      customerSince: '2018',
      province: 'DKI Jakarta',
      status: 'Active'
    },
    {
      id: 'CST-1008',
      name: 'Hotel Grand Makassar',
      sector: 'Commercial',
      contactPerson: 'Sri Wahyuni',
      email: 'sri.wahyuni@grandmakassar.com',
      phone: '0817-2233-4455',
      totalProjects: 2,
      customerSince: '2022',
      province: 'Sulawesi Selatan',
      status: 'Active'
    },
    {
      id: 'CST-1009',
      name: 'PT Sarana Logistik',
      sector: 'Commercial',
      contactPerson: 'Hendra Gunawan',
      email: 'hendra@saranalogistik.co.id',
      phone: '0821-5566-7788',
      totalProjects: 5,
      customerSince: '2019',
      province: 'Jawa Timur',
      status: 'Active'
    },
    {
      id: 'CST-1010',
      name: 'Universitas Nusantara',
      sector: 'Commercial',
      contactPerson: 'Anisa Putri',
      email: 'anisa.putri@unusantara.ac.id',
      phone: '0821-9900-1122',
      totalProjects: 3,
      customerSince: '2021',
      province: 'Jawa Tengah',
      status: 'Inactive'
    }
  ]);
  const customers = customersState.value;

  // ---------------------------------------------------------------------
  // TENDER (Government & Church)
  // ---------------------------------------------------------------------
  const tendersState = useState<Tender[]>('crm-tenders', () => [
    {
      id: 'TND-001',
      number: 'TND/2026/07/001',
      organization: 'Kementerian Perhubungan',
      sector: 'Government',
      projectName: 'Pengadaan IT Server',
      estimatedBudget: 1250000000,
      closingDate: '15 Jul 2026',
      pic: 'Rangga Wibowo',
      status: 'Preparing',
      requirement: 'Pengadaan 6 unit server rack termasuk instalasi & garansi 3 tahun',
      timeline: 'Persiapan: 01-14 Jul, Submit: 15 Jul, Evaluasi: 16-25 Jul',
      proposalProgress: 65,
      documents: ['KAK.pdf', 'RAB.xlsx', 'Company Profile.pdf']
    },
    {
      id: 'TND-002',
      number: 'TND/2026/07/002',
      organization: 'GKI Sinode',
      sector: 'Church',
      projectName: 'Pengadaan Sound System',
      estimatedBudget: 450000000,
      closingDate: '18 Jul 2026',
      pic: 'Dewi Lestari',
      status: 'Open',
      requirement: 'Sound system aula utama kapasitas 1500 jemaat',
      timeline: 'Open: 01 Jul, Closing: 18 Jul',
      proposalProgress: 20,
      documents: ['Spesifikasi Teknis.pdf']
    },
    {
      id: 'TND-003',
      number: 'TND/2026/07/003',
      organization: 'Pemkab Bandung',
      sector: 'Government',
      projectName: 'Pengadaan CCTV Terminal',
      estimatedBudget: 680000000,
      closingDate: '20 Jul 2026',
      pic: 'Rangga Wibowo',
      status: 'Preparing',
      requirement: 'CCTV 32 titik area terminal dan command center',
      timeline: 'Persiapan: 05-19 Jul, Submit: 20 Jul',
      proposalProgress: 40,
      documents: ['KAK.pdf', 'Denah Lokasi.pdf']
    },
    {
      id: 'TND-004',
      number: 'TND/2026/07/004',
      organization: 'Dinas Pendidikan Papua',
      sector: 'Government',
      projectName: 'Pengadaan AC Ruang Kelas',
      estimatedBudget: 320000000,
      closingDate: '22 Jul 2026',
      pic: 'Teguh Prabowo',
      status: 'Open',
      requirement: 'AC split 60 unit untuk 20 ruang kelas',
      timeline: 'Open: 08 Jul, Closing: 22 Jul',
      proposalProgress: 10,
      documents: ['RAB.xlsx']
    },
    {
      id: 'TND-005',
      number: 'TND/2026/06/018',
      organization: 'Keuskupan Agung Makassar',
      sector: 'Church',
      projectName: 'Pengadaan Sarana Ibadah',
      estimatedBudget: 275000000,
      closingDate: '28 Jul 2026',
      pic: 'Dewi Lestari',
      status: 'Open',
      requirement: 'Perlengkapan altar dan sarana ibadah katedral',
      timeline: 'Open: 10 Jul, Closing: 28 Jul',
      proposalProgress: 5,
      documents: []
    },
    {
      id: 'TND-006',
      number: 'TND/2026/06/012',
      organization: 'Kementerian Perhubungan',
      sector: 'Government',
      projectName: 'Pengadaan Genset 500 KVA',
      estimatedBudget: 850000000,
      closingDate: '05 Jul 2026',
      pic: 'Rangga Wibowo',
      status: 'Evaluation',
      requirement: 'Genset cadangan bandara kapasitas 500 KVA',
      timeline: 'Submitted: 05 Jul, Evaluasi: 06-20 Jul',
      proposalProgress: 100,
      documents: ['Proposal Teknis.pdf', 'Proposal Harga.pdf', 'BAST Contoh.pdf']
    },
    {
      id: 'TND-007',
      number: 'TND/2026/06/009',
      organization: 'Pemprov Papua',
      sector: 'Government',
      projectName: 'Smart Classroom Project',
      estimatedBudget: 560000000,
      closingDate: '02 Jul 2026',
      pic: 'Teguh Prabowo',
      status: 'Won',
      requirement: 'Instalasi smart classroom 10 ruang kelas',
      timeline: 'Selesai — kontrak ditandatangani 04 Jul 2026',
      proposalProgress: 100,
      documents: ['Kontrak.pdf', 'BAST.pdf']
    },
    {
      id: 'TND-008',
      number: 'TND/2026/05/031',
      organization: 'HKBP Jakarta',
      sector: 'Church',
      projectName: 'Renovasi Sistem Audio Gereja',
      estimatedBudget: 190000000,
      closingDate: '25 Jun 2026',
      pic: 'Dewi Lestari',
      status: 'Lost',
      requirement: 'Upgrade sistem audio dan mixer gereja',
      timeline: 'Ditutup — dimenangkan vendor lain',
      proposalProgress: 100,
      documents: ['Proposal Teknis.pdf']
    }
  ]);
  const tenders = tendersState.value;

  // ---------------------------------------------------------------------
  // PROMOTION / CAMPAIGNS (Commercial)
  // ---------------------------------------------------------------------
  const campaignsState = useState<Campaign[]>('crm-campaigns', () => [
    {
      id: 'CMP-001',
      name: 'Airport Solutions Digital Push',
      targetMarket: 'Hospitality & Logistics',
      type: 'Google Ads',
      budget: 85000000,
      leadsGenerated: 46,
      conversion: 18,
      startDate: '01 Jun 2026',
      endDate: '31 Jul 2026',
      status: 'Running'
    },
    {
      id: 'CMP-002',
      name: 'Instagram Brand Awareness Q3',
      targetMarket: 'Commercial - Perkotaan',
      type: 'Instagram',
      budget: 35000000,
      leadsGenerated: 28,
      conversion: 12,
      startDate: '15 Jun 2026',
      endDate: '15 Aug 2026',
      status: 'Running'
    },
    {
      id: 'CMP-003',
      name: 'Enterprise Facility Webinar',
      targetMarket: 'Corporate & University',
      type: 'Webinar',
      budget: 25000000,
      leadsGenerated: 19,
      conversion: 26,
      startDate: '10 Jul 2026',
      endDate: '10 Jul 2026',
      status: 'Completed'
    },
    {
      id: 'CMP-004',
      name: 'WhatsApp Blast Promo Ramadan Follow-up',
      targetMarket: 'Hospitality',
      type: 'WhatsApp Blast',
      budget: 8000000,
      leadsGenerated: 12,
      conversion: 9,
      startDate: '01 Jul 2026',
      endDate: '20 Jul 2026',
      status: 'Running'
    },
    {
      id: 'CMP-005',
      name: 'Facebook Lead Gen - SME Logistics',
      targetMarket: 'SME Logistik',
      type: 'Facebook',
      budget: 20000000,
      leadsGenerated: 21,
      conversion: 14,
      startDate: '05 Jul 2026',
      endDate: '05 Aug 2026',
      status: 'Running'
    },
    {
      id: 'CMP-006',
      name: 'Exhibition Infrastruktur Indonesia 2026',
      targetMarket: 'Infrastruktur & Konstruksi',
      type: 'Exhibition',
      budget: 120000000,
      leadsGenerated: 54,
      conversion: 22,
      startDate: '18 Aug 2026',
      endDate: '20 Aug 2026',
      status: 'Draft'
    },
    {
      id: 'CMP-007',
      name: 'Email Nurturing Hotel Chains',
      targetMarket: 'Hospitality',
      type: 'Email Marketing',
      budget: 6000000,
      leadsGenerated: 9,
      conversion: 11,
      startDate: '01 May 2026',
      endDate: '31 May 2026',
      status: 'Completed'
    },
    {
      id: 'CMP-008',
      name: 'Seminar Manajemen Aset Kampus',
      targetMarket: 'Universitas & Yayasan Pendidikan',
      type: 'Seminar',
      budget: 15000000,
      leadsGenerated: 7,
      conversion: 8,
      startDate: '12 Apr 2026',
      endDate: '12 Apr 2026',
      status: 'Cancelled'
    }
  ]);
  const campaigns = campaignsState.value;

  // ---------------------------------------------------------------------
  // OPPORTUNITIES
  // ---------------------------------------------------------------------
  const opportunitiesState = useState<Opportunity[]>('crm-opportunities', () => [
    {
      id: 'OPP-2107',
      name: 'Pengadaan Genset 500 KVA',
      customer: 'Dinas Perhubungan Papua',
      sector: 'Government',
      estimatedValue: 8500000000,
      probability: 65,
      stage: 'Proposal',
      expectedClosing: '20 Aug 2026',
      salesOwner: 'Rangga Wibowo'
    },
    {
      id: 'OPP-2106',
      name: 'IT Infrastructure Project',
      customer: 'Bank Sejahtera',
      sector: 'Commercial',
      estimatedValue: 7200000000,
      probability: 55,
      stage: 'Negotiation',
      expectedClosing: '05 Aug 2026',
      salesOwner: 'Yoga Permana'
    },
    {
      id: 'OPP-2105',
      name: 'Pengadaan Bus Bandara',
      customer: 'PT Angkasa Pura',
      sector: 'Commercial',
      estimatedValue: 6800000000,
      probability: 40,
      stage: 'Quotation',
      expectedClosing: '28 Aug 2026',
      salesOwner: 'Teguh Prabowo'
    },
    {
      id: 'OPP-2104',
      name: 'Smart Classroom Project',
      customer: 'Pemprov Jawa Barat',
      sector: 'Government',
      estimatedValue: 5600000000,
      probability: 70,
      stage: 'Proposal',
      expectedClosing: '12 Aug 2026',
      salesOwner: 'Rangga Wibowo'
    },
    {
      id: 'OPP-2103',
      name: 'Security System Upgrade',
      customer: 'Hotel Grand Makassar',
      sector: 'Commercial',
      estimatedValue: 3400000000,
      probability: 30,
      stage: 'Qualification',
      expectedClosing: '15 Sep 2026',
      salesOwner: 'Teguh Prabowo'
    },
    {
      id: 'OPP-2102',
      name: 'Sound System Renovation',
      customer: 'GKI Kota Wisata',
      sector: 'Church',
      estimatedValue: 950000000,
      probability: 50,
      stage: 'Negotiation',
      expectedClosing: '30 Jul 2026',
      salesOwner: 'Dewi Lestari'
    },
    {
      id: 'OPP-2101',
      name: 'Sarana Ibadah Katedral',
      customer: 'Keuskupan Agung Makassar',
      sector: 'Church',
      estimatedValue: 620000000,
      probability: 25,
      stage: 'Qualification',
      expectedClosing: '10 Sep 2026',
      salesOwner: 'Dewi Lestari'
    },
    {
      id: 'OPP-2100',
      name: 'Logistic Warehouse Automation',
      customer: 'PT Sarana Logistik',
      sector: 'Commercial',
      estimatedValue: 4100000000,
      probability: 60,
      stage: 'Contract',
      expectedClosing: '18 Jul 2026',
      salesOwner: 'Yoga Permana'
    },
    {
      id: 'OPP-2099',
      name: 'Campus WiFi & Network Upgrade',
      customer: 'Universitas Nusantara',
      sector: 'Commercial',
      estimatedValue: 1800000000,
      probability: 85,
      stage: 'Won',
      expectedClosing: '01 Jul 2026',
      salesOwner: 'Yoga Permana'
    },
    {
      id: 'OPP-2098',
      name: 'Terminal CCTV Expansion',
      customer: 'Pemkab Bandung',
      sector: 'Government',
      estimatedValue: 2600000000,
      probability: 15,
      stage: 'Lost',
      expectedClosing: '20 Jun 2026',
      salesOwner: 'Rangga Wibowo'
    }
  ]);
  const opportunities = opportunitiesState.value;

  // ---------------------------------------------------------------------
  // ACTIVITIES
  // ---------------------------------------------------------------------
  const activitiesState = useState<CrmActivity[]>('crm-activities', () => [
    {
      id: 'ACT-3301',
      type: 'Meeting',
      customer: 'Dinas PUPR',
      relatedOpportunity: 'Pengadaan Genset 500 KVA',
      sales: 'Budi Santoso',
      schedule: '08 Jul 2026, 10:00 WIB',
      result: '-',
      nextAction: 'Kirim proposal teknis',
      status: 'Scheduled'
    },
    {
      id: 'ACT-3300',
      type: 'Site Survey',
      customer: 'GBI Jemaat Kasih',
      relatedOpportunity: 'Sound System Renovation',
      sales: 'Andreas',
      schedule: '08 Jul 2026, 13:00 WIB',
      result: '-',
      nextAction: 'Susun estimasi biaya',
      status: 'Scheduled'
    },
    {
      id: 'ACT-3299',
      type: 'Presentation',
      customer: 'PT Maju Bersama',
      relatedOpportunity: 'Security System Upgrade',
      sales: 'Rina Setiawan',
      schedule: '09 Jul 2026, 09:00 WIB',
      result: '-',
      nextAction: 'Tunggu keputusan internal',
      status: 'Scheduled'
    },
    {
      id: 'ACT-3298',
      type: 'Phone Call',
      customer: 'Pemprov Jawa Barat',
      relatedOpportunity: 'Smart Classroom Project',
      sales: 'Agus Permana',
      schedule: '09 Jul 2026, 15:00 WIB',
      result: 'Tertarik, minta revisi RAB',
      nextAction: 'Revisi RAB',
      status: 'Completed'
    },
    {
      id: 'ACT-3297',
      type: 'Demo',
      customer: 'Hotel Santika',
      relatedOpportunity: 'Security System Upgrade',
      sales: 'Yuni Lestari',
      schedule: '10 Jul 2026, 11:00 WIB',
      result: '-',
      nextAction: 'Follow up hasil demo',
      status: 'Scheduled'
    },
    {
      id: 'ACT-3296',
      type: 'Follow Up',
      customer: 'Bank Sejahtera',
      relatedOpportunity: 'IT Infrastructure Project',
      sales: 'Yoga Permana',
      schedule: '06 Jul 2026, 14:00 WIB',
      result: 'Menunggu approval budget',
      nextAction: 'Follow up 15 Jul',
      status: 'Completed'
    },
    {
      id: 'ACT-3295',
      type: 'Meeting',
      customer: 'PT Angkasa Pura',
      relatedOpportunity: 'Pengadaan Bus Bandara',
      sales: 'Teguh Prabowo',
      schedule: '05 Jul 2026, 10:00 WIB',
      result: 'Deal disepakati tahap quotation',
      nextAction: 'Kirim penawaran harga',
      status: 'Completed'
    },
    {
      id: 'ACT-3294',
      type: 'Email',
      customer: 'Universitas Nusantara',
      relatedOpportunity: 'Campus WiFi & Network Upgrade',
      sales: 'Anisa Putri',
      schedule: '01 Jul 2026, 09:00 WIB',
      result: 'Kontrak ditandatangani',
      nextAction: 'Selesai',
      status: 'Completed'
    },
    {
      id: 'ACT-3293',
      type: 'Site Survey',
      customer: 'Keuskupan Agung Makassar',
      relatedOpportunity: 'Sarana Ibadah Katedral',
      sales: 'Rio Pratama',
      schedule: '11 Jul 2026, 09:00 WIB',
      result: '-',
      nextAction: 'Susun proposal',
      status: 'Scheduled'
    },
    {
      id: 'ACT-3292',
      type: 'Follow Up',
      customer: 'PT Sarana Logistik',
      relatedOpportunity: 'Logistic Warehouse Automation',
      sales: 'Hendra Gunawan',
      schedule: '30 Jun 2026, 10:00 WIB',
      result: 'Client cancel jadwal',
      nextAction: 'Reschedule minggu depan',
      status: 'Cancelled'
    }
  ]);
  const activities = activitiesState.value;

  // ---------------------------------------------------------------------
  // OVERVIEW PAGE — fixed snapshot dataset (mirrors reference dashboard)
  // ---------------------------------------------------------------------
  const overviewKpis = [
    {
      key: 'totalLeads',
      label: 'Total Leads',
      value: '312',
      trend: '18%',
      trendUp: true,
      icon: 'mdi-account-group',
      color: '#7C3AED',
      bg: '#EDE9FE'
    },
    {
      key: 'activeOpportunities',
      label: 'Active Opportunities',
      value: '87',
      trend: '12%',
      trendUp: true,
      icon: 'mdi-target-account',
      color: '#059669',
      bg: '#D1FAE5'
    },
    {
      key: 'tenderOngoing',
      label: 'Tender Ongoing',
      value: '24',
      trend: '9%',
      trendUp: true,
      icon: 'mdi-clipboard-text-outline',
      color: '#D97706',
      bg: '#FEF3C7'
    },
    {
      key: 'promotionCampaign',
      label: 'Promotion Campaign',
      value: '15',
      trend: '15%',
      trendUp: true,
      icon: 'mdi-bullhorn-outline',
      color: '#DC2626',
      bg: '#FEE2E2'
    },
    {
      key: 'wonProjects',
      label: 'Won Projects (This Year)',
      value: '32',
      trend: '10%',
      trendUp: true,
      icon: 'mdi-trophy-outline',
      color: '#2563EB',
      bg: '#DBEAFE'
    },
    {
      key: 'revenuePipeline',
      label: 'Revenue Pipeline',
      value: 'IDR 68.45 B',
      trend: '14%',
      trendUp: true,
      icon: 'mdi-chart-line',
      color: '#0891B2',
      bg: '#CFFAFE'
    }
  ];

  const leadsBySector = [
    { label: 'Government', value: 134, percent: 43, color: '#2563EB' },
    { label: 'Church', value: 78, percent: 25, color: '#059669' },
    { label: 'Commercial', value: 100, percent: 32, color: '#F59E0B' }
  ];

  const tenderStatusBreakdown = [
    { label: 'Open', value: 6, percent: 25, color: '#2563EB' },
    { label: 'Preparing', value: 7, percent: 29, color: '#059669' },
    { label: 'Submitted', value: 5, percent: 21, color: '#7C3AED' },
    { label: 'Evaluation', value: 4, percent: 17, color: '#F59E0B' },
    { label: 'Won', value: 2, percent: 8, color: '#DC2626' }
  ];

  const salesPipeline = [
    { label: 'Qualification', value: 87 },
    { label: 'Proposal', value: 32 },
    { label: 'Negotiation', value: 18 },
    { label: 'Quotation', value: 9 },
    { label: 'Contract', value: 6 },
    { label: 'Won', value: 5 }
  ];

  const opportunityByMonth = [
    { month: 'Jan', value: 20 },
    { month: 'Feb', value: 26 },
    { month: 'Mar', value: 31 },
    { month: 'Apr', value: 45 },
    { month: 'May', value: 38 },
    { month: 'Jun', value: 55 },
    { month: 'Jul', value: 87 },
    { month: 'Aug', value: null },
    { month: 'Sep', value: null },
    { month: 'Oct', value: null },
    { month: 'Nov', value: null },
    { month: 'Dec', value: null }
  ];

  const recentLeads = leads.slice(0, 5).map((l) => ({
    name: l.orgName,
    sector: l.sector,
    source: l.source,
    date: l.createdDate,
    status: l.status
  }));

  const upcomingActivities = [
    {
      activity: 'Meeting',
      customer: 'Dinas PUPR',
      pic: 'Budi Santoso',
      schedule: '08 Jul 2026, 10:00 WIB',
      status: 'Scheduled'
    },
    {
      activity: 'Site Survey',
      customer: 'GBI Jemaat Kasih',
      pic: 'Andreas',
      schedule: '08 Jul 2026, 13:00 WIB',
      status: 'Scheduled'
    },
    {
      activity: 'Presentation',
      customer: 'PT Maju Bersama',
      pic: 'Rina Setiawan',
      schedule: '09 Jul 2026, 09:00 WIB',
      status: 'Scheduled'
    },
    {
      activity: 'Call Follow Up',
      customer: 'Pemprov Jawa Barat',
      pic: 'Agus Permana',
      schedule: '09 Jul 2026, 15:00 WIB',
      status: 'Scheduled'
    },
    {
      activity: 'Demo',
      customer: 'Hotel Santika',
      pic: 'Yuni Lestari',
      schedule: '10 Jul 2026, 11:00 WIB',
      status: 'Scheduled'
    }
  ];

  const tenderDeadlines = [
    {
      name: 'Pengadaan IT Server',
      organization: 'Kementerian Perhubungan',
      deadline: '15 Jul 2026',
      status: 'Preparing'
    },
    {
      name: 'Pengadaan Sound System',
      organization: 'GKI Sinode',
      deadline: '18 Jul 2026',
      status: 'Open'
    },
    {
      name: 'Pengadaan CCTV',
      organization: 'Pemkab Bandung',
      deadline: '20 Jul 2026',
      status: 'Preparing'
    },
    {
      name: 'Pengadaan AC',
      organization: 'Dinas Pendidikan',
      deadline: '22 Jul 2026',
      status: 'Open'
    },
    {
      name: 'Pengadaan Sarana Ibadah',
      organization: 'Keuskupan Agung',
      deadline: '28 Jul 2026',
      status: 'Open'
    }
  ];

  const topOpportunities = opportunities.slice(0, 5).map((o) => ({
    name: o.name,
    customer: o.customer,
    value: formatIDR(o.estimatedValue),
    stage: o.stage
  }));

  // ---------------------------------------------------------------------
  // CRUD HELPERS (in-memory only — no backend, but shared reactive state
  // via useState so Add/Edit/Convert are reflected immediately in the UI)
  // ---------------------------------------------------------------------

  // LEADS
  function addLead(payload: Omit<Lead, 'id'>): Lead {
    const lead: Lead = { id: nextId('LD', leads, 4), ...payload };
    leads.unshift(lead);
    return lead;
  }
  function updateLead(id: string, payload: Partial<Omit<Lead, 'id'>>): void {
    const idx = leads.findIndex((l) => l.id === id);
    if (idx !== -1) leads[idx] = { ...leads[idx], ...payload };
  }
  function convertLeadToCustomer(
    lead: Lead,
    extra: {
      province: string;
      status: Customer['status'];
      totalProjects: number;
      customerSince: string;
    }
  ): Customer {
    const customer: Customer = {
      id: nextId('CST', customers, 4),
      name: lead.orgName,
      sector: lead.sector as Customer['sector'],
      contactPerson: lead.contactPerson,
      email: lead.email,
      phone: lead.phone,
      totalProjects: extra.totalProjects,
      customerSince: extra.customerSince,
      province: extra.province,
      status: extra.status
    };
    customers.unshift(customer);
    updateLead(lead.id, { status: 'Qualified' });
    return customer;
  }

  // CUSTOMERS
  function addCustomer(payload: Omit<Customer, 'id'>): Customer {
    const customer: Customer = { id: nextId('CST', customers, 4), ...payload };
    customers.unshift(customer);
    return customer;
  }
  function updateCustomer(id: string, payload: Partial<Omit<Customer, 'id'>>): void {
    const idx = customers.findIndex((c) => c.id === id);
    if (idx !== -1) customers[idx] = { ...customers[idx], ...payload };
  }

  // TENDER
  function addTender(payload: Omit<Tender, 'id'>): Tender {
    const tender: Tender = { id: nextId('TND', tenders, 3), ...payload };
    tenders.unshift(tender);
    return tender;
  }
  function updateTender(id: string, payload: Partial<Omit<Tender, 'id'>>): void {
    const idx = tenders.findIndex((t) => t.id === id);
    if (idx !== -1) tenders[idx] = { ...tenders[idx], ...payload };
  }

  // CAMPAIGNS / PROMOTION
  function addCampaign(payload: Omit<Campaign, 'id'>): Campaign {
    const campaign: Campaign = { id: nextId('CMP', campaigns, 3), ...payload };
    campaigns.unshift(campaign);
    return campaign;
  }
  function updateCampaign(id: string, payload: Partial<Omit<Campaign, 'id'>>): void {
    const idx = campaigns.findIndex((c) => c.id === id);
    if (idx !== -1) campaigns[idx] = { ...campaigns[idx], ...payload };
  }

  // OPPORTUNITIES
  function addOpportunity(payload: Omit<Opportunity, 'id'>): Opportunity {
    const opportunity: Opportunity = { id: nextId('OPP', opportunities, 4), ...payload };
    opportunities.unshift(opportunity);
    return opportunity;
  }
  function updateOpportunity(id: string, payload: Partial<Omit<Opportunity, 'id'>>): void {
    const idx = opportunities.findIndex((o) => o.id === id);
    if (idx !== -1) opportunities[idx] = { ...opportunities[idx], ...payload };
  }

  // ACTIVITIES
  function addActivity(payload: Omit<CrmActivity, 'id'>): CrmActivity {
    const activity: CrmActivity = { id: nextId('ACT', activities, 4), ...payload };
    activities.unshift(activity);
    return activity;
  }
  function updateActivity(id: string, payload: Partial<Omit<CrmActivity, 'id'>>): void {
    const idx = activities.findIndex((a) => a.id === id);
    if (idx !== -1) activities[idx] = { ...activities[idx], ...payload };
  }

  return {
    leads,
    customers,
    tenders,
    campaigns,
    opportunities,
    activities,
    overviewKpis,
    leadsBySector,
    tenderStatusBreakdown,
    salesPipeline,
    opportunityByMonth,
    recentLeads,
    upcomingActivities,
    tenderDeadlines,
    topOpportunities,
    // CRUD helpers
    addLead,
    updateLead,
    convertLeadToCustomer,
    addCustomer,
    updateCustomer,
    addTender,
    updateTender,
    addCampaign,
    updateCampaign,
    addOpportunity,
    updateOpportunity,
    addActivity,
    updateActivity
  };
}
