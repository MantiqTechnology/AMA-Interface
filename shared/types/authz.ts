import type {
  AppUser,
  Flight,
  FlightRequest,
  FlightStatus,
  HandlingConfirmation,
  ReadinessCheck,
  Route
} from './ops-demo';

export type AuthorizationReason =
  | 'MODULE_DISABLED'
  | 'MISSING_PERMISSION'
  | 'OUTSIDE_STATION_SCOPE'
  | 'INVALID_WORKFLOW_STATE'
  | 'SELF_APPROVAL_FORBIDDEN'
  | 'READINESS_BLOCKER'
  | 'MISSING_REQUIRED_DATA'
  | 'INVALID_TRANSITION'
  | 'INACTIVE_USER';

export interface AuthorizationResult {
  allowed: boolean;
  message: string;
  reason?: AuthorizationReason;
  policyId?: string;
  missingRequirements?: string[];
}

export interface AuthorizationContext {
  user?: AppUser;
  flightRequest?: FlightRequest;
  flight?: Flight;
  route?: Route;
  readiness?: ReadinessCheck;
  handling?: HandlingConfirmation;
  stationId?: string;
  nextStatus?: FlightStatus;
  note?: string;
}
