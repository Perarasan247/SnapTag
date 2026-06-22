import { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { QUICK_TAGS } from '../constants/tags';
import TagChip from '../components/TagChip';
import * as FileSystem from 'expo-file-system/legacy';
import { saveCapture } from '../services/storageService';
import { incrementCaptureCount } from '../services/fileService';
import { linkCaptureToItem } from '../services/checklistService';

// Sub-component to handle video player hook without violating hook rules
function VideoPreview({ uri, style }) {
  const player = useVideoPlayer(uri, (player) => {
    player.muted = true;
    player.loop = true;
    player.play();
  });

  return (
    <VideoView style={style} player={player} allowsFullscreen={false} />
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  backBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start',
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 999,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  toastText: {
    color: theme.textPrimary,
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000000',
  },
  previewMedia: { width: '100%', height: '100%' },
  mediaTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
  },
  mediaTypeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  measureBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  measureBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  formSafeArea: { flex: 1 },
  formScroll: { padding: 20 },
  inputLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    color: theme.textPrimary,
    fontFamily: 'System',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 24,
  },
  chipsRow: { marginBottom: 24 },
  chipsScroll: { paddingRight: 20 },
  checklistSection: { marginBottom: 20 },
  checklistGroup: { marginBottom: 12 },
  checklistGroupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingBottom: 8, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  checklistGroupName: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  checklistLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    marginBottom: 6,
  },
  checklistLinkItemSelected: { borderColor: theme.accent, backgroundColor: theme.accentSubtle },
  checklistLinkBody: { flex: 1 },
  checklistLinkLabel: { color: theme.textPrimary, fontSize: 14 },
  checklistLinkLabelSelected: { color: theme.accent, fontWeight: '600' },
  checklistLinkTemplate: { color: theme.textMuted, fontSize: 11, marginTop: 1 },
  bottomActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  saveButton: {
    height: 48,
    flexDirection: 'row',
    backgroundColor: theme.accent,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
  },
  localButton: {
    height: 48,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  localButtonText: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  skipBtnText: {
    color: theme.textMuted,
    fontSize: 13,
    fontFamily: 'System',
  },
  progressOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,8,8,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 100,
  },
  progressCard: {
    width: '100%',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
  },
  progressLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  progressPercent: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.card,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: theme.borderRadius.full,
  },
  progressSub: {
    color: theme.textSecondary,
    fontSize: 12,
    fontFamily: 'System',
  },
});

export default function TagScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const { mediaUri, mediaType, gps, file, preLinkedItemId, preLinkedTemplateId, preLinkedTemplateName, preLinkedItemLabel } = route.params;

  // Form States
  const [tag, setTag] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedItemIds] = useState(preLinkedItemId ? [preLinkedItemId] : []);

  const [isUploading] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Toast Animation helper
  const triggerToast = (msg) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 40,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(''));
  };

  // Helper to retrieve/create unique device ID
  const getOrGenerateDeviceId = async () => {
    try {
      let deviceId = await AsyncStorage.getItem('@snaptag_device_id');
      if (!deviceId) {
        deviceId = 'snaptag-device-' + Math.random().toString(36).substring(2, 11);
        await AsyncStorage.setItem('@snaptag_device_id', deviceId);
      }
      return deviceId;
    } catch (e) {
      return 'snaptag-device-fallback';
    }
  };

  const buildCaptureMetadata = (activeTag, activeNotes, uploadStatus) => {
    const timestamp = Date.now();
    const extension = mediaType === 'video' ? 'mp4' : 'jpg';
    const id = `${mediaType}_${timestamp}`;
    const filename = `${id}.${extension}`;
    const folder = preLinkedItemId ? 'checklist' : 'standalone';
    return {
      id, filename,
      s3DataKey: `data/${file.slug}/images/${folder}/${filename}`,
      s3MetadataKey: `data/${file.slug}/metadata/${id}.json`,
      type: mediaType,
      tag: activeTag,
      notes: activeNotes,
      gps: gps || null,
      capturedAt: new Date(timestamp).toISOString(),
      uploadedAt: null,
      uploadStatus,
      localUri: mediaUri,
      fileId: file.id,
      fileName: file.name,
      fileSlug: file.slug,
      checklistItemId: preLinkedItemId || null,
      checklistTemplateId: preLinkedTemplateId || null,
      checklistTemplateName: preLinkedTemplateName || null,
      checklistItemLabel: preLinkedItemLabel || null,
    };
  };

  const copyToPermanentStorage = async (sourceUri, filename) => {
    if (Platform.OS === 'web') return sourceUri; // web has no file system
    const capturesDir = FileSystem.documentDirectory + 'captures/';
    await FileSystem.makeDirectoryAsync(capturesDir, { intermediates: true });
    const dest = capturesDir + filename;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  };

  const linkToChecklist = async (captureId) => {
    for (const itemId of linkedItemIds) {
      await linkCaptureToItem(file.id, itemId, captureId);
    }
  };

  const handleSaveLocal = async () => {
    const activeTag = tag.trim();
    const deviceId = await getOrGenerateDeviceId();
    const metadata = buildCaptureMetadata(activeTag, notes.trim(), 'local');

    try {
      const permanentUri = await copyToPermanentStorage(mediaUri, metadata.filename);
      await saveCapture({ ...metadata, localUri: permanentUri, deviceId });
      await incrementCaptureCount(file.id);
      await linkToChecklist(metadata.id);
      navigation.pop(2); // pops TagScreen + CameraScreen → lands on InspectionHub
    } catch (error) {
      console.error('Local save failed:', error);
      triggerToast('Failed to save locally');
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Toast Notification */}
      {toastMessage !== '' && (
        <Animated.View
          style={[
            styles.toast,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <MaterialCommunityIcons name="cloud-off-outline" size={20} color={theme.error} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}

      {/* Back button */}
      <SafeAreaView style={styles.backBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.pop(2)}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Media Preview */}
      <View style={styles.previewContainer}>
        {mediaType === 'video' ? (
          <VideoPreview uri={mediaUri} style={styles.previewMedia} />
        ) : (
          <Image source={{ uri: mediaUri }} style={styles.previewMedia} resizeMode="cover" />
        )}
        <View style={styles.mediaTypeBadge}>
          <MaterialCommunityIcons
            name={mediaType === 'video' ? 'video' : 'camera'}
            size={12}
            color="#FFFFFF"
          />
          <Text style={styles.mediaTypeText}>
            {mediaType.toUpperCase()}
          </Text>
        </View>

        {mediaType === 'photo' && (
          <TouchableOpacity
            style={styles.measureBtn}
            onPress={() => navigation.navigate('Measure', { mediaUri })}
          >
            <MaterialCommunityIcons name="ruler" size={15} color="#FFFFFF" />
            <Text style={styles.measureBtnText}>Measure</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Form Area */}
      <SafeAreaView style={styles.formSafeArea}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          {/* Tag Input Field */}
          <Text style={styles.inputLabel}>Tag</Text>
          <TextInput
            style={styles.textInput}
            value={tag}
            onChangeText={setTag}
            placeholder="e.g. Electrical, Structural…"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="sentences"
            maxLength={30}
          />

          {/* Quick tags horizontally scrollable */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={styles.chipsScroll}
          >
            {QUICK_TAGS.map((chipLabel) => {
              const isSelected = tag.toLowerCase() === chipLabel.toLowerCase();
              return (
                <TagChip
                  key={chipLabel}
                  label={chipLabel}
                  isSelected={isSelected}
                  onPress={() => setTag(chipLabel)}
                />
              );
            })}
          </ScrollView>

          {/* Remarks Input Field */}
          <Text style={styles.inputLabel}>Remarks</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes… (optional)"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

        </ScrollView>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.saveButton, isUploading && styles.saveButtonDisabled]}
            onPress={handleSaveLocal}
            disabled={isUploading}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.localButton, isUploading && styles.saveButtonDisabled]}
            onPress={() => navigation.pop(2)}
            disabled={isUploading}
          >
            <Text style={styles.localButtonText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Uploading Progress Overlay */}
      {isUploading && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>Uploading to S3</Text>
            <Text style={styles.progressPercent}>{Math.round(uploadProgress * 100)}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${Math.round(uploadProgress * 100)}%` }]} />
            </View>
            <Text style={styles.progressSub}>Uploading media…</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
