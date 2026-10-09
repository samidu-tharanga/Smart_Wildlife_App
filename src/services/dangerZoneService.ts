import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DangerZone {
  id: string;
  name: string;
  points: LatLng[];
  createdAt: number;
}

const COLLECTION_NAME = 'danger_zones';

export const fetchDangerZones = async (): Promise<DangerZone[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<DangerZone, 'id'>)
    }));
  } catch (error) {
    console.error('Error fetching danger zones:', error);
    return [];
  }
};

export const subscribeToDangerZones = (callback: (zones: DangerZone[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const zones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<DangerZone, 'id'>)
    }));
    callback(zones);
  });
};

export const addDangerZone = async (name: string, points: LatLng[]): Promise<void> => {
  await addDoc(collection(db, COLLECTION_NAME), {
    name,
    points,
    createdAt: Date.now()
  });
};

export const deleteDangerZone = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};
