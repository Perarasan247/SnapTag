import CryptoJS from 'crypto-js';

/**
 * Generates a presigned S3 upload URL locally using AWS Signature V4.
 * Used when AWS Access Keys are provided in the environment.
 * @param {string} key - S3 object key (e.g. "data/photo_123.jpg")
 * @returns {string} The local presigned URL.
 */
const generateLocalPresignedUrl = (key) => {
  const accessKeyId = process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.EXPO_PUBLIC_AWS_SESSION_TOKEN;
  const bucket = process.env.EXPO_PUBLIC_S3_BUCKET || 'alix-aiml';
  const region = process.env.EXPO_PUBLIC_S3_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Local signing requires EXPO_PUBLIC_AWS_ACCESS_KEY_ID and EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY.');
  }

  const expires = 900; // 15 minutes
  const now = new Date();
  
  // Format dates: amzDate (YYYYMMDDTHHMMSSZ), dateStamp (YYYYMMDD)
  const amzDate = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.substring(0, 8);

  const host = `${bucket}.s3.${region}.amazonaws.com`;
  
  // URL encode path segments
  const canonicalUri = '/' + key.split('/').map(encodeURIComponent).join('/');

  // Set up Query parameters
  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expires.toString(),
    'X-Amz-SignedHeaders': 'host'
  };

  if (sessionToken) {
    queryParams['X-Amz-Security-Token'] = sessionToken;
  }

  // Sort query parameters
  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  // Build canonical request
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const sha256 = (str) => CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);

  // Build String to Sign
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');

  // Derive signing key
  const kDate = CryptoJS.HmacSHA256(dateStamp, 'AWS4' + secretAccessKey);
  const kRegion = CryptoJS.HmacSHA256(region, kDate);
  const kService = CryptoJS.HmacSHA256('s3', kRegion);
  const kSigning = CryptoJS.HmacSHA256('aws4_request', kService);

  // Compute signature
  const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString(CryptoJS.enc.Hex);

  // Return final URL
  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
};

/**
 * Generates a presigned S3 upload URL locally.
 * @param {string} key - The target S3 key (e.g., "data/photo_123.jpg")
 * @returns {Promise<string>} The presigned URL.
 */
export const getPresignedUrl = async (key) => {
  try {
    return generateLocalPresignedUrl(key);
  } catch (error) {
    console.error('Error generating local presigned URL:', error);
    throw error;
  }
};

/**
 * Uploads a media file (photo/video) to S3 using a presigned URL.
 * Supports upload progress updates.
 * @param {string} localUri - Local filepath of the media file
 * @param {string} key - The S3 destination key
 * @param {function} onProgress - Callback for progress (0.0 to 1.0)
 * @returns {Promise<string>} Public S3 URL of the uploaded media
 */
export const uploadMedia = async (localUri, key, onProgress) => {
  try {
    const presignedUrl = await getPresignedUrl(key);
    const extension = key.split('.').pop().toLowerCase();
    const mimeType = extension === 'mp4' ? 'video/mp4' : 'image/jpeg';
    const bucket = process.env.EXPO_PUBLIC_S3_BUCKET || 'alix-aiml';
    const region = process.env.EXPO_PUBLIC_S3_REGION || 'us-east-1';

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', mimeType);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed. Status: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during S3 upload'));
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.min(0.99, e.loaded / e.total));
        };
      }
      // On web localUri is data:/blob:, on native it's file:// — XHR handles both
      if (typeof document !== 'undefined') {
        // Web: fetch the data/blob URL first, then send the blob
        fetch(localUri)
          .then((r) => r.blob())
          .then((blob) => xhr.send(blob))
          .catch(reject);
      } else {
        // Native: { uri, type, name } tells RN networking to stream the file directly
        xhr.send({ uri: localUri, type: mimeType, name: 'upload' });
      }
    });

    if (onProgress) onProgress(1.0);
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error(`Error uploading media for key ${key}:`, error);
    throw error;
  }
};

/**
 * Uploads metadata JSON object to S3 using a presigned URL.
 * @param {object} metadataObject - The metadata object
 * @param {string} key - The S3 destination key
 * @returns {Promise<string>} Public S3 URL of the uploaded metadata
 */
export const uploadMetadata = async (metadataObject, key) => {
  try {
    const presignedUrl = await getPresignedUrl(key);

    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadataObject),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload metadata to S3. Status: ${response.status}`);
    }

    const bucket = process.env.EXPO_PUBLIC_S3_BUCKET || 'alix-aiml';
    const region = process.env.EXPO_PUBLIC_S3_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error(`Error uploading metadata for key ${key}:`, error);
    throw error;
  }
};

/**
 * Fetches index.json from S3, appends the new entry, and re-uploads.
 * If index.json doesn't exist, initializes it as a new array.
 * @param {object} newEntry - The index entry to append
 * @returns {Promise<object[]>} The updated index array
 */
export const updateIndex = async (newEntry) => {
  try {
    const bucket = process.env.EXPO_PUBLIC_S3_BUCKET || 'alix-aiml';
    const region = process.env.EXPO_PUBLIC_S3_REGION || 'us-east-1';
    const indexKey = `${newEntry.fileSlug}/index.json`;
    
    // Fetch index.json from public URL
    const indexUrl = `https://${bucket}.s3.${region}.amazonaws.com/${indexKey}`;
    
    let currentIndex = [];
    try {
      const response = await fetch(indexUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        currentIndex = await response.json();
      } else {
        console.log(`Index file not found or inaccessible (status ${response.status}). Initializing new index.`);
      }
    } catch (e) {
      console.log('Error fetching index.json (might not exist yet). Initializing empty index:', e.message);
    }

    // Ensure it's an array
    if (!Array.isArray(currentIndex)) {
      currentIndex = [];
    }

    // Append entry, filtering duplicates by ID
    const existingIndex = currentIndex.findIndex(item => item.id === newEntry.id);
    const indexEntry = {
      id: newEntry.id,
      tag: newEntry.tag,
      filename: newEntry.filename,
      capturedAt: newEntry.capturedAt,
      uploadStatus: newEntry.uploadStatus
    };

    if (existingIndex >= 0) {
      currentIndex[existingIndex] = { ...currentIndex[existingIndex], ...indexEntry };
    } else {
      currentIndex.push(indexEntry);
    }

    // Upload updated index
    const presignedUrl = await getPresignedUrl(indexKey);
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentIndex),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload updated index.json. Status: ${uploadResponse.status}`);
    }

    return currentIndex;
  } catch (error) {
    console.error('Error updating index.json:', error);
    throw error;
  }
};
