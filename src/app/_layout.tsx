import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() { 
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(ranger)" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(researcher)" />
      </Stack>
    </ThemeProvider>
  );
}
