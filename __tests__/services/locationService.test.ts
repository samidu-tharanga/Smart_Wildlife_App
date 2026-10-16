import * as Location from 'expo-location';
import { LocationService } from '../../src/services/locationService';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
}));

describe('LocationService', () => {
  const mockLocationData = {
    coords: {
      latitude: 6.9271,
      longitude: 79.8612,
      accuracy: 12.5,
      altitude: 10,
      heading: 0,
      speed: 0,
      altitudeAccuracy: null,
    },
    timestamp: 1690000000000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermissionsAsync', () => {
    it('returns true when permission is granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const granted = await LocationService.requestPermissionsAsync();
      expect(granted).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false when permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const granted = await LocationService.requestPermissionsAsync();
      expect(granted).toBe(false);
    });
  });

  describe('getCurrentLocationAsync', () => {
    it('throws PERMISSION_DENIED when permission is not granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(LocationService.getCurrentLocationAsync()).rejects.toThrow('PERMISSION_DENIED');
      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('returns coordinates when GPS fetch succeeds', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocationData);

      const result = await LocationService.getCurrentLocationAsync();

      expect(result).toEqual({
        latitude: 6.9271,
        longitude: 79.8612,
        accuracy: 12.5,
      });
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.Balanced,
      });
    });

    it('falls back to last known position if active GPS fetch fails', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('GPS timeout'));
      (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue(mockLocationData);

      const result = await LocationService.getCurrentLocationAsync();

      expect(result).toEqual({
        latitude: 6.9271,
        longitude: 79.8612,
        accuracy: 12.5,
      });
      expect(Location.getLastKnownPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('returns dev fallback location or throws UNAVAILABLE when both methods fail', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('GPS timeout'));
      (Location.getLastKnownPositionAsync as jest.Mock).mockRejectedValue(new Error('No cached loc'));

      // In __DEV__ environment (standard in jest-expo), returns default mock coords
      // or throws UNAVAILABLE if __DEV__ is false
      if ((global as any).__DEV__) {
        const result = await LocationService.getCurrentLocationAsync();
        expect(result.latitude).toBe(6.9271);
        expect(result.longitude).toBe(79.8612);
      } else {
        await expect(LocationService.getCurrentLocationAsync()).rejects.toThrow('UNAVAILABLE');
      }
    });
  });
});
