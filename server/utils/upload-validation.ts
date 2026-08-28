import { DomainError } from './errors';

const allowedSignatures = [
  {
    contentType: 'application/pdf',
    extension: '.pdf',
    matches: (data: Buffer) => data.subarray(0, 5).toString() === '%PDF-'
  },
  {
    contentType: 'image/png',
    extension: '.png',
    matches: (data: Buffer) =>
      data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    contentType: 'image/jpeg',
    extension: '.jpg',
    matches: (data: Buffer) =>
      data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  }
];

export function validateOperationalUpload(data: Buffer, originalName: string) {
  const detected = allowedSignatures.find((candidate) => candidate.matches(data));
  if (!detected) {
    throw new DomainError(
      'UPLOAD_TYPE_NOT_ALLOWED',
      'Only PDF, JPEG, and PNG files with a valid file signature are accepted.',
      415
    );
  }
  const normalized = originalName.toLowerCase();
  const validExtension =
    detected.contentType === 'image/jpeg'
      ? normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')
      : normalized.endsWith(detected.extension);
  if (!validExtension) {
    throw new DomainError(
      'UPLOAD_EXTENSION_MISMATCH',
      'File extension does not match file content.',
      415
    );
  }
  return detected.contentType;
}
