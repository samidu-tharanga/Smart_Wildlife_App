export type ReportKind = 'overview' | 'incidents' | 'poaching' | 'patrols' | 'conflicts';
export type ReportSource = 'incidents' | 'patrols' | 'conflicts';
export type SourceState = 'available' | 'empty' | 'unavailable';

export interface IncidentRecord {
  id: string;
  occurredAt: Date;
  category: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
}

export interface PatrolRecord {
  id: string;
  patrolDate: Date;
  routeName: string;
  status: string;
  approximateDistanceKm: number | null;
  plannedPointCount: number;
}

export interface ReportCount {
  label: string;
  count: number;
}

export type ReportBucket = ReportCount;

export interface SourceResult<T> {
  state: SourceState;
  records: T[];
  error: string | null;
}

export interface ReportSources {
  incidents: SourceResult<IncidentRecord>;
  patrols: SourceResult<PatrolRecord>;
  conflicts: SourceResult<IncidentRecord>;
}

export interface Hotspot {
  label: string;
  latitude: number;
  longitude: number;
  incidents: number;
}

export interface ConservationReport {
  kind: ReportKind;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  sourceResults: ReportSources;
  partialData: boolean;
  totalAvailableRecords: number;
  incidents: {
    total: number;
    categories: ReportCount[];
    trend: ReportBucket[];
    missingLocations: number;
  };
  poaching: {
    candidateIncidentCount: number;
    hotspots: Hotspot[];
    candidateIncidentsWithoutLocation: number;
  };
  patrols: {
    assigned: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    completionPercent: number | null;
    plannedDistanceKm: number;
    routeProgress: { routeName: string; assigned: number; completed: number }[];
    spatialCoverageAvailable: false;
  };
  conflicts: {
    total: number;
    categories: ReportCount[];
    trend: ReportBucket[];
    missingLocations: number;
  };
}

export const REPORT_DEFINITIONS: Record<ReportKind, { title: string; description: string }> = {
  overview: {
    title: 'Conservation overview',
    description: 'All available conservation analysis for the selected period',
  },
  incidents: {
    title: 'Incident trends',
    description: 'Incidents grouped by type, location, and time',
  },
  poaching: {
    title: 'Poaching hotspots',
    description: 'Potential incident clusters derived from reported coordinates',
  },
  patrols: {
    title: 'Patrol coverage',
    description: 'Assignment completion and planned patrol distance',
  },
  conflicts: {
    title: 'Human-wildlife conflict',
    description: 'Community conflict reports grouped by type and time',
  },
};

function readableLabel(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countBy(values: (string | null)[]): ReportCount[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label: readableLabel(label), count }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
}

function createTrend(records: IncidentRecord[], startDate: Date, endDate: Date): ReportBucket[] {
  const periodDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
  const bucketCount = periodDays <= 7 ? periodDays : periodDays <= 31 ? 5 : 12;
  const duration = Math.max(1, endDate.getTime() - startDate.getTime() + 1);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(startDate.getTime() + (duration * index) / bucketCount);
    return {
      label: date.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
      count: 0,
    };
  });

  records.forEach((record) => {
    const elapsed = record.occurredAt.getTime() - startDate.getTime();
    const index = Math.max(0, Math.min(bucketCount - 1, Math.floor((elapsed / duration) * bucketCount)));
    buckets[index].count += 1;
  });

  return buckets;
}

function isPoachingCandidate(category: string | null): boolean {
  return category !== null && /snare|trap|poach|illegal|campsite/i.test(category);
}

function findPotentialHotspots(records: IncidentRecord[]): Hotspot[] {
  const cellSize = 0.01;
  const cells = new Map<string, Hotspot>();
  records.filter((record) => isPoachingCandidate(record.category)).forEach((record) => {
    if (record.latitude === null || record.longitude === null) return;
    const latitudeCell = Math.floor(record.latitude / cellSize);
    const longitudeCell = Math.floor(record.longitude / cellSize);
    const key = `${latitudeCell}:${longitudeCell}`;
    const hotspot = cells.get(key);
    if (hotspot) {
      hotspot.incidents += 1;
      return;
    }
    const latitude = (latitudeCell + 0.5) * cellSize;
    const longitude = (longitudeCell + 0.5) * cellSize;
    cells.set(key, {
      label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      latitude,
      longitude,
      incidents: 1,
    });
  });

  return [...cells.values()]
    .filter((cell) => cell.incidents >= 2)
    .sort((first, second) => second.incidents - first.incidents)
    .slice(0, 10);
}

export function buildConservationReport(
  kind: ReportKind,
  sources: ReportSources,
  startDate: Date,
  endDate: Date,
  generatedAt = new Date(),
): ConservationReport {
  const incidents = sources.incidents.records;
  const patrols = sources.patrols.records;
  const conflicts = sources.conflicts.records;
  const availableCounts = [incidents.length, patrols.length, conflicts.length];
  const totalAvailableRecords = availableCounts.reduce((total, count) => total + count, 0);
  const requiredSources = kind === 'overview'
    ? [sources.incidents, sources.patrols, sources.conflicts]
    : kind === 'patrols'
      ? [sources.patrols]
      : kind === 'conflicts'
        ? [sources.conflicts]
        : [sources.incidents];
  const partialData = requiredSources.some((source) => source.state === 'available') && requiredSources
    .some((source) => source.state !== 'available');
  const completedPatrols = patrols.filter((patrol) => patrol.status.toLowerCase() === 'completed').length;
  const inProgressPatrols = patrols.filter((patrol) => patrol.status.toLowerCase() === 'in_progress').length;
  const routeTotals = new Map<string, { assigned: number; completed: number }>();

  patrols.forEach((patrol) => {
    const route = routeTotals.get(patrol.routeName) ?? { assigned: 0, completed: 0 };
    route.assigned += 1;
    if (patrol.status.toLowerCase() === 'completed') route.completed += 1;
    routeTotals.set(patrol.routeName, route);
  });

  const candidateIncidents = incidents.filter((record) => isPoachingCandidate(record.category));

  return {
    kind,
    startDate,
    endDate,
    generatedAt,
    sourceResults: sources,
    partialData,
    totalAvailableRecords,
    incidents: {
      total: incidents.length,
      categories: countBy(incidents.map((record) => record.category)),
      trend: createTrend(incidents, startDate, endDate),
      missingLocations: incidents.filter((record) => record.latitude === null || record.longitude === null).length,
    },
    poaching: {
      candidateIncidentCount: candidateIncidents.length,
      hotspots: findPotentialHotspots(incidents),
      candidateIncidentsWithoutLocation: candidateIncidents.filter((record) => record.latitude === null || record.longitude === null).length,
    },
    patrols: {
      assigned: patrols.length,
      completed: completedPatrols,
      inProgress: inProgressPatrols,
      notStarted: patrols.filter((patrol) => patrol.status.toLowerCase() === 'assigned').length,
      completionPercent: patrols.length > 0 ? Math.round((completedPatrols / patrols.length) * 100) : null,
      plannedDistanceKm: Math.round(patrols.reduce((total, patrol) => total + (patrol.approximateDistanceKm ?? 0), 0) * 10) / 10,
      routeProgress: [...routeTotals.entries()]
        .map(([routeName, counts]) => ({ routeName, ...counts }))
        .sort((first, second) => second.assigned - first.assigned || first.routeName.localeCompare(second.routeName)),
      spatialCoverageAvailable: false,
    },
    conflicts: {
      total: conflicts.length,
      categories: countBy(conflicts.map((record) => record.category)),
      trend: createTrend(conflicts, startDate, endDate),
      missingLocations: conflicts.filter((record) => record.latitude === null || record.longitude === null).length,
    },
  };
}