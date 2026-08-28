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
      expect(messages[locale].stationOperations.taskTitles.ORIGIN_HANDOVER).toBeTruthy();
      expect(messages[locale].stationOperations.taskTitles.DESTINATION_HANDOVER).toBeTruthy();
    }
  });

  it('localizes station operation task titles by locale', () => {
    expect(messages.en.stationOperations.taskTitles.DESTINATION_HANDOVER).toBe(
      'Passenger and cargo handover completed'
    );
    expect(messages.id.stationOperations.taskTitles.DESTINATION_HANDOVER).toBe(
      'Serah terima penumpang dan kargo selesai'
    );
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
