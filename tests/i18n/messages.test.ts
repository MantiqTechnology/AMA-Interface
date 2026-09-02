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
      expect(messages[locale].nav.maintenanceOperations).toBeTruthy();
      expect(messages[locale].nav.workPackages).toBeTruthy();
      expect(messages[locale].nav.approvedMaintenanceData).toBeTruthy();
      expect(messages[locale].nav.technicalReleases).toBeTruthy();
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

  it('keeps maintenance glossary terms stable in Indonesian copy', () => {
    expect(messages.id.maintenance.terms.workPackage).toBe('Work Package');
    expect(messages.id.maintenance.terms.jobCard).toBe('Job Card');
    expect(messages.id.maintenance.terms.approvedMaintenanceData).toBe('Approved Maintenance Data');
    expect(messages.id.maintenance.terms.technicalRelease).toBe('Technical Release');
    expect(messages.id.maintenance.terms.inspection).toBe('Inspection');

    expect(messages.id.maintenance.status.WORK_PACKAGE).toBe('Work Package');
    expect(messages.id.maintenance.status.JOB_CARD).toBe('Job Card');
    expect(messages.id.maintenance.status.TECHNICAL_RELEASE).toBe('Technical Release');
    expect(messages.id.maintenance.status.READY_FOR_RELEASE).toBe('Menunggu Technical Release');
    expect(messages.id.maintenance.releaseImpact.BLOCKS_RELEASE).toBe(
      'Memblokir Technical Release'
    );
    expect(messages.id.maintenance.facilityOperations.openWorkPackage).toBe('Buka Work Package');
    expect(messages.id.nav.maintenanceOperations).toBe('Operasi Maintenance');
    expect(messages.id.nav.workPackages).toBe('Work Packages');
    expect(messages.id.nav.approvedMaintenanceData).toBe('Approved Maintenance Data');
    expect(messages.id.nav.technicalReleases).toBe('Technical Releases');
  });

  it('keeps maintenance namespaces available in every locale', () => {
    for (const locale of supportedLocales) {
      expect(messages[locale].maintenance.terms.workPackage).toBeTruthy();
      expect(messages[locale].maintenance.status.READY_FOR_RELEASE).toBeTruthy();
      expect(messages[locale].maintenance.permissionActions.releaseIssue).toBeTruthy();
      expect(messages[locale].maintenance.operationalActions.requiredAction).toBeTruthy();
      expect(messages[locale].maintenance.jobCardWorkflow.authorizationSummary).toBeTruthy();
      expect(messages[locale].maintenance.workPackagesList.queueTitle).toBeTruthy();
      expect(messages[locale].maintenance.myWork.title).toBeTruthy();
      expect(messages[locale].maintenance.facilityOperations.title).toBeTruthy();
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
