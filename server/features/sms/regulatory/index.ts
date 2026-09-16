import { SmsRegulatoryRepository } from './repository';
import { SmsRegulatoryService } from './service';

export * from './types';
export * from './repository';
export * from './service';

// Singleton Instance
export const smsRegulatoryRepository = new SmsRegulatoryRepository();
export const smsRegulatoryService = new SmsRegulatoryService(smsRegulatoryRepository);