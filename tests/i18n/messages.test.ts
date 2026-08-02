import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from '#shared/contracts/api';
import { messages, normalizeLocale, supportedLocales } from '#shared/i18n/messages';

describe('i18n foundation', () => {
  it('normalizes supported locales with English fallback', () => {
    expect(normalizeLocale('id-ID')).toBe('id');
    expect(normalizeLocale('en-US,en;q=0.9')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
  });

  it('keeps required shell keys available in every locale', () => {
    for (const locale of supportedLocales) {
      expect(messages[locale].nav.dashboard).toBeTruthy();
      expect(messages[locale].nav.flightRequests).toBeTruthy();
      expect(messages[locale].topbar.notifications).toBeTruthy();
      expect(messages[locale].actions.openNavigation).toBeTruthy();
    }
  });

  it('allows API errors to carry translation metadata without breaking message fallback', () => {
    expect(
      apiErrorSchema.parse({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        messageKey: 'validation.requestValidationFailed',
        messageParams: { count: 2 }
      })
    ).toMatchObject({
      code: 'VALIDATION_ERROR',
      messageKey: 'validation.requestValidationFailed'
    });
  });
});
