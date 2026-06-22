import { api } from './apiService';

export const saveCapture = async (metadata) => {
  return await api('POST', '/captures', {
    id: metadata.id,
    fileId: metadata.fileId,
    filename: metadata.filename,
    type: metadata.type,
    tag: metadata.tag || '',
    notes: metadata.notes || '',
    content: metadata.content || '',
    unit: metadata.unit || '',
    gps: metadata.gps || null,
    s3DataKey: metadata.s3DataKey || null,
    s3MetadataKey: metadata.s3MetadataKey || null,
    fileSlug: metadata.fileSlug || null,
    fileName: metadata.fileName || null,
    uploadStatus: metadata.uploadStatus || 'local',
    localUri: (metadata.localUri && !metadata.localUri.startsWith('data:')) ? metadata.localUri : null,
    capturedAt: metadata.capturedAt,
    deviceId: metadata.deviceId || null,
  });
};

export const getCapturesByFile = async (fileId) => {
  try {
    const result = await api('GET', `/captures?file_id=${fileId}`);
    return result || [];
  } catch { return []; }
};

export const updateCaptureStatus = async (id, status) => {
  const body = { uploadStatus: status };
  if (status === 'uploaded') body.uploadedAt = new Date().toISOString();
  return await api('PUT', `/captures/${id}`, body);
};

export const updateCapture = async (id, changes) => {
  const body = {};
  if (changes.tag !== undefined) body.tag = changes.tag;
  if (changes.notes !== undefined) body.notes = changes.notes;
  if (changes.content !== undefined) body.content = changes.content;
  if (changes.unit !== undefined) body.unit = changes.unit;
  if (changes.uploadStatus !== undefined) body.uploadStatus = changes.uploadStatus;
  return await api('PUT', `/captures/${id}`, body);
};

export const deleteCapture = async (id) => {
  return await api('DELETE', `/captures/${id}`);
};

export const getPendingUploads = async () => {
  try {
    // No longer used on startup — server holds all state
    return [];
  } catch { return []; }
};
