import { z } from 'zod';
import type {
  MaintenanceInventoryReservationDto,
  MaintenanceMaterialRequirementDto
} from './maintenance-v21';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const nullableText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().nullable().optional()
);
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Invalid calendar date');
const nullableDate = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  dateOnly.nullable().optional()
);

export const inventoryLifecycleTypes = [
  'CONSUMABLE',
  'EXPENDABLE',
  'REPAIRABLE',
  'ROTABLE'
] as const;
export const inventoryPartCategories = [
  'CONSUMABLE',
  'EXPENDABLE',
  'REPAIRABLE',
  'ROTABLE',
  'TOOL_GSE',
  'SOFTWARE_NAVDB',
  'MISSION_SPECIFIC'
] as const;
export const inventoryTrackingTypes = ['QUANTITY', 'LOT', 'SERIAL'] as const;
export const inventoryBinTypes = ['USABLE', 'QUARANTINE', 'REPAIR', 'TRANSIT'] as const;
export const inventoryConditions = [
  'SERVICEABLE',
  'QUARANTINE',
  'UNSERVICEABLE',
  'IN_REPAIR',
  'INSTALLED',
  'SCRAPPED'
] as const;
export const inventoryTagColors = [
  'YELLOW_SERVICEABLE',
  'RED_UNSERVICEABLE',
  'ORANGE_QUARANTINE',
  'BLACK_SCRAP'
] as const;
export const inventoryInterchangeabilityTypes = [
  'ONE_WAY',
  'TWO_WAY',
  'SUPERSEDED',
  'ALTERNATE',
  'EQUIVALENT'
] as const;
export const inventoryMovementTypes = [
  'RECEIPT',
  'ISSUE',
  'TRANSFER',
  'ADJUSTMENT_GAIN',
  'ADJUSTMENT_LOSS',
  'COUNT_VARIANCE',
  'INSTALL',
  'REMOVE',
  'REPAIR_SEND',
  'REPAIR_RETURN',
  'SCRAP',
  'REVERSAL'
] as const;

export type InventoryLifecycleType = (typeof inventoryLifecycleTypes)[number];
export type InventoryPartCategory = (typeof inventoryPartCategories)[number];
export type InventoryTrackingType = (typeof inventoryTrackingTypes)[number];
export type InventoryBinType = (typeof inventoryBinTypes)[number];
export type InventoryCondition = (typeof inventoryConditions)[number];
export type InventoryTagColor = (typeof inventoryTagColors)[number];
export type InventoryInterchangeabilityType = (typeof inventoryInterchangeabilityTypes)[number];
export type InventoryMovementType = (typeof inventoryMovementTypes)[number];

export const inventoryIdParamsSchema = z.object({ id: z.string().trim().min(1) });
export const inventoryListQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  stationId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  warehouseId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  status: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  lowStock: z.preprocess(
    (value) => (value === 'true' || value === true ? true : undefined),
    z.boolean().optional()
  ),
  limit: z.coerce.number().int().positive().max(250).default(100),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export const inventoryMaintenanceDemandQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  stationId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  status: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  requiredBefore: z.preprocess(emptyToUndefined, dateOnly.optional()),
  limit: z.coerce.number().int().positive().max(250).default(100),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export type InventoryMaintenanceDemandQuery = z.infer<typeof inventoryMaintenanceDemandQuerySchema>;

export const inventoryPartInputSchema = z
  .object({
    partNumber: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .transform((value) => value.toUpperCase()),
    partName: z.string().trim().min(2).max(160),
    description: nullableText.default(null),
    manufacturer: z.string().trim().min(2).max(120),
    manufacturerPartNumber: nullableText.default(null),
    unitOfMeasure: z.enum(['EA', 'SET', 'KIT', 'L', 'KG', 'M']),
    lifecycleType: z.enum(inventoryLifecycleTypes),
    trackingType: z.enum(inventoryTrackingTypes),
    criticality: z.enum(['STANDARD', 'ESSENTIAL', 'CRITICAL']),
    certificateRequired: z.boolean().default(false),
    shelfLifeDays: z.coerce.number().int().positive().nullable().default(null),
    partCategory: z.enum(inventoryPartCategories).default('ROTABLE').optional(),
    isAircraftPart: z.boolean().default(true).optional(),
    isLifeLimited: z.boolean().default(false).optional(),
    maxFlightHours: z.coerce.number().positive().nullable().default(null).optional(),
    maxFlightCycles: z.coerce.number().int().positive().nullable().default(null).optional(),
    onCondition: z.boolean().default(false).optional(),
    aircraftApplicability: z
      .array(
        z.object({
          aircraftType: z.string().trim().min(1),
          model: nullableText.default(null),
          note: nullableText.default(null)
        })
      )
      .default([])
  })
  .superRefine((part, context) => {
    if (
      part.trackingType === 'QUANTITY' &&
      (part.certificateRequired || part.shelfLifeDays !== null || part.isLifeLimited)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Shelf-life, life-limited, or certificate-controlled parts require lot or serial tracking.',
        path: ['trackingType']
      });
    }
  });

export const inventoryWarehouseInputSchema = z.object({
  stationId: z.string().trim().min(1),
  warehouseCode: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((value) => value.toUpperCase()),
  warehouseName: z.string().trim().min(2).max(120),
  bins: z
    .array(
      z.object({
        binCode: z
          .string()
          .trim()
          .min(1)
          .max(40)
          .transform((value) => value.toUpperCase()),
        binName: z.string().trim().min(1).max(120),
        binType: z.enum(inventoryBinTypes),
        tempMinCelsius: z.coerce.number().nullable().default(null),
        tempMaxCelsius: z.coerce.number().nullable().default(null),
        humidityMinPercent: z.coerce.number().nullable().default(null),
        humidityMaxPercent: z.coerce.number().nullable().default(null),
        isEsdSensitive: z.boolean().default(false),
        isHazmat: z.boolean().default(false),
        hazmatClass: nullableText.default(null),
        isQuarantineBin: z.boolean().default(false)
      })
    )
    .min(1)
});

export const inventoryReorderRuleInputSchema = z.object({
  partId: z.string().trim().min(1),
  warehouseId: z.string().trim().min(1),
  minimumQuantity: z.coerce.number().nonnegative(),
  reorderPoint: z.coerce.number().nonnegative(),
  maximumQuantity: z.coerce.number().positive(),
  leadTimeDays: z.coerce.number().int().nonnegative().default(0)
});

const requestedLineSchema = z.object({
  partId: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  requiredAt: dateOnly,
  note: nullableText.default(null)
});

export const purchaseRequestInputSchema = z.object({
  stationId: z.string().trim().min(1),
  requestReason: z.string().trim().min(3).max(500),
  lines: z.array(requestedLineSchema).min(1)
});

export const purchaseOrderInputSchema = z.object({
  purchaseRequestId: z.string().trim().min(1),
  vendorId: z.string().trim().min(1),
  currencyId: z.string().trim().min(1),
  exchangeRateToIdrMicros: z.coerce.number().int().positive().default(1_000_000),
  expectedAt: dateOnly,
  poType: z.enum(['AIRCRAFT_PART', 'NON_AIRCRAFT_PART']).default('AIRCRAFT_PART').optional(),
  isAogProcurement: z.boolean().default(false).optional(),
  cocRequired: z.boolean().default(true).optional(),
  certificateType: nullableText.default(null).optional(),
  lines: z
    .array(
      z.object({
        purchaseRequestLineId: z.string().trim().min(1),
        quantity: z.coerce.number().positive(),
        sourceUnitCostMinor: z.coerce.number().int().nonnegative()
      })
    )
    .min(1)
});

export const rejectInventoryActionSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const goodsReceiptInputSchema = z.object({
  purchaseOrderId: z.string().trim().min(1),
  warehouseId: z.string().trim().min(1),
  receivedAt: z.string().datetime({ offset: true }),
  documentReference: z.string().trim().min(2).max(100),
  inspectionStatus: z.enum(['PASSED', 'QUARANTINED', 'REJECTED']).default('PASSED').optional(),
  quarantineReason: nullableText.default(null).optional(),
  lines: z
    .array(
      z.object({
        purchaseOrderLineId: z.string().trim().min(1),
        binId: z.string().trim().min(1),
        quantity: z.coerce.number().positive(),
        lotNumber: nullableText.default(null),
        manufacturedAt: nullableDate.default(null),
        expiresAt: nullableDate.default(null),
        certificateReference: nullableText.default(null),
        certificateVerified: z.boolean().default(false),
        serialNumbers: z.array(z.string().trim().min(1).max(100)).default([])
      })
    )
    .min(1)
});

export const inventoryPartInterchangeabilityInputSchema = z
  .object({
    partId: z.string().trim().min(1),
    alternatePartId: z.string().trim().min(1),
    interchangeabilityType: z.enum(inventoryInterchangeabilityTypes),
    notes: nullableText.default(null)
  })
  .refine((value) => value.partId !== value.alternatePartId, {
    message: 'A part cannot be interchangeable with itself.',
    path: ['alternatePartId']
  });

export const inventoryCoreReturnInputSchema = z.object({
  stationId: z.string().trim().min(1),
  vendorId: z.string().trim().min(1),
  partId: z.string().trim().min(1),
  serialId: nullableText.default(null),
  repairOrderId: nullableText.default(null),
  coreDueDate: dateOnly,
  depositAmountIdr: z.coerce.number().int().nonnegative().default(0),
  notes: nullableText.default(null)
});

export const inventoryCoreReturnStatusSchema = z.object({
  status: z.enum(['SHIPPED', 'ACCEPTED_BY_VENDOR']),
  notes: nullableText.default(null)
});

export const inventoryToolInputSchema = z.object({
  toolNumber: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((val) => val.toUpperCase()),
  serialNumber: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .transform((val) => val.toUpperCase()),
  toolName: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).default('SPECIAL_TOOL'),
  warehouseId: nullableText.default(null),
  binId: nullableText.default(null),
  calibrationIntervalDays: z.coerce.number().int().positive().default(365),
  lastCalibratedAt: nullableDate.default(null),
  nextCalibrationDue: nullableDate.default(null),
  certificateNumber: nullableText.default(null),
  restrictedUse: z.boolean().default(false)
});

export const inventoryToolCheckoutSchema = z.object({
  toolId: z.string().trim().min(1),
  workOrderId: nullableText.default(null),
  notes: nullableText.default(null)
});

export const inventoryToolReturnSchema = z.object({
  toolId: z.string().trim().min(1),
  conditionOnReturn: z.string().trim().min(2).default('SERVICEABLE'),
  missingReported: z.boolean().default(false),
  notes: nullableText.default(null)
});

export const inventoryToolCalibrateSchema = z
  .object({
    toolId: z.string().trim().min(1),
    calibratedAt: dateOnly,
    nextCalibrationDue: dateOnly,
    certificateNumber: z.string().trim().min(2)
  })
  .refine((value) => value.nextCalibrationDue > value.calibratedAt, {
    message: 'Next calibration due must be after the calibration date.',
    path: ['nextCalibrationDue']
  });

export const inventorySoftwareNavdbInputSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    partId: nullableText.default(null),
    softwareName: z.string().trim().min(2).max(160),
    systemType: z.string().trim().min(2).max(100),
    version: z.string().trim().min(1).max(80),
    airacCycle: nullableText.default(null),
    effectiveDate: dateOnly,
    expirationDate: dateOnly
  })
  .refine((value) => value.expirationDate > value.effectiveDate, {
    message: 'Expiration date must be after the effective date.',
    path: ['expirationDate']
  });

export const inventoryFlyAwayKitInputSchema = z.object({
  kitNumber: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((val) => val.toUpperCase()),
  aircraftId: nullableText.default(null),
  stationId: nullableText.default(null),
  items: z
    .array(
      z.object({
        partId: z.string().trim().min(1),
        serialId: nullableText.default(null),
        requiredQuantity: z.coerce.number().positive(),
        currentQuantity: z.coerce.number().nonnegative(),
        condition: z.enum(inventoryConditions).default('SERVICEABLE')
      })
    )
    .default([])
});

export const inventoryQuarantineReleaseSchema = z.object({
  serialId: z.string().trim().min(1),
  targetBinId: z.string().trim().min(1),
  certificateReference: z.string().trim().min(2),
  notes: nullableText.default(null)
});

export const inventoryTransferInputSchema = z.object({
  partId: z.string().trim().min(1),
  fromBinId: z.string().trim().min(1),
  toBinId: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  lotId: z.string().trim().min(1).nullable().default(null),
  serialIds: z.array(z.string().trim().min(1)).default([]),
  reason: z.string().trim().min(3).max(500)
});

export const inventoryAdjustmentInputSchema = z.object({
  partId: z.string().trim().min(1),
  binId: z.string().trim().min(1),
  quantityDelta: z.coerce.number().refine((value) => value !== 0, 'Quantity cannot be zero'),
  sourceUnitCostMinor: z.coerce.number().int().nonnegative().default(0),
  currencyId: z.string().trim().min(1).default('cur-idr'),
  exchangeRateToIdrMicros: z.coerce.number().int().positive().default(1_000_000),
  reason: z.string().trim().min(3).max(500)
});

export const maintenancePartIssueInputSchema = z
  .object({
    targetType: z.enum(['AIRCRAFT', 'CORPORATE_ASSET']).default('AIRCRAFT'),
    targetId: z.string().trim().min(1).optional(),
    assetMaintenanceWorkOrderId: z.string().trim().min(1).nullable().default(null),
    expectedAssetVersion: z.coerce.number().int().positive().optional(),
    maintenanceHandoffId: z.string().trim().min(1).nullable().default(null),
    maintenanceCategory: z
      .enum(['ROUTINE', 'MINOR_REPAIR', 'HEAVY_MAINTENANCE', 'MAJOR_REPLACEMENT'])
      .optional(),
    aircraftId: z.string().trim().min(1).nullable().default(null),
    flightId: z.string().trim().min(1).nullable().default(null),
    warehouseId: z.string().trim().min(1),
    reason: z.string().trim().min(3).max(500),
    lines: z
      .array(
        z.object({
          partId: z.string().trim().min(1),
          quantity: z.coerce.number().positive(),
          serialIds: z.array(z.string().trim().min(1)).default([]),
          note: nullableText.default(null)
        })
      )
      .min(1)
  })
  .superRefine((input, context) => {
    if (input.targetType === 'AIRCRAFT' && !input.aircraftId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['aircraftId'],
        message: 'Aircraft is required.'
      });
    }
    if (
      input.targetType === 'CORPORATE_ASSET' &&
      (!input.targetId || !input.assetMaintenanceWorkOrderId || !input.expectedAssetVersion)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetId'],
        message: 'Corporate asset and work order are required.'
      });
    }
  });

export const inventoryCountInputSchema = z.object({
  warehouseId: z.string().trim().min(1),
  binId: z.string().trim().min(1).nullable().default(null),
  reason: z.string().trim().min(3).max(500)
});

export const inventoryCountLineInputSchema = z.object({
  lines: z
    .array(
      z.object({
        stockBalanceId: z.string().trim().min(1),
        countedQuantity: z.coerce.number().nonnegative()
      })
    )
    .min(1)
});

export const repairOrderInputSchema = z.object({
  serialId: z.string().trim().min(1),
  vendorId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(500),
  expectedReturnAt: nullableDate.default(null)
});

export const installSerializedPartInputSchema = z.object({
  aircraftId: z.string().trim().min(1),
  position: z.string().trim().min(1).max(120),
  installedAt: z.string().datetime({ offset: true }),
  hoursAtInstall: z.coerce.number().nonnegative().default(0),
  cyclesAtInstall: z.coerce.number().int().nonnegative().default(0),
  workOrderId: z.string().trim().min(1).optional(),
  workOrderCategory: z.enum(['HEAVY_MAINTENANCE', 'MAJOR_REPLACEMENT']).optional(),
  capitalizationCandidate: z.boolean().optional(),
  capitalizationThresholdMinor: z.coerce.number().int().nonnegative().optional(),
  expectedBenefitMonths: z.coerce.number().int().positive().optional(),
  technicalAcceptanceStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  readyForUseDate: z.string().date().optional()
});

export const removeSerializedPartInputSchema = z.object({
  quarantineBinId: z.string().trim().min(1),
  removedAt: z.string().datetime({ offset: true }),
  hoursAtRemove: z.coerce.number().nonnegative(),
  cyclesAtRemove: z.coerce.number().int().nonnegative(),
  removalReason: z.string().trim().min(3).max(500)
});

export const returnServiceableInputSchema = z.object({
  usableBinId: z.string().trim().min(1),
  returnedAt: z.string().datetime({ offset: true }),
  certificateReference: z.string().trim().min(2),
  certificateVerified: z.literal(true),
  sourceRepairCostMinor: z.coerce.number().int().nonnegative().default(0),
  currencyId: z.string().trim().min(1).default('cur-idr'),
  exchangeRateToIdrMicros: z.coerce.number().int().positive().default(1_000_000)
});

export const scrapSerializedPartInputSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
export type InventoryPartInput = z.infer<typeof inventoryPartInputSchema>;
export type InventoryWarehouseInput = z.infer<typeof inventoryWarehouseInputSchema>;
export type InventoryReorderRuleInput = z.infer<typeof inventoryReorderRuleInputSchema>;
export type PurchaseRequestInput = z.infer<typeof purchaseRequestInputSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;
export type GoodsReceiptInput = z.infer<typeof goodsReceiptInputSchema>;
export type InventoryTransferInput = z.infer<typeof inventoryTransferInputSchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentInputSchema>;
// Input intentionally keeps defaulted fields optional so existing aircraft issue
// callers remain source-compatible. The service parses this before using it.
export type MaintenancePartIssueInput = z.input<typeof maintenancePartIssueInputSchema>;
export type InventoryCountInput = z.infer<typeof inventoryCountInputSchema>;
export type InventoryCountLineInput = z.infer<typeof inventoryCountLineInputSchema>;
export type RepairOrderInput = z.infer<typeof repairOrderInputSchema>;
export type InstallSerializedPartInput = z.infer<typeof installSerializedPartInputSchema>;
export type RemoveSerializedPartInput = z.infer<typeof removeSerializedPartInputSchema>;
export type ReturnServiceableInput = z.infer<typeof returnServiceableInputSchema>;

export type InventoryPartDto = InventoryPartInput & {
  id: string;
  expiryProfile: {
    lotNumber: string | null;
    expiresAt: string | null;
    daysUntilExpiry: number | null;
    shelfLifeElapsedDays: number | null;
    quantityOnNearestExpiry: number;
    status: 'NO_EXPIRY' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryWarehouseDto = {
  id: string;
  stationId: string;
  stationCode: string;
  warehouseCode: string;
  warehouseName: string;
  isActive: boolean;
  bins: Array<{
    id: string;
    binCode: string;
    binName: string;
    binType: InventoryBinType;
    isActive: boolean;
  }>;
};

export type InventoryStockDto = {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  trackingType: InventoryTrackingType;
  lifecycleType: InventoryLifecycleType;
  unitOfMeasure: string;
  stationId: string;
  stationCode: string;
  warehouseId: string;
  warehouseCode: string;
  binId: string;
  binCode: string;
  binType: InventoryBinType;
  lotId: string | null;
  lotNumber: string | null;
  expiresAt: string | null;
  certificateReference: string | null;
  certificateVerified: boolean;
  condition: InventoryCondition;
  onHandQuantity: number;
  availableQuantity: number;
  fifoValueIdr: number | null;
  reorderPoint: number | null;
  lowStock: boolean;
};

export type InventoryMovementDto = {
  id: string;
  movementNumber: string;
  movementType: InventoryMovementType;
  sourceType: string;
  sourceId: string | null;
  stationId: string | null;
  stationCode?: string | null;
  destinationStationId: string | null;
  aircraftId: string | null;
  flightId: string | null;
  reason: string;
  status: 'POSTED' | 'REVERSED';
  totalBaseValueIdr: number | null;
  createdByUserId: string;
  createdAt: string;
};

export type InventoryDashboardDto = {
  availablePartCount: number;
  lowStockCount: number;
  expiringLotCount: number;
  certificateAlertCount: number;
  quarantineItemCount: number;
  openPurchaseRequestCount: number;
  openPurchaseOrderCount: number;
  fifoValuationIdr: number | null;
  recentMovements: InventoryMovementDto[];
};

export type InventoryMaintenanceDemandDto = {
  requirement: MaintenanceMaterialRequirementDto;
  workPackageNumber: string;
  workPackageTitle: string;
  workPackageStatus: string;
  aircraftId: string;
  aircraftRegistration: string;
  flightId: string | null;
  flightNumber: string | null;
  stationId: string | null;
  stationCode: string | null;
  reservations: MaintenanceInventoryReservationDto[];
  candidates: Array<{
    inventoryItemId: string;
    stationId: string;
    stationCode: string;
    warehouseCode: string;
    binId: string;
    binCode: string;
    lotNumber: string | null;
    serialId: string | null;
    serialNumber: string | null;
    availableQuantity: number;
    condition: string;
    expiresAt: string | null;
    certificateReference: string | null;
    certificateVerified: boolean;
    eligible: boolean;
    blocker: string | null;
  }>;
  nextAction: 'RESERVE' | 'ISSUE' | 'WAIT_INSTALL' | 'COMPLETED' | 'BLOCKED';
  blocker: string | null;
};

export type PurchaseRequestDto = {
  id: string;
  requestNumber: string;
  stationId: string;
  stationCode: string;
  requestReason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_ORDERED' | 'ORDERED' | 'CANCELLED';
  requestedByUserId: string;
  createdAt: string;
  lines: Array<{
    id: string;
    partId: string;
    partNumber: string;
    partName: string;
    quantity: number;
    orderedQuantity: number;
    requiredAt: string;
    note: string | null;
  }>;
};

export type PurchaseOrderDto = {
  id: string;
  orderNumber: string;
  purchaseRequestId: string;
  vendorId: string;
  vendorName: string;
  currencyId: string;
  currencyCode: string;
  exchangeRateToIdrMicros: number | null;
  expectedAt: string;
  status:
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'CANCELLED';
  rejectionReason: string | null;
  createdByUserId: string;
  approvedByUserId: string | null;
  createdAt: string;
  lines: Array<{
    id: string;
    purchaseRequestLineId: string;
    partId: string;
    partNumber: string;
    partName: string;
    quantity: number;
    receivedQuantity: number;
    sourceUnitCostMinor: number | null;
    baseUnitCostIdr: number | null;
  }>;
};

export type GoodsReceiptDto = {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  orderNumber: string;
  warehouseId: string;
  documentReference: string;
  receivedAt: string;
  status: 'POSTED' | 'REVERSED';
  movementId: string;
  totalBaseValueIdr: number | null;
};

export type MaintenancePartIssueDto = {
  id: string;
  issueNumber: string;
  maintenanceHandoffId: string | null;
  targetType: 'AIRCRAFT' | 'CORPORATE_ASSET';
  targetId: string;
  assetMaintenanceWorkOrderId: string | null;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  flightId: string | null;
  warehouseId: string;
  movementId: string;
  status: 'ISSUED' | 'REVERSED';
  totalPartsValueIdr: number | null;
  issuedAt: string;
  lines: Array<{
    id: string;
    partId: string;
    partNumber: string;
    partName: string;
    quantity: number;
    baseValueIdr: number | null;
    serialNumbers: string[];
  }>;
};

export type InventorySerializedPartDto = {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  serialNumber: string;
  condition: InventoryCondition;
  binId: string | null;
  binCode: string | null;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  position: string | null;
  hoursSinceNew: number;
  cyclesSinceNew: number;
  certificateReference: string | null;
  certificateVerified: boolean;
  repairOrderStatus: string | null;
};

export type InventoryCountDto = {
  id: string;
  countNumber: string;
  warehouseId: string;
  warehouseCode: string;
  binId: string | null;
  reason: string;
  status: 'DRAFT' | 'COUNTED' | 'POSTED' | 'CANCELLED';
  createdAt: string;
  lines: Array<{
    id: string;
    stockBalanceId: string;
    partId: string;
    partNumber: string;
    binId: string;
    binCode: string;
    lotId: string | null;
    lotNumber: string | null;
    condition: InventoryCondition;
    expectedQuantity: number;
    countedQuantity: number | null;
    varianceQuantity: number | null;
  }>;
};

export type InventoryCostLayerSummaryDto = {
  partId: string;
  partNumber: string;
  partName: string;
  warehouseId: string;
  warehouseCode: string;
  stationId: string;
  stationCode: string;
  remainingQuantity: number;
  baseValueIdr: number;
};

export type InventoryAccountingEventDto = {
  id: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  movementId: string;
  stationId: string | null;
  aircraftId: string | null;
  flightId: string | null;
  currencyId: string | null;
  sourceAmountMinor: number;
  exchangeRateToIdrMicros: number;
  baseAmountIdr: number;
  integrationStatus: 'PENDING_INTEGRATION';
  payload: Record<string, unknown>;
  createdAt: string;
};

export type InventoryPartInterchangeabilityInput = z.infer<
  typeof inventoryPartInterchangeabilityInputSchema
>;
export type InventoryCoreReturnInput = z.infer<typeof inventoryCoreReturnInputSchema>;
export type InventoryCoreReturnStatusInput = z.infer<typeof inventoryCoreReturnStatusSchema>;
export type InventoryToolInput = z.infer<typeof inventoryToolInputSchema>;
export type InventoryToolCheckoutInput = z.infer<typeof inventoryToolCheckoutSchema>;
export type InventoryToolReturnInput = z.infer<typeof inventoryToolReturnSchema>;
export type InventoryToolCalibrateInput = z.infer<typeof inventoryToolCalibrateSchema>;
export type InventorySoftwareNavdbInput = z.infer<typeof inventorySoftwareNavdbInputSchema>;
export type InventoryFlyAwayKitInput = z.infer<typeof inventoryFlyAwayKitInputSchema>;
export type InventoryQuarantineReleaseInput = z.infer<typeof inventoryQuarantineReleaseSchema>;

export type InventoryQuarantineItemDto = {
  serialId: string;
  serialNumber: string;
  quarantineReason: string | null;
  partId: string;
  partNumber: string;
  partName: string;
  manufacturer: string;
  warehouseId: string | null;
  warehouseName: string | null;
  binId: string | null;
  binCode: string | null;
  stationCode: string | null;
  isSuspectedUnapproved: boolean;
  tagColor: InventoryTagColor;
  createdAt: string;
};

export type InventoryToolDto = {
  id: string;
  toolNumber: string;
  serialNumber: string;
  toolName: string;
  category: string;
  warehouseId: string | null;
  binId: string | null;
  calibrationIntervalDays: number;
  lastCalibratedAt: string | null;
  nextCalibrationDue: string | null;
  certificateNumber: string | null;
  status: string;
  restrictedUse: boolean;
  isExpired: boolean;
};

export type InventoryCoreReturnDto = {
  id: string;
  returnNumber: string;
  stationId: string;
  stationCode: string;
  vendorId: string;
  vendorName: string;
  partId: string;
  partNumber: string;
  partName: string;
  serialId: string | null;
  serialNumber: string | null;
  repairOrderId: string | null;
  coreDueDate: string;
  depositAmountIdr: number | null;
  status: string;
  shippedAt: string | null;
  vendorReceiptAt: string | null;
  notes: string | null;
  isOverdue: boolean;
};

export type InventorySoftwareNavdbDto = {
  id: string;
  partId: string | null;
  softwareName: string;
  systemType: string;
  version: string;
  airacCycle: string | null;
  effectiveDate: string;
  expirationDate: string;
  status: string;
  daysLeft: number;
};

export type InventoryFlyAwayKitDto = {
  id: string;
  kitNumber: string;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  stationId: string | null;
  stationCode: string | null;
  status: string;
  assignedAt: string;
  lastInspectedAt: string | null;
  items: Array<{
    id: string;
    partId: string;
    partNumber: string;
    partName: string;
    serialId: string | null;
    serialNumber: string | null;
    unitOfMeasure: string;
    requiredQuantity: number;
    currentQuantity: number;
    condition: string;
  }>;
  isComplete: boolean;
};
