import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  runTransaction,
} from 'firebase/firestore';

import type { Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { IncidentService } from './incidentService';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  type: 'start' | 'checkpoint' | 'end';
}

export interface PatrolAssignmentData {
  rangerUid: string;
  routeName: string;
  points: RoutePoint[];
  approximateDistanceKm: number;
  patrolDate: string;
  estimatedDurationMinutes: number;
  incidentId?: string;
}

export interface PatrolAssignment extends PatrolAssignmentData {
  id: string;
  managerUid: string;
  status: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
}

export interface RangerProfile {
  uid: string;
  displayName: string;
}

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please log in again.');
  }

  return user;
}

function requireAssignmentId(assignmentId: string): string {
  const id = assignmentId.trim();

  if (!id) {
    throw new Error('Missing assignment ID.');
  }

  return id;
}

function patrolUpdateError(error: unknown): Error {
  const firebaseError = error as {
    code?: string;
    message?: string;
  };

  if (firebaseError.code === 'permission-denied') {
    return new Error(
      'Permission denied. Firestore rules must allow the assigned ranger to update patrol status.',
    );
  }

  if (firebaseError.code === 'unavailable') {
    return new Error(
      'Could not connect to Firebase. Check your internet connection and try again.',
    );
  }

  return new Error(
    firebaseError.message || 'Could not update the patrol. Please try again.',
  );
}

export class PatrolService {
  // Lists ranger accounts. This does not check availability.
  static async getAvailableRangers(): Promise<RangerProfile[]> {
    const rangerQuery = query(
      collection(db, 'user_roles'),
      where('role', '==', 'ranger'),
    );

    const snapshot = await getDocs(rangerQuery);

    return snapshot.docs.map((rangerDoc) => {
      const data = rangerDoc.data();

      return {
        uid: rangerDoc.id,
        displayName:
          data.displayName ||
          data.name ||
          data.email ||
          rangerDoc.id,
      };
    });
  }

  // Saves a patrol assignment created by the manager.
  static async assignPatrolRoute(
    data: PatrolAssignmentData,
  ): Promise<string> {
    const user = requireUser();

    try {
      const assignment = {
        managerUid: user.uid,
        rangerUid: data.rangerUid,
        routeName: data.routeName,
        points: data.points,
        approximateDistanceKm: data.approximateDistanceKm,
        patrolDate: data.patrolDate,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        incidentId: data.incidentId || null,
        status: 'assigned',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const document = await addDoc(
        collection(db, 'patrol_assignments'),
        assignment,
      );

      if (data.incidentId) {
        await IncidentService.linkIncidentToPatrol(data.incidentId, document.id);
      }

      return document.id;
    } catch (error: unknown) {
      console.error('Assignment Error:', error);

      const firebaseError = error as {
        code?: string;
        message?: string;
      };

      if (firebaseError.code === 'permission-denied') {
        throw new Error(
          "Firestore failure: You don't have permission to write patrol assignments.",
        );
      }

      throw new Error(
        firebaseError.message ||
          'Network failure or unexpected error occurred.',
      );
    }
  }

  // Loads assignments belonging to the logged-in ranger.
  static async getMyAssignments(): Promise<PatrolAssignment[]> {
    const user = requireUser();

    const assignmentQuery = query(
      collection(db, 'patrol_assignments'),
      where('rangerUid', '==', user.uid),
    );

    const snapshot = await getDocs(assignmentQuery);

    const assignments = snapshot.docs.map(
      (assignmentDoc) =>
        ({
          ...assignmentDoc.data(),
          id: assignmentDoc.id,
        }) as PatrolAssignment,
    );

    return assignments.sort((a, b) =>
      a.patrolDate.localeCompare(b.patrolDate),
    );
  }

  // Loads one assignment and checks ranger ownership.
  static async getMyAssignment(
    assignmentId: string,
  ): Promise<PatrolAssignment> {
    const user = requireUser();
    const id = requireAssignmentId(assignmentId);

    const snapshot = await getDoc(
      doc(db, 'patrol_assignments', id),
    );

    if (!snapshot.exists()) {
      throw new Error('This assignment could not be found.');
    }

    const data = snapshot.data();

    if (data.rangerUid !== user.uid) {
      throw new Error(
        'This patrol is not assigned to your account.',
      );
    }

    return {
      ...data,
      id: snapshot.id,
    } as PatrolAssignment;
  }

  // Starts an assigned patrol.
  // Repeated requests do not overwrite the original start time.
  static async startPatrol(
    assignmentId: string,
  ): Promise<void> {
    const user = requireUser();
    const id = requireAssignmentId(assignmentId);
    const assignmentRef = doc(db, 'patrol_assignments', id);

    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(assignmentRef);

        if (!snapshot.exists()) {
          throw new Error('This assignment could not be found.');
        }

        const assignment = snapshot.data();

        if (assignment.rangerUid !== user.uid) {
          throw new Error(
            'This patrol is not assigned to your account.',
          );
        }

        if (assignment.status === 'in_progress') {
          return;
        }

        if (assignment.status !== 'assigned') {
          throw new Error(
            'Only an assigned patrol can be started.',
          );
        }

        transaction.update(assignmentRef, {
          status: 'in_progress',
          startedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error: unknown) {
      throw patrolUpdateError(error);
    }
  }

  // Completes a patrol that has already been started.
  // Repeated requests preserve the original completion time.
  static async completePatrol(
    assignmentId: string,
  ): Promise<void> {
    const user = requireUser();
    const id = requireAssignmentId(assignmentId);
    const assignmentRef = doc(db, 'patrol_assignments', id);

    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(assignmentRef);

        if (!snapshot.exists()) {
          throw new Error('This assignment could not be found.');
        }

        const assignment = snapshot.data();

        if (assignment.rangerUid !== user.uid) {
          throw new Error(
            'This patrol is not assigned to your account.',
          );
        }

        if (assignment.status === 'completed') {
          return;
        }

        if (assignment.status !== 'in_progress') {
          throw new Error(
            'Start this patrol before completing it.',
          );
        }

        transaction.update(assignmentRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      // Synchronize linked incident status to RESOLVED
      await IncidentService.resolveIncidentIfLinked(id);
    } catch (error: unknown) {
      throw patrolUpdateError(error);
    }
  }
}