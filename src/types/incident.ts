export type IncidentType = 'snare' | 'carcass' | 'campsite' | 'footprints';

export const INCIDENT_WORKFLOW_STATUS = {
  SUBMITTED: 'SUBMITTED',
  PROCESSING: 'PROCESSING',
  ASSIGNED: 'ASSIGNED',
  CLOSED: 'CLOSED',
  RESOLVED: 'RESOLVED',
} as const;

export type IncidentWorkflowStatus = keyof typeof INCIDENT_WORKFLOW_STATUS;

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface IncidentReport {
  id?: string;
  type: IncidentType | null;
  description: string;
  photoUri: string | null;
  location: LocationData | null;
  timestamp: number;
  status: 'pending' | 'synced';
}

export interface FirestoreIncidentDocument {
  id: string;
  rangerId: string;
  incidentType: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  status: string;
  createdAt: number; // millisecond timestamp
  reviewedBy?: string | null;
  reviewedAt?: number | null;
  statusUpdatedAt?: number | null;
  closureReason?: string | null;
  closedBy?: string | null;
  closedAt?: number | null;
  assignedPatrolId?: string | null;
  assignedBy?: string | null;
  assignedAt?: number | null;
  resolvedAt?: number | null;
  resolutionOutcome?: string | null;
  rangerName?: string;
}

