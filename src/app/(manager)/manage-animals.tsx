import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Animal, subscribeToAnimals, addAnimal, deleteAnimal } from '../../services/animalService';
import { useTheme } from '../../context/ThemeContext';

const SPECIES_LIST = ['Elephant', 'Leopard', 'Sloth Bear', 'Wild Boar', 'Deer'];

// Yala rough bounds
const YALA_MIN_LAT = 6.3650;
const YALA_MAX_LAT = 6.3850;
const YALA_MIN_LNG = 81.5000;
const YALA_MAX_LNG = 81.5250;

export default function ManageAnimalsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [species, setSpecies] = useState('Elephant');
  const [animalName, setAnimalName] = useState('');
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAnimals((data) => {
      setAnimals(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);



  const handleAdd = async () => {
    if (!animalName || !deviceId) {
      Alert.alert('Error', 'Please enter both Animal Name and Device ID');
      return;
    }
    
    const randomLat = YALA_MIN_LAT + Math.random() * (YALA_MAX_LAT - YALA_MIN_LAT);
    const randomLng = YALA_MIN_LNG + Math.random() * (YALA_MAX_LNG - YALA_MIN_LNG);

    try {
      await addAnimal({
        name: animalName,
        species,
        deviceId,
        lat: randomLat,
        lng: randomLng
      });
      setAnimalName('');
      setDeviceId('');
      Alert.alert('Success', `${animalName} added inside Yala boundaries`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (id: string, animalName: string) => {
    Alert.alert('Remove Tracking', `Remove ${animalName} from tracking system?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteAnimal(id) }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>IoT Collars & Animals</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.formContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Register New Animal</Text>
        
        <Text style={{color: theme.textSecondary, marginBottom: 8, fontWeight: '600'}}>Select Species:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
          {SPECIES_LIST.map(sp => (
            <TouchableOpacity 
              key={sp} 
              style={[styles.speciesPill, species === sp ? {backgroundColor: theme.primary, borderColor: theme.primary} : {borderColor: theme.border}]}
              onPress={() => setSpecies(sp)}
            >
              <Text style={{color: species === sp ? '#fff' : theme.textPrimary, fontWeight: '600'}}>{sp}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

                <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="Animal Name / ID (e.g. ELE-001)"
          placeholderTextColor={theme.textSecondary}
          value={animalName}
          onChangeText={setAnimalName}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="GPS Collar Device ID (e.g. GPS-001)"
          placeholderTextColor={theme.textSecondary}
          value={deviceId}
          onChangeText={setDeviceId}
        />
        
        <Text style={{color: theme.textSecondary, fontSize: 12, marginBottom: 10}}>
          * Initial location will be auto-assigned inside Yala bounds.
        </Text>

        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={handleAdd}>
          <Text style={styles.addBtnText}>Register Collar</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.listContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 10 }]}>Tracked Animals</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <FlatList
            data={animals}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={{ color: theme.textSecondary }}>No animals registered yet.</Text>}
            renderItem={({ item }) => (
              <View style={[styles.animalRow, { borderColor: theme.border }]}>
                <View style={styles.animalIcon}>
                  <Ionicons name="paw" size={20} color={theme.primary} />
                </View>
                <View style={styles.animalInfo}>
                  <Text style={[styles.animalName, { color: theme.textPrimary }]}>{item.name}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.species} | {item.deviceId}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  formContainer: { padding: 15, borderBottomWidth: 1, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  speciesPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  addBtn: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  listContainer: { flex: 1, padding: 15, borderTopWidth: 1 },
  animalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  animalIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(21,101,192,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  animalInfo: { flex: 1 },
  animalName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  deleteBtn: { padding: 8 }
});
