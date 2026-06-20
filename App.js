import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { getPendingUploads, updateCaptureStatus } from './src/services/storageService';
import { uploadMedia, uploadMetadata, updateIndex } from './src/services/s3Service';

export default function App() {
  useEffect(() => {
    // Run background retry task for pending/failed uploads on launch
    const autoRetryPendingUploads = async () => {
      try {
        const pending = await getPendingUploads();
        if (pending && pending.length > 0) {
          console.log(`[SnapTag] Found ${pending.length} pending uploads. Starting auto-retry...`);
          
          for (const capture of pending) {
            try {
              console.log(`[SnapTag] Auto-retrying upload for capture: ${capture.id}`);
              
              // 1. Set status to uploading locally
              await updateCaptureStatus(capture.id, 'uploading');

              // 2. Upload media binary
              await uploadMedia(capture.localUri, capture.s3DataKey);

              // 3. Upload metadata
              const finalMetadata = {
                ...capture,
                uploadStatus: 'uploaded',
                uploadedAt: new Date().toISOString(),
              };
              await uploadMetadata(finalMetadata, capture.s3MetadataKey);

              // 4. Update index.json
              await updateIndex(finalMetadata);

              // 5. Update local status to uploaded
              await updateCaptureStatus(capture.id, 'uploaded');
              
              console.log(`[SnapTag] Auto-retry successful for capture: ${capture.id}`);
            } catch (err) {
              console.error(`[SnapTag] Auto-retry failed for capture ${capture.id}:`, err);
              // Revert to failed status so it can be retried again
              await updateCaptureStatus(capture.id, 'failed');
            }
          }
        } else {
          console.log('[SnapTag] No pending uploads found on launch.');
        }
      } catch (error) {
        console.error('[SnapTag] Error running auto-retry on launch:', error);
      }
    };

    autoRetryPendingUploads();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
