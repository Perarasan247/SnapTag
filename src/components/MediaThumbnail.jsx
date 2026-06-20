import { useState } from 'react';
import { View, Image, StyleSheet, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import UploadStatusIcon from './UploadStatusIcon';

const makeStyles = (theme) => StyleSheet.create({
  cell: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#181818',
  },
  cellPressed: { opacity: 0.82 },
  image: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818', gap: 6 },
  placeholderText: { color: '#666', fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTopRight: { position: 'absolute', top: 6, right: 6 },
  tagBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Text note card
  textCell: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.success + '33',
    padding: 12,
    gap: 6,
    justifyContent: 'flex-start',
  },
  textTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  textTypeLabel: { color: theme.success, fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  textTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  textContent: { color: theme.textSecondary, fontSize: 11, lineHeight: 15 },

  // Checklist card
  checklistCell: {
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#6366F1' + '44',
    padding: 12,
    gap: 6,
    justifyContent: 'flex-start',
  },
  clProgressTrack: { height: 3, backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: 2, overflow: 'hidden' },
  clProgressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 },
  clProgressText: { color: '#6366F1', fontSize: 10, fontWeight: '600' },

  // Measurement card
  measureCell: {
    backgroundColor: theme.warningSubtle,
    borderWidth: 1,
    borderColor: theme.warning + '44',
    padding: 12,
    gap: 4,
    justifyContent: 'flex-start',
  },
  measureLabel: { color: theme.textSecondary, fontSize: 11, lineHeight: 14 },
  measureValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  measureValue: { color: theme.textPrimary, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  measureUnit: { color: theme.warning, fontSize: 14, fontWeight: '600' },
  measureNotes: { color: theme.textMuted, fontSize: 10, fontStyle: 'italic' },
});

function TextCard({ item, onPress, theme, styles }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, styles.textCell, pressed && styles.cellPressed]}>
      <View style={styles.textTypeRow}>
        <MaterialCommunityIcons name="text-box-outline" size={13} color={theme.success} />
        <Text style={styles.textTypeLabel}>{(item.unit || 'note').toUpperCase()}</Text>
      </View>
      <Text style={styles.textTitle} numberOfLines={2}>{item.tag || 'Note'}</Text>
      <Text style={styles.textContent} numberOfLines={3}>{item.content || item.notes}</Text>
    </Pressable>
  );
}

function MeasurementCard({ item, onPress, theme, styles }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, styles.measureCell, pressed && styles.cellPressed]}>
      <View style={styles.textTypeRow}>
        <MaterialCommunityIcons name="ruler" size={13} color={theme.warning} />
        <Text style={[styles.textTypeLabel, { color: theme.warning }]}>MEASUREMENT</Text>
      </View>
      <Text style={styles.measureLabel} numberOfLines={2}>{item.tag || 'Measurement'}</Text>
      <View style={styles.measureValueRow}>
        <Text style={styles.measureValue} numberOfLines={1}>{item.content}</Text>
        <Text style={styles.measureUnit}>{item.unit}</Text>
      </View>
      {item.notes ? <Text style={styles.measureNotes} numberOfLines={1}>{item.notes}</Text> : null}
    </Pressable>
  );
}

function ChecklistCard({ item, onPress, styles }) {
  let summary = { checked: 0, total: 0, pct: 0, templateName: item.tag || 'Checklist' };
  try {
    const data = JSON.parse(item.content || '{}');
    if (data.summary) summary = { ...summary, ...data.summary, templateName: item.tag || 'Checklist' };
  } catch {}
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, styles.checklistCell, pressed && styles.cellPressed]}>
      <View style={styles.textTypeRow}>
        <MaterialCommunityIcons name="format-list-checks" size={13} color="#6366F1" />
        <Text style={[styles.textTypeLabel, { color: '#6366F1' }]}>CHECKLIST</Text>
      </View>
      <Text style={styles.textTitle} numberOfLines={2}>{summary.templateName}</Text>
      <View style={styles.clProgressTrack}>
        <View style={[styles.clProgressFill, { width: `${summary.pct}%` }]} />
      </View>
      <Text style={styles.clProgressText}>{summary.checked}/{summary.total} · {summary.pct}%</Text>
    </Pressable>
  );
}

export default function MediaThumbnail({ item, onPress, onRetryUpload }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [imgError, setImgError] = useState(false);

  if (item.type === 'text') return <TextCard item={item} onPress={onPress} theme={theme} styles={styles} />;
  if (item.type === 'measurement') return <MeasurementCard item={item} onPress={onPress} theme={theme} styles={styles} />;
  if (item.type === 'checklist') return <ChecklistCard item={item} onPress={onPress} styles={styles} />;

  const isVideo = item.type === 'video';
  const canUpload = item.uploadStatus === 'failed' || item.uploadStatus === 'local';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}>
      {item.localUri && !imgError ? (
        <Image source={{ uri: item.localUri }} style={styles.image} resizeMode="cover" onError={() => setImgError(true)} />
      ) : (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons name={isVideo ? 'video-off-outline' : 'image-off-outline'} size={32} color="#666" />
          <Text style={styles.placeholderText}>{item.tag || (isVideo ? 'Video' : 'Photo')}</Text>
        </View>
      )}
      {isVideo && item.localUri && !imgError && (
        <View style={styles.videoOverlay}>
          <MaterialCommunityIcons name="play" size={28} color="rgba(255,255,255,0.92)" />
        </View>
      )}
      <View style={styles.badgeTopRight}>
        <UploadStatusIcon status={item.uploadStatus} onRetryPress={canUpload ? onRetryUpload : undefined} />
      </View>
      {item.tag && (
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{item.tag.toLowerCase()}</Text>
        </View>
      )}
    </Pressable>
  );
}
