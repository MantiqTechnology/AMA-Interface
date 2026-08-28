import { describe, expect, it } from 'vitest';
import { validateOperationalUpload } from '../../server/utils/upload-validation';

describe('operational upload validation', () => {
  it('accepts matching PDF, PNG and JPEG signatures', () => {
    expect(validateOperationalUpload(Buffer.from('%PDF-1.4\n'), 'evidence.pdf')).toBe(
      'application/pdf'
    );
    expect(
      validateOperationalUpload(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'photo.png'
      )
    ).toBe('image/png');
    expect(validateOperationalUpload(Buffer.from([0xff, 0xd8, 0xff]), 'photo.jpeg')).toBe(
      'image/jpeg'
    );
  });

  it('rejects claimed content with invalid bytes and mismatched extensions', () => {
    expect(() => validateOperationalUpload(Buffer.from('<html>'), 'record.pdf')).toThrow(
      'Only PDF, JPEG, and PNG'
    );
    expect(() => validateOperationalUpload(Buffer.from('%PDF-1.4\n'), 'record.png')).toThrow(
      'extension does not match'
    );
  });
});
