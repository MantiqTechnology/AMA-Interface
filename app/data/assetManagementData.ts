// Dummy data for Asset Management module (frontend demo only, no backend)

export type AssetCategory =
  'Vehicle' | 'GSE' | 'IT Equipment' | 'Building' | 'Machinery' | 'Furniture & Fixture';

export type AssetStatus = 'Active' | 'Maintenance' | 'Idle' | 'Disposed';

export interface Insurance {
  company: string;
  policyNumber: string;
  coverage: number;
  premium: number;
  expiryDate: string; // YYYY-MM-DD
}

export interface Asset {
  code: string;
  name: string;
  category: AssetCategory;
  brand: string;
  model: string;
  serialNumber: string;
  location: string;
  department: string;
  pic: string;
  purchaseDate: string;
  purchaseValue: number;
  usefulLifeYears: number;
  monthlyDepreciation: number;
  bookValue: number;
  status: AssetStatus;
  insurance?: Insurance;
}

export const locations = [
  'DJJ - Jakarta (HLP)',
  'SUB - Surabaya (WARR)',
  'UPG - Ujung Pandang',
  'BPN - Balikpapan',
  'DPS - Denpasar',
  'PKU - Pekanbaru'
];

export const departments = [
  'GA Office',
  'IT Department',
  'Ops Department',
  'Workshop',
  'Finance Department',
  'HR Department',
  'Facility Management'
];

export const assets: Asset[] = [
  {
    code: 'VEH-00078',
    name: 'Toyota Hilux D-Cab B 1234 XX',
    category: 'Vehicle',
    brand: 'Toyota',
    model: 'Hilux D-Cab',
    serialNumber: 'SN-VEH-7801',
    location: 'DJJ - Jakarta (HLP)',
    department: 'GA Office',
    pic: 'Budi Santoso',
    purchaseDate: '2023-03-14',
    purchaseValue: 420000000,
    usefulLifeYears: 8,
    monthlyDepreciation: 4375000,
    bookValue: 315000000,
    status: 'Active',
    insurance: {
      company: 'Allianz Indonesia',
      policyNumber: 'ALZ-VEH-0078',
      coverage: 420000000,
      premium: 6300000,
      expiryDate: '2026-07-18'
    }
  },
  {
    code: 'VEH-00045',
    name: 'Toyota Innova B 1111 AA',
    category: 'Vehicle',
    brand: 'Toyota',
    model: 'Innova Reborn',
    serialNumber: 'SN-VEH-4501',
    location: 'UPG - Ujung Pandang',
    department: 'Ops Department',
    pic: 'Sri Wahyuni',
    purchaseDate: '2022-11-02',
    purchaseValue: 380000000,
    usefulLifeYears: 8,
    monthlyDepreciation: 3958000,
    bookValue: 245000000,
    status: 'Active'
  },
  {
    code: 'VEH-00065',
    name: 'Mitsubishi L300 B 9876 YY',
    category: 'Vehicle',
    brand: 'Mitsubishi',
    model: 'L300 Pick Up',
    serialNumber: 'SN-VEH-6501',
    location: 'UPG - Ujung Pandang',
    department: 'Workshop',
    pic: 'Andi Kurniawan',
    purchaseDate: '2021-06-20',
    purchaseValue: 260000000,
    usefulLifeYears: 8,
    monthlyDepreciation: 2708000,
    bookValue: 130000000,
    status: 'Active'
  },
  {
    code: 'VEH-00012',
    name: 'Airport Bus Isuzu ELF NLR',
    category: 'Vehicle',
    brand: 'Isuzu',
    model: 'ELF NLR',
    serialNumber: 'SN-VEH-1201',
    location: 'DJJ - Jakarta (HLP)',
    department: 'Ops Department',
    pic: 'Rendra Wijaya',
    purchaseDate: '2020-01-15',
    purchaseValue: 650000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 5417000,
    bookValue: 292000000,
    status: 'Active'
  },
  {
    code: 'GSE-00156',
    name: 'Belt Loader BL-01',
    category: 'GSE',
    brand: 'TLD',
    model: 'BL-3800',
    serialNumber: 'SN-GSE-1561',
    location: 'SUB - Surabaya (WARR)',
    department: 'Ops Department',
    pic: 'Hendra Gunawan',
    purchaseDate: '2022-05-10',
    purchaseValue: 780000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 6500000,
    bookValue: 546000000,
    status: 'Active',
    insurance: {
      company: 'Zurich Asuransi',
      policyNumber: 'ZR-GSE-0156',
      coverage: 780000000,
      premium: 9800000,
      expiryDate: '2026-07-22'
    }
  },
  {
    code: 'GSE-00032',
    name: 'GPU Unit 05',
    category: 'GSE',
    brand: 'ITW GSE',
    model: 'GPU-90',
    serialNumber: 'SN-GSE-0321',
    location: 'SUB - Surabaya (WARR)',
    department: 'Ops Department',
    pic: 'Yusuf Prasetyo',
    purchaseDate: '2021-09-01',
    purchaseValue: 1250000000,
    usefulLifeYears: 12,
    monthlyDepreciation: 8681000,
    bookValue: 875000000,
    status: 'Active'
  },
  {
    code: 'GSE-00098',
    name: 'GPU Unit 18',
    category: 'GSE',
    brand: 'ITW GSE',
    model: 'GPU-90',
    serialNumber: 'SN-GSE-0981',
    location: 'DPS - Denpasar',
    department: 'Ops Department',
    pic: 'Wahyu Nugroho',
    purchaseDate: '2023-08-19',
    purchaseValue: 1300000000,
    usefulLifeYears: 12,
    monthlyDepreciation: 9028000,
    bookValue: 1120000000,
    status: 'Maintenance'
  },
  {
    code: 'GSE-00110',
    name: 'Tug Truck TT-05',
    category: 'GSE',
    brand: 'Douglas',
    model: 'DTA-4000',
    serialNumber: 'SN-GSE-1101',
    location: 'DJJ - Jakarta (HLP)',
    department: 'Ops Department',
    pic: 'Fajar Ramadhan',
    purchaseDate: '2020-04-22',
    purchaseValue: 950000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 7917000,
    bookValue: 427000000,
    status: 'Active',
    insurance: {
      company: 'Zurich Asuransi',
      policyNumber: 'ZR-GSE-0110',
      coverage: 950000000,
      premium: 11200000,
      expiryDate: '2026-07-22'
    }
  },
  {
    code: 'GSE-00201',
    name: 'Push Back Tractor PB-02',
    category: 'GSE',
    brand: 'Kalmar',
    model: 'TBL-70',
    serialNumber: 'SN-GSE-2011',
    location: 'UPG - Ujung Pandang',
    department: 'Ops Department',
    pic: 'Dedi Firmansyah',
    purchaseDate: '2019-12-05',
    purchaseValue: 2100000000,
    usefulLifeYears: 12,
    monthlyDepreciation: 14583000,
    bookValue: 787000000,
    status: 'Active',
    insurance: {
      company: 'Allianz Indonesia',
      policyNumber: 'ALZ-GSE-0201',
      coverage: 2100000000,
      premium: 25000000,
      expiryDate: '2026-07-25'
    }
  },
  {
    code: 'GSE-00077',
    name: 'Conveyor Belt CV-03',
    category: 'GSE',
    brand: 'JBT AeroTech',
    model: 'CV-3000',
    serialNumber: 'SN-GSE-0771',
    location: 'BPN - Balikpapan',
    department: 'Ops Department',
    pic: 'Nur Aisyah',
    purchaseDate: '2021-02-18',
    purchaseValue: 540000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 4500000,
    bookValue: 297000000,
    status: 'Idle'
  },
  {
    code: 'GSE-00088',
    name: 'Baggage Belt Loop 2',
    category: 'GSE',
    brand: 'Vanderlande',
    model: 'BL-Loop2',
    serialNumber: 'SN-GSE-0881',
    location: 'DJJ - Jakarta (HLP)',
    department: 'Ops Department',
    pic: 'Rizky Aditya',
    purchaseDate: '2018-07-09',
    purchaseValue: 3200000000,
    usefulLifeYears: 15,
    monthlyDepreciation: 17778000,
    bookValue: 950000000,
    status: 'Maintenance'
  },
  {
    code: 'IT-00234',
    name: 'Server Dell PowerEdge R740',
    category: 'IT Equipment',
    brand: 'Dell',
    model: 'PowerEdge R740',
    serialNumber: 'SN-IT-2341',
    location: 'DJJ - Jakarta (HLP)',
    department: 'IT Department',
    pic: 'Anisa Putri',
    purchaseDate: '2023-01-10',
    purchaseValue: 185000000,
    usefulLifeYears: 5,
    monthlyDepreciation: 3083000,
    bookValue: 130000000,
    status: 'Active'
  },
  {
    code: 'IT-00123',
    name: 'Laptop Dell Latitude 5440',
    category: 'IT Equipment',
    brand: 'Dell',
    model: 'Latitude 5440',
    serialNumber: 'SN-IT-1231',
    location: 'DJJ - Jakarta (HLP)',
    department: 'IT Department',
    pic: 'Anisa Putri',
    purchaseDate: '2024-02-01',
    purchaseValue: 22000000,
    usefulLifeYears: 4,
    monthlyDepreciation: 458000,
    bookValue: 15500000,
    status: 'Active'
  },
  {
    code: 'IT-00301',
    name: 'Cisco Switch Catalyst 9300',
    category: 'IT Equipment',
    brand: 'Cisco',
    model: 'Catalyst 9300',
    serialNumber: 'SN-IT-3011',
    location: 'SUB - Surabaya (WARR)',
    department: 'IT Department',
    pic: 'Bagas Saputra',
    purchaseDate: '2022-10-12',
    purchaseValue: 95000000,
    usefulLifeYears: 6,
    monthlyDepreciation: 1319000,
    bookValue: 62000000,
    status: 'Active'
  },
  {
    code: 'IT-00089',
    name: 'CCTV NVR System',
    category: 'IT Equipment',
    brand: 'Hikvision',
    model: 'DS-9664NI',
    serialNumber: 'SN-IT-0891',
    location: 'UPG - Ujung Pandang',
    department: 'IT Department',
    pic: 'Bagas Saputra',
    purchaseDate: '2021-05-30',
    purchaseValue: 68000000,
    usefulLifeYears: 5,
    monthlyDepreciation: 1133000,
    bookValue: 22000000,
    status: 'Active'
  },
  {
    code: 'BLD-00011',
    name: 'Terminal Building Wing A',
    category: 'Building',
    brand: '-',
    model: '-',
    serialNumber: 'SN-BLD-0111',
    location: 'DJJ - Jakarta (HLP)',
    department: 'Facility Management',
    pic: 'Teguh Prabowo',
    purchaseDate: '2015-01-01',
    purchaseValue: 45000000000,
    usefulLifeYears: 30,
    monthlyDepreciation: 125000000,
    bookValue: 28500000000,
    status: 'Active'
  },
  {
    code: 'BLD-00023',
    name: 'Cargo Warehouse B',
    category: 'Building',
    brand: '-',
    model: '-',
    serialNumber: 'SN-BLD-0231',
    location: 'SUB - Surabaya (WARR)',
    department: 'Facility Management',
    pic: 'Teguh Prabowo',
    purchaseDate: '2017-06-15',
    purchaseValue: 18000000000,
    usefulLifeYears: 25,
    monthlyDepreciation: 60000000,
    bookValue: 12400000000,
    status: 'Active'
  },
  {
    code: 'MCH-00021',
    name: 'Compressor Atlas Copco',
    category: 'Machinery',
    brand: 'Atlas Copco',
    model: 'GA 90',
    serialNumber: 'SN-MCH-0211',
    location: 'UPG - Ujung Pandang',
    department: 'Workshop',
    pic: 'Yoga Permana',
    purchaseDate: '2020-08-11',
    purchaseValue: 320000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 2667000,
    bookValue: 155000000,
    status: 'Active'
  },
  {
    code: 'MCH-00035',
    name: 'Hydraulic Lift Jack 10T',
    category: 'Machinery',
    brand: 'Stertil-Koni',
    model: 'ST-1010',
    serialNumber: 'SN-MCH-0351',
    location: 'DJJ - Jakarta (HLP)',
    department: 'Workshop',
    pic: 'Yoga Permana',
    purchaseDate: '2019-03-27',
    purchaseValue: 210000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 1750000,
    bookValue: 75000000,
    status: 'Idle'
  },
  {
    code: 'GEN-00012',
    name: 'Genset 500 KVA',
    category: 'Machinery',
    brand: 'Cummins',
    model: 'C500D5',
    serialNumber: 'SN-GEN-0121',
    location: 'DPS - Denpasar',
    department: 'Facility Management',
    pic: 'Arif Budiman',
    purchaseDate: '2020-02-14',
    purchaseValue: 890000000,
    usefulLifeYears: 12,
    monthlyDepreciation: 6181000,
    bookValue: 421000000,
    status: 'Active',
    insurance: {
      company: 'Zurich Asuransi',
      policyNumber: 'ZR-GEN-0012',
      coverage: 890000000,
      premium: 10500000,
      expiryDate: '2026-07-31'
    }
  },
  {
    code: 'AC-00045',
    name: 'AC Central Chiller Unit 2',
    category: 'Machinery',
    brand: 'Daikin',
    model: 'EWAD-TZ',
    serialNumber: 'SN-AC-0451',
    location: 'DJJ - Jakarta (HLP)',
    department: 'Facility Management',
    pic: 'Arif Budiman',
    purchaseDate: '2018-11-20',
    purchaseValue: 610000000,
    usefulLifeYears: 12,
    monthlyDepreciation: 4236000,
    bookValue: 178000000,
    status: 'Maintenance'
  },
  {
    code: 'FUR-00077',
    name: 'Office Chair Ergo 01 (Set)',
    category: 'Furniture & Fixture',
    brand: 'Chairman',
    model: 'Ergo Deluxe',
    serialNumber: 'SN-FUR-0771',
    location: 'PKU - Pekanbaru',
    department: 'HR Department',
    pic: 'Dewi Lestari',
    purchaseDate: '2022-04-05',
    purchaseValue: 45000000,
    usefulLifeYears: 5,
    monthlyDepreciation: 750000,
    bookValue: 25000000,
    status: 'Active'
  },
  {
    code: 'FUR-00089',
    name: 'Meeting Table Set Executive',
    category: 'Furniture & Fixture',
    brand: 'Informa',
    model: 'Exec-8',
    serialNumber: 'SN-FUR-0891',
    location: 'DJJ - Jakarta (HLP)',
    department: 'GA Office',
    pic: 'Dewi Lestari',
    purchaseDate: '2021-01-18',
    purchaseValue: 38000000,
    usefulLifeYears: 6,
    monthlyDepreciation: 528000,
    bookValue: 15000000,
    status: 'Active'
  },
  {
    code: 'VEH-00099',
    name: 'Toyota Avanza B 5566 CC',
    category: 'Vehicle',
    brand: 'Toyota',
    model: 'Avanza Veloz',
    serialNumber: 'SN-VEH-9901',
    location: 'BPN - Balikpapan',
    department: 'GA Office',
    pic: 'Rendra Wijaya',
    purchaseDate: '2017-05-09',
    purchaseValue: 210000000,
    usefulLifeYears: 8,
    monthlyDepreciation: 2188000,
    bookValue: 0,
    status: 'Disposed'
  },
  {
    code: 'IT-00450',
    name: 'Printer HP LaserJet M604',
    category: 'IT Equipment',
    brand: 'HP',
    model: 'LaserJet M604',
    serialNumber: 'SN-IT-4501',
    location: 'UPG - Ujung Pandang',
    department: 'Finance Department',
    pic: 'Bagas Saputra',
    purchaseDate: '2016-09-14',
    purchaseValue: 18000000,
    usefulLifeYears: 5,
    monthlyDepreciation: 300000,
    bookValue: 0,
    status: 'Disposed'
  },
  {
    code: 'GSE-00250',
    name: 'Water Service Truck WS-02',
    category: 'GSE',
    brand: 'Hino',
    model: 'FC 260',
    serialNumber: 'SN-GSE-2501',
    location: 'PKU - Pekanbaru',
    department: 'Ops Department',
    pic: 'Fajar Ramadhan',
    purchaseDate: '2019-10-01',
    purchaseValue: 720000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 6000000,
    bookValue: 288000000,
    status: 'Active'
  },
  {
    code: 'GSE-00133',
    name: 'Lavatory Service Truck LS-01',
    category: 'GSE',
    brand: 'Hino',
    model: 'FC 260',
    serialNumber: 'SN-GSE-1331',
    location: 'DPS - Denpasar',
    department: 'Ops Department',
    pic: 'Wahyu Nugroho',
    purchaseDate: '2019-10-01',
    purchaseValue: 700000000,
    usefulLifeYears: 10,
    monthlyDepreciation: 5833000,
    bookValue: 280000000,
    status: 'Active'
  }
];

export interface MaintenanceOrder {
  workOrder: string;
  assetCode: string;
  assetName: string;
  location: string;
  maintenanceType: 'Preventive' | 'Corrective' | 'Emergency';
  scheduleDate: string;
  technician: string;
  estimatedCost: number;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Completed' | 'Waiting Sparepart';
}

export const maintenanceOrders: MaintenanceOrder[] = [
  {
    workOrder: 'WO-2607-001',
    assetCode: 'VEH-00078',
    assetName: 'Toyota Hilux D-Cab B 1234 XX',
    location: 'DJJ - Jakarta (HLP)',
    maintenanceType: 'Preventive',
    scheduleDate: '2026-07-08',
    technician: 'Bayu Saputra',
    estimatedCost: 1500000,
    priority: 'High',
    status: 'In Progress'
  },
  {
    workOrder: 'WO-2607-002',
    assetCode: 'GSE-00110',
    assetName: 'Tug Truck TT-05',
    location: 'DJJ - Jakarta (HLP)',
    maintenanceType: 'Corrective',
    scheduleDate: '2026-07-09',
    technician: 'Deni Herlambang',
    estimatedCost: 4200000,
    priority: 'Medium',
    status: 'Open'
  },
  {
    workOrder: 'WO-2607-003',
    assetCode: 'IT-00234',
    assetName: 'Server Dell PowerEdge R740',
    location: 'DJJ - Jakarta (HLP)',
    maintenanceType: 'Preventive',
    scheduleDate: '2026-07-10',
    technician: 'Rangga Wibowo',
    estimatedCost: 800000,
    priority: 'Medium',
    status: 'Open'
  },
  {
    workOrder: 'WO-2607-004',
    assetCode: 'VEH-00065',
    assetName: 'Mitsubishi L300 B 9876 YY',
    location: 'UPG - Ujung Pandang',
    maintenanceType: 'Preventive',
    scheduleDate: '2026-07-11',
    technician: 'Andi Kurniawan',
    estimatedCost: 950000,
    priority: 'Low',
    status: 'Open'
  },
  {
    workOrder: 'WO-2607-005',
    assetCode: 'GSE-00098',
    assetName: 'GPU Unit 18',
    location: 'DPS - Denpasar',
    maintenanceType: 'Emergency',
    scheduleDate: '2026-07-12',
    technician: 'Wahyu Nugroho',
    estimatedCost: 6800000,
    priority: 'High',
    status: 'Open'
  },
  {
    workOrder: 'WO-2606-088',
    assetCode: 'GSE-00088',
    assetName: 'Baggage Belt Loop 2',
    location: 'DJJ - Jakarta (HLP)',
    maintenanceType: 'Corrective',
    scheduleDate: '2026-06-28',
    technician: 'Rizky Aditya',
    estimatedCost: 12500000,
    priority: 'High',
    status: 'Waiting Sparepart'
  },
  {
    workOrder: 'WO-2606-076',
    assetCode: 'AC-00045',
    assetName: 'AC Central Chiller Unit 2',
    location: 'DJJ - Jakarta (HLP)',
    maintenanceType: 'Corrective',
    scheduleDate: '2026-06-25',
    technician: 'Arif Budiman',
    estimatedCost: 8500000,
    priority: 'Medium',
    status: 'Completed'
  },
  {
    workOrder: 'WO-2606-060',
    assetCode: 'MCH-00021',
    assetName: 'Compressor Atlas Copco',
    location: 'UPG - Ujung Pandang',
    maintenanceType: 'Preventive',
    scheduleDate: '2026-06-20',
    technician: 'Yoga Permana',
    estimatedCost: 1200000,
    priority: 'Low',
    status: 'Completed'
  },
  {
    workOrder: 'WO-2606-045',
    assetCode: 'GSE-00156',
    assetName: 'Belt Loader BL-01',
    location: 'SUB - Surabaya (WARR)',
    maintenanceType: 'Preventive',
    scheduleDate: '2026-06-15',
    technician: 'Hendra Gunawan',
    estimatedCost: 1750000,
    priority: 'Medium',
    status: 'Completed'
  },
  {
    workOrder: 'WO-2606-030',
    assetCode: 'GEN-00012',
    assetName: 'Genset 500 KVA',
    location: 'DPS - Denpasar',
    maintenanceType: 'Preventive',
    scheduleDate: '2026-06-10',
    technician: 'Arif Budiman',
    estimatedCost: 2200000,
    priority: 'Low',
    status: 'Completed'
  }
];

export interface AssignmentRecord {
  assignmentId: string;
  assetCode: string;
  assetName: string;
  assignedTo: string;
  department: string;
  assignmentDate: string;
  returnDate: string | null;
  status: 'Assigned' | 'Returned' | 'Overdue';
  condition: 'Good' | 'Fair' | 'Damaged';
}

export const assignments: AssignmentRecord[] = [
  {
    assignmentId: 'ASG-1001',
    assetCode: 'IT-00123',
    assetName: 'Laptop Dell Latitude 5440',
    assignedTo: 'Anisa Putri',
    department: 'IT Department',
    assignmentDate: '2024-02-05',
    returnDate: null,
    status: 'Assigned',
    condition: 'Good'
  },
  {
    assignmentId: 'ASG-1002',
    assetCode: 'VEH-00078',
    assetName: 'Toyota Hilux D-Cab B 1234 XX',
    assignedTo: 'Budi Santoso',
    department: 'GA Office',
    assignmentDate: '2023-03-20',
    returnDate: null,
    status: 'Assigned',
    condition: 'Good'
  },
  {
    assignmentId: 'ASG-1003',
    assetCode: 'FUR-00077',
    assetName: 'Office Chair Ergo 01 (Set)',
    assignedTo: 'Dewi Lestari',
    department: 'HR Department',
    assignmentDate: '2022-04-10',
    returnDate: null,
    status: 'Assigned',
    condition: 'Fair'
  },
  {
    assignmentId: 'ASG-1004',
    assetCode: 'IT-00450',
    assetName: 'Printer HP LaserJet M604',
    assignedTo: 'Bagas Saputra',
    department: 'Finance Department',
    assignmentDate: '2016-09-20',
    returnDate: '2026-05-30',
    status: 'Returned',
    condition: 'Damaged'
  },
  {
    assignmentId: 'ASG-1005',
    assetCode: 'VEH-00099',
    assetName: 'Toyota Avanza B 5566 CC',
    assignedTo: 'Rendra Wijaya',
    department: 'GA Office',
    assignmentDate: '2017-05-15',
    returnDate: '2026-06-01',
    status: 'Returned',
    condition: 'Damaged'
  },
  {
    assignmentId: 'ASG-1006',
    assetCode: 'GSE-00250',
    assetName: 'Water Service Truck WS-02',
    assignedTo: 'Fajar Ramadhan',
    department: 'Ops Department',
    assignmentDate: '2025-11-01',
    returnDate: '2026-06-30',
    status: 'Overdue',
    condition: 'Fair'
  },
  {
    assignmentId: 'ASG-1007',
    assetCode: 'IT-00301',
    assetName: 'Cisco Switch Catalyst 9300',
    assignedTo: 'Bagas Saputra',
    department: 'IT Department',
    assignmentDate: '2022-10-15',
    returnDate: null,
    status: 'Assigned',
    condition: 'Good'
  },
  {
    assignmentId: 'ASG-1008',
    assetCode: 'MCH-00035',
    assetName: 'Hydraulic Lift Jack 10T',
    assignedTo: 'Yoga Permana',
    department: 'Workshop',
    assignmentDate: '2025-01-05',
    returnDate: '2026-07-01',
    status: 'Overdue',
    condition: 'Fair'
  }
];

export interface MovementRecord {
  movementId: string;
  assetCode: string;
  assetName: string;
  fromLocation: string;
  toLocation: string;
  requestedBy: string;
  approvedBy: string;
  movementDate: string;
  status: 'Requested' | 'Approved' | 'Completed';
}

export const movements: MovementRecord[] = [
  {
    movementId: 'MOV-3001',
    assetCode: 'IT-00123',
    assetName: 'Laptop Dell Latitude 5440',
    fromLocation: 'IT Department',
    toLocation: 'Finance Dept',
    requestedBy: 'Anisa Putri',
    approvedBy: 'Bagas Saputra',
    movementDate: '2026-07-07',
    status: 'Completed'
  },
  {
    movementId: 'MOV-3002',
    assetCode: 'VEH-00045',
    assetName: 'Toyota Innova B 1111 AA',
    fromLocation: 'GA Office',
    toLocation: 'Ops Dept',
    requestedBy: 'Sri Wahyuni',
    approvedBy: 'Budi Santoso',
    movementDate: '2026-07-06',
    status: 'Completed'
  },
  {
    movementId: 'MOV-3003',
    assetCode: 'GSE-00032',
    assetName: 'GPU Unit 05',
    fromLocation: 'SUB - Surabaya',
    toLocation: 'DJJ - Jakarta',
    requestedBy: 'Yusuf Prasetyo',
    approvedBy: 'Hendra Gunawan',
    movementDate: '2026-07-06',
    status: 'Completed'
  },
  {
    movementId: 'MOV-3004',
    assetCode: 'MCH-00021',
    assetName: 'Compressor Atlas Copco',
    fromLocation: 'Workshop',
    toLocation: 'UPG - Makassar',
    requestedBy: 'Yoga Permana',
    approvedBy: 'Teguh Prabowo',
    movementDate: '2026-07-05',
    status: 'Completed'
  },
  {
    movementId: 'MOV-3005',
    assetCode: 'FUR-00077',
    assetName: 'Office Chair Ergo 01 (Set)',
    fromLocation: 'Storage',
    toLocation: 'HR Department',
    requestedBy: 'Dewi Lestari',
    approvedBy: 'Teguh Prabowo',
    movementDate: '2026-07-05',
    status: 'Completed'
  },
  {
    movementId: 'MOV-3006',
    assetCode: 'GSE-00201',
    assetName: 'Push Back Tractor PB-02',
    fromLocation: 'Workshop',
    toLocation: 'UPG - Ujung Pandang',
    requestedBy: 'Dedi Firmansyah',
    approvedBy: 'Hendra Gunawan',
    movementDate: '2026-07-04',
    status: 'Approved'
  },
  {
    movementId: 'MOV-3007',
    assetCode: 'IT-00089',
    assetName: 'CCTV NVR System',
    fromLocation: 'DJJ - Jakarta',
    toLocation: 'UPG - Ujung Pandang',
    requestedBy: 'Bagas Saputra',
    approvedBy: '-',
    movementDate: '2026-07-03',
    status: 'Requested'
  },
  {
    movementId: 'MOV-3008',
    assetCode: 'GEN-00012',
    assetName: 'Genset 500 KVA',
    fromLocation: 'Workshop',
    toLocation: 'DPS - Denpasar',
    requestedBy: 'Arif Budiman',
    approvedBy: 'Teguh Prabowo',
    movementDate: '2026-07-02',
    status: 'Approved'
  }
];

export interface DisposalRecord {
  assetCode: string;
  assetName: string;
  disposalType: 'Sold' | 'Scrapped' | 'Donated' | 'Write Off';
  disposalDate: string;
  disposalValue: number;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
}

export const disposals: DisposalRecord[] = [
  {
    assetCode: 'VEH-00099',
    assetName: 'Toyota Avanza B 5566 CC',
    disposalType: 'Sold',
    disposalDate: '2026-06-05',
    disposalValue: 85000000,
    approvalStatus: 'Approved'
  },
  {
    assetCode: 'IT-00450',
    assetName: 'Printer HP LaserJet M604',
    disposalType: 'Scrapped',
    disposalDate: '2026-05-28',
    disposalValue: 500000,
    approvalStatus: 'Approved'
  },
  {
    assetCode: 'FUR-00089',
    assetName: 'Meeting Table Set Executive',
    disposalType: 'Donated',
    disposalDate: '2026-04-15',
    disposalValue: 0,
    approvalStatus: 'Pending'
  },
  {
    assetCode: 'MCH-00035',
    assetName: 'Hydraulic Lift Jack 10T',
    disposalType: 'Write Off',
    disposalDate: '2026-03-02',
    disposalValue: 0,
    approvalStatus: 'Pending'
  }
];

export interface AuditRecord {
  auditId: string;
  assetCode: string;
  assetName: string;
  location: string;
  physicalStatus: 'Match' | 'Missing' | 'Damaged' | 'Needs Verification';
  systemStatus: AssetStatus;
  auditor: string;
  auditDate: string;
}

export const audits: AuditRecord[] = [
  {
    auditId: 'AUD-0001',
    assetCode: 'VEH-00078',
    assetName: 'Toyota Hilux D-Cab B 1234 XX',
    location: 'DJJ - Jakarta (HLP)',
    physicalStatus: 'Match',
    systemStatus: 'Active',
    auditor: 'Teguh Prabowo',
    auditDate: '2026-07-10'
  },
  {
    auditId: 'AUD-0002',
    assetCode: 'GSE-00156',
    assetName: 'Belt Loader BL-01',
    location: 'SUB - Surabaya (WARR)',
    physicalStatus: 'Match',
    systemStatus: 'Active',
    auditor: 'Hendra Gunawan',
    auditDate: '2026-07-10'
  },
  {
    auditId: 'AUD-0003',
    assetCode: 'IT-00089',
    assetName: 'CCTV NVR System',
    location: 'UPG - Ujung Pandang',
    physicalStatus: 'Needs Verification',
    systemStatus: 'Active',
    auditor: 'Bagas Saputra',
    auditDate: '2026-07-09'
  },
  {
    auditId: 'AUD-0004',
    assetCode: 'FUR-00089',
    assetName: 'Meeting Table Set Executive',
    location: 'DJJ - Jakarta (HLP)',
    physicalStatus: 'Missing',
    systemStatus: 'Active',
    auditor: 'Dewi Lestari',
    auditDate: '2026-07-09'
  },
  {
    auditId: 'AUD-0005',
    assetCode: 'MCH-00035',
    assetName: 'Hydraulic Lift Jack 10T',
    location: 'DJJ - Jakarta (HLP)',
    physicalStatus: 'Damaged',
    systemStatus: 'Idle',
    auditor: 'Yoga Permana',
    auditDate: '2026-07-08'
  },
  {
    auditId: 'AUD-0006',
    assetCode: 'GEN-00012',
    assetName: 'Genset 500 KVA',
    location: 'DPS - Denpasar',
    physicalStatus: 'Match',
    systemStatus: 'Active',
    auditor: 'Arif Budiman',
    auditDate: '2026-07-08'
  },
  {
    auditId: 'AUD-0007',
    assetCode: 'GSE-00088',
    assetName: 'Baggage Belt Loop 2',
    location: 'DJJ - Jakarta (HLP)',
    physicalStatus: 'Match',
    systemStatus: 'Maintenance',
    auditor: 'Rizky Aditya',
    auditDate: '2026-07-07'
  },
  {
    auditId: 'AUD-0008',
    assetCode: 'VEH-00065',
    assetName: 'Mitsubishi L300 B 9876 YY',
    location: 'UPG - Ujung Pandang',
    physicalStatus: 'Match',
    systemStatus: 'Active',
    auditor: 'Andi Kurniawan',
    auditDate: '2026-07-07'
  }
];

// ---- helper formatters ----
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `IDR ${(value / 1_000_000_000).toFixed(2)} B`;
  if (value >= 1_000_000) return `IDR ${(value / 1_000_000).toFixed(1)} M`;
  return `IDR ${value.toLocaleString('id-ID')}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function daysUntil(date: string): number {
  const today = new Date('2026-07-21');
  const target = new Date(date);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
