import { Stack } from 'expo-router';

export default function PatrolSessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0D47A1' },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen
        name="details"
        options={{ title: 'Patrol Details' }}
      />
    </Stack>
  );
}