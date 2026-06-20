import { api } from './apiService';

const toSlug = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const createFile = async (name, checklistTemplateIds = []) => {
  const timestamp = Date.now();
  const file = {
    id: `file_${timestamp}`,
    name: name.trim(),
    slug: toSlug(name),
    checklistTemplateIds,
    createdAt: new Date(timestamp).toISOString(),
  };
  return await api('POST', '/files', file);
};

export const getAllFiles = async () => {
  try {
    const result = await api('GET', '/files');
    return result || [];
  } catch { return []; }
};

export const updateFileChecklists = async (fileId, checklistTemplateIds) => {
  return await api('PUT', `/files/${fileId}`, { checklistTemplateIds });
};

export const incrementCaptureCount = async () => {
  // Auto-incremented server-side when capture is saved — no-op here
};

export const deleteFile = async (fileId) => {
  return await api('DELETE', `/files/${fileId}`);
};

export const getTrashFiles = async () => {
  try {
    const result = await api('GET', '/files/trash');
    return result || [];
  } catch { return []; }
};

export const restoreFile = async (fileId) => {
  return await api('POST', `/files/${fileId}/restore`);
};

export const permanentDeleteFile = async (fileId) => {
  return await api('DELETE', `/files/${fileId}/permanent`);
};
