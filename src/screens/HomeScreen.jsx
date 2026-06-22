import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, StatusBar, KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getAllFiles, createFile, deleteFile } from '../services/fileService';

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    backgroundColor: theme.navBg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  headerFieldText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  searchIconBtn: { padding: 4, marginTop: 4 },

  // Search mode header
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: {
    flex: 1, color: '#fff', fontSize: 16, paddingVertical: 0,
  },
  searchCloseBtn: { padding: 4 },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 22 },

  sectionLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10,
  },

  newSiteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 30 },
  input: {
    flex: 1, height: 46,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 14,
    fontSize: 15, color: theme.textPrimary,
  },
  addBtn: {
    width: 46, height: 46, borderRadius: theme.borderRadius.md,
    backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.35 },

  sitesHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sitesBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center',
  },
  sitesBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  siteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    padding: 14, marginBottom: 10,
    shadowColor: '#0D2461', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  siteIconWrap: {
    width: 44, height: 44, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center',
  },
  siteInfo: { flex: 1, minWidth: 0 },
  siteName: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  siteMeta: { color: theme.textSecondary, fontSize: 12 },
  siteMetaCaptures: { color: theme.accent, fontWeight: '600' },
  trashBtn: { padding: 6 },

  listContent: { paddingBottom: 8 },

  emptyState: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { color: theme.textMuted, fontSize: 15, fontWeight: '500' },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderTopWidth: 1, borderTopColor: theme.border,
    paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 4 : 12,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  navLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
  navLabelActive: { color: theme.accent },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  alertSheet: {
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.lg,
    padding: 24, gap: 6,
  },
  alertTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  alertSub: { color: theme.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  alertActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  alertCancelBtn: {
    flex: 1, height: 44, borderRadius: theme.borderRadius.sm,
    borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center',
  },
  alertCancelText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  alertConfirmBtn: {
    flex: 1, height: 44, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.error, justifyContent: 'center', alignItems: 'center',
  },
  alertConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { logout } = useAuth();
  const [files, setFiles] = useState([]);
  const [newFileName, setNewFileName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  useFocusEffect(useCallback(() => { loadFiles(); }, []));

  const loadFiles = async () => {
    const all = await getAllFiles();
    setFiles(all);
  };

  const openSearch = () => {
    setSearchMode(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchMode(false);
    setSearchQuery('');
  };

  const filteredFiles = searchQuery.trim()
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const handleCreate = async () => {
    if (!newFileName.trim() || creating) return;
    setCreating(true);
    try {
      const file = await createFile(newFileName.trim(), []);
      setNewFileName('');
      navigation.navigate('SiteSetup', { file });
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  const handleDelete = (file) => {
    if (Platform.OS === 'web') {
      setDeleteTarget(file);
    } else {
      Alert.alert('Delete Site', `Delete "${file.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deleteFile(file.id); loadFiles(); },
        },
      ]);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFile(deleteTarget.id);
    setDeleteTarget(null);
    loadFiles();
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderFile = ({ item }) => (
    <TouchableOpacity
      style={styles.siteCard}
      onPress={() => navigation.navigate('InspectionHub', { file: item })}
      activeOpacity={0.75}
    >
      <View style={styles.siteIconWrap}>
        <MaterialCommunityIcons name="folder" size={22} color="#fff" />
      </View>
      <View style={styles.siteInfo}>
        <Text style={styles.siteName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.siteMeta}>
          {item.captureCount > 0 ? (
            <Text style={styles.siteMetaCaptures}>⊞ {item.captureCount} capture{item.captureCount !== 1 ? 's' : ''}{'  '}</Text>
          ) : null}
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.trashBtn}
        onPress={() => handleDelete(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.navBg} />

      <View style={styles.header}>
        {searchMode ? (
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.7)" />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search sites…"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="none"
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchCloseBtn} onPress={closeSearch}>
              <MaterialCommunityIcons name="close" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>SnapTag</Text>
              <View style={styles.headerSubRow}>
                <Text style={styles.headerFieldText}>Field Inspection</Text>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.searchIconBtn} onPress={openSearch}>
              <MaterialCommunityIcons name="magnify" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>

          <Text style={styles.sectionLabel}>New Site</Text>
          <View style={styles.newSiteRow}>
            <TextInput
              style={styles.input}
              value={newFileName}
              onChangeText={setNewFileName}
              placeholder="Enter site name..."
              placeholderTextColor={theme.textMuted}
              returnKeyType="go"
              onSubmitEditing={handleCreate}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.addBtn, !newFileName.trim() && styles.addBtnDisabled]}
              onPress={handleCreate}
              disabled={!newFileName.trim() || creating}
            >
              <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.sitesHeaderRow}>
            <Text style={styles.sectionLabel}>
              {searchMode && searchQuery.trim() ? `Results (${filteredFiles.length})` : 'My Sites'}
            </Text>
            {!searchMode && files.length > 0 && (
              <View style={styles.sitesBadge}>
                <Text style={styles.sitesBadgeText}>{files.length}</Text>
              </View>
            )}
          </View>

          <FlatList
            data={filteredFiles}
            keyExtractor={(item) => item.id}
            renderItem={renderFile}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name={searchMode ? 'magnify-close' : 'folder-open-outline'}
                  size={52}
                  color={theme.textMuted}
                />
                <Text style={styles.emptyTitle}>
                  {searchMode && searchQuery.trim() ? `No sites matching "${searchQuery}"` : 'No sites yet'}
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Library', {})}>
          <MaterialCommunityIcons name="view-grid-outline" size={22} color={theme.textMuted} />
          <Text style={styles.navLabel}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Trash')}>
          <MaterialCommunityIcons name="delete-outline" size={22} color={theme.textMuted} />
          <Text style={styles.navLabel}>Recycle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons name="cog-outline" size={22} color={theme.textMuted} />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Web delete confirm */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertSheet}>
            <Text style={styles.alertTitle}>Delete Site?</Text>
            <Text style={styles.alertSub}>{`"${deleteTarget?.name}" and all its captures will be deleted.`}</Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertConfirmBtn} onPress={confirmDelete}>
                <Text style={styles.alertConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
