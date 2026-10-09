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

export interface ThreatAssessment {
  score: number;
  level: 'Low' | 'Moderate' | 'High' | 'Critical';
  color: string;
  summary: string;
  factors: { label: string; impact: 'Low' | 'Medium' | 'High'; description: string }[];
}

export interface Recommendation {
  id: string;
  priority: 'Urgent' | 'High' | 'Normal';
  title: string;
  description: string;
  actionText: string;
}

export interface ConservationReport {
  kind: ReportKind;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  sourceResults: ReportSources;
  partialData: boolean;
  totalAvailableRecords: number;
  threatAssessment: ThreatAssessment;
  recommendations: Recommendation[];
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
  const hotspots = findPotentialHotspots(incidents);
  const patrolCompletionPercent = patrols.length > 0 ? Math.round((completedPatrols / patrols.length) * 100) : null;

  // Calculate Threat Assessment
  let threatScore = 15;
  const threatFactors: { label: string; impact: 'Low' | 'Medium' | 'High'; description: string }[] = [];

  if (candidateIncidents.length > 0 || hotspots.length > 0) {
    const pScore = Math.min(45, candidateIncidents.length * 8 + hotspots.length * 10);
    threatScore += pScore;
    threatFactors.push({
      label: 'Poaching Activity',
      impact: pScore > 25 ? 'High' : 'Medium',
      description: `${candidateIncidents.length} poaching candidate report(s) and ${hotspots.length} hotspot cluster(s) detected.`,
    });
  } else {
    threatFactors.push({
      label: 'Poaching Activity',
      impact: 'Low',
      description: 'No active poaching incidents or snare clusters detected.',
    });
  }

  if (conflicts.length > 0) {
    const cScore = Math.min(25, conflicts.length * 6);
    threatScore += cScore;
    threatFactors.push({
      label: 'Human-Wildlife Conflict',
      impact: conflicts.length > 3 ? 'High' : 'Medium',
      description: `${conflicts.length} conflict report(s) recorded along boundary buffer.`,
    });
  }

  if (patrols.length > 0 && patrolCompletionPercent !== null && patrolCompletionPercent < 60) {
    const deficit = Math.round((60 - patrolCompletionPercent) * 0.4);
    threatScore += deficit;
    threatFactors.push({
      label: 'Patrol Coverage Deficit',
      impact: 'Medium',
      description: `Patrol completion is ${patrolCompletionPercent}% (target is 60%+).`,
    });
  }

  threatScore = Math.min(100, Math.max(0, threatScore));
  let threatLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
  let threatColor = '#2E7D32';
  let threatSummary = 'Conservation zone is stable. Standard routine surveillance recommended.';

  if (threatScore >= 70) {
    threatLevel = 'Critical';
    threatColor = '#B71C1C';
    threatSummary = 'Critical alert: Multiple concurrent threats detected. Deploy rapid response units.';
  } else if (threatScore >= 45) {
    threatLevel = 'High';
    threatColor = '#D32F2F';
    threatSummary = 'Elevated threat: Active incident clusters detected. Increase targeted patrol sweeps.';
  } else if (threatScore >= 25) {
    threatLevel = 'Moderate';
    threatColor = '#F57F17';
    threatSummary = 'Moderate threat: Boundary interactions detected. Enhance ranger vigilance.';
  }

  const threatAssessment: ThreatAssessment = {
    score: threatScore,
    level: threatLevel,
    color: threatColor,
    summary: threatSummary,
    factors: threatFactors,
  };

  // Generate Recommendations
  const recommendations: Recommendation[] = [];
  if (hotspots.length > 0) {
    recommendations.push({
      id: 'rec_hotspots',
      priority: 'Urgent',
      title: 'Targeted Anti-Poaching Sweeps',
      description: `Deploy snare-removal units to hotspot coordinates around [${hotspots[0].label}].`,
      actionText: 'Assign Sweep Route',
    });
  }
  if (patrolCompletionPercent !== null && patrolCompletionPercent < 70 && patrols.length > 0) {
    recommendations.push({
      id: 'rec_patrols',
      priority: 'High',
      title: 'Patrol Route Reallocation',
      description: `Rangers achieved ${patrolCompletionPercent}% route completion. Review assignments to increase coverage.`,
      actionText: 'Review Allocations',
    });
  }
  if (conflicts.length > 0) {
    recommendations.push({
      id: 'rec_conflicts',
      priority: 'High',
      title: 'Boundary Buffer Verification',
      description: `${conflicts.length} community conflict report(s) logged. Verify perimeter deterrents and community alerts.`,
      actionText: 'Inspect Boundaries',
    });
  }
  if (incidents.filter((r) => r.latitude === null || r.longitude === null).length > 0) {
    const missingLocs = incidents.filter((r) => r.latitude === null || r.longitude === null).length;
    recommendations.push({
      id: 'rec_gps',
      priority: 'Normal',
      title: 'Enforce Ranger GPS Logging',
      description: `${missingLocs} incident report(s) lack GPS coordinates, preventing cluster analysis.`,
      actionText: 'Update Protocol',
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec_maintain',
      priority: 'Normal',
      title: 'Maintain Baseline Patrol Regimen',
      description: 'Incident activity is within seasonal thresholds. Continue routine perimeter and wildlife monitoring.',
      actionText: 'Continue Monitoring',
    });
  }

  return {
    kind,
    startDate,
    endDate,
    generatedAt,
    sourceResults: sources,
    partialData,
    totalAvailableRecords,
    threatAssessment,
    recommendations,
    incidents: {
      total: incidents.length,
      categories: countBy(incidents.map((record) => record.category)),
      trend: createTrend(incidents, startDate, endDate),
      missingLocations: incidents.filter((record) => record.latitude === null || record.longitude === null).length,
    },
    poaching: {
      candidateIncidentCount: candidateIncidents.length,
      hotspots,
      candidateIncidentsWithoutLocation: candidateIncidents.filter((record) => record.latitude === null || record.longitude === null).length,
    },
    patrols: {
      assigned: patrols.length,
      completed: completedPatrols,
      inProgress: inProgressPatrols,
      notStarted: patrols.filter((patrol) => patrol.status.toLowerCase() === 'assigned').length,
      completionPercent: patrolCompletionPercent,
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