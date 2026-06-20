import { View, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';

export default function UploadStatusIcon({ status, onRetryPress }) {
  if (status === 'uploaded') {
    return (
      <View style={[styles.badge, styles.uploaded]}>
        <MaterialCommunityIcons name="cloud-check" size={13} color="#10B981" />
      </View>
    );
  }

  if (status === 'uploading') {
    return (
      <View style={[styles.badge, styles.uploading]}>
        <ActivityIndicator size="small" color="#93b4f0" style={styles.spinner} />
      </View>
    );
  }

  if (status === 'local') {
    return (
      <Pressable
        onPress={onRetryPress}
        style={({ pressed }) => [styles.badge, styles.local, pressed && styles.localPressed]}
      >
        <MaterialCommunityIcons name="cloud-off-outline" size={13} color="#a1a1aa" />
      </Pressable>
    );
  }

  if (status === 'failed') {
    return (
      <Pressable
        onPress={onRetryPress}
        style={({ pressed }) => [styles.badge, styles.failed, pressed && styles.failedPressed]}
      >
        <MaterialCommunityIcons name="cloud-alert" size={13} color="#EF4444" />
      </Pressable>
    );
  }

  return (
    <View style={[styles.badge, styles.pending]}>
      <MaterialCommunityIcons name="clock-outline" size={13} color="#737373" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: { transform: [{ scale: 0.55 }] },
  uploaded: { backgroundColor: '#052E1C' },
  uploading: { backgroundColor: '#1E3A5F' },
  local: { backgroundColor: 'rgba(0,0,0,0.55)' },
  localPressed: { backgroundColor: 'rgba(80,80,80,0.55)' },
  failed: { backgroundColor: '#2D0E0E' },
  failedPressed: { backgroundColor: 'rgba(80,20,20,0.9)' },
  pending: { backgroundColor: 'rgba(0,0,0,0.55)' },
});
