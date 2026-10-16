module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'src/services/incidentService.ts',
    'src/services/storageUtils.ts',
    'src/services/locationService.ts',
    'src/services/cameraService.ts',
    'src/utils/incidentValidation.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
