import { collection, doc, getDoc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  buildConservationReport,
  ConservationReport,
  IncidentRecord,
  PatrolRecord,
  ReportKind,
  ReportSources,
  SourceResult,
} from './reportAnalytics';

export interface ReportDateRange {
  startDate: Date;
  endDate: Date;
}

export type ReportProgressStage = 'incidents' | 'poaching' | 'patrols' | 'conflicts' | 'complete';

function getErrorCode(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : null;
}

function parseReportDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function text(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const candidate = data[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function number(data: Record<string, unknown>, key: string): number | null {
  const candidate = data[key];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function incidentFromDocument(id: string, data: Record<string, unknown>): IncidentRecord | null {
  const occurredAt = parseReportDate(data.createdAt);
  if (!occurredAt) return null;
  return {
    id,
    occurredAt,
    category: text(data, ['incidentType', 'type']),
    status: text(data, ['status']),
    latitude: number(data, 'latitude'),
    longitude: number(data, 'longitude'),
    area: text(data, ['area', 'zone', 'parkName', 'locationName']),
  };
}

function communityReportFromDocument(id: string, data: Record<string, unknown>): IncidentRecord | null {
  const occurredAt = parseReportDate(data.createdAt);
  if (!occurredAt) return null;
  const location = typeof data.location === 'object' && data.location !== null
    ? data.location as Record<string, unknown>
    : {};
  return {
    id,
    occurredAt,
    category: text(data, ['conflictType', 'reportType', 'incidentType', 'type']),
    status: text(data, ['status']),
    latitude: number(data, 'latitude') ?? number(location, 'latitude'),
    longitude: number(data, 'longitude') ?? number(location, 'longitude'),
    area: text(data, ['area', 'zone', 'parkName', 'locationName'])
      ?? text(location, ['area', 'name']),
  };
}

function patrolFromDocument(id: string, data: Record<string, unknown>): PatrolRecord | null {
  const patrolDate = parseReportDate(data.patrolDate);
  if (!patrolDate) return null;
  const points = Array.isArray(data.points) ? data.points : [];
  return {
    id,
    patrolDate,
    routeName: text(data, ['routeName']) ?? 'Unnamed route',
    status: text(data, ['status']) ?? 'unknown',
    approximateDistanceKm: number(data, 'approximateDistanceKm'),
    plannedPointCount: points.length,
  };
}

function isWithinRange(date: Date, { startDate, endDate }: ReportDateRange): boolean {
  return date >= startDate && date <= endDate;
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function unavailable<T>(error: string): SourceResult<T> {
  return { state: 'unavailable', records: [], error };
}

function result<T>(records: T[]): SourceResult<T> {
  return { state: records.length > 0 ? 'available' : 'empty', records, error: null };
}

async function readIncidents(range: ReportDateRange): Promise<SourceResult<IncidentRecord>> {
  try {
    const reference = query(
      collection(db, 'incidents'),
      where('createdAt', '>=', Timestamp.fromDate(range.startDate)),
      where('createdAt', '<=', Timestamp.fromDate(range.endDate)),
    );
    const snapshot = await getDocs(reference);
    const records = snapshot.docs
      .map((item) => incidentFromDocument(item.id, item.data()))
      .filter((item): item is IncidentRecord => item !== null);
    return result(records);
  } catch (error) {
    return unavailable(getErrorCode(error) === 'permission-denied'
      ? 'Your Firebase rules do not allow this account to read incidents.'
      : 'Incident records could not be loaded.');
  }
}

async function readPatrols(range: ReportDateRange): Promise<SourceResult<PatrolRecord>> {
  try {
    const startDate = localDateString(range.startDate);
    const endDate = localDateString(range.endDate);
    const reference = query(
      collection(db, 'patrol_assignments'),
      where('patrolDate', '>=', startDate),
      where('patrolDate', '<=', endDate),
    );
    const snapshot = await getDocs(reference);
    const records = snapshot.docs
      .map((item) => patrolFromDocument(item.id, item.data()))
      .filter((item): item is PatrolRecord => item !== null && isWithinRange(item.patrolDate, range));
    return result(records);
  } catch (error) {
    return unavailable(getErrorCode(error) === 'permission-denied'
      ? 'Your Firebase rules do not allow this account to read patrol assignments.'
      : 'Patrol assignments could not be loaded.');
  }
}

async function readCommunityReports(range: ReportDateRange): Promise<SourceResult<IncidentRecord>> {
  try {
    const reference = query(
      collection(db, 'community_reports'),
      where('createdAt', '>=', Timestamp.fromDate(range.startDate)),
      where('createdAt', '<=', Timestamp.fromDate(range.endDate)),
    );
    const snapshot = await getDocs(reference);
    const records = snapshot.docs
      .map((item) => communityReportFromDocument(item.id, item.data()))
      .filter((item): item is IncidentRecord => item !== null);
    return result(records);
  } catch (error) {
    return unavailable(getErrorCode(error) === 'permission-denied'
      ? 'Your Firebase rules do not allow this account to read community reports.'
      : 'Community reports could not be loaded.');
  }
}

function hasAnySource(sources: ReportSources): boolean {
  return sources.incidents.state !== 'unavailable'
    || sources.patrols.state !== 'unavailable'
    || sources.conflicts.state !== 'unavailable';
}

export async function generateConservationReport(
  kind: ReportKind,
  range: ReportDateRange,
  onProgress?: (stage: ReportProgressStage) => void,
): Promise<ConservationReport> {
  if (!Number.isFinite(range.startDate.getTime()) || !Number.isFinite(range.endDate.getTime())) {
    throw new Error('Enter valid start and end dates.');
  }
  if (range.startDate > range.endDate) {
    throw new Error('The start date must be on or before the end date.');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Your session has expired. Sign in again to generate a report.');
  }

  const roleSnapshot = await getDoc(doc(db, 'user_roles', user.uid));
  const role = roleSnapshot.exists() ? roleSnapshot.data().role : null;
  if (role !== 'manager' && role !== 'researcher') {
    throw new Error('Your account is not authorized to view conservation reports.');
  }

  onProgress?.('incidents');
  const incidents = await readIncidents(range);
  onProgress?.('patrols');
  const patrols = await readPatrols(range);
  onProgress?.('conflicts');
  const conflicts = await readCommunityReports(range);
  const sources: ReportSources = { incidents, patrols, conflicts };
  if (!hasAnySource(sources)) {
    const details = [incidents.error, patrols.error, conflicts.error].filter(Boolean).join(' ');
    throw new Error(details || 'No report data sources are available.');
  }

  onProgress?.('poaching');
  const report = buildConservationReport(kind, sources, range.startDate, range.endDate);
  onProgress?.('complete');
  return report;
}