import type { 
  RegulatoryReportItem, 
  CompanyCertificateItem, 
  OperationsManualItem, 
  RegulatoryDeadlineItem, 
  AuthorityMessageItem 
} from './types';

export class SmsRegulatoryRepository {
  async getRegulatoryReports(): Promise<RegulatoryReportItem[]> {
    return [
      {
        id: '1',
        ref: 'MOR-2026-048',
        type: 'MOR',
        sourceRef: 'HZD-2026-045',
        subject: 'Runway Excursion due to muddy surface at Borme (BME)',
        authority: 'DKUPPU',
        deadline: '25 Aug 2026 10:00',
        status: 'Pending Approval',
        receiptNumber: '',
        urgent: true,
        createdAt: '2026-08-23T08:00:00Z'
      },
      {
        id: '2',
        ref: 'SDR-2026-021',
        type: 'SDR',
        sourceRef: 'HZD-2026-043',
        subject: 'PT6A Engine Chip Detector warning on PK-RCX (C208B)',
        authority: 'DKUPPU',
        deadline: '26 Aug 2026 12:00',
        status: 'Draft',
        receiptNumber: '',
        urgent: true,
        createdAt: '2026-08-23T14:30:00Z'
      },
      {
        id: '3',
        ref: 'MOR-2026-047',
        type: 'MOR',
        sourceRef: 'OCC-2026-022',
        subject: 'Severe windshear encounter on short final at Oksibil (OKS)',
        authority: 'DKUPPU',
        deadline: '24 Aug 2026 16:00',
        status: 'Acknowledged',
        receiptNumber: 'DGCA-REC-9988',
        urgent: false,
        submittedAt: '2026-08-22T09:15:00Z',
        createdAt: '2026-08-21T18:00:00Z'
      },
      {
        id: '4',
        ref: 'MOR-2026-046',
        type: 'MOR',
        sourceRef: 'OCC-2026-020',
        subject: 'Total loss of HF Communication over Central Highlands',
        authority: 'AirNav Indonesia',
        deadline: '20 Aug 2026 09:00',
        status: 'Acknowledged',
        receiptNumber: 'DGCA-REC-9941',
        urgent: false,
        submittedAt: '2026-08-19T11:00:00Z',
        createdAt: '2026-08-18T10:00:00Z'
      },
      {
        id: '5',
        ref: 'SDR-2026-020',
        type: 'SDR',
        sourceRef: 'INS-2026-015',
        subject: 'Main landing gear oleo strut leak after landing at Bokondini',
        authority: 'DKUPPU',
        deadline: '18 Aug 2026 14:00',
        status: 'Acknowledged',
        receiptNumber: 'DGCA-SDR-8822',
        urgent: false,
        submittedAt: '2026-08-17T15:30:00Z',
        createdAt: '2026-08-16T12:00:00Z'
      },
      {
        id: '6',
        ref: 'ASR-2026-092',
        type: 'ASR',
        sourceRef: 'HZD-2026-039',
        subject: 'Stray dogs entering runway during takeoff roll at Wamena',
        authority: 'Otban Wilayah X',
        deadline: '-',
        status: 'Submitted',
        receiptNumber: 'OTB10-26-092',
        urgent: false,
        submittedAt: '2026-08-20T08:00:00Z',
        createdAt: '2026-08-19T07:45:00Z'
      }
    ];
  }

  async getCompanyCertificates(): Promise<CompanyCertificateItem[]> {
    return [
      {
        id: 'cert-1',
        name: 'Air Operator Cert (AOC 135)',
        desc: 'CASR Part 135 Commuter & Charter',
        expiry: '04 Jun 2027',
        status: 'Valid',
        statusColor: 'success',
        icon: 'mdi-certificate',
        certNumber: 'AOC 135-042'
      },
      {
        id: 'cert-2',
        name: 'Operations Specs (OpsSpecs)',
        desc: 'Authorized Areas of Operations (Papua)',
        expiry: '04 Jun 2027',
        status: 'Valid',
        statusColor: 'success',
        icon: 'mdi-file-document-multiple',
        certNumber: 'OPS-SPEC-2024-R4'
      },
      {
        id: 'cert-3',
        name: 'Approved Maintenance Org (AMO)',
        desc: 'CASR Part 145 Base & Line Maint.',
        expiry: '12 Dec 2026',
        status: 'Valid',
        statusColor: 'success',
        icon: 'mdi-wrench-cog',
        certNumber: 'AMO-145-088'
      },
      {
        id: 'cert-4',
        name: 'C of A (PK-AMA, AMB, AMC)',
        desc: 'Certificate of Airworthiness for Fleet',
        expiry: '15 Sep 2026',
        status: 'Expiring Soon',
        statusColor: 'warning',
        icon: 'mdi-airplane-check',
        certNumber: 'COA-FLEET-2025'
      },
      {
        id: 'cert-5',
        name: 'Certificate of Registration (C of R)',
        desc: 'DGCA Aircraft Registry',
        expiry: '22 Jan 2027',
        status: 'Valid',
        statusColor: 'success',
        icon: 'mdi-book-information-variant',
        certNumber: 'COR-DGCA-993'
      },
      {
        id: 'cert-6',
        name: 'Aircraft Radio Station License',
        desc: 'VHF/HF Transmitters Approval',
        expiry: '01 Nov 2026',
        status: 'Valid',
        statusColor: 'success',
        icon: 'mdi-radio-tower',
        certNumber: 'RAD-KOMINFO-2601'
      }
    ];
  }

  async getOperationsManuals(): Promise<OperationsManualItem[]> {
    return [
      { doc: 'Company Operations Manual (OM-A)', rev: '12.4', date: '01 Aug 2026', status: 'Approved', color: 'success', icon: 'mdi-book-check-outline', id: 'om-a' },
      { doc: 'Aircraft Operating Manual (OM-B) C208B', rev: '09.1', date: '10 Aug 2026', status: 'Approved', color: 'success', icon: 'mdi-book-check-outline', id: 'om-b' },
      { doc: 'Route & Aerodrome Manual (OM-C) Papua', rev: '15.0', date: '20 Aug 2026', status: 'Pending DKUPPU', color: 'warning', icon: 'mdi-book-clock-outline', id: 'om-c' },
      { doc: 'Safety Management System (SMS) Manual', rev: '05.1', date: '15 Aug 2026', status: 'Pending DKUPPU', color: 'warning', icon: 'mdi-book-clock-outline', id: 'om-sms' },
      { doc: 'Emergency Response Plan (ERP)', rev: '03.0', date: '20 Jul 2026', status: 'Approved', color: 'success', icon: 'mdi-book-check-outline', id: 'om-erp' },
      { doc: 'Dangerous Goods Manual (OM-D)', rev: '08.2', date: '19 Aug 2026', status: 'Under Revision', color: 'error', icon: 'mdi-book-edit-outline', id: 'om-d' }
    ];
  }

  async getUpcomingDeadlines(): Promise<RegulatoryDeadlineItem[]> {
    return [
      { id: 'MOR-2026-048', subject: 'Runway Excursion Borme (BME)', timeLeft: '17h 04m', progress: 85 },
      { id: 'SDR-2026-021', subject: 'Chip Detector Warning PK-RCX', timeLeft: '43h 04m', progress: 40 },
      { id: 'C of A RENEWAL', subject: 'Airworthiness Cert for PK-AMA', timeLeft: '22 Days', progress: 65 },
      { id: 'AOC RENEWAL', subject: 'Submit Application to DKUPPU', timeLeft: '80 Days', progress: 15 },
      { id: 'CAPA FOLLOW-UP', subject: 'Submit corrective action for AUD-26', timeLeft: '5 Days', progress: 90 }
    ];
  }

  async getAuthorityInbox(): Promise<AuthorityMessageItem[]> {
    return [
      { ref: 'msg-1', authority: 'DKUPPU (DGCA)', subject: 'Receipt Acknowledged: MOR-2026-047', message: 'The report regarding windshear at Oksibil has been reviewed and accepted. Ensure FRAT limits are enforced.', datetime: '24 Aug 2026 10:15', icon: 'mdi-email-check', color: 'success' },
      { ref: 'msg-2', authority: 'Otban Wilayah X', subject: 'Notice: Temporary Closure of Elelim Airstrip', message: 'Elelim airstrip is closed for 3 days due to tribal conflict around the perimeter. Please divert flights.', datetime: '23 Aug 2026 14:00', icon: 'mdi-information-outline', color: 'info' },
      { ref: 'msg-3', authority: 'KNKT', subject: 'Request for Information: AMA126 Borme', message: 'Please provide crew manifests and weather briefing documents for the runway excursion incident at Borme.', datetime: '22 Aug 2026 09:30', icon: 'mdi-alert-circle-outline', color: 'warning' },
      { ref: 'msg-4', authority: 'AirNav Indonesia', subject: 'Coordination: VHF Freq Change Wamena', message: 'New approach frequency for Wamena valley sector will be effective starting next week.', datetime: '21 Aug 2026 11:20', icon: 'mdi-radio-tower', color: 'primary' },
      { ref: 'msg-5', authority: 'DKUPPU (DGCA)', subject: 'Approval: SMS Manual Rev 05', message: 'The submitted SMS manual revision has been stamped and approved by the Directorate.', datetime: '20 Aug 2026 15:45', icon: 'mdi-check-decagram', color: 'success' }
    ];
  }
}