import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { IncidentService, RangerIncident } from '../services/incidentService';
import { OfflineStorageService } from '../services/offlineStorageService';
import { SyncService } from '../services/syncService';

interface UseRangerIncidentsResult {
  incidents: RangerIncident[];
  loading: boolean;
  error: string | null;
}

/**
 * Live list of the signed-in ranger's incidents.
 * Combines Firestore records (realtime) with incidents still waiting in offline storage.
 */
export function useRangerIncidents(): UseRangerIncidentsResult {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  // Remember which uid each snapshot belongs to so loading/empty states can be derived.
  const [cloud, setCloud] = useState<{ uid: string; items: RangerIncident[]; error: string | null } | null>(null);
  const [pendingIncidents, setPendingIncidents] = useState<RangerIncident[]>([]);

  // Track auth so the query starts once the user session is restored.
  useEffect(() => onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null)), []);

  // Realtime Firestore subscription.
  useEffect(() => {
    if (!uid) return;
    return IncidentService.subscribeToRangerIncidents(
      uid,
      (items) => setCloud({ uid, items, error: null }),
      (err) => setCloud({ uid, items: [], error: err.message })
    );
  }, [uid]);

  const current = uid && cloud?.uid === uid ? cloud : null;
  const cloudIncidents = useMemo(() => current?.items ?? [], [current]);
  const loading = !!uid && !current;
  const error = current?.error ?? null;

  // Offline queue — refreshed whenever the sync service reports a change.
  useEffect(() => {
    if (!uid) return;
    const loadPending = async () => {
      const offline = await OfflineStorageService.getOfflineIncidents();
      setPendingIncidents(
        offline
          .filter((i) => i.rangerId === uid)
          .map((i) => ({
            id: i.id,
            incidentType: i.type,
            description: i.description,
            latitude: i.latitude,
            longitude: i.longitude,
            photoUrl: i.photoUri,
            status: 'PENDING_SYNC',
            createdAt: i.createdAt,
            isPendingSync: true,
          }))
      );
    };
    return SyncService.subscribe(() => {
      loadPending();
    });
  }, [uid]);

  const incidents = useMemo(() => {
    const cloudIds = new Set(cloudIncidents.map((i) => i.id));
    const pending = uid ? pendingIncidents.filter((i) => !cloudIds.has(i.id)) : [];
    return [...pending, ...cloudIncidents].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }, [cloudIncidents, pendingIncidents, uid]);

  return { incidents, loading, error };
}
