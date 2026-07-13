import type { AppDatabase } from '../../client';
import { dgCategories } from '../../schema/cargo';

const referenceNow = '2026-07-07T09:00:00.000+07:00';

export async function seedCargoMasterData(db: AppDatabase) {
  await db
    .insert(dgCategories)
    .values([
      {
        id: 'dg-gen',
        dgCode: 'DG-GEN',
        dgClass: 'GENERAL',
        description: 'General dangerous goods demo category.',
        handlingInstruction: 'Demo review required before acceptance.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'dg-bat',
        dgCode: 'DG-BAT',
        dgClass: 'BATTERY',
        description: 'Battery cargo demo category.',
        handlingInstruction: 'Confirm packaging and state of charge in demo manifest.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'dg-fl',
        dgCode: 'DG-FL',
        dgClass: 'FLAMMABLE',
        description: 'Flammable goods demo category.',
        handlingInstruction: 'Hold for simulated DG approval.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'dg-med',
        dgCode: 'DG-MED',
        dgClass: 'MEDICAL',
        description: 'Medical cargo demo category.',
        handlingInstruction: 'Validate demo documentation before loading.',
        requiresSpecialApproval: false,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();
}
