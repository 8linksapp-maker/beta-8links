/**
 * Backblaze B2 API integration for Club replays
 * Docs: https://backblaze.com/docs/cloud-storage-download-files-with-the-native-api
 */

const B2_KEY_ID = process.env.B2_KEY_ID || '';
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || '';
const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || '';
const B2_PUBLIC_URL_BASE = process.env.B2_PUBLIC_URL_BASE || '';
const B2_REGION = process.env.B2_REGION || '';

/**
 * Get public URL for a file in B2
 * Format: https://f005.backblazeb2.com/file/seoflix/fileName
 */
export function getVideoUrl(fileName: string): string {
  if (!B2_PUBLIC_URL_BASE || !B2_BUCKET_NAME) {
    return '';
  }

  const cleanFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  return `${B2_PUBLIC_URL_BASE}/${B2_BUCKET_NAME}/${cleanFileName}`;
}

/**
 * Get authorized download URL with token (for private buckets)
 * Token expires after 1 hour by default
 */
export async function getAuthorizedVideoUrl(fileName: string, expiresInMs: number = 3600000): Promise<string> {
  if (!B2_KEY_ID || !B2_APPLICATION_KEY) {
    return getVideoUrl(fileName);
  }

  try {
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64')}`,
      },
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authorize with Backblaze');
    }

    const authData = await authResponse.json();
    const downloadUrl = authData.downloadUrl;
    const authorizationToken = authData.authorizationToken;

    const authDownloadResponse = await fetch('https://api.backblazeb2.com/b2api/v4/b2_get_download_authorization', {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketName: B2_BUCKET_NAME,
        fileNamePrefix: fileName,
        b2CacheControl: 'public',
        b2Expires: Math.floor(Date.now() / 1000) + Math.floor(expiresInMs / 1000),
      }),
    });

    if (!authDownloadResponse.ok) {
      throw new Error('Failed to get download authorization');
    }

    const authDownloadData = await authDownloadResponse.json();
    const fileAuthorizationToken = authDownloadData.authorizationToken;

    return `${downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}?b2Authorization=${fileAuthorizationToken}`;
  } catch (error) {
    console.error('[Backblaze] Error getting authorized URL:', error);
    return getVideoUrl(fileName);
  }
}
