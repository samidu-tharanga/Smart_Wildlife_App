import { IncidentService, IncidentSubmissionData } from '../../src/services/incidentService';
import { auth, db } from '../../src/services/firebase';
import { uploadImageToStorage } from '../../src/services/storageUtils';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

jest.mock('../../src/services/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

jest.mock('../../src/services/storageUtils', () => ({
  uploadImageToStorage: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  query: jest.fn(),
  orderBy: jest.fn(),
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
  });

  describe('submitIncident', () => {
    it('throws authentication error when ranger is not logged in', async () => {
      (auth as any).currentUser = null;

      await expect(IncidentService.submitIncident(sampleReportData)).rejects.toThrow(
        'Authentication failure: You must be logged in to submit an incident.'
      );
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('successfully uploads photo and saves incident document to Firestore', async () => {
      const mockStorageUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/incidents%2Fphoto.jpg?alt=media';
      (uploadImageToStorage as jest.Mock).mockResolvedValue(mockStorageUrl);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'incident_doc_789' });

      const docId = await IncidentService.submitIncident(sampleReportData);

      expect(docId).toBe('incident_doc_789');
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

    it('falls back to local photoUri if Firebase Storage upload fails', async () => {
      (uploadImageToStorage as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
      (addDoc as jest.Mock).mockResolvedValue({ id: 'incident_fallback_101' });

      const docId = await IncidentService.submitIncident(sampleReportData);

      expect(docId).toBe('incident_fallback_101');
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          photoUrl: sampleReportData.photoUri, // Fallback to local URI
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

      const docId = await IncidentService.submitIncident(reportWithoutPhoto);

      expect(docId).toBe('incident_no_photo_202');
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
      (addDoc as jest.Mock).mockRejectedValue(new Error('Custom database failure details'));

      await expect(IncidentService.submitIncident(sampleReportData)).rejects.toThrow(
        'Custom database failure details'
      );
    });

    it('maps generic database or network errors properly', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Network connection timeout'));

      await expect(IncidentService.submitIncident(sampleReportData)).rejects.toThrow(
        'Network connection timeout'
      );
    });
  });

  describe('Manager Workflow - getIncidents', () => {
    it('retrieves all incident records ordered by createdAt desc', async () => {
      const mockDocs = [
        {
          id: 'incident_1',
          data: () => ({
            incidentType: 'snare',
            description: 'Trap near sector 1',
            latitude: 6.9,
            longitude: 79.8,
            photoUrl: 'https://url/1.jpg',
            status: 'SUBMITTED',
          }),
        },
        {
          id: 'incident_2',
          data: () => ({
            incidentType: 'carcass',
            description: 'Dead deer',
            latitude: 7.1,
            longitude: 80.2,
            photoUrl: null,
            status: 'UNDER_REVIEW',
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
      });

      const incidents = await IncidentService.getIncidents();

      expect(incidents).toHaveLength(2);
      expect(incidents[0].id).toBe('incident_1');
      expect(incidents[0].status).toBe('SUBMITTED');
      expect(incidents[1].id).toBe('incident_2');
      expect(incidents[1].status).toBe('UNDER_REVIEW');
    });

    it('handles query failure and throws friendly error message', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore read failed'));

      await expect(IncidentService.getIncidents()).rejects.toThrow(
        'Firestore read failed'
      );
    });
  });

  describe('Manager Workflow - updateIncidentStatus', () => {
    it('throws error when invalid incident ID is provided', async () => {
      await expect(IncidentService.updateIncidentStatus('', 'ACTION_TAKEN')).rejects.toThrow(
        'Invalid incident ID provided.'
      );
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('successfully updates status with manager action notes', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await IncidentService.updateIncidentStatus(
        'incident_doc_789',
        'ACTION_TAKEN',
        'Dispatched rapid patrol team to dismantle the wire snares.'
      );

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'ACTION_TAKEN',
          actionTakenNotes: 'Dispatched rapid patrol team to dismantle the wire snares.',
          actionTakenAt: expect.anything(),
        })
      );
    });

    it('successfully updates status without action notes if none provided', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await IncidentService.updateIncidentStatus('incident_doc_789', 'UNDER_REVIEW');

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'UNDER_REVIEW',
        })
      );
    });

    it('throws descriptive error when updateDoc fails', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Write permission denied'));

      await expect(
        IncidentService.updateIncidentStatus('incident_doc_789', 'RESOLVED', 'Completed')
      ).rejects.toThrow('Write permission denied');
    });
  });
});
