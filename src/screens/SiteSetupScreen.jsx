import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CHECKLIST_TEMPLATES } from '../constants/checklists';
import { assignTemplates, getFileChecklist, saveCustomTemplate, deleteCustomTemplate } from '../services/checklistService';
import { updateFileChecklists } from '../services/fileService';

const PREDEFINED_COLORS = {
  retraining:     '#6366F1',
  electrical:     '#D97706',
  plumbing:       '#059669',
  structural:     '#EC4899',
  safety:         '#10B981',
  toilet_mapping: '#0891B2',
};

const CUSTOM_PALETTE = ['#2563EB', '#7C3AED', '#D97706', '#EC4899', '#059669', '#06B6D4'];

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: theme.navBg,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  scroll: { padding: 16, paddingBottom: 32 },

  sectionLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },

  card: {
    width: '47.5%', backgroundColor: theme.surface,
    borderRadius: theme.borderRadius.md, borderWidth: 2,
    padding: 14, gap: 8, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '700' },
  cardCount: { color: theme.textMuted, fontSize: 12 },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  // Custom checklist list
  customCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1.5, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  customCardIcon: {
    width: 40, height: 40, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  customCardBody: { flex: 1 },
  customCardName: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  customCardCount: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  customCardActions: { flexDirection: 'row', gap: 4 },

  createCustomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.accent, borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md, paddingVertical: 14,
    backgroundColor: theme.accentSubtle,
  },
  createCustomText: { color: theme.accent, fontSize: 14, fontWeight: '700' },

  footer: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface,
  },
  skipBtn: {
    flex: 1, height: 48, borderRadius: theme.borderRadius.sm,
    borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center',
  },
  skipText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  continueBtn: {
    flex: 2, height: 48, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.accent,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  continueText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32, maxHeight: '85%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 16 },

  fieldLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  nameInput: {
    backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: theme.textPrimary,
  },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  itemInput: {
    flex: 1, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.sm, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: theme.textPrimary,
  },
  removeItemBtn: { padding: 6 },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  addItemText: { color: theme.accent, fontSize: 14, fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1, height: 46, borderRadius: theme.borderRadius.sm,
    borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center',
  },
  modalCancelText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  modalSaveBtn: {
    flex: 2, height: 46, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalSaveBtnDisabled: { opacity: 0.4 },
});

export default function SiteSetupScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { file } = route.params;

  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalItems, setModalItems] = useState(['', '']);
  const [modalSaving, setModalSaving] = useState(false);

  useEffect(() => {
    loadExisting();
  }, []);

  const loadExisting = async () => {
    try {
      const cl = await getFileChecklist(file.id);
      if (cl?.customTemplates) setCustomTemplates(cl.customTemplates);
      if (cl?.templateIds) {
        // Pre-select predefined templates that were already assigned
        const predefinedIds = CHECKLIST_TEMPLATES.map((t) => t.id);
        setSelected(cl.templateIds.filter((id) => predefinedIds.includes(id)));
      }
    } catch {}
    setLoadingCustom(false);
  };

  const togglePredefined = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const openModal = () => {
    setModalName('');
    setModalItems(['', '']);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const addModalItem = () => setModalItems((prev) => [...prev, '']);
  const updateModalItem = (idx, text) => setModalItems((prev) => prev.map((v, i) => i === idx ? text : v));
  const removeModalItem = (idx) => {
    if (modalItems.length <= 1) return;
    setModalItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateCustom = async () => {
    const name = modalName.trim();
    const items = modalItems.map((s) => s.trim()).filter(Boolean);
    if (!name || items.length === 0) return;

    setModalSaving(true);
    try {
      const tid = `custom_${Date.now()}`;
      const template = {
        id: tid,
        name,
        icon: 'clipboard-list-outline',
        items: items.map((label, idx) => ({ id: `${tid}_${idx}`, label })),
        color: CUSTOM_PALETTE[customTemplates.length % CUSTOM_PALETTE.length],
        createdAt: new Date().toISOString(),
      };
      const updated = await saveCustomTemplate(file.id, template);
      if (updated?.customTemplates) setCustomTemplates(updated.customTemplates);
      setShowModal(false);
    } catch (e) {
      console.error('Failed to create custom checklist:', e);
    }
    setModalSaving(false);
  };

  const handleDeleteCustom = (template) => {
    const doDelete = async () => {
      const updated = await deleteCustomTemplate(file.id, template.id);
      setCustomTemplates(updated?.customTemplates || []);
    };
    if (Platform.OS === 'web') {
      doDelete();
    } else {
      Alert.alert('Delete Checklist', `Delete "${template.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      const customIds = (customTemplates || []).map((t) => t.id);
      const allIds = [...new Set([...selected, ...customIds])];
      if (allIds.length > 0) {
        await assignTemplates(file.id, selected); // predefined only (initializes their items)
        await updateFileChecklists(file.id, allIds);
        file.checklistTemplateIds = allIds;
      }
    } catch (e) {
      console.error('Failed to assign templates:', e);
    }
    setSaving(false);
    navigation.replace('InspectionHub', { file });
  };

  const canSaveModal = modalName.trim().length > 0 && modalItems.some((s) => s.trim().length > 0);
  const totalSelected = selected.length + customTemplates.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.navBg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{file.name}</Text>
          <Text style={styles.headerSub}>Select inspection checklists</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Predefined templates */}
        <Text style={styles.sectionLabel}>Predefined Checklists</Text>
        <View style={styles.grid}>
          {CHECKLIST_TEMPLATES.map((t) => {
            const color = PREDEFINED_COLORS[t.id] || theme.accent;
            const isSelected = selected.includes(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.card,
                  isSelected
                    ? { borderColor: color, borderWidth: 2.5, backgroundColor: color + '33' }
                    : { borderColor: theme.border, borderWidth: 1.5 },
                ]}
                onPress={() => togglePredefined(t.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconWrap, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={t.icon} size={24} color={color} />
                </View>
                <Text style={[styles.cardName, { color: isSelected ? color : theme.textPrimary }]}>{t.name}</Text>
                <Text style={styles.cardCount}>{t.items.length} items</Text>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: color }]}>
                    <MaterialCommunityIcons name="check" size={11} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom checklists */}
        <Text style={styles.sectionLabel}>Custom Checklists</Text>

        {!loadingCustom && (customTemplates || []).map((t, idx) => {
          const color = t.color || CUSTOM_PALETTE[idx % CUSTOM_PALETTE.length];
          return (
            <View
              key={t.id}
              style={[styles.customCard, { borderColor: color }]}
            >
              <View style={[styles.customCardIcon, { backgroundColor: color + '18' }]}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={20} color={color} />
              </View>
              <View style={styles.customCardBody}>
                <Text style={styles.customCardName}>{t.name}</Text>
                <Text style={styles.customCardCount}>{t.items.length} items · always included</Text>
              </View>
              <View style={styles.customCardActions}>
                <TouchableOpacity onPress={() => handleDeleteCustom(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.createCustomBtn} onPress={openModal} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color={theme.accent} />
          <Text style={styles.createCustomText}>Create Custom Checklist</Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.replace('InspectionHub', { file })} disabled={saving}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.continueText}>
                {totalSelected > 0 ? `Continue (${totalSelected})` : 'Continue'}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Create custom checklist modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
            <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Create Custom Checklist</Text>

                <Text style={styles.fieldLabel}>Checklist Name</Text>
                <TextInput
                  style={styles.nameInput}
                  value={modalName}
                  onChangeText={setModalName}
                  placeholder="e.g. Tech Room Inspection"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                />

                <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Checklist Items</Text>
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  {modalItems.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={{ color: theme.textMuted, width: 20, fontSize: 13 }}>{idx + 1}.</Text>
                      <TextInput
                        style={styles.itemInput}
                        value={item}
                        onChangeText={(text) => updateModalItem(idx, text)}
                        placeholder={`Item ${idx + 1}`}
                        placeholderTextColor={theme.textMuted}
                        returnKeyType="next"
                      />
                      <TouchableOpacity style={styles.removeItemBtn} onPress={() => removeModalItem(idx)}>
                        <MaterialCommunityIcons
                          name="close-circle"
                          size={18}
                          color={modalItems.length > 1 ? theme.textMuted : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.addItemBtn} onPress={addModalItem}>
                  <MaterialCommunityIcons name="plus" size={18} color={theme.accent} />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSaveBtn, !canSaveModal && styles.modalSaveBtnDisabled]}
                    onPress={handleCreateCustom}
                    disabled={!canSaveModal || modalSaving}
                  >
                    {modalSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalSaveText}>Create Checklist</Text>
                    )}
                  </TouchableOpacity>
                </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
