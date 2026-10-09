import * as FileSystem from 'expo-file-system/legacy';
import { auth, storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Converts a local file URI (file://... or content://...) to a Base64 Data URL.
 * Ensures images can be displayed across all devices even if Firebase Storage is offline or unavailable.
 */
export async function convertUriToBase64(uri: string): Promise<string> {
  if (!uri) return '';
  if (uri.startsWith('data:image') || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    console.warn('Failed to convert image URI to Base64:', err);
    return uri;
  }
}

/**
 * Uploads a local image file URI (file://...) to Firebase Storage.
 * Uses Native FileSystem binary upload via Firebase REST API with SDK fallback,
 * and converts to Base64 Data URI if Firebase Storage is unavailable.
 */
export async function uploadImageToStorage(uri: string, path: string): Promise<string> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  
  let bucket = (process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'smart-wildlife-app.appspot.com')
    .trim()
    .replace(/^["']|["']$/g, '');

  let uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;

  try {
    let response = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    // Handle 404 Bucket domain mismatch (.firebasestorage.app vs .appspot.com)
    if (response.status === 404) {
      const altBucket = bucket.includes('.firebasestorage.app')
        ? bucket.replace('.firebasestorage.app', '.appspot.com')
        : bucket.includes('.appspot.com')
          ? bucket.replace('.appspot.com', '.firebasestorage.app')
          : `${bucket}.appspot.com`;

      console.log(`404 on ${bucket}, trying alternative bucket domain: ${altBucket}`);
      const altUploadUrl = `https://firebasestorage.googleapis.com/v0/b/${altBucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;
      
      response = await FileSystem.uploadAsync(altUploadUrl, uri, {
        httpMethod: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/jpeg',
        },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (response.status === 200) {
        bucket = altBucket;
      }
    }

    if (response.status === 200) {
      const responseData = JSON.parse(response.body);
      const downloadTokens = responseData.downloadTokens || (responseData.metadata && responseData.metadata.downloadTokens) || '';
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media${downloadTokens ? `&token=${downloadTokens}` : ''}`;
      return downloadUrl;
    }

    console.warn(`Native upload failed with status ${response.status}: ${response.body}, trying SDK fallback...`);
  } catch (nativeError: any) {
    console.warn('Native FileSystem upload error, trying SDK fallback...', nativeError);
  }

  // SDK Fallback using fetch to convert local URI to Blob
  try {
    const fetchResponse = await fetch(uri);
    const blob = await fetchResponse.blob();

    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          () => resolve()
        );
      });

      return await getDownloadURL(storageRef);
    } finally {
      if (blob && typeof (blob as any).close === 'function') {
        (blob as any).close();
      }
    }
  } catch (sdkError: any) {
    console.warn('Firebase Storage SDK upload failed, falling back to Base64 image data:', sdkError.message);
    return await convertUriToBase64(uri);
  }
}
