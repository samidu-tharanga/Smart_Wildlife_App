import AsyncStorage from '@react-native-async-storage/async-storage';
import { IncidentSubmissionData } from './incidentService';
import { convertUriToBase64 } from './storageUtils';

const OFFLINE_INCIDENTS_KEY = '@offline_incidents';

export interface OfflineIncident extends IncidentSubmissionData {
  id: string;
  createdAt: number;
  synchronizationStatus: 'PENDING_SYNC';
  rangerId: string;
}

export class OfflineStorageService {
  /**
   * Store an incident locally for later synchronization
   */
  static async saveIncidentOffline(data: IncidentSubmissionData, rangerId: string): Promise<string> {
    try {
      const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let photoUri = data.photoUri;
      if (photoUri) {
        photoUri = await convertUriToBase64(photoUri);
      }
      const newIncident: OfflineIncident = {
        ...data,
        photoUri,
        id,
        createdAt: Date.now(),
        synchronizationStatus: 'PENDING_SYNC',
        rangerId,
      };

      const existingData = await AsyncStorage.getItem(OFFLINE_INCIDENTS_KEY);
      const incidents: OfflineIncident[] = existingData ? JSON.parse(existingData) : [];

      incidents.push(newIncident);
      await AsyncStorage.setItem(OFFLINE_INCIDENTS_KEY, JSON.stringify(incidents));

      return id;
    } catch (error) {
      console.error('Failed to save incident offline', error);
      throw new Error('Could not save the incident offline.');
    }
  }

  /**
   * Retrieve all offline incidents
   */
  static async getOfflineIncidents(): Promise<OfflineIncident[]> {
    try {
      const existingData = await AsyncStorage.getItem(OFFLINE_INCIDENTS_KEY);
      return existingData ? JSON.parse(existingData) : [];
    } catch (error) {
      console.error('Failed to get offline incidents', error);
      return [];
    }
  }

  /**
   * Remove an incident after successful synchronization
   */
  static async removeOfflineIncident(id: string): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(OFFLINE_INCIDENTS_KEY);
      if (!existingData) return;

      const incidents: OfflineIncident[] = JSON.parse(existingData);
      const updatedIncidents = incidents.filter((incident) => incident.id !== id);

      await AsyncStorage.setItem(OFFLINE_INCIDENTS_KEY, JSON.stringify(updatedIncidents));
    } catch (error) {
      console.error('Failed to remove offline incident', error);
    }
  }
}
