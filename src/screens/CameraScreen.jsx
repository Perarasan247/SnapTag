import { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShutterButton from '../components/ShutterButton';
import ChecklistPanel from '../components/ChecklistPanel';
import { getCapturesByFile } from '../services/storageService';
import { getFileChecklist, assignTemplates } from '../services/checklistService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  darkBackground: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  permissionsContainer: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionCard: { width: '100%', backgroundColor: theme.surface, borderRadius: theme.borderRadius.xl, padding: 24, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  permissionTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  permissionDesc: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  permissionList: { width: '100%', marginBottom: 28 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: theme.card, paddingHorizontal: 16, paddingVertical: 12, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.border },
  permissionText: { color: theme.textPrimary, fontSize: 14, marginLeft: 12 },
  primaryButton: { backgroundColor: theme.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: theme.borderRadius.full, width: '100%', alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  flashOverlay: { backgroundColor: '#FFFFFF', zIndex: 99 },
  overlayContainer: { flex: 1, justifyContent: 'space-between', zIndex: 10 },
  fileHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(8,8,8,0.78)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  fileHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  fileHeaderName: { color: '#F5F5F5', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  checklistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  checklistBtnDone: { backgroundColor: 'rgba(34,197,94,0.18)' },
  checklistBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  checklistBtnTextDone: { color: theme.success },
  topBar: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(8,8,8,0.5)',
  },
  iconButton: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.borderRadius.full,
    padding: 4,
  },
  modePill: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: theme.borderRadius.full },
  modePillActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  modeText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: '#FFFFFF' },
  bottomBarOuter: { position: 'relative', width: '100%' },
  recordingIndicator: {
    position: 'absolute',
    bottom: 88,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    zIndex: 1,
  },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 7 },
  recTimer: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  bottomBar: {
    height: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(8,8,8,0.82)',
  },
  thumbnailContainer: {
    width: 54, height: 54,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: '#181818',
  },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { flex: 1, backgroundColor: '#181818', justifyContent: 'center', alignItems: 'center' },
  flipBtn: { width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
});

export default function CameraScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { file, preLinkedItemId, preLinkedTemplateId, preLinkedTemplateName, preLinkedItemLabel } = route.params;
  const isFocused = useIsFocused();
  const cameraRef = useRef(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [locationPermission, setLocationPermission] = useState('unknown');

  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [cameraMode, setCameraMode] = useState(route.params?.mode === 'video' ? 'video' : 'photo');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef(null);

  const [lastCapture, setLastCapture] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const [checklist, setChecklist] = useState(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const recOpacity = useRef(new Animated.Value(1)).current;
  const recAnimationRef = useRef(null);
  const gpsPromiseRef = useRef(null);

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => setLocationPermission(status))
      .catch(() => setLocationPermission('denied'));
  }, []);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    const templateIds = file.checklistTemplateIds || [];
    if (templateIds.length === 0) return;

    let cl = await getFileChecklist(file.id);
    if (!cl) {
      cl = await assignTemplates(file.id, templateIds);
    }
    setChecklist(cl);
  };

  useEffect(() => {
    if (isRecording) {
      recAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(recOpacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
          Animated.timing(recOpacity, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      recAnimationRef.current.start();
    } else {
      recAnimationRef.current?.stop();
      recOpacity.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isFocused) loadLastCapture();
  }, [isFocused]);

  const loadLastCapture = async () => {
    try {
      const captures = await getCapturesByFile(file.id);
      if (captures.length > 0) {
        const sorted = [...captures].sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt));
        setLastCapture(sorted[0]);
      } else {
        setLastCapture(null);
      }
    } catch (e) {
      console.error('Failed to load last capture:', e);
    }
  };

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((p) => p + 1), 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  const formatTimer = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleRequestAllPermissions = async () => {
    await requestCameraPermission();
    await requestMicrophonePermission();
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => setLocationPermission(status))
      .catch(() => setLocationPermission('denied'));
  };

  const cameraReady = cameraPermission?.granted && microphonePermission?.granted;

  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.darkBackground}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!cameraReady) {
    return (
      <View style={styles.permissionsContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionCard}>
          <MaterialCommunityIcons name="camera-off" size={48} color={theme.accent} style={{ marginBottom: 16 }} />
          <Text style={styles.permissionTitle}>SnapTag Permissions</Text>
          <Text style={styles.permissionDesc}>
            To capture photos/videos and geotag them, we need camera and microphone access.
          </Text>
          <View style={styles.permissionList}>
            <View style={styles.permissionRow}>
              <MaterialCommunityIcons
                name={cameraPermission?.granted ? 'check-circle' : 'circle-outline'}
                size={20}
                color={cameraPermission?.granted ? theme.success : theme.textSecondary}
              />
              <Text style={styles.permissionText}>Camera</Text>
            </View>
            <View style={styles.permissionRow}>
              <MaterialCommunityIcons
                name={microphonePermission?.granted ? 'check-circle' : 'circle-outline'}
                size={20}
                color={microphonePermission?.granted ? theme.success : theme.textSecondary}
              />
              <Text style={styles.permissionText}>Microphone</Text>
            </View>
            <View style={styles.permissionRow}>
              <MaterialCommunityIcons
                name={locationPermission === 'granted' ? 'check-circle' : 'circle-outline'}
                size={20}
                color={locationPermission === 'granted' ? theme.success : theme.textSecondary}
              />
              <Text style={styles.permissionText}>GPS Location (optional)</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleRequestAllPermissions}>
            <Text style={styles.primaryButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const triggerFlashAnimation = () =>
    new Promise((resolve) => {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => resolve());
    });

  const getGps = async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, altitude: pos.coords.altitude };
    } catch {
      return null;
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const gpsPromise = getGps();
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
      await triggerFlashAnimation();
      const gps = await gpsPromise;
      setIsCapturing(false);
      navigation.navigate('Tag', { mediaUri: photo.uri, mediaType: 'photo', gps, file, checklist, preLinkedItemId, preLinkedTemplateId, preLinkedTemplateName, preLinkedItemLabel });
    } catch (e) {
      setIsCapturing(false);
      console.error('Photo capture failed:', e);
    }
  };

  const startVideoRecording = async () => {
    if (!cameraRef.current || isRecording || isCapturing) return;
    try {
      setIsRecording(true);
      gpsPromiseRef.current = getGps();
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      const gps = await (gpsPromiseRef.current ?? Promise.resolve(null));
      navigation.navigate('Tag', { mediaUri: video.uri, mediaType: 'video', gps, file, checklist, preLinkedItemId, preLinkedTemplateId, preLinkedTemplateName, preLinkedItemLabel });
    } catch (e) {
      console.error('Video recording failed:', e);
    } finally {
      setIsRecording(false);
    }
  };

  const stopVideoRecording = () => {
    if (!cameraRef.current || !isRecording) return;
    setIsRecording(false);
    try {
      cameraRef.current.stopRecording();
    } catch (e) {
      console.error('Stop recording error:', e);
    }
  };

  const handleShutterTap = () => {
    if (cameraMode === 'photo') {
      capturePhoto();
    } else {
      isRecording ? stopVideoRecording() : startVideoRecording();
    }
  };

  const handleShutterHold = () => {
    setCameraMode('video');
    startVideoRecording();
  };

  const handleShutterRelease = () => {
    if (isRecording) stopVideoRecording();
  };

  const checklistProgress = checklist
    ? Object.values(checklist.progress || {})
    : [];
  const checklistChecked = checklistProgress.filter((p) => p.checked).length;
  const checklistTotal = checklistProgress.length;
  const checklistAllDone = checklistTotal > 0 && checklistChecked === checklistTotal;

  return (
    <View style={styles.container} collapsable={false}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <CameraView
        ref={cameraRef}
        style={{ position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        facing={facing}
        flash={flash}
        mode={cameraMode === 'photo' ? 'picture' : 'video'}
        onMountError={(e) => console.error('[Camera] Mount error:', e.message)}
      />

      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.flashOverlay, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.overlayContainer}>
        <View>
          {/* File header bar */}
          <View style={styles.fileHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate('InspectionHub', { file })}
              disabled={isRecording}
            >
              <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.fileHeaderCenter}>
              <MaterialCommunityIcons name="folder" size={14} color={theme.accent} />
              <Text style={styles.fileHeaderName} numberOfLines={1}>{file.name}</Text>
            </View>
            {checklist ? (
              <TouchableOpacity
                style={[styles.checklistBtn, checklistAllDone && styles.checklistBtnDone]}
                onPress={() => setShowChecklist(true)}
                disabled={isRecording}
              >
                <MaterialCommunityIcons
                  name={checklistAllDone ? 'check-circle' : 'format-list-checks'}
                  size={15}
                  color={checklistAllDone ? theme.success : '#fff'}
                />
                <Text style={[styles.checklistBtnText, checklistAllDone && styles.checklistBtnTextDone]}>
                  {checklistChecked}/{checklistTotal}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>

          {/* Flash + Mode toggle row */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setFlash((f) => f === 'off' ? 'on' : 'off')}>
              <MaterialCommunityIcons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={24}
                color={flash === 'on' ? '#FBBF24' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modePill, cameraMode === 'photo' && styles.modePillActive]}
                onPress={() => { if (!isRecording) setCameraMode('photo'); }}
              >
                <Text style={[styles.modeText, cameraMode === 'photo' && styles.modeTextActive]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modePill, cameraMode === 'video' && styles.modePillActive]}
                onPress={() => { if (!isRecording) setCameraMode('video'); }}
              >
                <Text style={[styles.modeText, cameraMode === 'video' && styles.modeTextActive]}>Video</Text>
              </TouchableOpacity>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        <View style={styles.bottomBarOuter}>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <Animated.View style={[styles.recDot, { opacity: recOpacity }]} />
              <Text style={styles.recTimer}>{formatTimer(recordingSeconds)}</Text>
            </View>
          )}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.thumbnailContainer}
              onPress={() => { if (!isRecording) navigation.navigate('Library', { file }); }}
            >
              {lastCapture?.localUri ? (
                <Image source={{ uri: lastCapture.localUri }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <MaterialCommunityIcons name="image-multiple" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <ShutterButton
              isRecording={isRecording}
              onPress={handleShutterTap}
              onLongPress={handleShutterHold}
              onPressOut={handleShutterRelease}
            />

            <TouchableOpacity
              style={styles.flipBtn}
              onPress={() => setFacing((f) => f === 'back' ? 'front' : 'back')}
              disabled={isRecording}
            >
              <MaterialCommunityIcons name="camera-flip-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {showChecklist && checklist && (
        <ChecklistPanel
          fileId={file.id}
          checklist={checklist}
          onUpdate={setChecklist}
          onClose={() => setShowChecklist(false)}
        />
      )}
    </View>
  );
}
