import * as ImagePicker from 'expo-image-picker';
import { CameraService } from '../../src/services/cameraService';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

describe('CameraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermissionsAsync', () => {
    it('returns true when camera permission is granted', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await CameraService.requestPermissionsAsync();
      expect(result).toBe(true);
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false when camera permission is denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await CameraService.requestPermissionsAsync();
      expect(result).toBe(false);
    });
  });

  describe('takePhotoAsync', () => {
    it('throws error when camera permission is denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(CameraService.takePhotoAsync()).rejects.toThrow(
        'Camera permission is required to take a photo.'
      );
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it('returns photo URI when user takes a photo successfully', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///data/user/0/cache/camera_photo.jpg' }],
      });

      const uri = await CameraService.takePhotoAsync();
      expect(uri).toBe('file:///data/user/0/cache/camera_photo.jpg');
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
    });

    it('returns null when user cancels camera without capturing', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: null,
      });

      const uri = await CameraService.takePhotoAsync();
      expect(uri).toBeNull();
    });

    it('throws friendly error when launchCameraAsync throws an exception', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockRejectedValue(new Error('Hardware fault'));

      await expect(CameraService.takePhotoAsync()).rejects.toThrow(
        'Failed to launch camera. Please try again.'
      );
    });
  });
});
