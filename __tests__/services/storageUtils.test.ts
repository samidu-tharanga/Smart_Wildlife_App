import * as FileSystem from 'expo-file-system/legacy';
import { uploadImageToStorage, convertUriToBase64 } from '../../src/services/storageUtils';
import { auth, storage } from '../../src/services/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

jest.mock('../../src/services/firebase', () => ({
  auth: {
    currentUser: null,
  },
  storage: {},
}));

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  FileSystemUploadType: {
    BINARY_CONTENT: 1,
  },
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

describe('storageUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = {
      uid: 'ranger_user_123',
      getIdToken: jest.fn().mockResolvedValue('mock-token-xyz'),
    };
  });

  describe('convertUriToBase64', () => {
    it('returns empty string if uri is empty', async () => {
      const res = await convertUriToBase64('');
      expect(res).toBe('');
    });

    it('returns the same string if it already starts with data:image or http(s)', async () => {
      const dataUri = 'data:image/jpeg;base64,abc123';
      const httpUri = 'https://example.com/photo.jpg';

      expect(await convertUriToBase64(dataUri)).toBe(dataUri);
      expect(await convertUriToBase64(httpUri)).toBe(httpUri);
    });

    it('converts local file URI to Base64 data URL', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64encodedbytes');

      const result = await convertUriToBase64('file:///photo.jpg');
      expect(result).toBe('data:image/jpeg;base64,base64encodedbytes');
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///photo.jpg', {
        encoding: 'base64',
      });
    });

    it('falls back to returning original uri if reading fails', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('File unreadable'));

      const result = await convertUriToBase64('file:///photo.jpg');
      expect(result).toBe('file:///photo.jpg');
    });
  });

  describe('uploadImageToStorage', () => {
    it('uploads image via native FileSystem and formats download URL with token', async () => {
      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          downloadTokens: 'download-token-abc',
        }),
      });

      const url = await uploadImageToStorage('file:///photo.jpg', 'incidents/photo_1.jpg');

      expect(url).toContain('https://firebasestorage.googleapis.com/v0/b/');
      expect(url).toContain('token=download-token-abc');
      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
        expect.stringContaining('uploadType=media'),
        'file:///photo.jpg',
        expect.objectContaining({
          httpMethod: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-xyz',
            'Content-Type': 'image/jpeg',
          }),
        })
      );
    });

    it('retries with alternative bucket domain when 404 occurs and succeeds', async () => {
      // First call returns 404, second call (with alt domain) returns 200
      (FileSystem.uploadAsync as jest.Mock)
        .mockResolvedValueOnce({
          status: 404,
          body: 'Not found',
        })
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({
            downloadTokens: 'alt-token-123',
          }),
        });

      const url = await uploadImageToStorage('file:///photo.jpg', 'incidents/photo_alt.jpg');

      expect(FileSystem.uploadAsync).toHaveBeenCalledTimes(2);
      expect(url).toContain('token=alt-token-123');
    });

    it('falls back to SDK upload and then Base64 if bucket fails and fetch fails', async () => {
      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 404,
        body: 'Bucket Not Found',
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64bytesfallback');

      // Fetch will fail in node environment by default or reject
      const url = await uploadImageToStorage('file:///photo.jpg', 'incidents/missing.jpg');
      expect(url).toBe('data:image/jpeg;base64,base64bytesfallback');
    });

    it('handles unauthenticated state gracefully with empty token', async () => {
      (auth as any).currentUser = null;
      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          metadata: {
            downloadTokens: 'guest-token-123',
          },
        }),
      });

      const url = await uploadImageToStorage('file:///photo.jpg', 'incidents/guest.jpg');

      expect(url).toContain('token=guest-token-123');
      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
        expect.any(String),
        'file:///photo.jpg',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ',
          }),
        })
      );
    });

    it('falls back to SDK upload when native FileSystem upload encounters non-404 failure', async () => {
      (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
        status: 500,
        body: 'Internal Server Error',
      });

      const mockBlob = { close: jest.fn() };
      (global as any).fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          onComplete();
        }),
      };
      (ref as jest.Mock).mockReturnValue({});
      (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);
      (getDownloadURL as jest.Mock).mockResolvedValue('https://storage.sdk.url/image.jpg');

      const downloadUrl = await uploadImageToStorage('file:///photo.jpg', 'incidents/sdk_fallback.jpg');

      expect(downloadUrl).toBe('https://storage.sdk.url/image.jpg');
      expect(uploadBytesResumable).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
      expect(mockBlob.close).toHaveBeenCalled();
    });
  });
});
