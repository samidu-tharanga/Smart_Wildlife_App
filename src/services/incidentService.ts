import {
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { uploadImageToStorage, convertUriToBase64 } from './storageUtils';
import * as Network from 'expo-network';
import { OfflineStorageService } from './offlineStorageService';

export interface IncidentSubmissionData {
  type: string;
  description: string;
  photoUri: string | null;
  latitude: number;
  longitude: number;
}

export interface IncidentSubmissionResult {
  id: string;
  status: 'SYNCED' | 'OFFLINE';
}

export type IncidentStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'PENDING_SYNC' | string;

export interface RangerIncident {
  id: string;
  incidentType: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  status: IncidentStatus;
  /** Milliseconds since epoch. */
  createdAt: number;
  /** True when the incident only exists on this device and is waiting to sync. */
  isPendingSync: boolean;
}

export interface IncidentAlert {
  id: string;
  animalName?: string;
  species?: string;
  incidentType?: string;
  zoneName?: string;
  time?: string;
  timestamp?: number;
  lat?: number;
  lng?: number;
}

export const logIncident = async (incident: Omit<IncidentAlert, 'id'>) => {
  const newRef = doc(collection(db, 'incidents'));
  await setDoc(newRef, incident);
};

export const subscribeToIncidents = (callback: (incidents: IncidentAlert[]) => void) => {
  const q = query(collection(db, 'incidents'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        species: data.species || data.incidentType || 'INCIDENT',
        animalName: data.animalName || (data.incidentType ? `Incident (${data.incidentType})` : 'Wildlife Event'),
        zoneName: data.zoneName || 'Monitored Sector',
        time: data.time || 'Recently',
        ...data,
      } as IncidentAlert;
    }));
  });
};

export class IncidentService {
  /**
   * Submits a complete incident report.
   * Handles photo upload to Storage and document creation in Firestore,
   * or stores the incident locally if the device is offline.
   */
  static async submitIncident(data: IncidentSubmissionData): Promise<IncidentSubmissionResult> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Authentication failure: You must be logged in to submit an incident.");
    }

    // Check network connectivity
    const networkState = await Network.getNetworkStateAsync();
    // In some environments, isInternetReachable can be null, so we primarily rely on isConnected
    if (!networkState.isConnected) {
      const id = await OfflineStorageService.saveIncidentOffline(data, user.uid);
      return { id, status: 'OFFLINE' };
    }

    try {
      let photoUrl = null;

      // 1. Upload photo if present
      if (data.photoUri) {
        try {
          const fileName = `incidents/${user.uid}_${Date.now()}.jpg`;
          photoUrl = await uploadImageToStorage(data.photoUri, fileName);
        } catch (uploadErr: any) {
          console.warn("Firebase Storage unavailable, converting to base64 image:", uploadErr.message);
          photoUrl = await convertUriToBase64(data.photoUri);
        }
      }

      // 2. Create Firestore Document
      const docData = {
        rangerId: user.uid,
        incidentType: data.type,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        photoUrl: photoUrl,
        createdAt: serverTimestamp(),
        synchronizationStatus: 'SYNCED',
        status: 'SUBMITTED',
      };

      const docRef = await addDoc(collection(db, 'incidents'), docData);
      
      return { id: docRef.id, status: 'SYNCED' };

    } catch (error: any) {
      console.error("Submission Error:", error);
      // Map specific Firestore errors
      if (error.code === 'permission-denied') {
        throw new Error("Firestore failure: You don't have permission to write incident records.");
      }
      
      // If we already threw a friendly error, just re-throw it
      if (error.message.includes('failure')) {
        throw error;
      }
      
      
      throw new Error(error.message || "Network failure or unexpected error occurred.");
    }
  }

  /**
   * Directly submits an incident to Firebase without a network check.
   * Used strictly by the SyncService to push pending offline incidents to the cloud.
   * Uses setDoc to prevent creating duplicate incidents if retried.
   */
  static async submitCloudIncident(data: IncidentSubmissionData, incidentId: string, rangerId: string): Promise<void> {
    try {
      let photoUrl = null;

      // 1. Upload photo if present
      if (data.photoUri) {
        const fileName = `incidents/${rangerId}_${Date.now()}.jpg`;
        photoUrl = await uploadImageToStorage(data.photoUri, fileName);
      }

      // 2. Create/Overwrite Firestore Document with specific ID
      const docData = {
        rangerId: rangerId,
        incidentType: data.type,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        photoUrl: photoUrl,
        createdAt: serverTimestamp(),
        synchronizationStatus: 'SYNCED',
        status: 'SUBMITTED',
      };

      await setDoc(doc(db, 'incidents', incidentId), docData);

    } catch (error: any) {
      console.error(`Failed to submit cloud incident ${incidentId}:`, error);
      throw error;
    }
  }

  /**
   * Subscribes in real time to every incident reported by the given ranger.
   * Results are sorted newest-first on the client so no composite index is required.
   */
  static subscribeToRangerIncidents(
    rangerId: string,
    onChange: (incidents: RangerIncident[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(collection(db, 'incidents'), where('rangerId', '==', rangerId));

    return onSnapshot(
      q,
      (snapshot) => {
        const incidents: RangerIncident[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAt =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toMillis()
              : // serverTimestamp() is null in the local snapshot until the server confirms it
                Date.now();
          return {
            id: d.id,
            incidentType: data.incidentType ?? 'unknown',
            description: data.description ?? '',
            latitude: Number(data.latitude) || 0,
            longitude: Number(data.longitude) || 0,
            photoUrl: data.photoUrl ?? null,
            status: data.status ?? 'SUBMITTED',
            createdAt,
            isPendingSync: false,
          };
        });
        incidents.sort((a, b) => b.createdAt - a.createdAt);
        onChange(incidents);
      },
      (error) => {
        console.error('Failed to load ranger incidents:', error);
        onError?.(error);
      }
    );
  }

  /**
   * Realtime subscription for Manager to view all incidents.
   * Also fetches ranger user display names from user_roles where available.
   */
  static subscribeToAllIncidents(
    onChange: (incidents: (RangerIncident & { rangerName?: string; rawData: any })[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = collection(db, 'incidents');

    return onSnapshot(
      q,
      async (snapshot) => {
        try {
          // Collect ranger IDs to resolve display names
          const rangerIds = Array.from(new Set(snapshot.docs.map((d) => d.data().rangerId).filter(Boolean)));
          const rangerNames: Record<string, string> = {};

          if (rangerIds.length > 0) {
            try {
              const usersQuery = query(collection(db, 'user_roles'));
              const usersSnap = await getDocs(usersQuery);
              usersSnap.docs.forEach((uDoc) => {
                const uData = uDoc.data();
                rangerNames[uDoc.id] = uData.displayName || uData.name || uData.email || uDoc.id;
              });
            } catch (err) {
              console.warn('Could not load user_roles for ranger names:', err);
            }
          }

          const items = snapshot.docs.map((d) => {
            const data = d.data();
            const createdAt =
              data.createdAt instanceof Timestamp
                ? data.createdAt.toMillis()
                : typeof data.createdAt === 'number'
                ? data.createdAt
                : Date.now();

            return {
              id: d.id,
              incidentType: data.incidentType ?? 'unknown',
              description: data.description ?? '',
              latitude: Number(data.latitude) || 0,
              longitude: Number(data.longitude) || 0,
              photoUrl: data.photoUrl ?? null,
              status: data.status ?? 'SUBMITTED',
              createdAt,
              isPendingSync: false,
              rangerName: rangerNames[data.rangerId] || data.rangerId || 'Unknown Ranger',
              rawData: data,
            };
          });

          items.sort((a, b) => b.createdAt - a.createdAt);
          onChange(items);
        } catch (err: any) {
          console.error('Error parsing incidents snapshot:', err);
          onError?.(err);
        }
      },
      (error) => {
        console.error('Failed to load all incidents:', error);
        onError?.(error);
      }
    );
  }

  /**
   * Updates an incident status to PROCESSING.
   */
  static async startProcessingIncident(incidentId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required.');

    const incidentRef = doc(db, 'incidents', incidentId);
    await setDoc(
      incidentRef,
      {
        status: 'PROCESSING',
        statusUpdatedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Closes an incident with a short closure reason.
   */
  static async closeIncident(incidentId: string, closureReason: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required.');

    const incidentRef = doc(db, 'incidents', incidentId);
    await setDoc(
      incidentRef,
      {
        status: 'CLOSED',
        closureReason: closureReason.trim() || 'Closed by Manager (no field action required)',
        statusUpdatedAt: serverTimestamp(),
        closedBy: user.uid,
        closedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Links an incident to an assigned patrol and updates status to ASSIGNED.
   */
  static async linkIncidentToPatrol(incidentId: string, patrolAssignmentId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required.');

    const incidentRef = doc(db, 'incidents', incidentId);
    await setDoc(
      incidentRef,
      {
        status: 'ASSIGNED',
        assignedPatrolId: patrolAssignmentId,
        statusUpdatedAt: serverTimestamp(),
        assignedBy: user.uid,
        assignedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Called upon patrol completion to resolve any incident linked to the patrol.
   */
  static async resolveIncidentIfLinked(patrolAssignmentId: string, resolutionOutcome?: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required.');

    try {
      const q = query(collection(db, 'incidents'), where('assignedPatrolId', '==', patrolAssignmentId));
      const snapshot = await getDocs(q);

      for (const incidentDoc of snapshot.docs) {
        const incidentRef = doc(db, 'incidents', incidentDoc.id);
        await setDoc(
          incidentRef,
          {
            status: 'RESOLVED',
            statusUpdatedAt: serverTimestamp(),
            resolvedAt: serverTimestamp(),
            resolutionOutcome: resolutionOutcome || 'Patrol completed successfully',
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.error('Failed to resolve linked incidents:', err);
      // Non-blocking for patrol completion, but log error
    }
  }
}

