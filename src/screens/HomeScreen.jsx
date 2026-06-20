import { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, StatusBar, KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getAllFiles, createFile, deleteFile } from '../services/fileService';
import { useAuth } from '../contexts/AuthContext';

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  inner: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingTop: 20, paddingBottom: 26,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  headerBtn: { padding: 6 },
  headerTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { color: theme.textMuted, fontSize: 13, marginTop: 3 },

  sectionLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, borderBottomWidth: 1, borderBottomColor: theme.border,
    paddingVertical: 11, paddingHorizontal: 2,
    fontSize: 15, color: theme.textPrimary, backgroundColor: 'transparent',
  },
  createBtn: {
    width: 44, height: 44, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  createBtnDisabled: { opacity: 0.35 },

  listContent: { paddingBottom: 40, marginTop: 12 },

  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 8,
  },
  fileIcon: {
    width: 36, height: 36, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.accentSubtle, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { color: theme.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  fileMeta: { color: theme.textSecondary, fontSize: 12 },
  deleteBtn: { padding: 4 },

  emptyState: { alignItems: 'center', paddingTop: 56 },
  emptyTitle: { color: theme.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  emptySub: { color: theme.textMuted, fontSize: 13, textAlign: 'center' },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertSheet: {
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    padding: 24, width: '100%', maxWidth: 360,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.border,
  },
  alertTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginTop: 4 },
  alertSub: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 2 },
  alertActions: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  alertCancelBtn: {
    flex: 1, height: 44, borderRadius: theme.borderRadius.sm,
    borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center',
  },
  alertCancelText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  alertConfirmBtn: {
    flex: 1, height: 44, borderRadius: theme.borderRadius.sm,
    backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center',
  },
  alertConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default function HomeScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(theme);
  const { logout } = useAuth();
  const [files, setFiles] = useState([]);
  const [newFileName, setNewFileName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [])
  );

  const loadFiles = async () => {
    const all = await getAllFiles();
    setFiles(all);
  };

  const handleCreate = async () => {
    if (!newFileName.trim() || creating) return;
    setCreating(true);
    try {
      const file = await createFile(newFileName.trim(), []);
      setNewFileName('');
      navigation.navigate('SiteSetup', { file });
    } catch (e) {
      console.error('Failed to create site:', e);
    }
    setCreating(false);
  };

  const handleDeleteFile = (file) => {
    if (Platform.OS === 'web') {
      setDeleteTarget(file);
    } else {
      Alert.alert(
        'Delete Site',
        `Delete "${file.name}"? All captures will be lost.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => { await deleteFile(file.id); loadFiles(); },
          },
        ]
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFile(deleteTarget.id);
    setDeleteTarget(null);
    loadFiles();
  };

  const formatRelativeDate = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  };

  const renderFile = ({ item }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => navigation.navigate('InspectionHub', { file: item })}
      onLongPress={() => handleDeleteFile(item)}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={styles.fileIcon}>
        <MaterialCommunityIcons name="folder" size={18} color="#93b4f0" />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.fileMeta}>
          {item.captureCount > 0
            ? `${item.captureCount} capture${item.captureCount !== 1 ? 's' : ''} · ${formatRelativeDate(item.createdAt)}`
            : formatRelativeDate(item.createdAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteFile(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteBtn}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={17} color={theme.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>SnapTag</Text>
            <Text style={styles.headerSub}>Field capture</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Library', {})}>
              <MaterialCommunityIcons name="image-multiple-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Trash')}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={toggleTheme}>
              <MaterialCommunityIcons
                name={isDark ? 'weather-sunny' : 'weather-night'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                if (Platform.OS === 'web') {
                  setShowSignOutConfirm(true);
                } else {
                  Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: logout },
                  ]);
                }
              }}
            >
              <MaterialCommunityIcons name="logout" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>New site</Text>
        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            value={newFileName}
            onChangeText={setNewFileName}
            placeholder="Name a site…"
            placeholderTextColor={theme.textMuted}
            returnKeyType="go"
            onSubmitEditing={handleCreate}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.createBtn, !newFileName.trim() && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!newFileName.trim() || creating}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          renderItem={renderFile}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={files.length > 0 ? (
            <Text style={[styles.sectionLabel, { marginTop: 26 }]}>
              {`Sites (${files.length})`}
            </Text>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="folder-open-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No sites yet</Text>
              <Text style={styles.emptySub}>Name a site above to begin</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>

      {/* Sign out confirm (web only) */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade" onRequestClose={() => setShowSignOutConfirm(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertSheet}>
            <MaterialCommunityIcons name="logout" size={32} color={theme.textSecondary} />
            <Text style={styles.alertTitle}>Sign Out?</Text>
            <Text style={styles.alertSub}>You will need to sign in again to access your files.</Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancelBtn} onPress={() => setShowSignOutConfirm(false)}>
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertConfirmBtn, { backgroundColor: theme.accent }]} onPress={logout}>
                <Text style={styles.alertConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm (web only) */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertSheet}>
            <MaterialCommunityIcons name="trash-can-outline" size={32} color={theme.error} />
            <Text style={styles.alertTitle}>Delete Site?</Text>
            <Text style={styles.alertSub}>
              {`"${deleteTarget?.name}" and all its captures will be permanently deleted.`}
            </Text>
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
