import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';

export default function TabLayout() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTimeout(() => router.replace('/login'), 100);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <Tabs 
      screenOptions={{
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <Text style={{ color: 'red', fontWeight: 'bold' }}>Logout</Text>
          </TouchableOpacity>
        )
      }}
    />
  );
}
