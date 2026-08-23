import { getDbClient } from '../../../db/client';
import { FratAssessmentRepository } from './repository';
import { FratAssessmentService } from './service';

export function getFratAssessmentService() {
  const db = getDbClient().db;
  return new FratAssessmentService(
    new FratAssessmentRepository(db)
  );
}