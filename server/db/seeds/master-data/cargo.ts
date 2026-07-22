import type { AppDatabase } from '../../client';
import { createDemoSeedContext, type DemoSeedContext } from '../context';
import { dgCategories } from '../../schema/cargo';

export async function seedCargoMasterData(
  db: AppDatabase,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const referenceNow = context.now;
  await db
    .insert(dgCategories)
    .values([
      {
        id: 'dg-gen',
        dgCode: 'DG-GEN',
        dgClass: 'GENERAL',
        description: 'General dangerous goods operational category.',
        handlingInstruction: 'Operations review required before acceptance.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'dg-bat',
        dgCode: 'DG-BAT',
        dgClass: 'BATTERY',
        description: 'Battery cargo operational category.',
        handlingInstruction: 'Confirm packaging and state of charge in cargo manifest.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'dg-fl',
        dgCode: 'DG-FL',
        dgClass: 'FLAMMABLE',
        description: 'Flammable goods operational category.',
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
        description: 'Medical cargo operational category.',
        handlingInstruction: 'Validate shipping documentation before loading.',
        requiresSpecialApproval: false,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();
}
