import { api } from './apiService';
import { getTemplateById } from '../constants/checklists';

const get = async (fileId) => {
  try {
    return await api('GET', `/checklists/${fileId}`) || null;
  } catch { return null; }
};

const save = async (fileId, state) => {
  return await api('PUT', `/checklists/${fileId}`, {
    templateIds: state.templateIds || [],
    customItems: state.customItems || [],
    progress: state.progress || {},
    completedAt: state.completedAt || null,
  });
};

export const getFileChecklist = get;

export const assignTemplates = async (fileId, templateIds) => {
  const existing = await get(fileId) || { customItems: [], progress: {}, completedAt: null };

  const newProgress = { ...existing.progress };
  for (const id of templateIds) {
    const template = getTemplateById(id);
    if (!template) continue;
    for (const item of template.items) {
      if (!newProgress[item.id]) {
        newProgress[item.id] = { checked: false, captureIds: [], templateId: id };
      }
    }
  }

  const allTemplateItemIds = new Set();
  for (const id of templateIds) {
    const t = getTemplateById(id);
    if (t) t.items.forEach((i) => allTemplateItemIds.add(i.id));
  }
  const customIds = new Set((existing.customItems || []).map((i) => i.id));
  for (const itemId of Object.keys(newProgress)) {
    if (!allTemplateItemIds.has(itemId) && !customIds.has(itemId)) {
      delete newProgress[itemId];
    }
  }

  const next = { ...existing, templateIds, progress: newProgress };
  return await save(fileId, next);
};

export const toggleItem = async (fileId, itemId) => {
  const cl = await get(fileId);
  if (!cl?.progress[itemId]) return null;
  cl.progress[itemId] = { ...cl.progress[itemId], checked: !cl.progress[itemId].checked };
  if (!cl.progress[itemId].checked) cl.completedAt = null;
  return await save(fileId, cl);
};

export const updateItemNote = async (fileId, itemId, note) => {
  const cl = await get(fileId);
  if (!cl?.progress[itemId]) return null;
  cl.progress[itemId] = { ...cl.progress[itemId], note };
  return await save(fileId, cl);
};

export const linkCaptureToItem = async (fileId, itemId, captureId) => {
  const cl = await get(fileId);
  if (!cl?.progress[itemId]) return;
  const ids = cl.progress[itemId].captureIds || [];
  if (!ids.includes(captureId)) {
    cl.progress[itemId].captureIds = [...ids, captureId];
  }
  return await save(fileId, cl);
};

export const unlinkCaptureFromItem = async (fileId, itemId, captureId) => {
  const cl = await get(fileId);
  if (!cl?.progress[itemId]) return;
  cl.progress[itemId].captureIds =
    (cl.progress[itemId].captureIds || []).filter((id) => id !== captureId);
  return await save(fileId, cl);
};

export const addCustomItem = async (fileId, label, tabId = 'custom') => {
  const cl = await get(fileId);
  if (!cl) return null;
  const id = `custom_${Date.now()}`;
  cl.customItems = [...(cl.customItems || []), { id, label, tabId }];
  cl.progress[id] = { checked: false, captureIds: [], templateId: tabId };
  return await save(fileId, cl);
};

export const removeCustomItem = async (fileId, itemId) => {
  const cl = await get(fileId);
  if (!cl) return null;
  cl.customItems = (cl.customItems || []).filter((i) => i.id !== itemId);
  delete cl.progress[itemId];
  return await save(fileId, cl);
};

export const markComplete = async (fileId) => {
  const cl = await get(fileId);
  if (!cl) return;
  cl.completedAt = new Date().toISOString();
  return await save(fileId, cl);
};

export const resetChecklist = async (fileId) => {
  const cl = await get(fileId);
  if (!cl) return;
  for (const itemId of Object.keys(cl.progress)) {
    cl.progress[itemId] = { ...cl.progress[itemId], checked: false };
  }
  cl.completedAt = null;
  return await save(fileId, cl);
};

export const getChecklistSummary = async (fileId) => {
  const cl = await get(fileId);
  if (!cl) return null;
  const items = Object.values(cl.progress);
  return { checked: items.filter((i) => i.checked).length, total: items.length };
};
