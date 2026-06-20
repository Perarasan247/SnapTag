import { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CHECKLIST_TEMPLATES, getTemplateById } from '../constants/checklists';
import {
  getFileChecklist,
  assignTemplates,
  toggleItem,
  addCustomItem,
  removeCustomItem,
  markComplete,
  resetChecklist,
} from '../services/checklistService';

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerBtn: { padding: 4 },
  headerMeta: { flex: 1 },
  headerTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  headerSub: { color: theme.textSecondary, fontSize: 12, marginTop: 1 },
  addTemplateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.accent + '66',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.accentSubtle,
  },
  addTemplateBtnText: { color: theme.accent, fontSize: 13, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 40 },

  // Progress card
  progressCard: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, padding: 16, marginBottom: 20, gap: 12,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.accentSubtle, justifyContent: 'center', alignItems: 'center',
  },
  progressDotDone: { backgroundColor: theme.successSubtle },
  progressMeta: { flex: 1 },
  progressTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  progressSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  progressTrack: { height: 6, backgroundColor: theme.card, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.accent, borderRadius: 3 },
  progressFillDone: { backgroundColor: theme.success },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { color: theme.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptySub: { color: theme.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  emptyBtn: {
    marginTop: 8, backgroundColor: theme.accent,
    paddingVertical: 11, paddingHorizontal: 22,
    borderRadius: theme.borderRadius.full,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Sections / items
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 8, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  sectionTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
  sectionCount: { color: theme.textMuted, fontSize: 12 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  itemChecked: { opacity: 0.6 },
  itemLabel: { color: theme.textPrimary, fontSize: 14, flex: 1 },
  itemLabelChecked: { textDecorationLine: 'line-through', color: theme.textSecondary },
  removeBtn: { padding: 4 },

  // Add custom item
  addItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16,
  },
  addItemInput: { flex: 1, color: theme.textPrimary, fontSize: 14 },
  addItemSave: { paddingHorizontal: 8 },
  addItemSaveText: { color: theme.accent, fontSize: 14, fontWeight: '700' },
  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: theme.border,
    marginBottom: 20,
  },
  addCustomBtnText: { color: theme.textSecondary, fontSize: 14 },

  // Bottom actions
  actions: { gap: 10, marginTop: 8 },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.success, borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
  },
  completeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, paddingVertical: 12,
  },
  resetBtnText: { color: theme.textSecondary, fontSize: 14 },

  // Template modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: theme.border, maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  modalTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  templateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  templateRowActive: { backgroundColor: theme.accentSubtle },
  templateMeta: { flex: 1 },
  templateName: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  templateCount: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
});

export default function ChecklistScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { file } = route.params;
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [file.id])
  );

  const load = async () => {
    setLoading(true);
    const cl = await getFileChecklist(file.id);
    setChecklist(cl);
    setLoading(false);
  };

  const handleToggleTemplate = async (templateId) => {
    if (!checklist || busy) return;
    setBusy(true);
    try {
      const current = checklist.templateIds || [];
      const next = current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId];
      const updated = await assignTemplates(file.id, next);
      if (updated) setChecklist(updated);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const handleToggleItem = async (itemId) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await toggleItem(file.id, itemId);
      if (updated) setChecklist(updated);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const handleAddCustom = async () => {
    if (!newItemText.trim() || busy) return;
    setBusy(true);
    try {
      const updated = await addCustomItem(file.id, newItemText.trim());
      if (updated) setChecklist(updated);
      setNewItemText('');
      setAddingItem(false);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const handleRemoveCustom = async (itemId) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await removeCustomItem(file.id, itemId);
      if (updated) setChecklist(updated);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const handleMarkComplete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await markComplete(file.id);
      if (updated) setChecklist(updated);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const handleReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await resetChecklist(file.id);
      if (updated) setChecklist(updated);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const allItems = checklist ? (() => {
    const items = [];
    for (const tid of checklist.templateIds || []) {
      const t = getTemplateById(tid);
      if (t) for (const it of t.items) items.push({ ...it, templateName: t.name, templateIcon: t.icon });
    }
    for (const ci of checklist.customItems || []) {
      items.push({ ...ci, templateName: 'Custom', templateIcon: 'pencil-outline' });
    }
    return items;
  })() : [];

  const checked = allItems.filter((i) => checklist?.progress?.[i.id]?.checked).length;
  const total = allItems.length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const isDone = total > 0 && checked === total;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle}>Checklist</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{file.name}</Text>
        </View>
        <TouchableOpacity style={styles.addTemplateBtn} onPress={() => setShowTemplates(true)}>
          <MaterialCommunityIcons name="plus" size={18} color={theme.accent} />
          <Text style={styles.addTemplateBtnText}>Templates</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Progress bar */}
          {total > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <View style={[styles.progressDot, isDone && styles.progressDotDone]}>
                  <MaterialCommunityIcons
                    name={isDone ? 'check-circle' : 'format-list-checks'}
                    size={18}
                    color={isDone ? theme.success : theme.accent}
                  />
                </View>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressTitle}>
                    {isDone ? 'All done!' : `${checked} of ${total} items complete`}
                  </Text>
                  <Text style={styles.progressSub}>{pct}%</Text>
                </View>
                {checklist?.completedAt && (
                  <MaterialCommunityIcons name="check-all" size={20} color={theme.success} />
                )}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }, isDone && styles.progressFillDone]} />
              </View>
            </View>
          )}

          {/* No templates assigned */}
          {(checklist?.templateIds || []).length === 0 && (checklist?.customItems || []).length === 0 && (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="format-list-checks" size={40} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No checklist yet</Text>
              <Text style={styles.emptySub}>Add templates or custom items to start tracking inspection steps.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowTemplates(true)}>
                <Text style={styles.emptyBtnText}>Add Templates</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Items by template */}
          {(checklist?.templateIds || []).map((tid) => {
            const t = getTemplateById(tid);
            if (!t) return null;
            const tChecked = t.items.filter((i) => checklist?.progress?.[i.id]?.checked).length;
            return (
              <View key={tid} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name={t.icon} size={16} color={theme.accent} />
                  <Text style={styles.sectionTitle}>{t.name}</Text>
                  <Text style={styles.sectionCount}>{tChecked}/{t.items.length}</Text>
                </View>
                {t.items.map((item) => {
                  const prog = checklist?.progress?.[item.id];
                  const isChecked = prog?.checked || false;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.item, isChecked && styles.itemChecked]}
                      onPress={() => handleToggleItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isChecked ? theme.success : theme.textMuted}
                      />
                      <Text style={[styles.itemLabel, isChecked && styles.itemLabelChecked]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {/* Custom items */}
          {(checklist?.customItems || []).length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.sectionTitle}>Custom Items</Text>
              </View>
              {checklist.customItems.map((item) => {
                const isChecked = checklist?.progress?.[item.id]?.checked || false;
                return (
                  <View key={item.id} style={[styles.item, isChecked && styles.itemChecked]}>
                    <TouchableOpacity onPress={() => handleToggleItem(item.id)}>
                      <MaterialCommunityIcons
                        name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isChecked ? theme.success : theme.textMuted}
                      />
                    </TouchableOpacity>
                    <Text style={[styles.itemLabel, { flex: 1 }, isChecked && styles.itemLabelChecked]}>
                      {item.label}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveCustom(item.id)} style={styles.removeBtn}>
                      <MaterialCommunityIcons name="close" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Add custom item */}
          {total > 0 && (
            addingItem ? (
              <View style={styles.addItemRow}>
                <TextInput
                  style={styles.addItemInput}
                  value={newItemText}
                  onChangeText={setNewItemText}
                  placeholder="Custom item name…"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAddCustom}
                />
                <TouchableOpacity style={styles.addItemSave} onPress={handleAddCustom} disabled={!newItemText.trim()}>
                  <Text style={[styles.addItemSaveText, !newItemText.trim() && { opacity: 0.4 }]}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAddingItem(false); setNewItemText(''); }}>
                  <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addCustomBtn} onPress={() => setAddingItem(true)}>
                <MaterialCommunityIcons name="plus" size={18} color={theme.textSecondary} />
                <Text style={styles.addCustomBtnText}>Add custom item</Text>
              </TouchableOpacity>
            )
          )}

          {/* Actions */}
          {total > 0 && (
            <View style={styles.actions}>
              {!checklist?.completedAt && isDone && (
                <TouchableOpacity style={styles.completeBtn} onPress={handleMarkComplete} disabled={busy}>
                  <MaterialCommunityIcons name="check-all" size={18} color="#fff" />
                  <Text style={styles.completeBtnText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={busy}>
                <MaterialCommunityIcons name="reload" size={16} color={theme.textSecondary} />
                <Text style={styles.resetBtnText}>Reset all</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Template picker modal */}
      <Modal visible={showTemplates} animationType="slide" transparent onRequestClose={() => setShowTemplates(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inspection Templates</Text>
              <TouchableOpacity onPress={() => setShowTemplates(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CHECKLIST_TEMPLATES}
              keyExtractor={(t) => t.id}
              renderItem={({ item: t }) => {
                const active = (checklist?.templateIds || []).includes(t.id);
                return (
                  <TouchableOpacity
                    style={[styles.templateRow, active && styles.templateRowActive]}
                    onPress={() => handleToggleTemplate(t.id)}
                    disabled={busy}
                  >
                    <MaterialCommunityIcons name={t.icon} size={22} color={active ? theme.accent : theme.textSecondary} />
                    <View style={styles.templateMeta}>
                      <Text style={[styles.templateName, active && { color: theme.accent }]}>{t.name}</Text>
                      <Text style={styles.templateCount}>{t.items.length} items</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={active ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={active ? theme.accent : theme.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
