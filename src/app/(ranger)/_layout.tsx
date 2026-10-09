import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { AppTheme } from '../../theme';

export default function TabLayout() {
  const { isDarkMode, theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: isDarkMode ? theme.header : AppTheme.colors.header },
        headerTintColor: isDarkMode ? '#F8FAFC' : AppTheme.colors.background,
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#0B132B' : AppTheme.colors.background,
          borderTopColor: isDarkMode ? '#1C2541' : '#E2E8F0',
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="patrol"
        options={{
          title: 'My Patrols',
          tabBarIcon: ({ color }) => (
            <Ionicons name="map" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Tracking',
          tabBarIcon: ({ color }) => <Ionicons name="paw" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="incident"
        options={{
          title: 'Report Incident',
          href: null, // Hides it from the tab bar but keeps it in the navigator
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: AppTheme.spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={AppTheme.colors.background} />
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Review Incident',
          href: null,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: AppTheme.spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={AppTheme.colors.background} />
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen
        name="my-incidents"
        options={{
          title: 'My Incidents',
          href: null,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: AppTheme.spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={AppTheme.colors.background} />
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen
        name="patrol-session"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="success"
        options={{
          title: 'Success',
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
