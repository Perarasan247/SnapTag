import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';
import { saveCapture } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';

const ACTION_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  headerSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },

  scroll: { padding: 16 },

  progressCard: {
    backgroundColor: '#1A1D27', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 14, marginBottom: 12, gap: 10,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: theme.textSecondary, fontSize: 13 },
  progressPct: { color: theme.accent, fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: theme.card, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.accent, borderRadius: 2 },

  fieldCard: {
    backgroundColor: '#1A1D27', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10, overflow: 'hidden',
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  checkLabel: { flex: 1, color: theme.textPrimary, fontSize: 15 },
  checkLabelDone: { textDecorationLine: 'line-through', color: theme.textSecondary },

  itemActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)',
  },
  actionBtnActive: { backgroundColor: 'rgba(37,99,235,0.1)' },
  actionBtnRemarksActive: { backgroundColor: 'rgba(245,158,11,0.1)' },
  actionBtnText: { color: theme.textSecondary, fontSize: 12 },
  actionBtnTextActive: { color: theme.accent },

  inlineNote: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: theme.textPrimary, minHeight: 70, textAlignVertical: 'top',
  },
  inlineRemarks: { borderTopColor: theme.warning + '33', color: theme.warning },

  priorityChips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  priorityChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.borderRadius.full,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface,
  },
  priorityChipActive: { borderColor: theme.warning, backgroundColor: theme.warningSubtle },
  priorityChipText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  priorityChipTextActive: { color: theme.warning },

  notePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(37,99,235,0.2)',
    backgroundColor: 'rgba(37,99,235,0.06)',
  },
  actionPill: {
    borderTopColor: theme.warning + '33',
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  notePillText: { flex: 1, color: theme.accent, fontSize: 12 },

  footer: {
    padding: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0F1117',
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.success, height: 50, borderRadius: theme.borderRadius.full,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default function ChecklistFormScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { template, file } = route.params;
  const { session } = useAuth();
  const scrollRef = useRef(null);

  // Auto-captured metadata (silent, no UI)
  const conductedOn = useRef(new Date());
  const locationRef = useRef('');

  const [items, setItems] = useState(
    template.items.map((item) => ({
      ...item,
      checked: false,
      note: '',
      action: '',
      actionPriority: 'Medium',
    }))
  );
  const [expandedNote, setExpandedNote] = useState(null);
  const [expandedRemarks, setExpandedRemarks] = useState(null);
  const [saving, setSaving] = useState(false);

  // Silently grab GPS on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        locationRef.current = `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
      } catch {}
    })();
  }, []);

  const toggleItem = (id) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));

  const setItemNote = (id, note) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, note } : i));

  const setItemRemarks = (id, action) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, action } : i));

  const setItemRemarksPriority = (id, priority) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, actionPriority: priority } : i));

  const checkedCount = items.filter((i) => i.checked).length;
  const pct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const timestamp = Date.now();
      const formData = {
        titlePage: {
          clientSite: file.name,
          conductedOn: conductedOn.current.toISOString(),
          inspectedBy: session?.name || session?.email || '',
          location: locationRef.current,
        },
        template: { id: template.id, name: template.name },
        items: items.map((i) => ({
          id: i.id,
          label: i.label,
          checked: i.checked,
          note: i.note,
          action: i.action,
          actionPriority: i.actionPriority,
        })),
        summary: { checked: checkedCount, total: items.length, pct },
        submittedAt: new Date(timestamp).toISOString(),
      };

      await saveCapture({
        id: `cl_${timestamp}`,
        fileId: file.id,
        filename: `checklist_${template.id}_${timestamp}.json`,
        type: 'checklist',
        tag: template.name,
        notes: `${checkedCount}/${items.length} items · ${pct}%`,
        content: JSON.stringify(formData),
        unit: template.id,
        fileSlug: file.slug,
        fileName: file.name,
        uploadStatus: 'local',
        capturedAt: new Date(timestamp).toISOString(),
      });

      navigation.navigate('InspectionHub', { file });
    } catch (e) {
      console.error('Failed to save checklist:', e);
    } finally {
      setSaving(false);
    }
  };

  const renderItemActions = (item) => (
    <View style={styles.itemActions}>
      <TouchableOpacity
        style={[styles.actionBtn, !!item.note && styles.actionBtnActive]}
        onPress={() => setExpandedNote(expandedNote === item.id ? null : item.id)}
      >
        <MaterialCommunityIcons name="note-plus-outline" size={15} color={item.note ? theme.accent : theme.textSecondary} />
        <Text style={[styles.actionBtnText, !!item.note && styles.actionBtnTextActive]}>Add note</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Camera', { file })}>
        <MaterialCommunityIcons name="image-plus" size={15} color={theme.textSecondary} />
        <Text style={styles.actionBtnText}>Media</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, !!item.action && styles.actionBtnRemarksActive]}
        onPress={() => setExpandedRemarks(expandedRemarks === item.id ? null : item.id)}
      >
        <MaterialCommunityIcons name="flag-outline" size={15} color={item.action ? theme.warning : theme.textSecondary} />
        <Text style={[styles.actionBtnText, !!item.action && { color: theme.warning }]}>Remarks</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{template.name}</Text>
          <Text style={styles.headerSub}>{file.name}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{checkedCount} of {items.length} checked</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Items */}
        {items.map((item) => (
          <View key={item.id} style={styles.fieldCard}>
            <TouchableOpacity style={styles.checkRow} onPress={() => toggleItem(item.id)}>
              <MaterialCommunityIcons
                name={item.checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={item.checked ? theme.success : theme.textMuted}
              />
              <Text style={[styles.checkLabel, item.checked && styles.checkLabelDone]}>
                {item.label}
              </Text>
            </TouchableOpacity>

            {renderItemActions(item)}

            {expandedNote === item.id && (
              <TextInput
                style={styles.inlineNote}
                value={item.note}
                onChangeText={(v) => setItemNote(item.id, v)}
                placeholder="Add observation or note…"
                placeholderTextColor={theme.textMuted}
                multiline autoFocus
              />
            )}

            {expandedRemarks === item.id && (
              <View>
                <TextInput
                  style={[styles.inlineNote, styles.inlineRemarks]}
                  value={item.action}
                  onChangeText={(v) => setItemRemarks(item.id, v)}
                  placeholder="Add remarks or observations…"
                  placeholderTextColor={theme.textMuted}
                  multiline autoFocus
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.priorityChips}>
                  {ACTION_PRIORITIES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityChip, item.actionPriority === p && styles.priorityChipActive]}
                      onPress={() => setItemRemarksPriority(item.id, p)}
                    >
                      <Text style={[styles.priorityChipText, item.actionPriority === p && styles.priorityChipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {item.note && expandedNote !== item.id && (
              <View style={styles.notePill}>
                <MaterialCommunityIcons name="note-text-outline" size={12} color={theme.accent} />
                <Text style={styles.notePillText} numberOfLines={1}>{item.note}</Text>
              </View>
            )}
            {item.action && expandedRemarks !== item.id && (
              <View style={[styles.notePill, styles.actionPill]}>
                <MaterialCommunityIcons name="flag" size={12} color={theme.warning} />
                <Text style={[styles.notePillText, { color: theme.warning }]} numberOfLines={1}>
                  [{item.actionPriority}] {item.action}
                </Text>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
              <Text style={styles.submitText}>Submit Checklist</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
