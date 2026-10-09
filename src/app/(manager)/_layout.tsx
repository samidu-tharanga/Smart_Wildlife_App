import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../services/firebase';

export default function TabLayout() {
  const { theme } = useTheme();

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
        name="manage"
        options={{ title: 'Manage', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Reports', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }}
      />
      {/* Hidden Screens (Not in Bottom Tab Bar) */}
      <Tabs.Screen
        name="danger-zones"
        options={{ href: null, title: 'Danger Zones' }}
      />
      <Tabs.Screen
        name="manage-animals"
        options={{ href: null, title: 'Manage Animals' }}
      />
      <Tabs.Screen
        name="all-alerts"
        options={{ href: null, title: 'All Alerts' }}
      />
    </Tabs>
  );
}
