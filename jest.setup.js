// Global setup for Jest tests
// Provide default env vars for tests
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'smart-wildlife-app.appspot.com';
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

