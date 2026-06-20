import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { saveCapture } from '../services/storageService';
import { getFileChecklist, toggleItem } from '../services/checklistService';
import { getTemplateById } from '../constants/checklists';

const CATEGORIES = [
  { id: 'observation', label: 'Observation', icon: 'eye-outline' },
  { id: 'count',       label: 'Count',       icon: 'counter' },
  { id: 'condition',   label: 'Condition',   icon: 'clipboard-check-outline' },
  { id: 'description', label: 'Description', icon: 'text-long' },
  { id: 'other',       label: 'Other',       icon: 'dots-horizontal' },
];

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerBtn: { padding: 4, minWidth: 40 },
  headerTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  saveBtn: {
    backgroundColor: theme.accent, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: theme.borderRadius.full, minWidth: 60, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 40 },
  filePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.full, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  filePillText: { color: theme.textSecondary, fontSize: 12 },

  // Checklist section
  clSection: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, marginBottom: 20, overflow: 'hidden',
  },
  clSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  clSectionTitle: { color: theme.accent, fontSize: 13, fontWeight: '600', flex: 1 },
  clLinkedDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: theme.accent,
  },
  clItems: { borderTopWidth: 1, borderTopColor: theme.border },
  clItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  clItemLinked: { backgroundColor: theme.accentSubtle },
  clItemDone: { opacity: 0.5 },
  clItemLabel: { color: theme.textPrimary, fontSize: 13 },
  clItemLabelDone: { textDecorationLine: 'line-through', color: theme.textSecondary },
  clItemTemplate: { color: theme.textMuted, fontSize: 10, marginTop: 1 },
  clLinkedTag: {
    color: theme.accent, fontSize: 10, fontWeight: '700',
    borderWidth: 1, borderColor: theme.accent + '55',
    borderRadius: theme.borderRadius.full, paddingHorizontal: 8, paddingVertical: 2,
  },

  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  titleInput: {
    borderBottomWidth: 1, borderBottomColor: theme.borderStrong,
    paddingVertical: 10, fontSize: 17, color: theme.textPrimary, fontWeight: '600',
  },
  chips: { gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: theme.borderRadius.full, borderWidth: 1,
    borderColor: theme.border, backgroundColor: theme.surface,
  },
  chipActive: { borderColor: theme.accent, backgroundColor: theme.accentSubtle },
  chipText: { color: theme.textSecondary, fontSize: 13 },
  chipTextActive: { color: theme.accent, fontWeight: '600' },
  contentInput: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, padding: 14, fontSize: 15,
    color: theme.textPrimary, minHeight: 140, lineHeight: 22,
  },
  preview: { marginTop: 8 },
  previewLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  previewCard: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.success + '44',
    borderRadius: theme.borderRadius.md, padding: 14, gap: 6,
  },
  previewTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewType: { color: theme.success, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  previewTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  previewContent: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
});

export default function TextNoteScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { file } = route.params;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('observation');
  const [saving, setSaving] = useState(false);

  const [checklistItems, setChecklistItems] = useState([]);
  const [linkedItemId, setLinkedItemId] = useState(null);
  const [showChecklist, setShowChecklist] = useState(true);

  useEffect(() => {
    getFileChecklist(file.id).then((cl) => {
      if (!cl) return;
      const items = [];
      for (const tid of cl.templateIds || []) {
        const t = getTemplateById(tid);
        if (t) for (const it of t.items) items.push({ ...it, templateName: t.name, checked: cl.progress?.[it.id]?.checked || false });
      }
      for (const ci of cl.customItems || []) {
        items.push({ ...ci, templateName: 'Custom', checked: cl.progress?.[ci.id]?.checked || false });
      }
      setChecklistItems(items);
    });
  }, [file.id]);

  const canSave = title.trim().length > 0 && content.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const timestamp = Date.now();
      await saveCapture({
        id: `text_${timestamp}`,
        fileId: file.id,
        filename: `note_${timestamp}.txt`,
        type: 'text',
        tag: title.trim(),
        notes: content.trim(),
        content: content.trim(),
        unit: category,
        fileSlug: file.slug,
        fileName: file.name,
        uploadStatus: 'local',
        capturedAt: new Date(timestamp).toISOString(),
      });
      if (linkedItemId) {
        await toggleItem(file.id, linkedItemId);
      }
      navigation.goBack();
    } catch (e) {
      console.error('Failed to save text note:', e);
    } finally {
      setSaving(false);
    }
  };

  const pickChecklistItem = (item) => {
    setTitle(item.label);
    setLinkedItemId(item.id === linkedItemId ? null : item.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Text Note</Text>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* File label */}
          <View style={styles.filePill}>
            <MaterialCommunityIcons name="folder" size={13} color="#93b4f0" />
            <Text style={styles.filePillText} numberOfLines={1}>{file.name}</Text>
          </View>

          {/* Checklist quick-pick */}
          {checklistItems.length > 0 && (
            <View style={styles.clSection}>
              <TouchableOpacity style={styles.clSectionHeader} onPress={() => setShowChecklist(!showChecklist)}>
                <MaterialCommunityIcons name="format-list-checks" size={15} color={theme.accent} />
                <Text style={styles.clSectionTitle}>From checklist</Text>
                {linkedItemId && <View style={styles.clLinkedDot} />}
                <MaterialCommunityIcons
                  name={showChecklist ? 'chevron-up' : 'chevron-down'}
                  size={16} color={theme.textMuted}
                />
              </TouchableOpacity>
              {showChecklist && (
                <View style={styles.clItems}>
                  {checklistItems.map((item) => {
                    const linked = linkedItemId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.clItem, linked && styles.clItemLinked, item.checked && styles.clItemDone]}
                        onPress={() => pickChecklistItem(item)}
                      >
                        <MaterialCommunityIcons
                          name={item.checked ? 'checkbox-marked' : linked ? 'checkbox-intermediate' : 'checkbox-blank-outline'}
                          size={18}
                          color={item.checked ? theme.success : linked ? theme.accent : theme.textMuted}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.clItemLabel, item.checked && styles.clItemLabelDone]}>{item.label}</Text>
                          <Text style={styles.clItemTemplate}>{item.templateName}</Text>
                        </View>
                        {linked && (
                          <Text style={styles.clLinkedTag}>will check</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Title / What are you noting?</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Toilet count, Room condition…"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="sentences"
              autoFocus={checklistItems.length === 0}
              returnKeyType="next"
            />
          </View>

          {/* Category chips */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, category === cat.id && styles.chipActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <MaterialCommunityIcons
                    name={cat.icon} size={14}
                    color={category === cat.id ? theme.accent : theme.textSecondary}
                  />
                  <Text style={[styles.chipText, category === cat.id && styles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Content */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Content</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Enter your observations, counts, or notes here…"
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
          </View>

          {/* Preview */}
          {title.trim() && content.trim() ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewTypeRow}>
                  <MaterialCommunityIcons name="text-box-outline" size={14} color={theme.success} />
                  <Text style={styles.previewType}>TEXT NOTE · {category.toUpperCase()}</Text>
                </View>
                <Text style={styles.previewTitle}>{title.trim()}</Text>
                <Text style={styles.previewContent} numberOfLines={3}>{content.trim()}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
