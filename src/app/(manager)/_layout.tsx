import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.header },
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E3F2FD' },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Logout</Text>
          </TouchableOpacity>
        )
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="assign"
        options={{ title: 'Assign', tabBarIcon: ({ color, size }) => <Ionicons name="person-add-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="monitor"
        options={{ title: 'Monitor', tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Reports', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
