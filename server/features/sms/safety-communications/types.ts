export type CommType = 'FLASH' | 'BULLETIN' | 'LESSONS_LEARNED';
export type CommUrgency = 'NORMAL' | 'URGENT';
export type CommStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface SafetyCommunicationDto {
  id: string;
  commType: CommType;
  urgency: CommUrgency;
  title: string;
  content: string;
  status: CommStatus;
  documentId: string | null;
  authorUserId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyCommunicationInput {
  commType: CommType;
  urgency?: CommUrgency;
  title: string;
  content: string;
  documentId?: string;
  authorUserId: string;
}

export interface SafetyCommListQuery {
  status?: CommStatus;
  commType?: CommType;
  urgency?: CommUrgency;
  search?: string;
}