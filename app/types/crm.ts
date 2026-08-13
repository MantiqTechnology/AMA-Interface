export type Sector = 'Government' | 'Church' | 'Commercial';

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Lost';
export type LeadSource =
  | 'Website'
  | 'Referral'
  | 'Exhibition'
  | 'Social Media'
  | 'WhatsApp'
  | 'Google Ads'
  | 'Email'
  | 'Walk In';

export interface Lead {
  id: string;
  orgName: string;
  sector: string;
  contactPerson: string;
  phone: string;
  email: string;
  source: LeadSource; // Pastikan ini menggunakan LeadSource
  status: string;
  assignedSales: string;
  createdDate: string;
}

export type CustomerStatus = 'Active' | 'Inactive';

export interface Customer {
  id: string;
  name: string;
  sector: Sector;
  contactPerson: string;
  email: string;
  phone: string;
  totalProjects: number;
  customerSince: string;
  province: string;
  status: CustomerStatus;
}

export type TenderStatus =
  'Open' | 'Preparing' | 'Submitted' | 'Evaluation' | 'Won' | 'Lost' | 'Cancelled';

export interface Tender {
  id: string;
  number: string;
  organization: string;
  sector: Extract<Sector, 'Government' | 'Church'>;
  projectName: string;
  estimatedBudget: number; // IDR
  closingDate: string;
  pic: string;
  status: TenderStatus;
  requirement: string;
  timeline: string;
  proposalProgress: number; // 0-100
  documents: string[];
}

export type CampaignType =
  | 'Digital Ads'
  | 'Instagram'
  | 'Facebook'
  | 'Google Ads'
  | 'Email Marketing'
  | 'WhatsApp Blast'
  | 'Exhibition'
  | 'Seminar'
  | 'Webinar';

export type CampaignStatus = 'Draft' | 'Running' | 'Completed' | 'Cancelled';

export interface Campaign {
  id: string;
  name: string;
  targetMarket: string;
  type: CampaignType;
  budget: number;
  leadsGenerated: number;
  conversion: number; // %
  startDate: string;
  endDate: string;
  status: CampaignStatus;
}

export type OpportunityStage =
  'Qualification' | 'Proposal' | 'Negotiation' | 'Quotation' | 'Contract' | 'Won' | 'Lost';

export interface Opportunity {
  id: string;
  name: string;
  customer: string;
  sector: Sector;
  estimatedValue: number;
  probability: number; // %
  stage: OpportunityStage;
  expectedClosing: string;
  salesOwner: string;
}

export type ActivityType =
  'Meeting' | 'Phone Call' | 'Email' | 'Demo' | 'Presentation' | 'Site Survey' | 'Follow Up';

export type ActivityStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface CrmActivity {
  id: string;
  type: ActivityType;
  customer: string;
  relatedOpportunity: string;
  sales: string;
  schedule: string;
  result: string;
  nextAction: string;
  status: ActivityStatus;
}
