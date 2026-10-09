import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

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
        headerShown: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border || '#E3F2FD' },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.textPrimary,
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <Text style={{ color: 'red', fontWeight: 'bold' }}>Logout</Text>
          </TouchableOpacity>
        )
      }}
    >
      <Tabs.Screen
        name="reports"
        options={{ 
          title: 'Reports', 
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> 
        }}
      />
    </Tabs>
  );
}
