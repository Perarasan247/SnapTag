import { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  FlatList, StatusBar, Modal, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getTrashFiles, restoreFile, permanentDeleteFile } from '../services/fileService';

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border, gap: 8,
  },
  backBtn: { padding: 4 },
  headerMeta: { flex: 1 },
  headerTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  headerSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },

  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  hintText: { color: theme.textMuted, fontSize: 12, flex: 1 },

  list: { padding: 16, gap: 8, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.border, padding: 14,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { color: theme.textSecondary, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  cardMeta: { color: theme.textMuted, fontSize: 12 },

  restoreBtn: {
    padding: 8, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.accentSubtle,
  },
  deleteBtn: {
    padding: 8, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.errorSubtle,
  },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: theme.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 10 },
  emptySub: { color: theme.textMuted, fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: {
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    padding: 24, width: '100%', maxWidth: 360,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.border,
  },
  sheetTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginTop: 4 },
  sheetSub: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 2 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  cancelBtn: {
    flex: 1, height: 44, borderRadius: theme.borderRadius.sm,
    borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1, height: 44, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default function TrashScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null); // { file, mode: 'restore'|'delete' }
  const [showConfirm, setShowConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => { load(); }, [])
  );

  const load = async () => {
    setLoading(true);
    const trash = await getTrashFiles();
    setFiles(trash);
    setLoading(false);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const confirmAction = (file, mode) => {
    if (Platform.OS === 'web') {
      setActionTarget({ file, mode });
      setShowConfirm(true);
    } else {
      if (mode === 'restore') {
        Alert.alert('Restore Site', `Restore "${file.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', onPress: () => doRestore(file) },
        ]);
      } else {
        Alert.alert(
          'Delete Forever',
          `Permanently delete "${file.name}"? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => doDelete(file) },
          ]
        );
      }
    }
  };

  const doRestore = async (file) => {
    await restoreFile(file.id);
    load();
  };

  const doDelete = async (file) => {
    await permanentDeleteFile(file.id);
    load();
  };

  const handleConfirm = async () => {
    if (!actionTarget) return;
    setShowConfirm(false);
    if (actionTarget.mode === 'restore') await doRestore(actionTarget.file);
    else await doDelete(actionTarget.file);
    setActionTarget(null);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name="folder-remove-outline" size={20} color={theme.textMuted} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMeta}>
          {item.captureCount > 0 ? `${item.captureCount} capture${item.captureCount !== 1 ? 's' : ''} · ` : ''}
          Deleted {formatDate(item.deletedAt)}
        </Text>
      </View>
      <TouchableOpacity style={styles.restoreBtn} onPress={() => confirmAction(item, 'restore')}>
        <MaterialCommunityIcons name="restore" size={18} color={theme.accent} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmAction(item, 'delete')}>
        <MaterialCommunityIcons name="delete-forever-outline" size={18} color={theme.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle}>Recycle Bin</Text>
          <Text style={styles.headerSub}>
            {files.length > 0 ? `${files.length} deleted site${files.length !== 1 ? 's' : ''}` : 'Empty'}
          </Text>
        </View>
      </View>

      {files.length === 0 && !loading ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="delete-empty-outline" size={56} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>Recycle bin is empty</Text>
          <Text style={styles.emptySub}>Deleted sites will appear here</Text>
        </View>
      ) : (
        <>
          <View style={styles.hint}>
            <MaterialCommunityIcons name="information-outline" size={14} color={theme.textMuted} />
            <Text style={styles.hintText}>Tap restore to recover · Tap trash icon to delete forever</Text>
          </View>
          <FlatList
            data={files}
            keyExtractor={(f) => f.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Web confirm modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <MaterialCommunityIcons
              name={actionTarget?.mode === 'restore' ? 'restore' : 'delete-forever-outline'}
              size={32}
              color={actionTarget?.mode === 'restore' ? theme.accent : theme.error}
            />
            <Text style={styles.sheetTitle}>
              {actionTarget?.mode === 'restore' ? 'Restore Site?' : 'Delete Forever?'}
            </Text>
            <Text style={styles.sheetSub}>
              {actionTarget?.mode === 'restore'
                ? `"${actionTarget?.file?.name}" will be restored to your sites.`
                : `"${actionTarget?.file?.name}" will be permanently deleted. This cannot be undone.`}
            </Text>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: actionTarget?.mode === 'restore' ? theme.accent : theme.error },
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>
                  {actionTarget?.mode === 'restore' ? 'Restore' : 'Delete Forever'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
