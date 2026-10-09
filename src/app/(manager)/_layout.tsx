import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { isDarkMode, theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#0B132B' : '#FFFFFF',
          borderTopColor: isDarkMode ? '#1C2541' : '#E3F2FD',
        },
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
      <Tabs.Screen
        name="manage"
        options={{ title: 'Manage', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }}
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
    </Tabs>
  );
}


