import {
  medicalCertificateIdParamsSchema,
  personnelMedicalCertificateInputSchema
} from '../../../../../../shared/features/operations/personnel';
import { getPersonnelService } from '../../../../../features/operations/personnel';
import { defineApiEventHandler } from '../../../../../utils/api-response';
import { requireDemoPermission } from '../../../../../utils/auth';
import { parseBody, parseParams } from '../../../../../utils/validation';

export default defineApiEventHandler(async (event) => {
  requireDemoPermission(event, 'personnel.medical.manage');
  const { id, certificateId } = parseParams(event, medicalCertificateIdParamsSchema);
  return getPersonnelService().updateMedicalCertificate(
    id,
    certificateId,
    await parseBody(event, personnelMedicalCertificateInputSchema)
  );
});
