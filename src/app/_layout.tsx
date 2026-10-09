import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

function AppContent() {
  const { isDarkMode } = useTheme();
  
  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(ranger)" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(researcher)" />
      </Stack>
    </>
  );
}

export default function RootLayout() { 
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
