import { View, Image, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: 'rgba(8,8,8,0.78)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  placeholder: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  placeholderCard: {
    backgroundColor: 'rgba(17,17,17,0.92)',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  placeholderTitle: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    marginTop: 12,
    marginBottom: 6,
  },
  placeholderSub: {
    color: theme.textSecondary,
    fontSize: 13,
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 19,
  },
});

export default function MeasureScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { mediaUri } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-screen photo */}
      <Image source={{ uri: mediaUri }} style={styles.photo} resizeMode="contain" />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={22} color="#F5F5F5" />
        </TouchableOpacity>
        <Text style={styles.title}>Measure</Text>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      {/* Placeholder overlay */}
      <View style={styles.placeholder}>
        <View style={styles.placeholderCard}>
          <MaterialCommunityIcons name="ruler-square" size={36} color={theme.textMuted} />
          <Text style={styles.placeholderTitle}>Measurement Tools</Text>
          <Text style={styles.placeholderSub}>Tap on the photo to place measurement points. Coming soon.</Text>
        </View>
      </View>
    </View>
  );
}
