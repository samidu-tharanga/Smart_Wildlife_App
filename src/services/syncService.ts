import NetInfo from '@react-native-community/netinfo';
import { OfflineStorageService, OfflineIncident } from './offlineStorageService';
import { IncidentService } from './incidentService';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'PENDING_OFFLINE';

type SyncListener = (status: SyncStatus, pendingCount: number) => void;

export class SyncService {
  private static isSyncing = false;
  private static listeners: SyncListener[] = [];
  
  static subscribe(listener: SyncListener) {
    this.listeners.push(listener);
    this.notifyListeners();
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static async notifyListeners(status?: SyncStatus) {
    const incidents = await OfflineStorageService.getOfflineIncidents();
    let currentStatus = status;
    if (!currentStatus) {
       currentStatus = incidents.length > 0 ? 'PENDING_OFFLINE' : 'IDLE';
    }
    this.listeners.forEach(l => l(currentStatus as SyncStatus, incidents.length));
  }

  static init() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.syncPendingIncidents();
      }
    });
    // Check initial state
    this.notifyListeners();
  }

  static async syncPendingIncidents() {
    if (this.isSyncing) return;
    
    const incidents = await OfflineStorageService.getOfflineIncidents();
    if (incidents.length === 0) {
      this.notifyListeners('IDLE');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('SYNCING');

    let hasErrors = false;

    for (const incident of incidents) {
      try {
        await IncidentService.submitCloudIncident(incident, incident.id, incident.rangerId);
        // Only remove after successful submission
        await OfflineStorageService.removeOfflineIncident(incident.id);
      } catch (error) {
        console.error('Sync failed for incident:', incident.id, error);
        hasErrors = true;
        // The incident remains in local storage to be retried later
      }
    }

    this.isSyncing = false;
    
    if (hasErrors) {
      this.notifyListeners('ERROR');
      // If error, it might still have pending offline items
      setTimeout(() => this.notifyListeners(), 3000);
    } else {
      this.notifyListeners('SUCCESS');
      // After showing success briefly, revert to IDLE
      setTimeout(() => this.notifyListeners('IDLE'), 4000);
    }
  }
}
