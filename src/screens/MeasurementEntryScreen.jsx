import { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { saveCapture } from '../services/storageService';

const UNITS = [
  { id: 'm',     label: 'm',     name: 'Metres' },
  { id: 'cm',    label: 'cm',    name: 'Centimetres' },
  { id: 'mm',    label: 'mm',    name: 'Millimetres' },
  { id: 'ft',    label: 'ft',    name: 'Feet' },
  { id: 'in',    label: 'in',    name: 'Inches' },
  { id: 'count', label: 'count', name: 'Count / Qty' },
  { id: '%',     label: '%',     name: 'Percentage' },
  { id: 'kg',    label: 'kg',    name: 'Kilograms' },
  { id: 'L',     label: 'L',     name: 'Litres' },
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
    backgroundColor: theme.warning, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: theme.borderRadius.full, minWidth: 60, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 40 },
  filePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.full, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  filePillText: { color: theme.textSecondary, fontSize: 12 },

  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  labelInput: {
    borderBottomWidth: 1, borderBottomColor: theme.borderStrong,
    paddingVertical: 10, fontSize: 17, color: theme.textPrimary, fontWeight: '600',
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueInput: {
    flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderStrong,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 32, color: theme.textPrimary, fontWeight: '700', textAlign: 'center',
  },
  unitDisplay: {
    backgroundColor: theme.warningSubtle, borderWidth: 1, borderColor: theme.warning + '55',
    borderRadius: theme.borderRadius.md, paddingHorizontal: 18, paddingVertical: 14,
    minWidth: 64, alignItems: 'center',
  },
  unitDisplayText: { color: theme.warning, fontSize: 20, fontWeight: '700' },
  unitChips: { gap: 8 },
  unitChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: theme.borderRadius.sm, borderWidth: 1,
    borderColor: theme.border, backgroundColor: theme.surface, minWidth: 64,
  },
  unitChipActive: { borderColor: theme.warning, backgroundColor: theme.warningSubtle },
  unitChipLabel: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  unitChipLabelActive: { color: theme.warning },
  unitChipName: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  unitChipNameActive: { color: theme.warning + 'AA' },
  notesInput: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, padding: 14, fontSize: 15,
    color: theme.textPrimary, minHeight: 80, lineHeight: 22,
  },
  previewCard: {
    backgroundColor: theme.warningSubtle, borderWidth: 1, borderColor: theme.warning + '44',
    borderRadius: theme.borderRadius.md, padding: 16, gap: 6,
  },
  previewTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewType: { color: theme.warning, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  previewLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '500' },
  previewValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  previewValue: { color: theme.textPrimary, fontSize: 40, fontWeight: '700', lineHeight: 48 },
  previewUnit: { color: theme.warning, fontSize: 18, fontWeight: '600' },
  previewNotes: { color: theme.textSecondary, fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  bottomBar: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface,
  },
  discardBtn: {
    flex: 1, height: 48, borderRadius: theme.borderRadius.sm,
    borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center',
  },
  discardText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  saveBottomBtn: {
    flex: 2, height: 48, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.warning, justifyContent: 'center', alignItems: 'center',
  },
  saveBottomBtnDisabled: { opacity: 0.4 },
  saveBottomText: { color: '#000', fontSize: 15, fontWeight: '700' },
});

export default function MeasurementEntryScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { file } = route.params;
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('m');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const valueRef = useRef(null);

  const canSave = label.trim().length > 0 && value.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const timestamp = Date.now();
      const id = `meas_${timestamp}`;
      await saveCapture({
        id,
        fileId: file.id,
        filename: `measurement_${timestamp}.json`,
        type: 'measurement',
        tag: label.trim(),
        notes: notes.trim(),
        content: value.trim(),
        unit: unit,
        fileSlug: file.slug,
        fileName: file.name,
        s3DataKey: `data/${file.slug}/data/${id}.json`,
        s3MetadataKey: `data/${file.slug}/metadata/${id}.json`,
        uploadStatus: 'local',
        capturedAt: new Date(timestamp).toISOString(),
      });
      navigation.goBack();
    } catch (e) {
      console.error('Failed to save measurement:', e);
    } finally {
      setSaving(false);
    }
  };

  const selectedUnit = UNITS.find((u) => u.id === unit) || UNITS[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Measurement</Text>
          <View style={{ minWidth: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* File label */}
          <View style={styles.filePill}>
            <MaterialCommunityIcons name="folder" size={13} color="#93b4f0" />
            <Text style={styles.filePillText} numberOfLines={1}>{file.name}</Text>
          </View>

          {/* Label */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>What are you measuring?</Text>
            <TextInput
              style={styles.labelInput}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Room Width, Toilet Count, Door Height…"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => valueRef.current?.focus()}
            />
          </View>

          {/* Value + Unit row */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Value</Text>
            <View style={styles.valueRow}>
              <TextInput
                ref={valueRef}
                style={styles.valueInput}
                value={value}
                onChangeText={setValue}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <View style={styles.unitDisplay}>
                <Text style={styles.unitDisplayText}>{selectedUnit.label}</Text>
              </View>
            </View>
          </View>

          {/* Unit picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitChips}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.unitChip, unit === u.id && styles.unitChipActive]}
                  onPress={() => setUnit(u.id)}
                >
                  <Text style={[styles.unitChipLabel, unit === u.id && styles.unitChipLabelActive]}>{u.label}</Text>
                  <Text style={[styles.unitChipName, unit === u.id && styles.unitChipNameActive]}>{u.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Optional notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional context or observations…"
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
          </View>

          {/* Preview */}
          {label.trim() && value.trim() ? (
            <View style={styles.previewCard}>
              <View style={styles.previewTypeRow}>
                <MaterialCommunityIcons name="ruler" size={14} color={theme.warning} />
                <Text style={styles.previewType}>MEASUREMENT</Text>
              </View>
              <Text style={styles.previewLabel}>{label.trim()}</Text>
              <View style={styles.previewValueRow}>
                <Text style={styles.previewValue}>{value.trim()}</Text>
                <Text style={styles.previewUnit}>{unit}</Text>
              </View>
              {notes.trim() ? <Text style={styles.previewNotes}>{notes.trim()}</Text> : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.discardBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBottomBtn, !canSave && styles.saveBottomBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveBottomText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
