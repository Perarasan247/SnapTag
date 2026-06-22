import { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, StatusBar, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CHECKLIST_TEMPLATES, getTemplateById } from '../constants/checklists';
import { getCapturesByFile, updateCaptureStatus } from '../services/storageService';
import { getFileChecklist, toggleItem, updateItemNote } from '../services/checklistService';
import { getAllFiles } from '../services/fileService';
import { uploadMedia, uploadMetadata, updateIndex } from '../services/s3Service';

const ACTIONS = [
  { id: 'photo',       icon: 'camera',           label: 'Photo',   color: '#2563EB' },
  { id: 'video',       icon: 'video',            label: 'Video',   color: '#7C3AED' },
  { id: 'text',        icon: 'text-box-outline', label: 'Text',    color: '#059669' },
  { id: 'measurement', icon: 'ruler',            label: 'Measure', color: '#D97706' },
];

const TYPE_META = {
  photo:       { icon: 'camera',             color: '#2563EB' },
  video:       { icon: 'video',              color: '#7C3AED' },
  text:        { icon: 'text-box-outline',   color: '#10B981' },
  measurement: { icon: 'ruler',              color: '#F59E0B' },
  checklist:   { icon: 'format-list-checks', color: '#6366F1' },
};

const TEMPLATE_COLORS = {
  retraining:     '#2563EB',
  electrical:     '#D97706',
  plumbing:       '#059669',
  structural:     '#EC4899',
  safety:         '#10B981',
  toilet_mapping: '#0891B2',
};

const TYPE_BADGE = {
  photo:       { label: 'PHOTO',  color: '#2563EB' },
  video:       { label: 'VIDEO',  color: '#7C3AED' },
  text:        { label: 'TEXT',   color: '#059669' },
  measurement: { label: 'MEAS',   color: '#D97706' },
  checklist:   { label: 'CHECK',  color: '#6366F1' },
};

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: theme.navBg,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerMeta: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  headerRight: { padding: 6 },

  scroll: { padding: 18, paddingBottom: 48 },

  sectionLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10,
  },

  // Action row — white cards with colored icon
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, borderRadius: theme.borderRadius.md, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', gap: 8,
    backgroundColor: theme.surface,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  actionIconWrap: {
    width: 38, height: 38, borderRadius: theme.borderRadius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: theme.textPrimary },

  // Checklists — left colored border
  checklistsBlock: { gap: 8 },
  checklistBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.border,
    borderLeftWidth: 4, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  checklistBlockBody: { flex: 1, gap: 2 },
  checklistBlockName: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  checklistBlockSub: { color: theme.textSecondary, fontSize: 12, marginBottom: 6 },
  progressTrack: {
    height: 4, backgroundColor: theme.border, borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  clMediaRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  clMediaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: theme.background, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  clMediaChipText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },

  // Bottom bulk bar
  bulkBar: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface,
  },
  bulkBtn: {
    flex: 1, height: 46, borderRadius: theme.borderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1, borderColor: theme.border,
  },
  bulkBtnS3: { backgroundColor: theme.accent, borderColor: theme.accent },
  bulkBtnText: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  bulkBtnTextS3: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Checklist dropdown items
  dropdownWrap: {
    backgroundColor: theme.surface,
    borderLeftWidth: 4,
    borderColor: theme.border,
    borderTopWidth: 0,
    marginTop: -8,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    paddingTop: 4, paddingBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  dropdownItemBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  dropdownItemLabel: { flex: 1, color: theme.textPrimary, fontSize: 14 },
  dropdownItemLabelDone: { color: theme.textMuted, textDecorationLine: 'line-through' },
  dropdownItemActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  mediaCountBadge: {
    backgroundColor: theme.accentSubtle, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center',
  },
  mediaCountText: { color: theme.accent, fontSize: 11, fontWeight: '700' },
  dropdownNoteInput: {
    marginHorizontal: 14, marginBottom: 8, marginTop: 2,
    backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.sm, paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, color: theme.textPrimary,
  },

  // Entries
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.border,
    padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  entryIconWrap: {
    width: 36, height: 36, borderRadius: theme.borderRadius.full,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  entryBody: { flex: 1, minWidth: 0 },
  entryTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  entrySub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  entryBadge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  entryTime: { color: theme.textMuted, fontSize: 11 },
  entryChecklistLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: '#6366F1' + '18', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  entryChecklistLinkText: { color: '#6366F1', fontSize: 11, fontWeight: '600' },

  // Checklist picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: theme.border, padding: 20, gap: 4,
  },
  pickerTitle: {
    color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  pickerItemIcon: {
    width: 36, height: 36, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  pickerItemName: { flex: 1, fontSize: 15, fontWeight: '600' },
  pickerCancel: { paddingVertical: 16, alignItems: 'center' },
  pickerCancelText: { color: theme.textSecondary, fontSize: 15 },
});

export default function InspectionHubScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [file, setFile] = useState(route.params.file);
  const [captures, setCaptures] = useState([]);
  const [checklistProgress, setChecklistProgress] = useState(null);
  const [expandedTid, setExpandedTid] = useState(null);
  const [togglingItem, setTogglingItem] = useState(null);
  const [itemNotes, setItemNotes] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [route.params.file.id])
  );

  const loadData = async () => {
    const fileId = route.params.file.id;

    // Reload file from DB to get latest checklistTemplateIds
    const allFiles = await getAllFiles();
    const fresh = allFiles.find((f) => f.id === fileId);
    if (fresh) setFile(fresh);

    const caps = await getCapturesByFile(fileId);
    const sorted = [...caps].sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt));
    setCaptures(sorted);

    const cl = await getFileChecklist(fileId);
    setChecklistProgress(cl);
  };

  const handleAction = (actionId) => {
    if (actionId === 'photo' || actionId === 'video') {
      navigation.navigate('Camera', { file, mode: actionId });
    } else if (actionId === 'text') {
      navigation.navigate('TextNote', { file });
    } else if (actionId === 'measurement') {
      navigation.navigate('MeasurementEntry', { file });
    }
  };

  const handleToggleItem = async (itemId) => {
    if (togglingItem) return;
    setTogglingItem(itemId);
    const updated = await toggleItem(file.id, itemId);
    if (updated) setChecklistProgress(updated);
    setTogglingItem(null);
  };

  const handleSaveItemNote = async (itemId, note) => {
    const updated = await updateItemNote(file.id, itemId, note);
    if (updated) setChecklistProgress(updated);
  };

  const handleSaveToGallery = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not supported', 'Save to Gallery is only available on mobile.');
      return;
    }
    const mediaCaps = captures.filter((c) => (c.type === 'photo' || c.type === 'video') && c.localUri);
    if (mediaCaps.length === 0) { Alert.alert('Nothing to save', 'No photos or videos in this site.'); return; }
    setBulkSaving(true);
    try {
      const MediaLibrary = require('expo-media-library/legacy');
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status !== 'granted') { Alert.alert('Permission denied', 'Allow media access to save to gallery.'); setBulkSaving(false); return; }
      let saved = 0;
      for (const cap of mediaCaps) {
        try { await MediaLibrary.saveToLibraryAsync(cap.localUri); saved++; } catch {}
      }
      Alert.alert('Saved', `${saved} of ${mediaCaps.length} items saved to gallery.`);
    } catch (e) {
      if (e?.message?.includes('Expo Go')) {
        Alert.alert(
          'Expo Go Limitation',
          'Saving to gallery requires a development build. To test this feature, run:\n\nnpx expo run:android\n\nor share files individually from the Library screen.',
        );
      } else {
        console.error(e);
      }
    }
    setBulkSaving(false);
  };

  const handleSaveToS3 = async () => {
    const pending = captures.filter((c) => c.uploadStatus === 'local' || c.uploadStatus === 'failed');
    if (pending.length === 0) { Alert.alert('All synced', 'No pending uploads for this site.'); return; }
    setBulkSaving(true);
    let uploaded = 0;
    for (const cap of pending) {
      try {
        await updateCaptureStatus(cap.id, 'uploading');
        const isMedia = cap.type === 'photo' || cap.type === 'video';
        if (isMedia && cap.localUri && cap.s3DataKey) {
          // Binary upload for photos/videos
          await uploadMedia(cap.localUri, cap.s3DataKey);
        } else if (!isMedia && cap.s3DataKey) {
          // Text/measurement: upload content JSON as the data file
          const dataPayload = { id: cap.id, type: cap.type, tag: cap.tag, content: cap.content, unit: cap.unit, notes: cap.notes, capturedAt: cap.capturedAt };
          await uploadMetadata(dataPayload, cap.s3DataKey);
        }
        const finalMeta = { ...cap, uploadStatus: 'uploaded', uploadedAt: new Date().toISOString() };
        if (cap.s3MetadataKey) await uploadMetadata(finalMeta, cap.s3MetadataKey);
        await updateIndex(finalMeta);
        await updateCaptureStatus(cap.id, 'uploaded');
        uploaded++;
      } catch (e) {
        console.error('Upload failed for', cap.id, e);
        await updateCaptureStatus(cap.id, 'failed');
      }
    }
    // Upload checklist progress (remarks + checked state) per template
    if (checklistProgress) {
      const allTmpls = [
        ...assignedTemplateIds.map(resolveTemplate).filter(Boolean),
        ...(checklistProgress.customTemplates || []),
      ];
      for (const tmpl of allTmpls) {
        try {
          const prog = checklistProgress.progress || {};
          const payload = {
            templateId: tmpl.id,
            templateName: tmpl.name,
            siteSlug: file.slug,
            exportedAt: new Date().toISOString(),
            items: tmpl.items.map((item) => ({
              id: item.id,
              label: item.label,
              checked: prog[item.id]?.checked || false,
              remark: prog[item.id]?.note || '',
              linkedCaptureIds: prog[item.id]?.captureIds || [],
            })),
          };
          await uploadMetadata(payload, `data/${file.slug}/checklist/${tmpl.id}.json`);
        } catch (e) { console.error('Checklist upload failed for', tmpl.id, e); }
      }
    }

    Alert.alert('Upload complete', `${uploaded} of ${pending.length} entries uploaded to S3.`);
    loadData();
    setBulkSaving(false);
  };

  // Stats for action badge counts
  const countByType = (type) => captures.filter((c) => c.type === type).length;

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getCaptureSummary = (cap) => {
    if (cap.type === 'measurement') return `${cap.content} ${cap.unit}`;
    if (cap.type === 'text') return cap.notes || cap.content || '';
    return cap.notes || '';
  };

  // Returns { templateName, itemLabel } for each checklist item this capture is linked to
  const getLinkedChecklistItems = (captureId) => {
    if (!checklistProgress?.progress) return [];
    const linked = [];
    const allTids = [...assignedTemplateIds, ...(checklistProgress.customTemplates || []).map((t) => t.id)];
    for (const [itemId, p] of Object.entries(checklistProgress.progress)) {
      if (!(p.captureIds || []).includes(captureId)) continue;
      let templateName = '';
      let itemLabel = itemId;
      for (const tid of allTids) {
        const tmpl = resolveTemplate(tid);
        const found = tmpl?.items.find((i) => i.id === itemId);
        if (found) { templateName = tmpl.name; itemLabel = found.label; break; }
      }
      linked.push({ templateName, itemLabel });
    }
    return linked;
  };

  const assignedTemplateIds = file.checklistTemplateIds || [];
  const customTemplates = checklistProgress?.customTemplates || [];
  const customTemplateMap = Object.fromEntries(customTemplates.map((t) => [t.id, t]));

  const resolveTemplate = (tid) => {
    const predefined = getTemplateById(tid);
    if (predefined) return predefined;
    return customTemplateMap[tid] || null;
  };

  // Build entries from captures
  const expandedEntries = [];
  for (const cap of captures) {
    if (cap.type === 'checklist') {
      try {
        const data = JSON.parse(cap.content || '{}');
        const checkedItems = (data.items || []).filter((i) => i.checked);
        if (checkedItems.length > 0) {
          for (const item of checkedItems) {
            const method = item.note ? 'text note' : item.action ? 'action' : 'checked';
            expandedEntries.push({
              _key: `${cap.id}_${item.id}`,
              _type: 'checklist-item',
              _label: item.label,
              _templateName: data.template?.name || cap.tag,
              _method: method,
              _note: item.note || '',
              _time: cap.capturedAt,
              _cap: cap,
            });
          }
        } else {
          expandedEntries.push({ _key: cap.id, _type: 'capture', _cap: cap });
        }
      } catch {
        expandedEntries.push({ _key: cap.id, _type: 'capture', _cap: cap });
      }
    } else {
      expandedEntries.push({ _key: cap.id, _type: 'capture', _cap: cap });
    }
  }

  // Add checked inline checklist progress items as entries
  if (checklistProgress) {
    const allTemplates = [
      ...assignedTemplateIds.map(resolveTemplate).filter(Boolean),
      ...(checklistProgress.customTemplates || []),
    ];
    for (const tmpl of allTemplates) {
      const prog = checklistProgress.progress || {};
      for (const item of (tmpl.items || [])) {
        const p = prog[item.id];
        if (p?.checked || p?.note) {
          const alreadyIn = expandedEntries.some((e) => e._key === `cl_${item.id}`);
          if (!alreadyIn) {
            expandedEntries.push({
              _key: `cl_${item.id}`,
              _type: 'checklist-item',
              _label: item.label,
              _templateName: tmpl.name,
              _method: p.checked ? 'checked' : 'remarked',
              _note: p.note || '',
              _checked: p.checked || false,
              _linkedCount: (p.captureIds || []).length,
              _time: null,
            });
          }
        }
      }
    }
  }

  // Legacy checklist progress summary
  const clItems = checklistProgress ? Object.values(checklistProgress.progress || {}) : [];
  const clChecked = clItems.filter((i) => i.checked).length;
  const clTotal = clItems.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.navBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>{file.name}</Text>
          <Text style={styles.headerSub}>
            {captures.length > 0 ? `${captures.length} entr${captures.length !== 1 ? 'ies' : 'y'}` : 'No entries yet'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Library', { file })}>
            <MaterialCommunityIcons name="view-grid-outline" size={22} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerRight} onPress={() => navigation.navigate('Settings')}>
            <MaterialCommunityIcons name="cog-outline" size={22} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Add entry label */}
        <Text style={styles.sectionLabel}>Add entry</Text>

        {/* Action row */}
        <View style={styles.actionRow}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionBtn}
              onPress={() => handleAction(action.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.color + '18' }]}>
                <MaterialCommunityIcons name={action.icon} size={20} color={action.color} />
              </View>
              <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Assigned checklists block */}
        {assignedTemplateIds.length > 0 && (
          <View style={styles.checklistsBlock}>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Checklists</Text>
            {assignedTemplateIds.map((tid) => {
              const tmpl = resolveTemplate(tid);
              if (!tmpl) return null;
              const color = tmpl.color || TEMPLATE_COLORS[tid] || '#6366F1';
              const isOpen = expandedTid === tid;

              // Count checked items from checklistProgress
              const itemIds = tmpl.items.map((i) => i.id);
              const prog = checklistProgress?.progress || {};
              const checkedCount = itemIds.filter((id) => prog[id]?.checked).length;
              const total = tmpl.items.length;
              const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

              // Media counts for this checklist
              const linkedCaptureIds = new Set(itemIds.flatMap((id) => prog[id]?.captureIds || []));
              const linkedCaps = captures.filter((c) => linkedCaptureIds.has(c.id));
              const photoCount = linkedCaps.filter((c) => c.type === 'photo').length;
              const videoCount = linkedCaps.filter((c) => c.type === 'video').length;
              const remarkCount = itemIds.filter((id) => prog[id]?.note).length;

              return (
                <View key={tid} style={{ marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.checklistBlock,
                      { borderLeftColor: color, borderColor: theme.border },
                      isOpen && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
                    ]}
                    onPress={() => setExpandedTid(isOpen ? null : tid)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.checklistBlockBody}>
                      <Text style={styles.checklistBlockName}>{tmpl.name}</Text>
                      <Text style={styles.checklistBlockSub}>{checkedCount}/{total} items completed</Text>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
                      </View>
                      {(photoCount > 0 || videoCount > 0 || remarkCount > 0) && (
                        <View style={styles.clMediaRow}>
                          {photoCount > 0 && (
                            <View style={styles.clMediaChip}>
                              <MaterialCommunityIcons name="camera-outline" size={11} color={theme.textSecondary} />
                              <Text style={styles.clMediaChipText}>{photoCount}</Text>
                            </View>
                          )}
                          {videoCount > 0 && (
                            <View style={styles.clMediaChip}>
                              <MaterialCommunityIcons name="video-outline" size={11} color={theme.textSecondary} />
                              <Text style={styles.clMediaChipText}>{videoCount}</Text>
                            </View>
                          )}
                          {remarkCount > 0 && (
                            <View style={styles.clMediaChip}>
                              <MaterialCommunityIcons name="comment-text-outline" size={11} color={theme.textSecondary} />
                              <Text style={styles.clMediaChipText}>{remarkCount}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={[styles.dropdownWrap, { borderLeftColor: color }]}>
                      {tmpl.items.map((item, idx) => {
                        const checked = prog[item.id]?.checked || false;
                        const toggling = togglingItem === item.id;
                        const noteVal = itemNotes[item.id] ?? (prog[item.id]?.note || '');
                        const linkedCapIds = prog[item.id]?.captureIds || [];
                        const linkedCount = linkedCapIds.length;
                        return (
                          <View key={item.id}>
                            <View style={[styles.dropdownItem, idx > 0 && styles.dropdownItemBorder]}>
                              <TouchableOpacity
                                onPress={() => handleToggleItem(item.id)}
                                disabled={!!togglingItem}
                              >
                                {toggling
                                  ? <ActivityIndicator size="small" color={color} />
                                  : <MaterialCommunityIcons
                                      name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                      size={22}
                                      color={checked ? color : theme.textMuted}
                                    />
                                }
                              </TouchableOpacity>
                              <Text style={[
                                styles.dropdownItemLabel,
                                checked && styles.dropdownItemLabelDone,
                              ]}>
                                {item.label}
                              </Text>
                              <View style={styles.dropdownItemActions}>
                                {linkedCount > 0 && (
                                  <View style={styles.mediaCountBadge}>
                                    <Text style={styles.mediaCountText}>{linkedCount}</Text>
                                  </View>
                                )}
                                <TouchableOpacity
                                  onPress={() => navigation.navigate('Camera', { file, mode: 'photo', preLinkedItemId: item.id, preLinkedTemplateId: tmpl.id, preLinkedTemplateName: tmpl.name, preLinkedItemLabel: item.label })}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <MaterialCommunityIcons name="camera-outline" size={18} color={theme.accent} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => navigation.navigate('Camera', { file, mode: 'video', preLinkedItemId: item.id, preLinkedTemplateId: tmpl.id, preLinkedTemplateName: tmpl.name, preLinkedItemLabel: item.label })}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <MaterialCommunityIcons name="video-outline" size={18} color={theme.accent} />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <TextInput
                              style={styles.dropdownNoteInput}
                              value={noteVal}
                              onChangeText={(text) => setItemNotes((prev) => ({ ...prev, [item.id]: text }))}
                              onBlur={() => handleSaveItemNote(item.id, noteVal)}
                              placeholder="Add remarks…"
                              placeholderTextColor={theme.textMuted}
                              multiline
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Entries feed */}
        {expandedEntries.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Entries</Text>
            {expandedEntries.map((entry) => {
              if (entry._type === 'checklist-item') {
                const iconColor = entry._checked ? '#6366F1' : theme.warning;
                const iconName = entry._checked ? 'checkbox-marked-outline' : 'comment-text-outline';
                const subParts = [entry._templateName];
                if (entry._linkedCount > 0) subParts.push(`${entry._linkedCount} photo${entry._linkedCount > 1 ? 's' : ''}`);
                if (entry._note) subParts.push(entry._note);
                return (
                  <View key={entry._key} style={styles.entryRow}>
                    <View style={[styles.entryIconWrap, { backgroundColor: iconColor + '18' }]}>
                      <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
                    </View>
                    <View style={styles.entryBody}>
                      <Text style={styles.entryTitle} numberOfLines={1}>{entry._label}</Text>
                      <Text style={styles.entrySub} numberOfLines={2}>{subParts.join(' · ')}</Text>
                    </View>
                    <View style={styles.entryRight}>
                      <Text style={[styles.entryBadge, { color: '#6366F1' }]}>CHECK</Text>
                      {entry._time ? <Text style={styles.entryTime}>{formatTime(entry._time)}</Text> : null}
                    </View>
                  </View>
                );
              }
              const cap = entry._cap;
              const meta = TYPE_META[cap.type] || TYPE_META.photo;
              const badge = TYPE_BADGE[cap.type] || { label: cap.type.toUpperCase(), color: theme.textMuted };
              const summary = getCaptureSummary(cap);
              const linkedItems = getLinkedChecklistItems(cap.id);
              const subtitle = [cap.tag ? `#${cap.tag}` : null, summary].filter(Boolean).join(' · ');
              return (
                <TouchableOpacity
                  key={entry._key}
                  style={styles.entryRow}
                  onPress={() => navigation.navigate('Library', { file, highlightId: cap.id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.entryIconWrap, { backgroundColor: meta.color + '18' }]}>
                    <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={styles.entryBody}>
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      {cap.filename || cap.tag || cap.type}
                    </Text>
                    {subtitle ? <Text style={styles.entrySub} numberOfLines={1}>{subtitle}</Text> : null}
                    {linkedItems.map((link, i) => (
                      <View key={i} style={styles.entryChecklistLink}>
                        <MaterialCommunityIcons name="clipboard-check-outline" size={11} color='#6366F1' />
                        <Text style={styles.entryChecklistLinkText} numberOfLines={1}>
                          {link.templateName ? `${link.templateName} · ${link.itemLabel}` : link.itemLabel}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={[styles.entryBadge, { color: badge.color }]}>{badge.label}</Text>
                    <Text style={styles.entryTime}>{formatTime(cap.capturedAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

      </ScrollView>

      {/* Bulk action bar */}
      <View style={styles.bulkBar}>
        <TouchableOpacity style={styles.bulkBtn} onPress={handleSaveToS3} disabled={bulkSaving}>
          {bulkSaving
            ? <ActivityIndicator size="small" color={theme.textSecondary} />
            : <MaterialCommunityIcons name="cloud-upload-outline" size={16} color={theme.textPrimary} />
          }
          <Text style={styles.bulkBtnText}>Save to S3</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnS3]} onPress={handleSaveToGallery} disabled={bulkSaving}>
          {bulkSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <MaterialCommunityIcons name="image-multiple-outline" size={16} color="#fff" />
          }
          <Text style={styles.bulkBtnTextS3}>Save to Gallery</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
