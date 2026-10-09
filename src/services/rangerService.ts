import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, getDocs, updateDoc } from 'firebase/firestore';

export interface RangerLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isSOS: boolean;
  updatedAt: number;
}

const COLLECTION_NAME = 'rangers';

export const updateRangerLocation = async (id: string, name: string, lat: number, lng: number, isSOS: boolean) => {
  await setDoc(doc(db, COLLECTION_NAME, id), {
    name,
    lat,
    lng,
    isSOS,
    updatedAt: Date.now()
  }, { merge: true });
};

export const subscribeToRangers = (callback: (rangers: RangerLocation[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const rangers = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as RangerLocation[];
    callback(rangers);
  });
};

export const resolveRangerSOS = async (id: string) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    isSOS: false,
    updatedAt: Date.now()
  });
};
