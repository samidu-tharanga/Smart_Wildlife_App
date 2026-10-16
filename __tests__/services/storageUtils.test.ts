import * as FileSystem from 'expo-file-system/legacy';
import { uploadImageToStorage } from '../../src/services/storageUtils';
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
  FileSystemUploadType: {
    BINARY_CONTENT: 1,
  },
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

describe('storageUtils - uploadImageToStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = {
      uid: 'ranger_user_123',
      getIdToken: jest.fn().mockResolvedValue('mock-token-xyz'),
    };
  });

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

  it('throws a descriptive error when storage bucket is not found (404 on both attempts)', async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
      status: 404,
      body: 'Bucket Not Found',
    });

    await expect(
      uploadImageToStorage('file:///photo.jpg', 'incidents/missing.jpg')
    ).rejects.toThrow('Firebase Storage bucket not found (404)');
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

    // Mock XMLHttpRequest
    const mockBlob = { close: jest.fn() };
    const mockXHR = {
      open: jest.fn(),
      send: jest.fn(function (this: any) {
        this.response = mockBlob;
        this.onload();
      }),
      response: mockBlob,
      onload: jest.fn(),
      onerror: jest.fn(),
      responseType: '',
    };
    (global as any).XMLHttpRequest = jest.fn(() => mockXHR);

    // Mock Firebase Storage upload task
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
