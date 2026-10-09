import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface Animal {
  id: string;
  name: string;
  species: string;
  deviceId: string;
  lat: number;
  lng: number;
}

export const fetchAnimals = async (): Promise<Animal[]> => {
  const snapshot = await getDocs(collection(db, 'animals'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Animal));
};

export const subscribeToAnimals = (callback: (animals: Animal[]) => void) => {
  return onSnapshot(collection(db, 'animals'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Animal)));
  });
};

export const addAnimal = async (animal: Omit<Animal, 'id'>) => {
  const newRef = doc(collection(db, 'animals'));
  await setDoc(newRef, animal);
};

export const deleteAnimal = async (id: string) => {
  await deleteDoc(doc(db, 'animals', id));
};
