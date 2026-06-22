import { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { saveCapture } from '../services/storageService';

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

  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  titleInput: {
    borderBottomWidth: 1, borderBottomColor: theme.borderStrong,
    paddingVertical: 10, fontSize: 17, color: theme.textPrimary, fontWeight: '600',
  },
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
    backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center',
  },
  saveBottomBtnDisabled: { opacity: 0.4 },
  saveBottomText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default function TextNoteScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { file } = route.params;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && content.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const timestamp = Date.now();
      const id = `text_${timestamp}`;
      await saveCapture({
        id,
        fileId: file.id,
        filename: `note_${timestamp}.json`,
        type: 'text',
        tag: title.trim(),
        notes: content.trim(),
        content: content.trim(),
        unit: 'note',
        fileSlug: file.slug,
        fileName: file.name,
        s3DataKey: `data/${file.slug}/data/${id}.json`,
        s3MetadataKey: `data/${file.slug}/metadata/${id}.json`,
        uploadStatus: 'local',
        capturedAt: new Date(timestamp).toISOString(),
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Text Note</Text>
          <View style={{ minWidth: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* File label */}
          <View style={styles.filePill}>
            <MaterialCommunityIcons name="folder" size={13} color="#93b4f0" />
            <Text style={styles.filePillText} numberOfLines={1}>{file.name}</Text>
          </View>

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
              autoFocus
              returnKeyType="next"
            />
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
                  <Text style={styles.previewType}>TEXT NOTE</Text>
                </View>
                <Text style={styles.previewTitle}>{title.trim()}</Text>
                <Text style={styles.previewContent} numberOfLines={3}>{content.trim()}</Text>
              </View>
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
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBottomText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
