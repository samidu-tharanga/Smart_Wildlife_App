import { IncidentService, IncidentSubmissionData } from '../../src/services/incidentService';
import { auth, db } from '../../src/services/firebase';
import { uploadImageToStorage, convertUriToBase64 } from '../../src/services/storageUtils';
import { OfflineStorageService } from '../../src/services/offlineStorageService';
import * as Network from 'expo-network';
import {
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

jest.mock('../../src/services/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
}));

jest.mock('../../src/services/offlineStorageService', () => ({
  OfflineStorageService: {
    saveIncidentOffline: jest.fn(),
  },
}));

jest.mock('../../src/services/storageUtils', () => ({
  uploadImageToStorage: jest.fn(),
  convertUriToBase64: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: Object.assign(
    function MockTimestamp(this: any, seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
      this.toMillis = () => seconds * 1000;
    },
    {
      fromMillis: jest.fn((ms) => ({ toMillis: () => ms })),
    }
  ),
}));

describe('IncidentService', () => {
  const mockUser = {
    uid: 'ranger_test_uid_456',
    email: 'ranger@wildlife.gov',
  };

  const sampleReportData: IncidentSubmissionData = {
    type: 'snare',
    description: 'Active wire snare discovered in Sector 4',
    photoUri: 'file:///data/user/0/cache/snare.jpg',
    latitude: 6.9271,
    longitude: 79.8612,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = mockUser;
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  describe('submitIncident', () => {
    it('throws authentication error when ranger is not logged in', async () => {
      (auth as any).currentUser = null;

      await expect(IncidentService.submitIncident(sampleReportData)).rejects.toThrow(
        'Authentication failure: You must be logged in to submit an incident.'
      );
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('saves incident offline when device has no network connection', async () => {
      (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({
        isConnected: false,
      });
      (OfflineStorageService.saveIncidentOffline as jest.Mock).mockResolvedValue('offline_local_id_999');

      const result = await IncidentService.submitIncident(sampleReportData);

      expect(result).toEqual({ id: 'offline_local_id_999', status: 'OFFLINE' });
      expect(OfflineStorageService.saveIncidentOffline).toHaveBeenCalledWith(
        sampleReportData,
        'ranger_test_uid_456'
      );
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('successfully uploads photo and saves incident document to Firestore when online', async () => {
      const mockStorageUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/incidents%2Fphoto.jpg?alt=media';
      (uploadImageToStorage as jest.Mock).mockResolvedValue(mockStorageUrl);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'incident_doc_789' });

      const result = await IncidentService.submitIncident(sampleReportData);

      expect(result).toEqual({ id: 'incident_doc_789', status: 'SYNCED' });
      expect(uploadImageToStorage).toHaveBeenCalledWith(
        sampleReportData.photoUri,
        expect.stringMatching(/^incidents\/ranger_test_uid_456_\d+\.jpg$/)
      );
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          rangerId: 'ranger_test_uid_456',
          incidentType: 'snare',
          description: 'Active wire snare discovered in Sector 4',
          latitude: 6.9271,
          longitude: 79.8612,
          photoUrl: mockStorageUrl,
          synchronizationStatus: 'SYNCED',
          status: 'SUBMITTED',
        })
      );
    });

    it('falls back to base64 conversion if Firebase Storage upload fails', async () => {
      (uploadImageToStorage as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
      (convertUriToBase64 as jest.Mock).mockResolvedValue('data:image/jpeg;base64,mockbase64');
      (addDoc as jest.Mock).mockResolvedValue({ id: 'incident_fallback_101' });

      const result = await IncidentService.submitIncident(sampleReportData);

      expect(result).toEqual({ id: 'incident_fallback_101', status: 'SYNCED' });
      expect(convertUriToBase64).toHaveBeenCalledWith(sampleReportData.photoUri);
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          photoUrl: 'data:image/jpeg;base64,mockbase64',
          status: 'SUBMITTED',
        })
      );
    });

    it('submits without uploading when photoUri is null', async () => {
      const reportWithoutPhoto = {
        ...sampleReportData,
        photoUri: null,
      };
      (addDoc as jest.Mock).mockResolvedValue({ id: 'incident_no_photo_202' });

      const result = await IncidentService.submitIncident(reportWithoutPhoto);

      expect(result).toEqual({ id: 'incident_no_photo_202', status: 'SYNCED' });
      expect(uploadImageToStorage).not.toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          photoUrl: null,
        })
      );
    });

    it('maps permission-denied Firestore error to friendly message', async () => {
      (uploadImageToStorage as jest.Mock).mockResolvedValue('https://storage.url/photo.jpg');
      const permError: any = new Error('Missing or insufficient permissions.');
      permError.code = 'permission-denied';
      (addDoc as jest.Mock).mockRejectedValue(permError);

      await expect(IncidentService.submitIncident(sampleReportData)).rejects.toThrow(
        "Firestore failure: You don't have permission to write incident records."
      );
    });

    it('re-throws existing friendly failure message directly', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Custom failure details occurred'));

      await expect(IncidentService.submitIncident(sampleReportData)).rejects.toThrow(
        'Custom failure details occurred'
      );
    });

    it('maps generic database or network errors properly', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Network connection timeout'));

      await expect(IncidentService.submitIncident(sampleReportData)).rejects.toThrow(
        'Network connection timeout'
      );
    });
  });

  describe('submitPublicIncident (Community Reporting)', () => {
    it('submits public incident successfully without requiring login', async () => {
      (auth as any).currentUser = null; // Unauthenticated
      (addDoc as jest.Mock).mockResolvedValue({ id: 'public_doc_555' });

      const docId = await IncidentService.submitPublicIncident({
        type: 'carcass',
        description: 'Dead wild boar near village border',
        photoUri: null,
        latitude: 6.9,
        longitude: 79.8,
        villagerName: 'Sunil Perera',
        villagerContact: '0771234567',
      });

      expect(docId).toBe('public_doc_555');
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          reporterType: 'COMMUNITY',
          villagerName: 'Sunil Perera',
          villagerContact: '0771234567',
          status: 'SUBMITTED',
          isEmergency: true,
        })
      );
    });

    it('submits public incident with photo and falls back to base64 if storage fails', async () => {
      (uploadImageToStorage as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
      (convertUriToBase64 as jest.Mock).mockResolvedValue('data:image/jpeg;base64,publicphoto');
      (addDoc as jest.Mock).mockResolvedValue({ id: 'public_doc_photo' });

      const docId = await IncidentService.submitPublicIncident({
        type: 'snare',
        description: 'Snare found by river',
        photoUri: 'file:///photo.jpg',
        latitude: 6.9,
        longitude: 79.8,
      });

      expect(docId).toBe('public_doc_photo');
      expect(convertUriToBase64).toHaveBeenCalledWith('file:///photo.jpg');
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          photoUrl: 'data:image/jpeg;base64,publicphoto',
          villagerName: 'Anonymous Villager',
        })
      );
    });

    it('maps permission-denied error for public incident submission', async () => {
      const permError: any = new Error('Missing permission');
      permError.code = 'permission-denied';
      (addDoc as jest.Mock).mockRejectedValue(permError);

      await expect(
        IncidentService.submitPublicIncident({
          type: 'snare',
          description: 'Snare spotted',
          photoUri: null,
          latitude: 6.9,
          longitude: 79.8,
        })
      ).rejects.toThrow('Permission denied to submit report. Please check database permissions.');
    });

    it('handles unexpected failure during public incident submission', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        IncidentService.submitPublicIncident({
          type: 'snare',
          description: 'Snare spotted',
          photoUri: null,
          latitude: 6.9,
          longitude: 79.8,
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('submitCloudIncident (Offline Sync)', () => {
    it('uses setDoc with incidentId to prevent duplicate records during sync', async () => {
      (uploadImageToStorage as jest.Mock).mockResolvedValue('https://storage.url/cloud.jpg');
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await IncidentService.submitCloudIncident(
        sampleReportData,
        'incident_offline_123',
        'ranger_test_uid_456'
      );

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          rangerId: 'ranger_test_uid_456',
          status: 'SUBMITTED',
          synchronizationStatus: 'SYNCED',
        })
      );
    });

    it('throws error when submitCloudIncident fails', async () => {
      (uploadImageToStorage as jest.Mock).mockResolvedValue('https://storage.url/cloud.jpg');
      (setDoc as jest.Mock).mockRejectedValue(new Error('Cloud sync write failed'));

      await expect(
        IncidentService.submitCloudIncident(
          sampleReportData,
          'incident_offline_123',
          'ranger_test_uid_456'
        )
      ).rejects.toThrow('Cloud sync write failed');
    });
  });

  describe('Manager Incident Actions', () => {
    it('throws authentication error for manager actions if user is logged out', async () => {
      (auth as any).currentUser = null;

      await expect(IncidentService.startProcessingIncident('inc_1')).rejects.toThrow('Authentication required.');
      await expect(IncidentService.closeIncident('inc_1', 'Reason')).rejects.toThrow('Authentication required.');
      await expect(IncidentService.linkIncidentToPatrol('inc_1', 'patrol_1')).rejects.toThrow('Authentication required.');
      await expect(IncidentService.resolveIncidentIfLinked('patrol_1')).rejects.toThrow('Authentication required.');
    });

    it('starts processing incident and records reviewer information', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await IncidentService.startProcessingIncident('inc_100');

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'PROCESSING',
          reviewedBy: 'ranger_test_uid_456',
        }),
        { merge: true }
      );
    });

    it('closes incident with closure reason', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await IncidentService.closeIncident('inc_100', 'False alarm confirmed');

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'CLOSED',
          closureReason: 'False alarm confirmed',
          closedBy: 'ranger_test_uid_456',
        }),
        { merge: true }
      );
    });

    it('links incident to assigned patrol', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await IncidentService.linkIncidentToPatrol('inc_100', 'patrol_assignment_42');

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'ASSIGNED',
          assignedPatrolId: 'patrol_assignment_42',
          assignedBy: 'ranger_test_uid_456',
        }),
        { merge: true }
      );
    });

    it('resolves incidents linked to a completed patrol', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [{ id: 'inc_linked_1' }],
      });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await IncidentService.resolveIncidentIfLinked('patrol_assignment_42', 'Wire snare removed');

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'RESOLVED',
          resolutionOutcome: 'Wire snare removed',
        }),
        { merge: true }
      );
    });
  });

  describe('Real-time Incident Subscriptions & Logging', () => {
    it('logs an incident alert via logIncident', async () => {
      const { logIncident } = require('../../src/services/incidentService');
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await logIncident({
        animalName: 'Elephant',
        species: 'Elephas maximus',
        incidentType: 'snare',
        zoneName: 'North Gate',
      });

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          animalName: 'Elephant',
          species: 'Elephas maximus',
        })
      );
    });

    it('subscribes to incident alerts via subscribeToIncidents', () => {
      const { subscribeToIncidents } = require('../../src/services/incidentService');
      const callback = jest.fn();
      let capturedSnapshotCallback: any;

      (onSnapshot as jest.Mock).mockImplementation((q, onNext) => {
        capturedSnapshotCallback = onNext;
        return jest.fn();
      });

      subscribeToIncidents(callback);

      capturedSnapshotCallback({
        docs: [
          {
            id: 'alert_1',
            data: () => ({
              incidentType: 'snare',
              animalName: 'Deer',
              zoneName: 'Sector 3',
              time: '10 mins ago',
            }),
          },
        ],
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'alert_1',
          species: 'snare',
          animalName: 'Deer',
          zoneName: 'Sector 3',
        }),
      ]);
    });

    it('subscribes to ranger incidents and orders newest first', () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();
      let capturedSnapshotCallback: any;
      let capturedErrorCallback: any;

      (onSnapshot as jest.Mock).mockImplementation((q, onNext, onError) => {
        capturedSnapshotCallback = onNext;
        capturedErrorCallback = onError;
        return jest.fn();
      });

      IncidentService.subscribeToRangerIncidents('ranger_test_uid_456', callback, errorCallback);

      expect(onSnapshot).toHaveBeenCalled();

      const { Timestamp } = require('firebase/firestore');

      // Trigger snapshot callback with mock documents
      capturedSnapshotCallback({
        docs: [
          {
            id: 'doc_old',
            data: () => ({
              incidentType: 'snare',
              description: 'Old snare',
              latitude: 6.9,
              longitude: 79.8,
              status: 'SUBMITTED',
              createdAt: Object.assign(new (Timestamp as any)(1, 0), { toMillis: () => 1000 }),
            }),
          },
          {
            id: 'doc_new',
            data: () => ({
              incidentType: 'campsite',
              description: 'New campsite',
              latitude: 7.0,
              longitude: 80.0,
              status: 'SUBMITTED',
              createdAt: Object.assign(new (Timestamp as any)(2, 0), { toMillis: () => 2000 }),
            }),
          },
        ],
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'doc_new', createdAt: 2000 }),
        expect.objectContaining({ id: 'doc_old', createdAt: 1000 }),
      ]);

      // Trigger error callback
      const testError = new Error('Snapshot listener failed');
      capturedErrorCallback(testError);
      expect(errorCallback).toHaveBeenCalledWith(testError);
    });

    it('subscribes to all incidents for manager and resolves ranger/villager display names', async () => {
      const callback = jest.fn();
      let capturedSnapshotCallback: any;

      (onSnapshot as jest.Mock).mockImplementation((q, onNext) => {
        capturedSnapshotCallback = onNext;
        return jest.fn();
      });

      // Mock user_roles query to resolve ranger display names
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: 'ranger_123',
            data: () => ({ displayName: 'Ranger Kamal' }),
          },
        ],
      });

      IncidentService.subscribeToAllIncidents(callback);

      const { Timestamp } = require('firebase/firestore');

      await capturedSnapshotCallback({
        docs: [
          {
            id: 'inc_r1',
            data: () => ({
              rangerId: 'ranger_123',
              incidentType: 'snare',
              description: 'Wire snare',
              createdAt: Object.assign(new (Timestamp as any)(10, 0), { toMillis: () => 10000 }),
            }),
          },
          {
            id: 'inc_v1',
            data: () => ({
              rangerId: null,
              reporterType: 'COMMUNITY',
              villagerName: 'Kamal Perera',
              incidentType: 'carcass',
              description: 'Dead boar',
              createdAt: 5000,
            }),
          },
        ],
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'inc_r1',
          rangerName: 'Ranger (Ranger Kamal)',
        }),
        expect.objectContaining({
          id: 'inc_v1',
          rangerName: 'Villager - Kamal Perera',
        }),
      ]);
    });
  });
});

