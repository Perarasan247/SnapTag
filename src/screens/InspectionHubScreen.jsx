import { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CHECKLIST_TEMPLATES, getTemplateById } from '../constants/checklists';
import { getCapturesByFile } from '../services/storageService';
import { getFileChecklist } from '../services/checklistService';
import { getAllFiles } from '../services/fileService';

const ACTIONS = [
  { id: 'photo',       icon: 'camera',           label: 'Photo',       color: '#2563EB', bg: '#1E3A5F' },
  { id: 'video',       icon: 'video',            label: 'Video',       color: '#7C3AED', bg: '#2D1B5E' },
  { id: 'text',        icon: 'text-box-outline', label: 'Text',        color: '#10B981', bg: '#052E1C' },
  { id: 'measurement', icon: 'ruler',            label: 'Measure',     color: '#F59E0B', bg: '#2D1F00' },
];

const TYPE_META = {
  photo:       { icon: 'camera',             color: '#2563EB' },
  video:       { icon: 'video',              color: '#7C3AED' },
  text:        { icon: 'text-box-outline',   color: '#10B981' },
  measurement: { icon: 'ruler',              color: '#F59E0B' },
  checklist:   { icon: 'format-list-checks', color: '#6366F1' },
};

const TEMPLATE_COLORS = {
  retraining: { color: '#6366F1', bg: '#1E1B4B' },
  electrical:  { color: '#F59E0B', bg: '#2D1F00' },
  plumbing:    { color: '#06B6D4', bg: '#0A2030' },
  structural:  { color: '#EC4899', bg: '#2D0A1E' },
  safety:      { color: '#10B981', bg: '#052E1C' },
};

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border, gap: 8,
  },
  backBtn: { padding: 4 },
  headerMeta: { flex: 1 },
  headerTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  headerSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  libraryBtn: { padding: 8 },

  scroll: { padding: 20, paddingBottom: 48 },

  sectionLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  // Action row — compact horizontal strip
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, borderRadius: theme.borderRadius.md, padding: 10,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: theme.border,
  },
  actionIconWrap: {
    width: 36, height: 36, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  actionLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  actionCount: { fontSize: 11, fontWeight: '700', opacity: 0.7 },

  // Checklists block
  checklistsBlock: { gap: 8 },
  checklistBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, padding: 14,
  },
  checklistBlockIcon: {
    width: 40, height: 40, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checklistBlockBody: { flex: 1, gap: 4 },
  checklistBlockName: { fontSize: 14, fontWeight: '700' },
  checklistBlockSub: { color: theme.textSecondary, fontSize: 12 },
  progressTrack: {
    height: 3, backgroundColor: theme.card, borderRadius: 2,
    overflow: 'hidden', marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: 2 },

  // Entries feed
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.border, padding: 12, marginBottom: 6,
  },
  entryIconWrap: {
    width: 36, height: 36, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  entryBody: { flex: 1, minWidth: 0 },
  entryTag: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  entrySub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  entryType: {
    color: theme.textMuted, fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  entryTime: { color: theme.textMuted, fontSize: 11 },
  entryChecklistLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3,
  },
  entryChecklistLinkText: { color: theme.success, fontSize: 11 },

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
  const [showChecklistPicker, setShowChecklistPicker] = useState(false);

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
    } else if (actionId === 'checklist') {
      handleChecklistAction();
    }
  };

  const handleChecklistAction = () => {
    const templateIds = file.checklistTemplateIds || [];
    if (templateIds.length === 0) {
      // No templates assigned — go to SiteSetup to pick one
      navigation.navigate('SiteSetup', { file });
      return;
    }
    if (templateIds.length === 1) {
      const template = getTemplateById(templateIds[0]);
      if (template) navigation.navigate('ChecklistForm', { template, file });
      return;
    }
    // Multiple templates — show picker
    setShowChecklistPicker(true);
  };

  // Stats for action badge counts
  const countByType = (type) => captures.filter((c) => c.type === type).length;

  const formatTime = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getCaptureSummary = (cap) => {
    if (cap.type === 'measurement') return `${cap.content} ${cap.unit}`;
    if (cap.type === 'text') return cap.notes || cap.content || '';
    return cap.notes || '';
  };

  // Returns labels of checklist items this capture is linked to
  const getLinkedChecklistItems = (captureId) => {
    if (!checklistProgress?.progress) return [];
    const linked = [];
    for (const [itemId, prog] of Object.entries(checklistProgress.progress)) {
      if ((prog.captureIds || []).includes(captureId)) {
        // Find label from templates
        let label = itemId;
        for (const tid of (checklistProgress.templateIds || [])) {
          const tmpl = getTemplateById(tid);
          const found = tmpl?.items.find((i) => i.id === itemId);
          if (found) { label = found.label; break; }
        }
        const custom = (checklistProgress.customItems || []).find((i) => i.id === itemId);
        if (custom) label = custom.label;
        linked.push(label);
      }
    }
    return linked;
  };

  // Expand checklist captures into one row per checked item
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
              _time: cap.capturedAt,
              _cap: cap,
            });
          }
        } else {
          // No items checked — show the overall capture row
          expandedEntries.push({ _key: cap.id, _type: 'capture', _cap: cap });
        }
      } catch {
        expandedEntries.push({ _key: cap.id, _type: 'capture', _cap: cap });
      }
    } else {
      expandedEntries.push({ _key: cap.id, _type: 'capture', _cap: cap });
    }
  }

  // Legacy checklist progress summary
  const clItems = checklistProgress ? Object.values(checklistProgress.progress || {}) : [];
  const clChecked = clItems.filter((i) => i.checked).length;
  const clTotal = clItems.length;

  const assignedTemplateIds = file.checklistTemplateIds || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>{file.name}</Text>
          <Text style={styles.headerSub}>
            {captures.length > 0 ? `${captures.length} entr${captures.length !== 1 ? 'ies' : 'y'}` : 'No entries yet'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.libraryBtn}
          onPress={() => navigation.navigate('Library', { file })}
        >
          <MaterialCommunityIcons name="image-multiple-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Add entry label */}
        <Text style={styles.sectionLabel}>Add entry</Text>

        {/* Action row — compact */}
        <View style={styles.actionRow}>
          {ACTIONS.map((action) => {
            return (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionBtn, { backgroundColor: action.bg }]}
                onPress={() => handleAction(action.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.color + '33' }]}>
                  <MaterialCommunityIcons name={action.icon} size={20} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: action.color }]} numberOfLines={1}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Assigned checklists block */}
        {assignedTemplateIds.length > 0 && (
          <View style={styles.checklistsBlock}>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Checklists</Text>
            {assignedTemplateIds.map((tid) => {
              const tmpl = getTemplateById(tid);
              if (!tmpl) return null;
              const c = TEMPLATE_COLORS[tid] || { color: '#6366F1', bg: '#1E1B4B' };

              // Count submitted checklist captures for this template
              const submitted = captures.filter(
                (cap) => cap.type === 'checklist' && cap.unit === tid
              );
              const latest = submitted[0];
              let latestProgress = null;
              if (latest) {
                try { latestProgress = JSON.parse(latest.content || '{}').summary; } catch {}
              }

              // Legacy progress from checklistService
              const legacyChecked = clTotal > 0 ? clChecked : null;

              return (
                <TouchableOpacity
                  key={tid}
                  style={[styles.checklistBlock, { borderColor: c.color + '40' }]}
                  onPress={() => navigation.navigate('ChecklistForm', { template: tmpl, file })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checklistBlockIcon, { backgroundColor: c.bg }]}>
                    <MaterialCommunityIcons name={tmpl.icon} size={20} color={c.color} />
                  </View>
                  <View style={styles.checklistBlockBody}>
                    <Text style={[styles.checklistBlockName, { color: c.color }]}>{tmpl.name}</Text>
                    <Text style={styles.checklistBlockSub}>
                      {latestProgress
                        ? `Last: ${latestProgress.checked}/${latestProgress.total} items · ${latestProgress.pct}%`
                        : legacyChecked !== null
                          ? `${legacyChecked}/${clTotal} items done`
                          : `${tmpl.items.length} items · not started`}
                    </Text>
                    {latestProgress && (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${latestProgress.pct}%`, backgroundColor: c.color }]} />
                      </View>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Entries feed */}
        {expandedEntries.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
              {`Entries (${captures.length})`}
            </Text>
            {expandedEntries.map((entry) => {
              if (entry._type === 'checklist-item') {
                return (
                  <TouchableOpacity
                    key={entry._key}
                    style={styles.entryRow}
                    onPress={() => navigation.navigate('Library', { file, highlightId: entry._cap.id })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.entryIconWrap, { backgroundColor: '#6366F118' }]}>
                      <MaterialCommunityIcons name="check" size={18} color="#6366F1" />
                    </View>
                    <View style={styles.entryBody}>
                      <Text style={styles.entryTag} numberOfLines={1}>{entry._label}</Text>
                      <Text style={styles.entrySub} numberOfLines={1}>
                        {entry._templateName} · {entry._method}
                      </Text>
                    </View>
                    <View style={styles.entryRight}>
                      <Text style={styles.entryType}>checklist</Text>
                      <Text style={styles.entryTime}>{formatTime(entry._time)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              const cap = entry._cap;
              const meta = TYPE_META[cap.type] || TYPE_META.photo;
              const summary = getCaptureSummary(cap);
              const linkedItems = getLinkedChecklistItems(cap.id);
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
                    <Text style={styles.entryTag} numberOfLines={1}>
                      {cap.tag || cap.type}
                    </Text>
                    {summary ? <Text style={styles.entrySub} numberOfLines={1}>{summary}</Text> : null}
                    {linkedItems.map((label, i) => (
                      <View key={i} style={styles.entryChecklistLink}>
                        <MaterialCommunityIcons name="check-circle" size={11} color={theme.success} />
                        <Text style={styles.entryChecklistLinkText} numberOfLines={1}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={styles.entryType}>{cap.type}</Text>
                    <Text style={styles.entryTime}>{formatTime(cap.capturedAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

      </ScrollView>

      {/* Checklist template picker (when multiple assigned) */}
      <Modal
        visible={showChecklistPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChecklistPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Which checklist?</Text>
            {assignedTemplateIds.map((tid) => {
              const tmpl = getTemplateById(tid);
              if (!tmpl) return null;
              const c = TEMPLATE_COLORS[tid] || { color: '#6366F1', bg: '#1E1B4B' };
              return (
                <TouchableOpacity
                  key={tid}
                  style={styles.pickerItem}
                  onPress={() => {
                    setShowChecklistPicker(false);
                    navigation.navigate('ChecklistForm', { template: tmpl, file });
                  }}
                >
                  <View style={[styles.pickerItemIcon, { backgroundColor: c.bg }]}>
                    <MaterialCommunityIcons name={tmpl.icon} size={18} color={c.color} />
                  </View>
                  <Text style={[styles.pickerItemName, { color: c.color }]}>{tmpl.name}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowChecklistPicker(false)}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
