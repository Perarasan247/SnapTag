import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CHECKLIST_TEMPLATES } from '../constants/checklists';
import {
  toggleItem, addCustomItem, removeCustomItem, markComplete, resetChecklist, updateItemNote,
} from '../services/checklistService';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_H = SCREEN_H * 0.58;

const makeStyles = (theme) => StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_H,
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: theme.border,
    zIndex: 100,
    elevation: 20,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: theme.borderStrong,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  headerProgress: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.successSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  completedText: { color: theme.success, fontSize: 11, fontWeight: '600' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  resetText: { color: theme.textMuted, fontSize: 12 },
  closeBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  tabActive: { backgroundColor: theme.accentSubtle },
  tabText: { color: theme.textSecondary, fontSize: 12 },
  tabTextActive: { color: theme.accent, fontWeight: '600' },
  tabCount: { color: theme.textMuted, fontSize: 11 },
  tabCountActive: { color: theme.accent },
  itemList: { flex: 1 },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemExpanded: {
    backgroundColor: 'rgba(37,99,235,0.05)',
    borderBottomColor: theme.accent,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemBody: { flex: 1 },
  itemLabel: { color: theme.textPrimary, fontSize: 14 },
  itemLabelDone: { color: theme.textMuted, textDecorationLine: 'line-through' },
  itemNotePreview: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemLinked: { color: theme.accent, fontSize: 11, marginTop: 2 },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteBtn: {
    padding: 5,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  noteBtnActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accentSubtle,
  },
  noteInputRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  noteInput: {
    color: theme.textPrimary,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  addInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.accent,
    paddingVertical: 6,
  },
  addConfirmBtn: { padding: 4 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addItemText: { color: theme.accent, fontSize: 13 },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.success,
    margin: 12,
    height: 46,
    borderRadius: theme.borderRadius.sm,
  },
  completeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default function ChecklistPanel({ fileId, checklist, onUpdate, onClose }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const slideAnim = useRef(new Animated.Value(PANEL_H)).current;
  const [activeTab, setActiveTab] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});

  const templateIds = checklist?.templateIds || [];
  const progress = checklist?.progress || {};
  const customItems = checklist?.customItems || [];

  const tabs = CHECKLIST_TEMPLATES.filter((t) => templateIds.includes(t.id));

  useEffect(() => {
    if (tabs.length > 0 && !activeTab) setActiveTab(tabs[0].id);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  }, []);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: PANEL_H, duration: 220, useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleToggle = async (itemId) => {
    const updated = await toggleItem(fileId, itemId);
    if (updated) onUpdate(updated);
  };

  const handleAddCustom = async () => {
    if (!customInput.trim()) return;
    const updated = await addCustomItem(fileId, customInput.trim(), activeTab || 'custom');
    setCustomInput('');
    setAddingCustom(false);
    if (updated) onUpdate(updated);
  };

  const handleRemoveCustom = async (itemId) => {
    const updated = await removeCustomItem(fileId, itemId);
    if (updated) onUpdate(updated);
  };

  const handleNoteChange = (itemId, text) => {
    setNoteInputs((prev) => ({ ...prev, [itemId]: text }));
  };

  const handleNoteSave = async (itemId) => {
    const text = noteInputs[itemId] ?? progress[itemId]?.note ?? '';
    const updated = await updateItemNote(fileId, itemId, text);
    if (updated) onUpdate(updated);
    setExpandedItemId(null);
  };

  const toggleExpand = (itemId) => {
    if (expandedItemId === itemId) {
      handleNoteSave(itemId);
    } else {
      setNoteInputs((prev) => ({ ...prev, [itemId]: progress[itemId]?.note || '' }));
      setExpandedItemId(itemId);
    }
  };

  const handleMarkComplete = async () => {
    await markComplete(fileId);
    onUpdate({ ...checklist, completedAt: new Date().toISOString() });
    close();
  };

  const handleReset = async () => {
    await resetChecklist(fileId);
    const newProgress = {};
    for (const [k, v] of Object.entries(checklist.progress || {})) {
      newProgress[k] = { ...v, checked: false };
    }
    onUpdate({ ...checklist, completedAt: null, progress: newProgress });
  };

  // Items for current tab: template items + custom items added to this tab
  const activeTabData = tabs.find((t) => t.id === activeTab);
  const activeTemplateItems = activeTabData?.items || [];
  const activeCustomItems = customItems.filter((i) => i.tabId === activeTab);
  const activeItems = [...activeTemplateItems, ...activeCustomItems];

  const totalChecked = Object.values(progress).filter((p) => p.checked).length;
  const totalItems = Object.keys(progress).length;
  const allDone = totalItems > 0 && totalChecked === totalItems;

  return (
    <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Drag handle */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Single header row: title | progress | reset | close */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Checklist</Text>

          <Text style={styles.headerProgress}>{totalChecked}/{totalItems}</Text>

          {checklist?.completedAt ? (
            <View style={styles.completedBadge}>
              <MaterialCommunityIcons name="check-circle" size={13} color={theme.success} />
              <Text style={styles.completedText}>Done</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleReset}
            style={styles.resetBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="refresh" size={15} color={theme.textMuted} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={close}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tabs — only show when multiple templates */}
        {tabs.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
          >
            {tabs.map((tab) => {
              const tabTemplateItems = tab.items;
              const tabCustomItems = customItems.filter((i) => i.tabId === tab.id);
              const allTabItems = [...tabTemplateItems, ...tabCustomItems];
              const tabChecked = allTabItems.filter((i) => progress[i.id]?.checked).length;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => { setActiveTab(tab.id); setAddingCustom(false); }}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <MaterialCommunityIcons
                    name={tab.icon || 'format-list-checks'}
                    size={13}
                    color={isActive ? theme.accent : theme.textSecondary}
                  />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.name}
                  </Text>
                  <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                    {tabChecked}/{allTabItems.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Items list */}
        <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
          {activeItems.map((item) => {
            const prog = progress[item.id] || {};
            const linked = (prog.captureIds || []).length;
            const isCustom = !!item.tabId;
            const isExpanded = expandedItemId === item.id;
            const savedNote = prog.note || '';
            const currentNote = isExpanded
              ? (noteInputs[item.id] ?? savedNote)
              : savedNote;

            return (
              <View key={item.id} style={[styles.item, isExpanded && styles.itemExpanded]}>
                {/* Main row */}
                <View style={styles.itemMainRow}>
                  <TouchableOpacity
                    onPress={() => handleToggle(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <MaterialCommunityIcons
                      name={prog.checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={prog.checked ? theme.success : theme.textMuted}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.itemBody}
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.itemLabel, prog.checked && styles.itemLabelDone]}>
                      {item.label}
                    </Text>
                    {/* Show note preview when collapsed */}
                    {!isExpanded && savedNote !== '' && (
                      <Text style={styles.itemNotePreview} numberOfLines={1}>
                        {savedNote}
                      </Text>
                    )}
                    {/* Show linked photo count */}
                    {linked > 0 && (
                      <Text style={styles.itemLinked}>
                        {linked} photo{linked !== 1 ? 's' : ''} linked
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => toggleExpand(item.id)}
                      style={[styles.noteBtn, (savedNote || isExpanded) && styles.noteBtnActive]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialCommunityIcons
                        name={isExpanded ? 'check' : 'pencil-outline'}
                        size={15}
                        color={savedNote && !isExpanded ? theme.accent : isExpanded ? theme.success : theme.textMuted}
                      />
                    </TouchableOpacity>
                    {isCustom && (
                      <TouchableOpacity
                        onPress={() => handleRemoveCustom(item.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialCommunityIcons name="minus-circle-outline" size={16} color={theme.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Expanded note input */}
                {isExpanded && (
                  <View style={styles.noteInputRow}>
                    <TextInput
                      style={styles.noteInput}
                      value={currentNote}
                      onChangeText={(text) => handleNoteChange(item.id, text)}
                      placeholder="Add notes, measurements, readings…"
                      placeholderTextColor={theme.textMuted}
                      multiline
                      autoFocus
                      returnKeyType="done"
                      blurOnSubmit
                      onBlur={() => handleNoteSave(item.id)}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* Add custom item to this tab */}
          {addingCustom ? (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="New item…"
                placeholderTextColor={theme.textMuted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddCustom}
              />
              <TouchableOpacity
                onPress={handleAddCustom}
                style={styles.addConfirmBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="check" size={20} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setAddingCustom(false); setCustomInput(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => setAddingCustom(true)}
              activeOpacity={0.65}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color={theme.accent} />
              <Text style={styles.addItemText}>Add custom item</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Complete button */}
        {allDone && !checklist?.completedAt && (
          <TouchableOpacity style={styles.completeBtn} onPress={handleMarkComplete}>
            <MaterialCommunityIcons name="check-all" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.completeBtnText}>Mark Checklist Complete</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
