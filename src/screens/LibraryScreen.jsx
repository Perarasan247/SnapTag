import { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  Modal, Image, Animated, ActivityIndicator, ScrollView, TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../contexts/ThemeContext';
import { QUICK_TAGS } from '../constants/tags';
import MediaThumbnail from '../components/MediaThumbnail';
import TagChip from '../components/TagChip';
import { getCapturesByFile, updateCaptureStatus, deleteCapture, updateCapture } from '../services/storageService';
import { uploadMedia, uploadMetadata, updateIndex } from '../services/s3Service';
import { getAllFiles } from '../services/fileService';
import { getFileChecklist } from '../services/checklistService';
import { CHECKLIST_TEMPLATES } from '../constants/checklists';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CUBE_GAP = 12;
const CUBE_COLS = 2;
const CUBE_SIZE = (SCREEN_WIDTH - 24 * 2 - CUBE_GAP) / CUBE_COLS;
const MEDIA_PAD = 4;
const MEDIA_GAP = 4;
const MEDIA_SIZE = (SCREEN_WIDTH - MEDIA_PAD * 2 - MEDIA_GAP) / 2;

function VideoPlayer({ uri, style }) {
  const player = useVideoPlayer(uri, (p) => { p.muted = false; p.loop = true; p.play(); });
  return <VideoView style={style} player={player} allowsFullscreen allowsPictureInPicture />;
}

// A single file cube — loads its own preview
function FileCube({ file, onPress, styles, theme }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    getCapturesByFile(file.id).then((caps) => {
      const first = caps?.find((c) => (c.type === 'photo' || c.type === 'video') && c.localUri);
      if (first) setPreview(first.localUri);
    });
  }, [file.id]);

  return (
    <TouchableOpacity style={styles.cube} onPress={onPress} activeOpacity={0.85}>
      {preview ? (
        <Image source={{ uri: preview }} style={styles.cubeImage} resizeMode="cover" />
      ) : (
        <View style={styles.cubePlaceholder}>
          <MaterialCommunityIcons name="folder-open-outline" size={40} color={theme.textMuted} />
        </View>
      )}
      <View style={styles.cubeOverlay}>
        <Text style={styles.cubeName} numberOfLines={2}>{file.name}</Text>
        <Text style={styles.cubeCount}>
          {file.captureCount > 0 ? `${file.captureCount} capture${file.captureCount !== 1 ? 's' : ''}` : 'No captures'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  // Grid view header
  gridHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  gridHeaderTitle: { flex: 1, textAlign: 'center', color: theme.textPrimary, fontSize: 17, fontWeight: '700' },

  // File cubes
  cubeGrid: { padding: 24, paddingBottom: 32 },
  cubeRow: { gap: CUBE_GAP, marginBottom: CUBE_GAP },
  cube: {
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    // Cube shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  cubeImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cubePlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.card,
  },
  cubeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cubeName: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  cubeCount: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },

  // Captures header
  header: {
    height: 48, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 4, minWidth: 32, alignItems: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  headerTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  headerCount: { color: theme.textSecondary, fontSize: 13, minWidth: 24, textAlign: 'right' },
  clBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: theme.card, paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  clBadgeDone: { backgroundColor: theme.successSubtle },
  clBadgeText: { color: theme.textSecondary, fontSize: 10, fontWeight: '600' },
  clBadgeTextDone: { color: theme.success },

  // File picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', paddingTop: 80, paddingHorizontal: 16 },
  pickerSheet: {
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.border, maxHeight: 360, overflow: 'hidden',
  },
  pickerTitle: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  pickerItemActive: { backgroundColor: theme.accentSubtle },
  pickerItemText: { flex: 1, color: theme.textPrimary, fontSize: 14 },
  pickerItemTextActive: { color: theme.accent, fontWeight: '600' },
  pickerItemCount: { color: theme.textMuted, fontSize: 12 },

  // Filter bar
  filterBar: { height: 44, borderBottomWidth: 1, borderBottomColor: theme.border, flexShrink: 0 },
  filterScroll: { paddingHorizontal: 16, alignItems: 'center', height: '100%' },

  // Mixed layout
  mixedList: { padding: MEDIA_PAD, paddingBottom: 24, gap: MEDIA_GAP },
  mediaPair: { flexDirection: 'row', gap: MEDIA_GAP },
  mediaCell: { width: MEDIA_SIZE, height: MEDIA_SIZE },
  mediaSolo: { height: MEDIA_SIZE * 1.2, width: '100%' },
  dataRow: { width: '100%', minHeight: 80 },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  emptyTitle: { color: theme.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 6 },
  emptySubtitle: { color: theme.textMuted, fontSize: 13, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: theme.accent,
    paddingVertical: 11, paddingHorizontal: 22,
    borderRadius: theme.borderRadius.full,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Toast
  toast: { position: 'absolute', top: 0, left: 20, right: 20, zIndex: 999, alignItems: 'center' },
  toastContent: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surface, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.border,
  },
  toastText: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },

  // Detail modal
  modalContainer: { flex: 1, backgroundColor: theme.background },
  modalHeader: {
    height: 48, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  modalHeaderTitle: { flex: 1, textAlign: 'center', color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  cancelEditText: { color: theme.textSecondary, fontSize: 13 },
  detailMediaContainer: { width: '100%', height: 300, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  detailMedia: { width: '100%', height: '100%' },
  detailPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  detailContent: { padding: 16 },
  detailBadges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tagBadge: { backgroundColor: theme.accent, paddingHorizontal: 13, paddingVertical: 6, borderRadius: theme.borderRadius.full },
  tagBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  typeBadge: { backgroundColor: theme.successSubtle, paddingHorizontal: 13, paddingVertical: 6, borderRadius: theme.borderRadius.full },
  typeBadgeText: { color: theme.success, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  sectionCard: {
    backgroundColor: theme.surface, borderColor: theme.border,
    borderWidth: 1, borderRadius: theme.borderRadius.md, padding: 14, marginBottom: 12,
  },
  sectionLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  notesText: { color: theme.textPrimary, fontSize: 14.5, lineHeight: 21 },

  // Text note hero (detail modal)
  textHero: {
    backgroundColor: theme.successSubtle,
    borderBottomWidth: 1,
    borderBottomColor: theme.success + '33',
    padding: 20,
    gap: 8,
  },
  textHeroTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textHeroType: { color: theme.success, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  textHeroTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '700' },
  textHeroContent: { color: theme.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 4 },

  // Measurement hero (detail modal)
  measureHero: {
    backgroundColor: theme.warningSubtle,
    borderBottomWidth: 1,
    borderBottomColor: theme.warning + '33',
    padding: 20,
    gap: 6,
  },
  measureHeroValue: { color: theme.textPrimary, fontSize: 52, fontWeight: '800', lineHeight: 60 },
  measureHeroUnit: { color: theme.warning, fontSize: 24, fontWeight: '700' },
  measureHeroNotes: { color: theme.textSecondary, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  editInput: { borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 10, fontSize: 14.5, color: theme.textPrimary },
  editNotesInput: {
    minHeight: 80, textAlignVertical: 'top', borderBottomWidth: 0,
    borderWidth: 1, borderColor: theme.border, borderRadius: theme.borderRadius.sm, padding: 10, marginTop: 6,
  },
  saveEditBtn: { height: 44, backgroundColor: theme.accent, borderRadius: theme.borderRadius.sm, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveEditBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  metaLabel: { color: theme.textSecondary, fontSize: 13 },
  metaValue: { color: theme.textPrimary, fontSize: 13, fontWeight: '500' },
  metaEmpty: { color: theme.textMuted, fontSize: 13, fontStyle: 'italic' },
  linkedItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  linkedItemLabel: { color: theme.textPrimary, fontSize: 13 },
  linkedItemTemplate: { color: theme.textMuted, fontSize: 11, marginTop: 1 },
  linkedItemNote: { color: theme.textSecondary, fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  modalActions: { padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface },
  actionBtn: { flexDirection: 'row', height: 48, borderRadius: theme.borderRadius.sm, justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%' },
  retryBtn: { backgroundColor: theme.accent },
  deleteBtn: { backgroundColor: theme.errorSubtle, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default function LibraryScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // view: 'grid' shows all files as cubes; 'captures' shows one file's media
  const [view, setView] = useState(route.params?.file ? 'captures' : 'grid');
  const [allFiles, setAllFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(route.params?.file || null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const isFocused = useIsFocused();

  // Captures view state
  const [captures, setCaptures] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTag, setEditTag] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [checklist, setChecklist] = useState(null);

  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    getAllFiles().then(setAllFiles);
  }, []);

  useEffect(() => {
    if (isFocused && view === 'captures' && activeFile) {
      loadCaptures();
    }
  }, [isFocused, activeFile, view]);

  const loadCaptures = async () => {
    try {
      const all = await getCapturesByFile(activeFile.id);
      setCaptures([...all].sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt)));
    } catch (e) { console.error(e); }
    const cl = await getFileChecklist(activeFile.id);
    setChecklist(cl);
  };

  const openFile = (file) => {
    setActiveFile(file);
    setActiveFilter('All');
    setShowFilePicker(false);
    setCaptures([]);
    setView('captures');
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 40, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(''));
  };

  const handleRetryUpload = async (item) => {
    if (isRetrying) return;
    setIsRetrying(true);
    setCaptures((prev) => prev.map((c) => c.id === item.id ? { ...c, uploadStatus: 'uploading' } : c));
    if (selectedItem?.id === item.id) setSelectedItem((p) => ({ ...p, uploadStatus: 'uploading' }));
    try {
      await updateCaptureStatus(item.id, 'uploading');
      await uploadMedia(item.localUri, item.s3DataKey, () => {});
      const final = { ...item, uploadStatus: 'uploaded', uploadedAt: new Date().toISOString() };
      await uploadMetadata(final, item.s3MetadataKey);
      await updateIndex(final);
      await updateCaptureStatus(item.id, 'uploaded');
      triggerToast('Upload successful!');
      await loadCaptures();
      if (selectedItem?.id === item.id) setSelectedItem(final);
    } catch {
      await updateCaptureStatus(item.id, 'failed');
      triggerToast('Upload failed. Try again.');
      await loadCaptures();
      if (selectedItem?.id === item.id) setSelectedItem((p) => ({ ...p, uploadStatus: 'failed' }));
    } finally { setIsRetrying(false); }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteCapture(id);
      setSelectedItem(null);
      triggerToast('Capture deleted');
      loadCaptures();
    } catch { triggerToast('Error deleting item'); }
  };

  const handleSaveEdit = async () => {
    if (!selectedItem || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateCapture(selectedItem.id, { tag: editTag.trim(), notes: editNotes.trim() });
      setSelectedItem(updated);
      setCaptures((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setIsEditing(false);
      triggerToast('Changes saved');
    } catch { triggerToast('Failed to save'); }
    finally { setIsSavingEdit(false); }
  };

  const filteredCaptures = captures.filter((c) =>
    activeFilter === 'All' || (c.tag && c.tag.toLowerCase() === activeFilter.toLowerCase())
  );

  // ─── FILES GRID VIEW ──────────────────────────────────────────────────────
  if (view === 'grid') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gridHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.gridHeaderTitle}>Library</Text>
          <View style={{ width: 32 }} />
        </View>

        {allFiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="folder-open-outline" size={56} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No files yet</Text>
            <Text style={styles.emptySubtitle}>Create a file from the home screen</Text>
          </View>
        ) : (
          <FlatList
            data={allFiles}
            keyExtractor={(f) => f.id}
            numColumns={CUBE_COLS}
            contentContainerStyle={styles.cubeGrid}
            columnWrapperStyle={styles.cubeRow}
            renderItem={({ item }) => (
              <FileCube file={item} onPress={() => openFile(item)} styles={styles} theme={theme} />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── CAPTURES VIEW ────────────────────────────────────────────────────────
  const checklistItems = Object.values(checklist?.progress || {});
  const checklistChecked = checklistItems.filter((i) => i.checked).length;
  const checklistTotal = checklistItems.length;
  const checklistDone = checklistTotal > 0 && checklistChecked === checklistTotal;

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast */}
      {toastMessage !== '' && (
        <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
          <View style={styles.toastContent}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.accent} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setView('grid')} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerTitleWrap} onPress={() => setShowFilePicker(true)}>
          <MaterialCommunityIcons name="folder" size={15} color="#93b4f0" />
          <Text style={styles.headerTitle} numberOfLines={1}>{activeFile?.name}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        {checklist ? (
          <View style={[styles.clBadge, checklistDone && styles.clBadgeDone]}>
            <MaterialCommunityIcons
              name={checklistDone ? 'check-circle' : 'format-list-checks'}
              size={11}
              color={checklistDone ? theme.success : theme.textSecondary}
            />
            <Text style={[styles.clBadgeText, checklistDone && styles.clBadgeTextDone]}>
              {checklistChecked}/{checklistTotal}
            </Text>
          </View>
        ) : (
          <Text style={styles.headerCount}>{captures.length > 0 ? captures.length : ''}</Text>
        )}
      </View>

      {/* File switcher dropdown */}
      <Modal visible={showFilePicker} transparent animationType="fade" onRequestClose={() => setShowFilePicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowFilePicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Switch File</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {allFiles.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.pickerItem, f.id === activeFile?.id && styles.pickerItemActive]}
                  onPress={() => openFile(f)}
                >
                  <MaterialCommunityIcons name="folder" size={16} color={f.id === activeFile?.id ? theme.accent : '#93b4f0'} />
                  <Text style={[styles.pickerItemText, f.id === activeFile?.id && styles.pickerItemTextActive]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={styles.pickerItemCount}>{f.captureCount || 0}</Text>
                  {f.id === activeFile?.id && <MaterialCommunityIcons name="check" size={15} color={theme.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter chips */}
      {QUICK_TAGS.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterBar} contentContainerStyle={styles.filterScroll}>
          {['All', ...QUICK_TAGS].map((f) => (
            <TagChip key={f} label={f} isSelected={activeFilter === f} onPress={() => setActiveFilter(f)} />
          ))}
        </ScrollView>
      )}

      {/* Captures — mixed layout */}
      {captures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="camera-outline" size={48} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>No captures yet</Text>
          <Text style={styles.emptySubtitle}>Go take a photo or video to get started</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Camera', { file: activeFile })}>
            <Text style={styles.emptyBtnText}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.mixedList} showsVerticalScrollIndicator={false}>
          {(() => {
            const rows = [];
            let i = 0;
            while (i < filteredCaptures.length) {
              const cap = filteredCaptures[i];
              const isMedia = cap.type === 'photo' || cap.type === 'video';
              if (isMedia) {
                const next = filteredCaptures[i + 1];
                const nextIsMedia = next && (next.type === 'photo' || next.type === 'video');
                if (nextIsMedia) {
                  rows.push(
                    <View key={`pair_${cap.id}`} style={styles.mediaPair}>
                      <View style={styles.mediaCell}>
                        <MediaThumbnail item={cap} onPress={() => setSelectedItem(cap)} onRetryUpload={() => handleRetryUpload(cap)} />
                      </View>
                      <View style={styles.mediaCell}>
                        <MediaThumbnail item={next} onPress={() => setSelectedItem(next)} onRetryUpload={() => handleRetryUpload(next)} />
                      </View>
                    </View>
                  );
                  i += 2;
                } else {
                  rows.push(
                    <View key={`solo_${cap.id}`} style={styles.mediaSolo}>
                      <MediaThumbnail item={cap} onPress={() => setSelectedItem(cap)} onRetryUpload={() => handleRetryUpload(cap)} />
                    </View>
                  );
                  i += 1;
                }
              } else {
                rows.push(
                  <View key={cap.id} style={styles.dataRow}>
                    <MediaThumbnail item={cap} onPress={() => setSelectedItem(cap)} onRetryUpload={() => handleRetryUpload(cap)} />
                  </View>
                );
                i += 1;
              }
            }
            return rows;
          })()}
        </ScrollView>
      )}

      {/* Capture detail modal */}
      <Modal visible={selectedItem !== null} animationType="slide" transparent={false} onRequestClose={() => setSelectedItem(null)}>
        {selectedItem && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setIsEditing(false); setSelectedItem(null); }} style={styles.backBtn}>
                <MaterialCommunityIcons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>{isEditing ? 'Edit' : 'Details'}</Text>
              {isEditing ? (
                <TouchableOpacity style={styles.backBtn} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.backBtn} onPress={() => { setEditTag(selectedItem.tag || ''); setEditNotes(selectedItem.notes || ''); setIsEditing(true); }}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.accent} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Media area — photo/video only */}
              {(selectedItem.type === 'photo' || selectedItem.type === 'video') && (
                <View style={styles.detailMediaContainer}>
                  {selectedItem.type === 'video' ? (
                    <VideoPlayer uri={selectedItem.localUri} style={styles.detailMedia} />
                  ) : selectedItem.localUri ? (
                    <Image source={{ uri: selectedItem.localUri }} style={styles.detailMedia} resizeMode="contain" />
                  ) : (
                    <View style={[styles.detailMedia, styles.detailPlaceholder]}>
                      <MaterialCommunityIcons name="image-off-outline" size={48} color="#3D3D3D" />
                    </View>
                  )}
                </View>
              )}

              {/* Text note hero */}
              {selectedItem.type === 'text' && (
                <View style={styles.textHero}>
                  <View style={styles.textHeroTypeRow}>
                    <MaterialCommunityIcons name="text-box-outline" size={16} color={theme.success} />
                    <Text style={styles.textHeroType}>TEXT NOTE · {(selectedItem.unit || 'note').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.textHeroTitle}>{selectedItem.tag}</Text>
                  <Text style={styles.textHeroContent}>{selectedItem.content || selectedItem.notes}</Text>
                </View>
              )}

              {/* Measurement hero */}
              {selectedItem.type === 'measurement' && (
                <View style={styles.measureHero}>
                  <View style={styles.textHeroTypeRow}>
                    <MaterialCommunityIcons name="ruler" size={16} color={theme.warning} />
                    <Text style={[styles.textHeroType, { color: theme.warning }]}>MEASUREMENT</Text>
                  </View>
                  <Text style={[styles.textHeroTitle, { color: theme.textSecondary, fontSize: 14 }]}>{selectedItem.tag}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                    <Text style={styles.measureHeroValue}>{selectedItem.content}</Text>
                    <Text style={styles.measureHeroUnit}>{selectedItem.unit}</Text>
                  </View>
                  {selectedItem.notes ? <Text style={styles.measureHeroNotes}>{selectedItem.notes}</Text> : null}
                </View>
              )}

              <View style={styles.detailContent}>
                <View style={styles.detailBadges}>
                  <View style={[styles.typeBadge, selectedItem.type === 'text' && { backgroundColor: theme.successSubtle },
                    selectedItem.type === 'measurement' && { backgroundColor: theme.warningSubtle }]}>
                    <Text style={[styles.typeBadgeText,
                      selectedItem.type === 'text' && { color: theme.success },
                      selectedItem.type === 'measurement' && { color: theme.warning },
                    ]}>{selectedItem.type?.toUpperCase()}</Text>
                  </View>
                </View>

                {isEditing ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionLabel}>{selectedItem.type === 'measurement' ? 'Label' : 'Title'}</Text>
                    <TextInput style={styles.editInput} value={editTag} onChangeText={setEditTag}
                      placeholder="Title…" placeholderTextColor={theme.textMuted} autoCapitalize="words" />
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Notes</Text>
                    <TextInput style={[styles.editInput, styles.editNotesInput]} value={editNotes}
                      onChangeText={setEditNotes} placeholder="Add notes…" placeholderTextColor={theme.textMuted}
                      multiline textAlignVertical="top" />
                    <TouchableOpacity style={[styles.saveEditBtn, isSavingEdit && { opacity: 0.5 }]}
                      onPress={handleSaveEdit} disabled={isSavingEdit}>
                      {isSavingEdit ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.saveEditBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                  </View>
                ) : (selectedItem.type === 'photo' || selectedItem.type === 'video') ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionLabel}>Notes</Text>
                    <Text style={styles.notesText}>{selectedItem.notes || 'No notes added.'}</Text>
                  </View>
                ) : null}

                {checklist && (() => {
                  const linked = Object.entries(checklist.progress || {})
                    .filter(([, p]) => (p.captureIds || []).includes(selectedItem.id))
                    .map(([itemId, p]) => {
                      const t = CHECKLIST_TEMPLATES.find((t) => t.id === p.templateId);
                      const it = t?.items.find((i) => i.id === itemId) || checklist.customItems?.find((i) => i.id === itemId);
                      return it ? { ...it, templateName: t?.name || 'Custom', checked: p.checked, note: p.note || '' } : null;
                    }).filter(Boolean);
                  if (!linked.length) return null;
                  return (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionLabel}>Linked checklist items</Text>
                      {linked.map((it) => (
                        <View key={it.id} style={styles.linkedItem}>
                          <MaterialCommunityIcons name={it.checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={17} color={it.checked ? theme.success : theme.textMuted} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.linkedItemLabel}>{it.label}</Text>
                            <Text style={styles.linkedItemTemplate}>{it.templateName}</Text>
                            {it.note ? <Text style={styles.linkedItemNote}>{it.note}</Text> : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })()}

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>Location</Text>
                  {selectedItem.gps ? (
                    <>
                      <View style={styles.metaRow}><Text style={styles.metaLabel}>Latitude</Text><Text style={styles.metaValue}>{selectedItem.gps.latitude?.toFixed(6)} N</Text></View>
                      <View style={styles.metaRow}><Text style={styles.metaLabel}>Longitude</Text><Text style={styles.metaValue}>{selectedItem.gps.longitude?.toFixed(6)} E</Text></View>
                      {selectedItem.gps.altitude != null && <View style={styles.metaRow}><Text style={styles.metaLabel}>Altitude</Text><Text style={styles.metaValue}>{selectedItem.gps.altitude?.toFixed(1)} m</Text></View>}
                    </>
                  ) : <Text style={styles.metaEmpty}>No GPS data.</Text>}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>Metadata</Text>
                  <View style={styles.metaRow}><Text style={styles.metaLabel}>Captured</Text><Text style={styles.metaValue}>{new Date(selectedItem.capturedAt).toLocaleString()}</Text></View>
                  <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel}>Upload</Text>
                    <Text style={[styles.metaValue,
                      selectedItem.uploadStatus === 'uploaded' && { color: theme.success },
                      selectedItem.uploadStatus === 'uploading' && { color: theme.accent },
                      selectedItem.uploadStatus === 'failed' && { color: theme.error },
                    ]}>{selectedItem.uploadStatus?.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {(selectedItem.uploadStatus === 'failed' || selectedItem.uploadStatus === 'local') && (
                <TouchableOpacity style={[styles.actionBtn, styles.retryBtn]} onPress={() => handleRetryUpload(selectedItem)} disabled={isRetrying}>
                  {isRetrying ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>{selectedItem.uploadStatus === 'local' ? 'Upload to S3' : 'Re-upload'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteItem(selectedItem.id)} disabled={isRetrying}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.error} />
                <Text style={[styles.actionBtnText, { color: theme.error }]}>Delete Capture</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}
